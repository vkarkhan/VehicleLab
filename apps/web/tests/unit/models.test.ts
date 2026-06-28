import { describe, expect, test } from "vitest";

import { bootModels } from "@/lib/models";
import { getModel } from "@/lib/sim/registry";
import { safeSteadyStateSteerAngle } from "@/lib/vehicle/understeer";
import { createVehicleParams } from "@/lib/vehicle/params";

bootModels();

describe("vehicle models", () => {
  test("lin2dof maintains equilibrium with zero steer", () => {
    const model = getModel("lin2dof");
    expect(model).toBeDefined();
    const params = { ...(model?.defaults ?? {}) };
    const dt = 0.01;
    let state = model!.init(params as any);

    for (let i = 0; i < 600; i += 1) {
      state = model!.step(state, { steer: 0 }, dt, params as any);
    }

    expect(Math.abs(state.vy ?? 0)).toBeLessThan(1e-4);
    expect(Math.abs(state.r ?? 0)).toBeLessThan(1e-4);
  });

  test("lin2dof step steer produces finite telemetry", () => {
    const model = getModel("lin2dof");
    expect(model).toBeDefined();
    const params = { ...(model?.defaults ?? {}), processNoise: false };
    let state = model!.init(params as any);

    for (let i = 0; i < 400; i += 1) {
      state = model!.step(state, { steer: (5 * Math.PI) / 180 }, 0.01, params as any);
    }

    const telemetry = model!.outputs(state, params as any);
    expect(Number.isFinite(telemetry.r)).toBe(true);
    expect(Number.isFinite(telemetry.ay)).toBe(true);
    expect(Number.isFinite(telemetry.beta)).toBe(true);
  });

  test("unicycle yaw rate matches curvature", () => {
    const model = getModel("unicycle");
    expect(model).toBeDefined();
    const params = { ...(model?.defaults ?? {}), v: 30, L_eff: 2.6 };
    const steerDeg = 6;
    const steerRad = (steerDeg * Math.PI) / 180;
    const expectedYaw = (params.v as number) * Math.tan(steerRad) / (params.L_eff as number);

    let state = model!.init(params as any);
    state = model!.step(state, { steer: steerRad }, 0.01, params as any);

    expect(Math.abs((state as any).yawRate - expectedYaw)).toBeLessThan(1e-3);
  });

  test("steady-state steer helper returns null for invalid radius", () => {
    const params = createVehicleParams({
      m: 1500,
      Iz: 2250,
      a: 1.2,
      b: 1.6,
      Cf: 80000,
      Cr: 80000,
      mu: 1,
      track: 1.6,
      hCg: 0.55,
    });

    expect(safeSteadyStateSteerAngle(25, 0, params)).toBeNull();
    expect(safeSteadyStateSteerAngle(25, Number.NaN, params)).toBeNull();
    expect(safeSteadyStateSteerAngle(25, -50, params)).not.toBeNull();
  });
});
