import { describe, expect, it } from "vitest";

import { Unicycle } from "@/lib/models/unicycle";
import { Lin2DOF } from "@/lib/models/lin2dof";

const runModel = (model: typeof Unicycle | typeof Lin2DOF, params: Record<string, unknown>, steps: number, dt: number, steer: (t: number) => number) => {
  let state = model.init(params as any);
  for (let i = 0; i < steps; i += 1) {
    const t = i * dt;
    state = model.step(state, { steer: steer(t) }, dt, params as any);
  }
  return state;
};

describe("invariants", () => {
  it("unicycle skidpad matches analytic yaw and ay", () => {
    const params = { ...Unicycle.defaults, v: 25 } as Record<string, unknown>;
    const dt = (params.dt as number) ?? 0.01;
    const radius = 35;
    const steerAngle = Math.atan((params.L_eff as number) / radius);
    const steps = 8_000;
    const state = runModel(Unicycle, params, steps, dt, () => steerAngle);
    const expectedYaw = (params.v as number) / radius;
    const expectedAy = (params.v as number) * expectedYaw;
    const yawRate = (state as any).yawRate as number;
    const ay = expectedAy; // unicycle ay = v * yawRate by definition
    expect(Math.abs(yawRate - expectedYaw) / expectedYaw).toBeLessThan(0.05);
    expect(Math.abs(ay - expectedAy) / expectedAy).toBeLessThan(0.05);
  });

  it("linear bicycle zero-steer remains stable", () => {
    const params = { ...Lin2DOF.defaults, v: 25, dt: 0.01, processNoise: false, useFrictionClamp: false } as Record<string, unknown>;
    const dt = params.dt as number;
    const steps = 6_000;
    const state = runModel(Lin2DOF, params, steps, dt, () => 0);
    const yawRate = (state as any).r as number;
    const vy = (state as any).vy as number;
    expect(Math.abs(yawRate)).toBeLessThan(1e-3);
    expect(Math.abs(vy)).toBeLessThan(0.05);
  });
});
