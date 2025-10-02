import type { ModelParams, ModelState, Telemetry } from "./core";

export type SimStateFrame = {
  telemetry: Telemetry;
  state: ModelState | null;
  modelId: string;
  scenarioId: string;
  params: ModelParams;
  dt?: number;
};

type Listener = (frame: SimStateFrame) => void;

class SimStateBus {
  private listeners = new Set<Listener>();
  private currentFrame: SimStateFrame | null = null;
  private playbackTimer: ReturnType<typeof setInterval> | null = null;
  private playbackFrames: SimStateFrame[] = [];
  private playbackIndex = 0;
  private playbackInterval = 80;

  publish(frame: SimStateFrame) {
    this.stopPlayback();
    this.currentFrame = frame;
    for (const listener of this.listeners) {
      listener(frame);
    }
  }

  subscribe(listener: Listener, emitCurrent = true) {
    this.listeners.add(listener);
    if (emitCurrent && this.currentFrame) {
      listener(this.currentFrame);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot() {
    return this.currentFrame;
  }

  startPlayback(frames: SimStateFrame[], intervalMs = 80) {
    if (!frames.length) {
      return;
    }
    this.stopPlayback();
    this.playbackFrames = frames;
    this.playbackIndex = 0;
    this.playbackInterval = intervalMs;
    this.playbackTimer = setInterval(() => {
      const frame = this.playbackFrames[this.playbackIndex];
      this.currentFrame = frame;
      for (const listener of this.listeners) {
        listener(frame);
      }
      this.playbackIndex = (this.playbackIndex + 1) % this.playbackFrames.length;
    }, this.playbackInterval);
  }

  stopPlayback() {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
  }
}

export const simStateBus = new SimStateBus();

export const recordPlaybackFrames = (
  samples: Array<Pick<SimStateFrame, "telemetry" | "state" | "params" | "modelId" | "scenarioId">>,
  dt = 0.05
): SimStateFrame[] =>
  samples.map((sample, index) => ({
    ...sample,
    dt,
    telemetry: {
      ...sample.telemetry,
      t: typeof sample.telemetry.t === "number" ? sample.telemetry.t : index * dt,
    },
  }));

export type SimStateSubscription = ReturnType<typeof simStateBus.subscribe>;
