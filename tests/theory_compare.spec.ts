import { describe, expect, it } from "vitest";

import {
  runStepSteerRun,
  runFrequencyRun,
} from "@/lib/scenarios/canonical";

describe("theory comparisons", () => {
  it("step-steer metrics meet tolerances", () => {
    const result = runStepSteerRun({
      speed: 20,
      delta: 4 * (Math.PI / 180),
      duration: 8,
      modelId: "lin2dof",
      modelParams: {
        ...{
          m: 1500,
          Iz: 2250,
          a: 1.2,
          b: 1.6,
          Cf: 80000,
          Cr: 80000,
          v: 20,
          mu: 1,
          trackWidth: 1.6,
          hCg: 0.55,
        },
      },
    });

    expect(result.grades.finalYaw).toBe(true);
    expect(result.grades.settling).toBe(true);
    expect(result.grades.overshoot).toBe(true);
  });

  it("frequency response metrics meet tolerances", () => {
    const result = runFrequencyRun({
      speed: 18,
      freqs: [0.5, 0.8, 1.2],
      amplitude: 3 * (Math.PI / 180),
      modelId: "lin2dof",
      modelParams: {
        m: 1500,
        Iz: 2250,
        a: 1.2,
        b: 1.6,
        Cf: 80000,
        Cr: 80000,
        v: 18,
        mu: 1,
        trackWidth: 1.6,
        hCg: 0.55,
      },
    });

    expect(result.grades.dcGain).toBe(true);
    expect(result.grades.peakFrequency).toBe(true);
    expect(result.grades.magnitudeRms).toBe(true);
  });
});
