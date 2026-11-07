import { expect, test } from "@playwright/test";

test("safe downstream fixture and reset", async ({ page }) => {
  await page.goto("/?renderer=2d");
  await page.waitForFunction(() => document.activeElement?.tagName === "H1");
  await page.keyboard.press("d");
  await page.getByLabel("場景").selectOption("output");
  await page.getByRole("button", { name: "跳至所選場景" }).click();
  await expect(page.getByText(/想念一個人，是因為他曾經是你生活的一部分/u)).toBeVisible();
  await page.keyboard.press("d");
  await page.getByRole("button", { name: "重新開始" }).click();
  await expect(page.getByRole("button", { name: "不掃描、用預設影像" })).toBeVisible();
  await expect(page.locator(".progress-avatar")).toHaveCount(0); // the virtual image is gone after a reset
});
