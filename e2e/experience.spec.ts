import { expect, test } from "@playwright/test";

test("presenter fixture still requires both prediction choices and reaches summary", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/?renderer=2d");
  await page.keyboard.press("d");
  await page.getByLabel("場景").selectOption("prediction");
  await page.getByLabel("安全預設路線").selectOption("emotion");
  await page.getByLabel("減少動態").check();
  await page.getByRole("button", { name: "跳至所選場景" }).click();
  await expect(page.getByRole("button", { name: /emotional/u })).toBeEnabled();
  await page.getByRole("button", { name: /vivid/u }).click();
  await expect(page.getByRole("button", { name: /events/u })).toBeEnabled();
  await page.getByRole("button", { name: /events/u }).click();
  await expect(page.locator(".answer-card")).toBeVisible();
  await expect(page.locator(".answer-card")).toContainText(/vivid events can connect/u);
  await page.getByRole("button", { name: "查看這次的路徑" }).click();
  await expect(page.getByText("emotion:vivid:events")).toBeVisible();
  expect(errors).toEqual([]);
});
