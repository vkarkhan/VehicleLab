import { expect, test } from "@playwright/test";

import { bootModels } from "@/lib/models";
import { getModel } from "@/lib/sim/registry";

bootModels();

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
