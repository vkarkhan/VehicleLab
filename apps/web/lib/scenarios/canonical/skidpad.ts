import { predictSkidpad } from "@/lib/theory/skidpad";
import { runSimulation, vehicleParamsFromModel, type CanonicalTelemetry } from "./common";

export type SkidpadConfig = {
  speed: number;
  radius: number;
  duration?: number;
  dt?: number;
  modelId?: string;
  modelParams?: Record<string, unknown>;
  controller?: {
    kp?: number;
    ki?: number;
  };
};

export type SkidpadResult = {
  telemetry: CanonicalTelemetry[];
  theory: ReturnType<typeof predictSkidpad>;
  metrics: Record<string, number>;
  grades: Record<string, boolean>;
  flags: Record<string, boolean>;
};

export function runSkidpadRun(config: SkidpadConfig): SkidpadResult {
  const dt = config.dt ?? 0.01;
  const duration = config.duration ?? 20;
  const targetYaw = config.radius > 0 ? config.speed / config.radius : 0;
  const pidKp = config.controller?.kp ?? 0.4;
  const pidKi = config.controller?.ki ?? 0.1;

  let integral = 0;
  let command = 0;

  const sim = runSimulation({
    modelId: config.modelId,
    params: { v: config.speed, ...(config.modelParams ?? {}) },
    dt,
    duration,
    input: ({ previous }) => {
      if (!previous) {
        integral = 0;
        command = 0;
      } else {
        const error = targetYaw - previous.yawRate;
        integral += error * dt;
        command += pidKp * error + pidKi * integral;
        if (command > 0.8) command = 0.8;
        if (command < -0.8) command = -0.8;
      }
      return { steer: command };
    },
  });

  const vehicle = vehicleParamsFromModel(sim.params);
  const theory = predictSkidpad(config.speed, config.radius, vehicle);

  const samples = sim.telemetry;
  const windowStart = Math.floor(samples.length * 0.6);
  const steadySamples = samples.slice(windowStart);

  const avg = (selector: (sample: CanonicalTelemetry) => number) => {
    if (steadySamples.length === 0) return 0;
    const sum = steadySamples.reduce((acc, sample) => acc + selector(sample), 0);
    return sum / steadySamples.length;
  };

  const avgYaw = avg((s) => s.yawRate);
  const avgAy = avg((s) => s.ay);
  const avgSteer = avg((s) => s.steer);

  const yawError = theory.yawRate === 0 ? 0 : Math.abs(avgYaw - theory.yawRate) / Math.max(Math.abs(theory.yawRate), 1e-6);
  const ayError = theory.lateralAcceleration === 0 ? 0 : Math.abs(avgAy - theory.lateralAcceleration) / Math.max(Math.abs(theory.lateralAcceleration), 1e-6);
  const steerError = Math.abs(avgSteer - theory.steadyStateSteer);

  const maxSlip = Math.max(
    ...steadySamples.map((s) => Math.max(Math.abs(s.slipFront), Math.abs(s.slipRear)))
  );
  const frictionLimited = steadySamples.some((s) => s.frontLimited || s.rearLimited);
  const linearRegion = maxSlip < (6 * Math.PI) / 180;

  const yawTol = frictionLimited ? 0.1 : 0.05;
  const ayTol = frictionLimited ? 0.1 : 0.05;
  const steerTol = frictionLimited ? 0.08 : 0.05;

  const grades = {
    yawRate: yawError <= yawTol,
    lateralAcceleration: ayError <= ayTol,
    steer: steerError <= steerTol,
  };

  const metrics = {
    avgYaw,
    avgAy,
    avgSteer,
    yawError,
    ayError,
    steerError,
    maxSlip,
  };

  const flags = {
    frictionLimited,
    linearRegion,
  };

  return {
    telemetry: samples,
    theory,
    metrics,
    grades,
    flags,
  };
}
