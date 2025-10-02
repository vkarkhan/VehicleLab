import { predictLimit } from "@/lib/theory/frictionEnvelope";
import { createStepSteerTheory } from "@/lib/theory/stepSteer";
import { runSimulation, vehicleParamsFromModel, type CanonicalTelemetry } from "./common";

export type RampConfig = {
  speed: number;
  rampRate: number;
  duration?: number;
  dt?: number;
  modelId?: string;
  modelParams?: Record<string, unknown>;
};

export type RampResult = {
  telemetry: CanonicalTelemetry[];
  theory: ReturnType<typeof predictLimit> & {
    linearGain: number;
  };
  metrics: Record<string, number>;
  grades: Record<string, boolean>;
  flags: Record<string, boolean>;
};

export function runRampToLimitRun(config: RampConfig): RampResult {
  const dt = config.dt ?? 0.01;
  const duration = config.duration ?? Math.max(6, (0.4 / config.rampRate) + 2);

  const sim = runSimulation({
    modelId: config.modelId,
    params: { v: config.speed, ...(config.modelParams ?? {}) },
    dt,
    duration,
    input: ({ t }) => ({ steer: config.rampRate * t }),
  });

  const vehicle = vehicleParamsFromModel(sim.params);
  const frictionTheory = predictLimit(config.speed, vehicle.mu, vehicle);
  const stepTheory = createStepSteerTheory(vehicle, config.speed);
  const linearGainTheory = stepTheory.gainRDelta * config.speed;

  const slopeWindow = 0.05;
  let num = 0;
  let denom = 0;
  for (const sample of sim.telemetry) {
    if (Math.abs(sample.steer) > slopeWindow) break;
    if (Math.abs(sample.steer) < 1e-4) continue;
    num += sample.steer * sample.ay;
    denom += sample.steer * sample.steer;
  }
  const linearGainMeasured = denom === 0 ? 0 : num / denom;
  const gainError = linearGainTheory === 0
    ? Math.abs(linearGainMeasured)
    : Math.abs(linearGainMeasured - linearGainTheory) / Math.max(Math.abs(linearGainTheory), 1e-6);

  const limitIndex = sim.telemetry.findIndex((sample) => sample.frontLimited || sample.rearLimited);
  const limitSample = limitIndex >= 0
    ? sim.telemetry[limitIndex]
    : sim.telemetry[sim.telemetry.length - 1];

  const ayAtLimit = limitSample.ay;
  const steerAtLimit = limitSample.steer;
  const ayError = Math.abs(ayAtLimit - frictionTheory.ayMax) / vehicle.g;
  const steerError = Math.abs(steerAtLimit - frictionTheory.steerAtLimit);

  const frictionLimited = limitIndex >= 0;
  const maxSlip = sim.telemetry.length
    ? Math.max(
        ...sim.telemetry.map((sample) => Math.max(Math.abs(sample.slipFront), Math.abs(sample.slipRear)))
      )
    : 0;

  const grades = {
    linearGain: gainError <= 0.1,
    ayLimit: ayError <= 0.05,
    steerLimit: steerError <= 0.05,
  };

  const metrics = {
    linearGainMeasured,
    linearGainTheory,
    gainError,
    ayAtLimit,
    ayExpected: frictionTheory.ayMax,
    ayError,
    steerAtLimit,
    steerExpected: frictionTheory.steerAtLimit,
    steerError,
    maxSlip,
  };

  const flags = {
    frictionLimited,
  };

  return {
    telemetry: sim.telemetry,
    theory: {
      ...frictionTheory,
      linearGain: linearGainTheory,
    },
    metrics,
    grades,
    flags,
  };
}
