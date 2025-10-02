import { createStepSteerTheory } from "@/lib/theory/stepSteer";
import { runSimulation, vehicleParamsFromModel, type CanonicalTelemetry } from "./common";

export type StepSteerConfig = {
  speed: number;
  delta: number;
  tStep?: number;
  duration?: number;
  dt?: number;
  modelId?: string;
  modelParams?: Record<string, unknown>;
};

export type StepSteerResult = {
  telemetry: CanonicalTelemetry[];
  theory: ReturnType<typeof createStepSteerTheory> & {
    yawRate: number[];
    ay: number[];
  };
  metrics: Record<string, number>;
  grades: Record<string, boolean>;
  flags: Record<string, boolean>;
};

const findSettlingTime = (
  samples: CanonicalTelemetry[],
  startIndex: number,
  finalValue: number,
  tolerance: number
) => {
  const lower = finalValue - Math.abs(finalValue) * tolerance;
  const upper = finalValue + Math.abs(finalValue) * tolerance;
  let settlingTime = samples[samples.length - 1]?.t ?? 0;
  for (let i = startIndex; i < samples.length; i += 1) {
    const candidate = samples[i];
    const within = candidate.yawRate >= lower && candidate.yawRate <= upper;
    if (!within) {
      settlingTime = samples[samples.length - 1]?.t ?? settlingTime;
    } else {
      const remaining = samples.slice(i).every((s) => s.yawRate >= lower && s.yawRate <= upper);
      if (remaining) {
        settlingTime = candidate.t;
        break;
      }
    }
  }
  return settlingTime;
};

export function runStepSteerRun(config: StepSteerConfig): StepSteerResult {
  const dt = config.dt ?? 0.01;
  const duration = config.duration ?? 8;
  const tStep = config.tStep ?? 1;
  const delta = config.delta;

  const sim = runSimulation({
    modelId: config.modelId,
    params: { v: config.speed, ...(config.modelParams ?? {}) },
    dt,
    duration,
    input: ({ t }) => ({ steer: t >= tStep ? delta : 0 }),
  });

  const vehicle = vehicleParamsFromModel(sim.params);
  const theoryBase = createStepSteerTheory(vehicle, config.speed);
  const times = sim.telemetry.map((sample) => sample.t);
  const theoryCurves = theoryBase.stepCurves(times, delta);

  const finalExpected = theoryBase.gainRDelta * delta;
  const steadySamples = sim.telemetry.filter((sample) => sample.t >= duration - 1);
  const avgYaw = steadySamples.length
    ? steadySamples.reduce((acc, sample) => acc + sample.yawRate, 0) / steadySamples.length
    : sim.telemetry[sim.telemetry.length - 1]?.yawRate ?? 0;

  const finalError = finalExpected === 0
    ? 0
    : Math.abs(avgYaw - finalExpected) / Math.max(Math.abs(finalExpected), 1e-6);

  const peakSample = sim.telemetry
    .filter((sample) => sample.t >= tStep)
    .reduce((max, sample) => (sample.yawRate > max.yawRate ? sample : max), sim.telemetry[0]);

  const overshoot = finalExpected === 0
    ? 0
    : Math.max(0, (peakSample.yawRate - finalExpected) / Math.max(Math.abs(finalExpected), 1e-6));

  const startIndex = sim.telemetry.findIndex((sample) => sample.t >= tStep);
  const measuredSettling = startIndex >= 0
    ? findSettlingTime(sim.telemetry, startIndex, finalExpected, 0.02)
    : duration;

  const theoreticalSettling = theoryBase.zeta > 0 && theoryBase.omegaN > 0
    ? 4 / (theoryBase.zeta * theoryBase.omegaN)
    : duration;
  const theoreticalOvershoot = theoryBase.zeta < 1
    ? Math.exp((-Math.PI * theoryBase.zeta) / Math.sqrt(Math.max(1 - theoryBase.zeta * theoryBase.zeta, 1e-6)))
    : 0;

  const settlingError = theoreticalSettling === 0
    ? 0
    : Math.abs(measuredSettling - (tStep + theoreticalSettling)) / Math.max(theoreticalSettling + tStep, 1e-6);
  const overshootError = theoreticalOvershoot === 0
    ? overshoot
    : Math.abs(overshoot - theoreticalOvershoot) / Math.max(theoreticalOvershoot, 1e-6);

  const maxSlip = Math.max(
    ...sim.telemetry.map((s) => Math.max(Math.abs(s.slipFront), Math.abs(s.slipRear)))
  );
  const frictionLimited = sim.telemetry.some((s) => s.frontLimited || s.rearLimited);
  const linearRegion = maxSlip < (6 * Math.PI) / 180;

  const grades = {
    finalYaw: finalError <= 0.05,
    settling: settlingError <= 0.15,
    overshoot: theoryBase.zeta < 1 ? overshootError <= 0.2 : overshoot <= 0.02,
  };

  const metrics = {
    finalExpected,
    avgYaw,
    finalError,
    measuredSettling,
    theoreticalSettling: tStep + theoreticalSettling,
    settlingError,
    overshoot,
    theoreticalOvershoot,
    overshootError,
    maxSlip,
  };

  const flags = {
    frictionLimited,
    linearRegion,
  };

  return {
    telemetry: sim.telemetry,
    theory: {
      ...theoryBase,
      yawRate: theoryCurves.yawRate,
      ay: theoryCurves.ay,
    },
    metrics,
    grades,
    flags,
  };
}
