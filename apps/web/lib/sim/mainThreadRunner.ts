import { createScenario, type ScenarioSampler } from "../scenarios";
import { getModel } from "../sim/registry";
import type { ModelDef, ModelParams, ModelState, Telemetry } from "./core";
import type { SimStartMessage, SimWorkerMessage, SimWorkerResponse } from "./messages";

type RunnerCallbacks = {
  onMessage: (message: SimWorkerResponse) => void;
};

type Runtime = {
  model?: ModelDef;
  params: ModelParams;
  scenarioId?: string;
  scenarioSampler?: ScenarioSampler;
  dt: number;
  speedMultiplier: number;
  state?: ModelState;
  running: boolean;
  t: number;
  timer?: ReturnType<typeof setInterval>;
  throttleMs: number;
};

const createRuntime = (): Runtime => ({
  params: {},
  dt: 0.01,
  speedMultiplier: 1,
  running: false,
  t: 0,
  throttleMs: 20,
});

export type WorkerLike = {
  postMessage: (message: SimWorkerMessage) => void;
  terminate: () => void;
};

export const createMainThreadRunner = (callbacks: RunnerCallbacks): WorkerLike => {
  const runtime = createRuntime();
  let lastEmit = 0;
  let seededRandom: (() => number) | null = null;
  const originalRandom = Math.random;

  const emit = (message: SimWorkerResponse) => {
    callbacks.onMessage(message);
  };

  const emitError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    emit({ type: "error", message });
  };

  const stopLoop = () => {
    runtime.running = false;
    if (runtime.timer) {
      clearInterval(runtime.timer);
      runtime.timer = undefined;
    }
  };

  const applySeed = (seed?: number) => {
    if (typeof seed !== "number") {
      if (seededRandom) {
        Math.random = originalRandom;
        seededRandom = null;
      }
      return;
    }

    let state = seed % 2147483647;
    if (state <= 0) state += 2147483646;
    seededRandom = () => {
      state = (state * 16807) % 2147483647;
      return (state - 1) / 2147483646;
    };
    Math.random = seededRandom as typeof Math.random;
  };

  const emitTick = (force = false) => {
    if (!runtime.model || !runtime.state) return;
    const now = Date.now();
    if (!force && now - lastEmit < runtime.throttleMs) {
      return;
    }
    lastEmit = now;
    try {
      const rawTelemetry = runtime.model.outputs(runtime.state, runtime.params);
      const telemetry: Telemetry = { ...rawTelemetry, t: runtime.t };
      emit({ type: "tick", t: runtime.t, state: runtime.state, telemetry });
    } catch (error) {
      emitError(error);
    }
  };

  const step = () => {
    if (!runtime.model || !runtime.state || !runtime.scenarioSampler) return;
    const dt = runtime.dt * runtime.speedMultiplier;
    const inputs = runtime.scenarioSampler({
      t: runtime.t,
      modelId: runtime.model.id,
      params: runtime.params,
    });
    runtime.state = runtime.model.step(runtime.state, inputs, dt, runtime.params);
    runtime.t += dt;
    emitTick();
  };

  const startLoop = () => {
    stopLoop();
    runtime.running = true;
    const interval = Math.max((runtime.dt / runtime.speedMultiplier) * 1000, 1);
    runtime.timer = setInterval(step, interval);
  };

  const resetSimulation = () => {
    if (!runtime.model) return;
    runtime.state = runtime.model.init(runtime.params as any);
    runtime.t = 0;
    emitTick(true);
  };

  const handleStart = (message: SimStartMessage) => {
    const model = getModel(message.modelId);
    if (!model) {
      throw new Error("Model not registered: " + message.modelId);
    }
    runtime.model = model;
    runtime.params = { ...model.defaults, ...message.params };
    runtime.dt = typeof message.dt === "number" ? message.dt : 0.01;
    runtime.speedMultiplier = message.speedMultiplier ?? 1;
    runtime.scenarioId = message.scenarioId;
    runtime.scenarioSampler = createScenario(message.scenarioId, message.scenarioOverrides);
    runtime.state = model.init(runtime.params as any);
    runtime.t = 0;
    applySeed(message.seed);
    emitTick(true);
    startLoop();
  };

  const handleMessage = (message: SimWorkerMessage) => {
    try {
      switch (message.type) {
        case "start":
          handleStart(message);
          break;
        case "pause":
          stopLoop();
          emit({ type: "done", reason: "paused" });
          break;
        case "resume":
          startLoop();
          break;
        case "reset":
          resetSimulation();
          break;
        case "updateParams":
          runtime.params = { ...runtime.params, ...message.params };
          break;
        case "updateScenario":
          runtime.scenarioId = message.scenarioId;
          runtime.scenarioSampler = createScenario(message.scenarioId, message.overrides);
          break;
        case "setSpeed":
          runtime.speedMultiplier = Math.max(0.01, message.multiplier);
          if (runtime.running) {
            startLoop();
          }
          break;
        default:
          break;
      }
    } catch (error) {
      emitError(error);
    }
  };

  const terminate = () => {
    stopLoop();
    applySeed(undefined);
  };

  return {
    postMessage: handleMessage,
    terminate,
  };
};
