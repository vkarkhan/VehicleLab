import { create } from "zustand";
import type { ModelParams, Telemetry } from "../sim/core";

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
  baselineStatus: BaselineStatus;
  actions: {
    setModel: (modelId: string, params: ModelParams) => void;
    setParams: (params: ModelParams) => void;
    setScenario: (scenarioId: string) => void;
    setRunning: (running: boolean) => void;
    setSpeedMultiplier: (multiplier: number) => void;
    addTelemetry: (samples: Telemetry | Telemetry[]) => void;
    clearTelemetry: () => void;
    setBaselineStatus: (status: BaselineStatus) => void;
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
  baselineStatus: "idle",
  actions: {
    setModel: (modelId, params) =>
      set(() => ({ modelId, params, telemetry: makeBuffer() })),
    setParams: (params) => set(() => ({ params })),
    setScenario: (scenarioId) => set(() => ({ scenarioId })),
    setRunning: (running) => set(() => ({ running })),
    setSpeedMultiplier: (multiplier) =>
      set(() => ({ speedMultiplier: Math.max(0.1, multiplier) })),
    addTelemetry: (samples) =>
      set((state) => {
        const incoming = Array.isArray(samples) ? samples : [samples];
        return {
          telemetry: {
            samples: [...state.telemetry.samples, ...incoming],
          },
        };
      }),
    clearTelemetry: () => set(() => ({ telemetry: makeBuffer() })),
    setBaselineStatus: (status) => set(() => ({ baselineStatus: status })),
  },
}));
