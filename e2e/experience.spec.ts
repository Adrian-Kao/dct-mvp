import { expect, test } from "@playwright/test";

test("presenter jump to Attention still requires turning the dial and pumping before the summary", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/?renderer=2d");
  await page.waitForFunction(() => document.activeElement?.tagName === "H1");
  await page.keyboard.press("d");
  await page.getByLabel("場景").selectOption("attention");
  await page.getByLabel("減少動態").check();
  await page.getByRole("button", { name: "跳至所選場景" }).click();
  await expect(page.locator("#stage-root")).toHaveAttribute("data-transition-phase", "idle", { timeout: 6_000 });
  for (const name of ["humans", "remember", "childhood"]) {
    await page.locator(".attention-tokens").getByRole("radio", { name: new RegExp(`^${name}`, "u") }).click();
  }
  await page.getByRole("button", { name: "轉盤往左一格" }).click();
  await expect(page.locator(".attention-dial figcaption strong")).toHaveText("remember");
  await page.getByRole("button", { name: "帶著重點前進" }).click();
  await expect(page.locator("#stage-root")).toHaveAttribute("data-transition-phase", "idle", { timeout: 6_000 });
  const pump = page.getByRole("button", { name: "壓一下" });
  for (let press = 0; press < 24; press += 1) await pump.click();
  await expect(pump).toBeDisabled({ timeout: 5_000 });
  await expect(page.locator(".answer-card")).toBeVisible({ timeout: 8_000 });
  await page.getByRole("button", { name: "查看這次的路徑" }).click();
  await expect(page.getByText("childhood-answer-v1")).toBeVisible();
  expect(errors).toEqual([]);
});
