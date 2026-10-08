import { expect, test } from "@playwright/test";

test("complete reduced-motion 2D flow from simulated hold to personal summary", async ({ page }) => {
  await page.goto("/?renderer=2d");
  await page.keyboard.press("d");
  await page.getByLabel("減少動態").check();
  await page.getByRole("button", { name: "關閉演示工具" }).click();
  await expect(page.locator("#stage-root")).toHaveAttribute("data-transition-phase", "idle");

  const hold = page.getByRole("button", { name: "按住提問" });
  await hold.hover();
  await page.mouse.down();
  await page.waitForTimeout(680);
  await page.mouse.up();
  await expect(page.getByText("Why do humans remember childhood?")).toBeVisible();

  await expect(page.getByRole("heading", { name: /Explore distance/u })).toBeVisible({ timeout: 6_000 });
  await page.getByRole("button", { name: "emotion", exact: true }).click();
  await page.getByRole("button", { name: "family", exact: true }).click();
  await page.getByRole("button", { name: "繼續到 Attention" }).click();

  await page.getByRole("radio", { name: /emotion/u }).click();
  await page.locator(".secondary-control").getByRole("button", { name: "family", exact: true }).click();
  await page.getByRole("button", { name: "讓資訊繼續前進" }).click();

  await expect(page.getByRole("button", { name: /emotional/u })).toBeEnabled({ timeout: 6_000 });
  await page.getByRole("button", { name: /emotional/u }).click();
  await expect(page.getByRole("button", { name: /experiences/u })).toBeEnabled({ timeout: 6_000 });
  await page.getByRole("button", { name: /experiences/u }).focus();
  await page.keyboard.press("Enter");

  await expect(page.locator(".answer-card")).toContainText(/emotional experiences can connect/u, { timeout: 10_000 });
  await page.getByRole("button", { name: "查看這次的路徑" }).click();
  await expect(page.getByText("emotion:emotional:experiences")).toBeVisible();
  await expect(page.locator(".receipt")).toContainText("emotion · family");
});
