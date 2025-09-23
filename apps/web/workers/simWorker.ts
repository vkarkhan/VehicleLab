declare const self: DedicatedWorkerGlobalScope;
export {};

import { bootModels } from "../lib/models";
import { createScenario, type ScenarioSampler } from "../lib/scenarios";
import { getModel } from "../lib/sim/registry";
import type {
  ModelDef,
  ModelParams,
  ModelState,
  Telemetry,
} from "../lib/sim/core";

bootModels();

type StartMessage = {
  type: "start";
  modelId: string;
  params: ModelParams;
  scenarioId: string;
  dt?: number;
  seed?: number;
  speedMultiplier?: number;
  scenarioOverrides?: Record<string, unknown>;
};

type WorkerMessage =
  | StartMessage
  | { type: "pause" }
  | { type: "resume" }
  | { type: "reset" }
  | { type: "updateParams"; params: ModelParams }
  | { type: "updateScenario"; scenarioId: string; overrides?: Record<string, unknown> }
  | { type: "setSpeed"; multiplier: number };

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

const runtime: Runtime = {
  params: {},
  dt: 0.01,
  speedMultiplier: 1,
  running: false,
  t: 0,
  throttleMs: 20,
};

let seededRandom: (() => number) | null = null;
const originalRandom = Math.random;

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  try {
    const message = event.data;
    switch (message.type) {
      case "start":
        return handleStart(message);
      case "pause":
        return pause("paused");
      case "resume":
        return resume();
      case "reset":
        return reset();
      case "updateParams":
        return updateParams(message.params);
      case "updateScenario":
        return updateScenario(message.scenarioId, message.overrides);
      case "setSpeed":
        return setSpeed(message.multiplier);
      default:
        return;
    }
  } catch (error) {
    emitError(error);
  }
};

const handleStart = (message: StartMessage) => {
  const model = getModel(message.modelId);
  if (!model) {
    throw new Error(Model  not registered);
  }

  runtime.model = model;
  runtime.params = { ...model.defaults, ...message.params };
  runtime.dt = typeof message.dt === "number" ? message.dt : 0.01;
  runtime.speedMultiplier = message.speedMultiplier ?? 1;
  runtime.scenarioId = message.scenarioId;
  runtime.scenarioSampler = createScenario(
    message.scenarioId,
    message.scenarioOverrides
  );
  runtime.state = model.init(runtime.params as any);
  runtime.t = 0;

  applySeed(message.seed);
  emitTick(true);
  startLoop();
};

const updateParams = (params: ModelParams) => {
  if (!runtime.model) return;
  runtime.params = { ...runtime.params, ...params };
};

const updateScenario = (
  scenarioId: string,
  overrides?: Record<string, unknown>
) => {
  runtime.scenarioId = scenarioId;
  runtime.scenarioSampler = createScenario(scenarioId, overrides);
};

const reset = () => {
  if (!runtime.model) return;
  runtime.state = runtime.model.init(runtime.params as any);
  runtime.t = 0;
  emitTick(true);
};

const setSpeed = (multiplier: number) => {
  runtime.speedMultiplier = Math.max(0.01, multiplier);
  if (runtime.running) {
    startLoop();
  }
};

const resume = () => {
  if (!runtime.model) return;
  startLoop();
};

const pause = (reason: string) => {
  stopLoop();
  emitDone(reason);
};

const startLoop = () => {
  stopLoop();
  runtime.running = true;
  const interval = Math.max((runtime.dt / runtime.speedMultiplier) * 1000, 1);
  runtime.timer = setInterval(step, interval);
};

const stopLoop = () => {
  runtime.running = false;
  if (runtime.timer) {
    clearInterval(runtime.timer);
    runtime.timer = undefined;
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

  runtime.state = runtime.model.step(
    runtime.state,
    inputs,
    dt,
    runtime.params
  );
  runtime.t += dt;

  emitTick();
};

let lastEmit = 0;

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
    self.postMessage({
      type: "tick",
      t: runtime.t,
      state: runtime.state,
      telemetry,
    });
  } catch (error) {
    emitError(error);
  }
};

const emitDone = (reason: string) => {
  self.postMessage({ type: "done", reason });
};

const emitError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  self.postMessage({ type: "error", message });
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
