import { expect, test } from "@playwright/test";

test("sandbox exposes the Bicycle Lab controls", async ({ page }) => {
  await page.goto("/sim");

  await expect(page.getByRole("heading", { name: /2-DOF Linear Bicycle Model Lab/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset" })).toBeVisible();
  await expect(page.getByText(/Model parameters/i)).toBeVisible();
  await expect(page.getByText(/Telemetry/i)).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
});
