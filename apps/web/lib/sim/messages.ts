import type { ModelParams, ModelState, Telemetry } from "./core";

export type SimStartMessage = {
  type: "start";
  modelId: string;
  params: ModelParams;
  scenarioId: string;
  dt?: number;
  seed?: number;
  speedMultiplier?: number;
  scenarioOverrides?: Record<string, unknown>;
};

export type SimWorkerMessage =
  | SimStartMessage
  | { type: "pause" }
  | { type: "resume" }
  | { type: "reset" }
  | { type: "updateParams"; params: ModelParams }
  | { type: "updateScenario"; scenarioId: string; overrides?: Record<string, unknown> }
  | { type: "setSpeed"; multiplier: number };

export type SimTickMessage = {
  type: "tick";
  t: number;
  state: ModelState;
  telemetry: Telemetry;
};

export type SimDoneMessage = { type: "done"; reason: string };
export type SimErrorMessage = { type: "error"; message: string };

export type SimWorkerResponse = SimTickMessage | SimDoneMessage | SimErrorMessage;
