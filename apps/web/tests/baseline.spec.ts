import { expect, test } from "@playwright/test";

import { bootModels } from "@/lib/models";
import { runBaseline } from "@/lib/validation/baseline";

bootModels();

test("unicycle baseline stays within tolerance", () => {
  const result = runBaseline("unicycle", {});
  expect(result).not.toBeNull();
  expect(result?.status).toBe("pass");
  expect(result?.metrics.rmsRadiusError).toBeLessThan(0.5);
});

test("lin2dof baseline holds steady response", () => {
  const defaultRun = runBaseline("lin2dof", {});
  expect(defaultRun).not.toBeNull();
  expect(defaultRun?.status).toBe("pass");
  expect(defaultRun?.metrics.steadyYawRate ?? 0).toBeGreaterThan(0.05);
  const fineRun = runBaseline("lin2dof", { dt: 0.005 });
  expect(fineRun).not.toBeNull();
  expect(fineRun?.status).toBe("pass");
  const delta = Math.abs((fineRun?.metrics.steadyYawRate ?? 0) - (defaultRun?.metrics.steadyYawRate ?? 0));
  expect(delta).toBeLessThan(0.02);
});

