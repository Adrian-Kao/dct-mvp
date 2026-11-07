import { expect, test } from "@playwright/test";

test("black title cards open and close each station and hold the next station until dismissed", async ({ page }) => {
  await page.goto("/?renderer=2d&cards=on");
  const card = page.locator(".station-card");
  await expect(card).toHaveAttribute("data-station-card", "intro", { timeout: 6_000 });
  await expect(card).toContainText("站 0 / 5 · 入口");
  await expect(card.locator(".card-progress li.is-current")).toHaveText("入口");
  // Presses in the first half second are ignored so a held key can't skip it by accident.
  await page.waitForTimeout(700);
  await page.keyboard.press("Space");
  await expect(card).toHaveCount(0, { timeout: 3_000 });

  await page.getByRole("button", { name: "不掃描、用預設影像" }).click();
  await page.getByRole("button", { name: /點選彈珠/ }).click({ timeout: 10_000 });
  await expect(card).toHaveAttribute("data-station-card", "outro", { timeout: 6_000 });
  await expect(card).toContainText("站 0 完成");
  await expect(card).toContainText("你的模型編號是");
  await expect(page.locator(".input-shell")).toBeVisible();
  await page.waitForTimeout(700);
  await card.click();
  await expect(card).toHaveAttribute("data-station-card", "intro", { timeout: 8_000 });
  await expect(card).toContainText("站 1 / 5 · 切字");
  await expect(page.locator(".tokenization-shell")).toBeVisible();
  // Cards leave on their own too.
  await expect(card).toHaveCount(0, { timeout: 12_000 });
});
