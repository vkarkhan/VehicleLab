import { createVehicleParams, type VehicleParams } from "@/lib/vehicle/params";
import type { Telemetry } from "@/lib/sim/core";
import { getModel } from "@/lib/sim/registry";
import type { SimInputs } from "@/lib/sim/core";

export type CanonicalTelemetry = {
  t: number;
  steer: number;
  yawRate: number;
  ay: number;
  vy: number;
  beta: number;
  vyDot: number;
  slipFront: number;
  slipRear: number;
  frontLimited: boolean;
  rearLimited: boolean;
  dtClamped: boolean;
};

export type SimulationRun = {
  telemetry: CanonicalTelemetry[];
  params: Record<string, unknown>;
};

export type SimulationConfig = {
  modelId?: string;
  params?: Record<string, unknown>;
  dt: number;
  duration: number;
  input: (context: { t: number; previous?: CanonicalTelemetry }) => SimInputs;
};

const toTelemetry = (raw: Telemetry, steer: number): CanonicalTelemetry => {
  const notes = raw.notes ?? {};
  const frontLimited = Boolean(notes.frontLimited && notes.frontLimited > 0);
  const rearLimited = Boolean(notes.rearLimited && notes.rearLimited > 0);
  const dtClamped = Boolean(notes.dtClamped && notes.dtClamped > 0);
  return {
    t: raw.t ?? 0,
    steer,
    yawRate: raw.r ?? 0,
    ay: raw.ay ?? 0,
    vy: raw.vy ?? 0,
    beta: raw.beta ?? 0,
    vyDot: notes.vyDot ?? 0,
    slipFront: notes.slipFront ?? 0,
    slipRear: notes.slipRear ?? 0,
    frontLimited,
    rearLimited,
    dtClamped,
  };
};

export const runSimulation = (config: SimulationConfig): SimulationRun => {
  const modelId = config.modelId ?? "lin2dof";
  const model = getModel(modelId);
  if (!model) {
    throw new Error("Model not registered: " + modelId);
  }
  const params = {
    ...model.defaults,
    ...(config.params ?? {}),
  };
  if (typeof (params as any).useFrictionClamp === "undefined") {
    (params as any).useFrictionClamp = true;
  }
  if ((params as any).processNoise) {
    (params as any).processNoise = false;
  }
  const dt = config.dt;
  const steps = Math.max(1, Math.ceil(config.duration / dt));
  let state = model.init(params as any);
  const telemetry: CanonicalTelemetry[] = [];

  for (let i = 0; i < steps; i += 1) {
    const t = i * dt;
    const previous = telemetry.length > 0 ? telemetry[telemetry.length - 1] : undefined;
    const inputs = config.input({ t, previous });
    state = model.step(state, inputs, dt, params as any);
    const raw = model.outputs(state, params as any);
    const sample = toTelemetry({ ...raw, t: t + dt }, inputs.steer ?? 0);
    telemetry.push(sample);
  }

  return {
    telemetry,
    params,
  };
};

export const vehicleParamsFromModel = (
  params: Record<string, unknown>
): VehicleParams =>
  createVehicleParams({
    m: (params.m as number) ?? 1500,
    Iz: (params.Iz as number) ?? 2250,
    a: (params.a as number) ?? 1.2,
    b: (params.b as number) ?? 1.6,
    Cf: (params.Cf as number) ?? 80000,
    Cr: (params.Cr as number) ?? 80000,
    mu: (params.mu as number) ?? 1,
    track: (params.trackWidth as number) ?? 1.6,
    hCg: (params.hCg as number) ?? 0.55,
  });
