import { expect, test } from "@playwright/test";

// Chromium's fake camera shows a test pattern, not a face: this checks that the camera opens,
// the face model loads offline and the scene asks the visitor to face the camera.
test.use({
  launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
  permissions: ["camera"],
});

test("opens the camera, loads the local face model and waits for a face", async ({ page }) => {
  const external: string[] = [];
  page.on("requestfinished", (request) => { if (!request.url().startsWith("http://127.0.0.1")) external.push(request.url()); });
  const blocked: string[] = [];
  page.on("console", (message) => { if (/Content Security Policy/u.test(message.text())) blocked.push(message.text()); });
  await page.goto("/?renderer=2d");
  await page.waitForFunction(() => document.activeElement?.tagName === "H1");
  await expect(page.locator("#stage-root")).toHaveAttribute("data-transition-phase", "idle");
  await page.getByRole("button", { name: "開始掃描" }).click();
  await expect(page.locator("[data-input-phase]")).toHaveAttribute("data-input-phase", "scanning", { timeout: 20_000 });
  await expect(page.getByText("請正對鏡頭，站在地上的腳印上。")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "找不到臉？改用預設影像" }).click();
  await expect(page.getByText("掃描完成。你現在是一個語言模型。")).toBeVisible({ timeout: 6_000 });
  expect(external).toEqual([]); // nothing leaves the machine
  // The face library tries to send a usage log to Google; the page policy refuses it.
  for (const message of blocked) expect(message).toMatch(/googleapis/u);
});
