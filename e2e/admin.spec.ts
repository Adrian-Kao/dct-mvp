import { expect, test } from "@playwright/test";

test("the back office sets a new question that the exhibition then plays", async ({ page }) => {
  await page.goto("/?admin");
  await expect(page.getByRole("heading", { name: "設定這一輪的題目" })).toBeVisible();
  await page.getByLabel(/上一位觀眾的問題/u).fill("AI 會不會取代我的工作？");
  await page.getByLabel(/^答案（/u).fill("有些工作會被改變，但需要判斷和關心別人的工作，AI 很難完全取代。");
  await page.getByRole("button", { name: "自動切字" }).click();
  await expect(page.getByLabel(/問題的切法/u)).toHaveValue("AI |會不會|取代|我的|工作|？");
  await page.getByRole("button", { name: "產生每一站" }).click();
  await expect(page.getByRole("status")).toContainText("每一站都產生好了");
  await expect(page.locator(".admin-chip")).toHaveCount(6);
  await page.getByRole("button", { name: "儲存並套用到展場" }).click();
  await expect(page.getByRole("status")).toContainText("已儲存");

  await page.goto("/?renderer=2d");
  await page.waitForFunction(() => document.activeElement?.tagName === "H1");
  await page.keyboard.press("d");
  await page.getByLabel("減少動態").check();
  await page.getByLabel("場景").selectOption("tokenization");
  await page.getByRole("button", { name: "跳至所選場景" }).click();
  await expect(page.locator(".slice-sentence")).toHaveAttribute("aria-label", "AI 會不會取代我的工作？");
  const shell = page.locator(".tokenization-shell");
  await expect(page.locator("#stage-root")).toHaveAttribute("data-transition-phase", "idle", { timeout: 6_000 });
  for (let swing = 0; swing < 5; swing += 1) await page.keyboard.press("Space");
  await expect(shell).toHaveAttribute("data-slice-complete", "true");
  await expect(page.locator(".token-chip")).toHaveCount(6);

  // Restoring the default brings the original question back.
  await page.goto("/?admin");
  await page.getByRole("button", { name: "恢復預設題目" }).click();
  await page.goto("/?renderer=2d");
  await page.waitForFunction(() => document.activeElement?.tagName === "H1");
  await page.keyboard.press("d");
  await page.getByLabel("場景").selectOption("tokenization");
  await page.getByRole("button", { name: "跳至所選場景" }).click();
  await expect(page.locator(".slice-sentence")).toHaveAttribute("aria-label", "為什麼人會想念一個人？");
});
