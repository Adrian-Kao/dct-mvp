import { expect, test } from "@playwright/test";

test("safe downstream fixture and reset", async ({ page }) => {
  await page.goto("/?renderer=2d");
  await page.waitForFunction(() => document.activeElement?.tagName === "H1");
  await page.keyboard.press("d");
  await page.getByLabel("場景").selectOption("output");
  await page.getByRole("button", { name: "跳至所選場景" }).click();
  await expect(page.getByText(/Humans remember childhood because early experiences/u)).toBeVisible();
  await page.keyboard.press("d");
  await page.getByRole("button", { name: "重新開始" }).click();
  await expect(page.getByRole("button", { name: "按住提問" })).toBeVisible();
});
