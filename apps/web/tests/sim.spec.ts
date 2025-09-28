import { expect, test } from "@playwright/test";

test("sandbox emits telemetry", async ({ page }) => {
  await page.goto("/sim");

  const runButton = page.getByRole("button", { name: "Run" });
  await expect(runButton).toBeVisible();

  const sampleCount = page.locator("[data-test=\"telemetry-sample-count\"]");
  await expect(sampleCount).toHaveText(/0 samples/i);

  await runButton.click();

  await expect.poll(async () => {
    const text = await sampleCount.textContent();
    return text?.trim() ?? "";
  }, { timeout: 6000 }).not.toMatch(/^0\s*samples/i);

  await expect(page.locator("canvas")).toBeVisible();
});
