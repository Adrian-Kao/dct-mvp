import { expect, test } from "@playwright/test";
import { lockNextVectorToken, spinAllRounds } from "./helpers";

test("presenter jump to the star field still requires locking, turning the dial and pumping", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/?renderer=2d");
  await page.waitForFunction(() => document.activeElement?.tagName === "H1");
  await page.keyboard.press("d");
  await page.getByLabel("場景").selectOption("vector");
  await page.getByLabel("減少動態").check();
  await page.getByRole("button", { name: "跳至所選場景" }).click();
  await expect(page.locator("#stage-root")).toHaveAttribute("data-transition-phase", "idle", { timeout: 6_000 });

  // Locking outside the aiming band only shows a hint.
  await page.getByRole("button", { name: "鎖定", exact: true }).click();
  await expect(page.locator(".vector-shell")).toHaveAttribute("data-vector-locked", "0");
  await expect(page.getByRole("status").filter({ hasText: "還沒對準" })).toBeVisible();
  for (let lock = 0; lock < 4; lock += 1) await lockNextVectorToken(page);
  await expect(page.getByRole("button", { name: "鎖定", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "帶著星座前往站 3" }).click();

  await expect(page.locator(".prediction-shell")).toBeVisible({ timeout: 6_000 });
  await spinAllRounds(page);
  await page.getByRole("button", { name: "帶著開頭前往站 4" }).click();
  await expect(page.locator("#stage-root")).toHaveAttribute("data-transition-phase", "idle", { timeout: 6_000 });
  const pump = page.getByRole("button", { name: "壓一下" });
  for (let press = 0; press < 41; press += 1) await pump.click();
  await expect(pump).toBeDisabled({ timeout: 5_000 });
  await expect(page.locator(".answer-card")).toBeVisible({ timeout: 8_000 });
  await page.getByRole("button", { name: "查看這次的路徑" }).click();
  await expect(page.getByText("missing-someone-answer-v1")).toBeVisible();
  expect(errors).toEqual([]);
});
