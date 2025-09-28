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
