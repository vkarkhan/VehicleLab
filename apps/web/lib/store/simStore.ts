import { create } from "zustand";
import type { ModelParams, ModelState, Telemetry } from "../sim/core";

type TelemetryBuffer = {
  samples: Telemetry[];
};

type BaselineStatus = "idle" | "running" | "pass" | "fail";

type SimStoreState = {
  modelId: string;
  params: ModelParams;
  scenarioId: string;
  running: boolean;
  speedMultiplier: number;
  telemetry: TelemetryBuffer;
  lastTelemetry: Telemetry | null;
  lastState: ModelState | null;
  error: string | null;
  baselineStatus: BaselineStatus;
  actions: {
    setModel: (modelId: string, params: ModelParams) => void;
    setParams: (params: ModelParams) => void;
    setScenario: (scenarioId: string) => void;
    setRunning: (running: boolean) => void;
    setSpeedMultiplier: (multiplier: number) => void;
    recordTick: (state: ModelState, telemetry: Telemetry) => void;
    addTelemetry: (samples: Telemetry | Telemetry[]) => void;
    clearTelemetry: () => void;
    setBaselineStatus: (status: BaselineStatus) => void;
    setError: (message: string | null) => void;
  };
};

const makeBuffer = (): TelemetryBuffer => ({ samples: [] });

export const useSimStore = create<SimStoreState>((set) => ({
  modelId: "unicycle",
  params: {},
  scenarioId: "step-steer",
  running: false,
  speedMultiplier: 1,
  telemetry: makeBuffer(),
  lastTelemetry: null,
  lastState: null,
  error: null,
  baselineStatus: "idle",
  actions: {
    setModel: (modelId, params) =>
      set(() => ({
        modelId,
        params,
        telemetry: makeBuffer(),
        lastTelemetry: null,
        lastState: null,
      })),
    setParams: (params) => set(() => ({ params })),
    setScenario: (scenarioId) => set(() => ({ scenarioId })),
    setRunning: (running) => set(() => ({ running })),
    setSpeedMultiplier: (multiplier) =>
      set(() => ({ speedMultiplier: Math.max(0.1, multiplier) })),
    recordTick: (state, telemetry) =>
      set((current) => ({
        lastState: state,
        lastTelemetry: telemetry,
        telemetry: {
          samples: [...current.telemetry.samples, telemetry],
        },
      })),
    addTelemetry: (samples) =>
      set((state) => {
        const incoming = Array.isArray(samples) ? samples : [samples];
        return {
          telemetry: {
            samples: [...state.telemetry.samples, ...incoming],
          },
        };
      }),
    clearTelemetry: () =>
      set(() => ({ telemetry: makeBuffer(), lastTelemetry: null, lastState: null })),
    setBaselineStatus: (status) => set(() => ({ baselineStatus: status })),
    setError: (message) => set(() => ({ error: message })),
  },
}));
