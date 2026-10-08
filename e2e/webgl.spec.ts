import { expect, test } from "@playwright/test";

test("WebGL mode keeps one canvas and renders the prediction influx locally", async ({ page }, testInfo) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname !== "127.0.0.1") externalRequests.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.getByText("本機互動演示")).toBeVisible();
  await page.keyboard.press("d");
  await page.getByLabel("場景").selectOption("prediction");
  await page.getByLabel("安全預設路線").selectOption("emotion");
  await page.getByRole("button", { name: "跳至所選場景" }).click();
  await expect(page.getByRole("button", { name: /emotional/u })).toBeEnabled({ timeout: 9_000 });
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath("prediction-webgl-1366x768.png"), fullPage: true });
  await page.getByRole("button", { name: /emotional/u }).click();
  await expect(page.locator("#stage-root")).toHaveAttribute("data-transition-phase", "converging", { timeout: 5_000 });
  await page.screenshot({ path: "artifacts/integrated-upgrade/legacy-regression/prediction-webgl-converging.png", animations: "allow" });
  await expect(page.getByRole("button", { name: /experiences/u })).toBeEnabled({ timeout: 8_000 });
  await expect(page.locator("canvas")).toHaveCount(1);
  expect(externalRequests).toEqual([]);
});
