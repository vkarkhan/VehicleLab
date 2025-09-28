import { constRadius, stepSteer, type ScenarioSampler } from "@/lib/scenarios";
import { getModel } from "@/lib/sim/registry";
import type { ModelParams, Telemetry } from "@/lib/sim/core";

export type BaselineResult = {
  status: "pass" | "fail";
  metrics: Record<string, number>;
  message?: string;
};

const DEFAULT_DT = 0.01;

const runSimulation = (
  modelId: string,
  baseParams: ModelParams,
  duration: number,
  sampler: ScenarioSampler,
  dtOverride?: number
) => {
  const model = getModel(modelId);
  if (!model) {
    throw new Error("Model not registered: " + modelId);
  }

  const params = { ...model.defaults, ...baseParams } as Record<string, unknown>;
  if ("processNoise" in params) {
    (params as Record<string, unknown>).processNoise = false;
  }

  const dt = typeof params.dt === "number" ? (params.dt as number) : dtOverride ?? DEFAULT_DT;

  let state = model.init(params as any);
  const samples: Telemetry[] = [];
  let t = 0;

  while (t < duration) {
    const inputs = sampler({ t, modelId, params });
    state = model.step(state, inputs, dt, params);
    t += dt;
    const telemetry = model.outputs(state, params);
    samples.push({ ...telemetry, t });
  }

  return { samples, params };
};

const runUnicycleBaseline = (params: ModelParams): BaselineResult => {
  const radius = 50;
  const duration = 30;
  const sampler = constRadius({ R: radius });
  const { samples } = runSimulation("unicycle", params, duration, sampler);

  const targetCenter = { x: 0, y: radius };
  const errors: number[] = [];

  for (const telemetry of samples) {
    const x = telemetry.x ?? 0;
    const y = telemetry.y ?? 0;
    const dx = x - targetCenter.x;
    const dy = y - targetCenter.y;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (Number.isFinite(r)) {
      errors.push(Math.abs(r - radius));
    }
  }

  const rms = Math.sqrt(errors.reduce((sum, error) => sum + error * error, 0) / Math.max(errors.length, 1));
  return {
    status: rms < 0.5 ? "pass" : "fail",
    metrics: { rmsRadiusError: rms },
  };
};

const runLin2DofBaseline = (params: ModelParams): BaselineResult => {
  const duration = 6;
  const sampler = stepSteer({ deltaDeg: 5, tStep: 1 });
  const { samples } = runSimulation("lin2dof", params, duration, sampler);

  const yawRates = samples.map((sample) => sample.r ?? 0);
  const peak = Math.max(...yawRates.map((value) => Math.abs(value)), 0);
  const steadyWindow = samples.filter((sample) => sample.t > duration - 1);
  const steady =
    steadyWindow.reduce((sum, sample) => sum + (sample.r ?? 0), 0) / Math.max(steadyWindow.length, 1);

  const monotonicRise = yawRates.slice(0, yawRates.length - 1).every((value, index, array) => {
    if (samples[index].t < 1) return true;
    return value <= array[index + 1] + 1e-3;
  });

  const pass = steady > 0 && peak >= steady && peak < 1.0 && monotonicRise;

  return {
    status: pass ? "pass" : "fail",
    metrics: {
      steadyYawRate: steady,
      peakYawRate: peak,
    },
  };
};

export const runBaseline = (modelId: string, params: ModelParams): BaselineResult | null => {
  switch (modelId) {
    case "unicycle":
      return runUnicycleBaseline(params);
    case "lin2dof":
      return runLin2DofBaseline(params);
    default:
      return null;
  }
};
