import { create } from "zustand";
import type { ModelParams, ModelState, Telemetry } from "../sim/core";

const TELEMETRY_LIMIT = 20000;

export type BaselineStatus = "idle" | "running" | "pass" | "fail";

type TelemetryBuffer = {
  samples: Telemetry[];
};

type SimStoreState = {
  modelId: string;
  params: ModelParams;
  scenarioId: string;
  running: boolean;
  speedMultiplier: number;
  lateralUnit: "g" | "mps2";
  telemetry: TelemetryBuffer;
  lastTelemetry: Telemetry | null;
  lastState: ModelState | null;
  error: string | null;
  baselineStatus: BaselineStatus;
  baselineMetrics: Record<string, number> | null;
  actions: {
    setModel: (modelId: string, params: ModelParams) => void;
    setParams: (params: ModelParams) => void;
    mergeParams: (params: Partial<ModelParams>) => void;
    setScenario: (scenarioId: string) => void;
    setRunning: (running: boolean) => void;
    setSpeedMultiplier: (multiplier: number) => void;
    setLateralUnit: (unit: "g" | "mps2") => void;
    recordTick: (state: ModelState, telemetry: Telemetry) => void;
    addTelemetry: (samples: Telemetry | Telemetry[]) => void;
    clearTelemetry: () => void;
    setBaselineStatus: (status: BaselineStatus) => void;
    setBaselineMetrics: (metrics: Record<string, number> | null) => void;
    setError: (message: string | null) => void;
  };
};

const clampTelemetry = (samples: Telemetry[]) => {
  if (samples.length <= TELEMETRY_LIMIT) {
    return samples;
  }
  return samples.slice(samples.length - TELEMETRY_LIMIT);
};

const makeBuffer = (): TelemetryBuffer => ({ samples: [] });

export const useSimStore = create<SimStoreState>((set) => ({
  modelId: "lin2dof",
  params: {},
  scenarioId: "const-radius",
  running: false,
  speedMultiplier: 1,
  telemetry: makeBuffer(),
  lastTelemetry: null,
  lastState: null,
  error: null,
  baselineStatus: "idle",
  baselineMetrics: null,
  actions: {
    setModel: (modelId, params) =>
      set(() => ({
        modelId,
        params,
        telemetry: makeBuffer(),
        lastTelemetry: null,
        lastState: null,
        baselineStatus: "idle",
        baselineMetrics: null,
      })),
    setParams: (params) => set(() => ({ params, baselineStatus: "idle", baselineMetrics: null })),
    mergeParams: (params) =>
      set((state) => ({
        params: { ...state.params, ...params },
        baselineStatus: "idle",
        baselineMetrics: null,
      })),
    setScenario: (scenarioId) =>
      set(() => ({ scenarioId, baselineStatus: "idle", baselineMetrics: null })),
    setRunning: (running) => set(() => ({ running })),
    setSpeedMultiplier: (multiplier) =>
      set(() => ({ speedMultiplier: Math.max(0.1, multiplier) })),
    setLateralUnit: (unit) => set(() => ({ lateralUnit: unit })),
    recordTick: (stateValue, telemetry) =>
      set((current) => {
        const merged = clampTelemetry([...current.telemetry.samples, telemetry]);
        return {
          lastState: stateValue,
          lastTelemetry: telemetry,
          telemetry: { samples: merged },
        };
      }),
    addTelemetry: (samples) =>
      set((state) => {
        const incoming = Array.isArray(samples) ? samples : [samples];
        const merged = clampTelemetry([...state.telemetry.samples, ...incoming]);
        return {
          telemetry: {
            samples: merged,
          },
          lastTelemetry: incoming[incoming.length - 1] ?? state.lastTelemetry,
        };
      }),
    clearTelemetry: () =>
      set(() => ({ telemetry: makeBuffer(), lastTelemetry: null, lastState: null })),
    setBaselineStatus: (status) => set(() => ({ baselineStatus: status })),
    setBaselineMetrics: (metrics) => set(() => ({ baselineMetrics: metrics })),
    setError: (message) => set(() => ({ error: message })),
  },
}));
