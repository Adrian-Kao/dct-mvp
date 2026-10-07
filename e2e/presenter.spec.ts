import { expect, test } from "@playwright/test";

test("safe downstream fixture and reset", async ({ page }) => {
  await page.goto("/?renderer=2d");
  await page.keyboard.press("d");
  await page.getByLabel("場景").selectOption("output");
  await page.getByLabel("安全預設路線").selectOption("identity");
  await page.getByRole("button", { name: "跳至所選場景" }).click();
  await expect(page.getByText(/shared stories can become part/u)).toBeVisible();
  await page.keyboard.press("d");
  await page.getByRole("button", { name: "重新開始" }).click();
  await expect(page.getByRole("button", { name: "按住提問" })).toBeVisible();
});
