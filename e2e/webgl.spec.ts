import { expect, test } from "@playwright/test";

test("WebGL mode keeps one canvas through the star field, the wheel and the pump", async ({ page }, testInfo) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname !== "127.0.0.1") externalRequests.push(request.url());
  });
  await page.goto("/");
  await page.waitForFunction(() => document.activeElement?.tagName === "H1");
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.keyboard.press("d");
  await page.getByLabel("場景").selectOption("vector");
  await page.getByRole("button", { name: "跳至所選場景" }).click();
  await expect(page.locator("#stage-root")).toHaveAttribute("data-transition-phase", "idle", { timeout: 9_000 });
  await expect(page.locator(".star-word")).toHaveCount(121);
  await page.screenshot({ path: testInfo.outputPath("vector-webgl-1366x768.png") });
  await page.keyboard.press("d");
  await page.getByLabel("場景").selectOption("attention");
  await page.getByRole("button", { name: "跳至所選場景" }).click();
  await expect(page.locator("#stage-root")).toHaveAttribute("data-transition-phase", "idle", { timeout: 9_000 });
  await page.screenshot({ path: testInfo.outputPath("prediction-webgl-1366x768.png") });
  await page.keyboard.press("d");
  await page.getByLabel("場景").selectOption("generation");
  await page.getByRole("button", { name: "跳至所選場景" }).click();
  await expect(page.locator("#stage-root")).toHaveAttribute("data-transition-phase", "idle", { timeout: 9_000 });
  await page.getByRole("button", { name: "壓一下" }).click();
  await expect(page.locator(".pump-bubble")).toHaveCount(1);
  await expect(page.locator("canvas")).toHaveCount(1);
  expect(externalRequests).toEqual([]);
});
