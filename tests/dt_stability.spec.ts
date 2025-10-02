import { describe, expect, it } from "vitest";

import { Lin2DOF } from "@/lib/models/lin2dof";

const simulateStep = (dt: number) => {
  const params = {
    ...Lin2DOF.defaults,
    dt,
    processNoise: false,
    useFrictionClamp: false,
    v: 22,
  } as Record<string, unknown>;

  let state = Lin2DOF.init(params as any);
  const totalTime = 6;
  const steps = Math.floor(totalTime / dt);
  for (let i = 0; i < steps; i += 1) {
    state = Lin2DOF.step(state, { steer: i * dt >= 1 ? 5 * (Math.PI / 180) : 0 }, dt, params as any);
  }
  return {
    yawRate: (state as any).r as number,
    vy: (state as any).vy as number,
  };
};

describe("dt stability", () => {
  it("step-steer response stays consistent across dt scaling", () => {
    const baseline = simulateStep(0.01);
    const fine = simulateStep(0.005);
    const coarse = simulateStep(0.02);

    const compare = (value: number, reference: number) => Math.abs(value - reference) / Math.max(Math.abs(reference), 1e-6);

    expect(compare(fine.yawRate, baseline.yawRate)).toBeLessThan(0.02);
    expect(compare(coarse.yawRate, baseline.yawRate)).toBeLessThan(0.05);
    expect(compare(fine.vy, baseline.vy)).toBeLessThan(0.03);
    expect(compare(coarse.vy, baseline.vy)).toBeLessThan(0.06);
  });
});
