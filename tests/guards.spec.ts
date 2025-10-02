import { describe, expect, it } from "vitest";

import { enforceDtBounds } from "@/lib/vehicle/dtGuards";
import { clampLateralForces } from "@/lib/vehicle/frictionClamp";
import { computeSlipAngles } from "@/lib/vehicle/slipAndForces";
import { assertConventions } from "@/lib/vehicle/conventions";
import { createVehicleParams } from "@/lib/vehicle/params";

describe("guards", () => {
  it("dt guard clamps values outside the stable range", () => {
    const high = enforceDtBounds("lin2dof", 0.08);
    const low = enforceDtBounds("lin2dof", 0.0005);
    expect(high.clamped).toBe(true);
    expect(low.clamped).toBe(true);
    expect(high.dt).toBeLessThanOrEqual(0.02);
    expect(low.dt).toBeGreaterThanOrEqual(0.002);
  });

  it("friction clamp binds lateral forces to \u03bc Fz", () => {
    const params = createVehicleParams({
      m: 1500,
      Iz: 2250,
      a: 1.2,
      b: 1.6,
      Cf: 80000,
      Cr: 80000,
      mu: 0.9,
    });
    const result = clampLateralForces({
      FyFront: 50000,
      FyRear: 50000,
      params,
    });
    expect(Math.abs(result.front)).toBeLessThanOrEqual(params.mu * params.m * params.g);
    expect(result.limitFlags.front).toBe(true);
  });

  it("slip angle signs follow conventions", () => {
    const angles = computeSlipAngles({
      vy: 0.5,
      r: 0.2,
      vx: 20,
      a: 1.2,
      b: 1.6,
      steer: 5 * (Math.PI / 180),
    });
    expect(angles.front).toBeGreaterThan(0);
    expect(angles.rear).toBeLessThan(0);
  });

  it("convention assertion passes for default axes", () => {
    expect(() => assertConventions()).not.toThrow();
    expect(() => assertConventions({ yawPositive: "ccw" })).not.toThrow();
    expect(() => assertConventions({ yawPositive: "cw" as any })).toThrow();
  });
});
