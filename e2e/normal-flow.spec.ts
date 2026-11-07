import { expect, test } from "@playwright/test";

test("complete reduced-motion 2D flow from simulated hold to personal summary", async ({ page }) => {
  await page.goto("/?renderer=2d");
  await page.waitForFunction(() => document.activeElement?.tagName === "H1");
  await page.keyboard.press("d");
  await page.getByLabel("減少動態").check();
  await page.getByRole("button", { name: "關閉演示工具" }).click();
  await expect(page.locator("#stage-root")).toHaveAttribute("data-transition-phase", "idle");

  const hold = page.getByRole("button", { name: "按住提問" });
  await hold.hover();
  await page.mouse.down();
  await page.waitForTimeout(680);
  await page.mouse.up();
  await expect(page.getByText("Why do humans remember childhood?")).toBeVisible();

  await expect(page.getByRole("heading", { name: /Explore distance/u })).toBeVisible({ timeout: 6_000 });
  await page.getByRole("button", { name: "emotion", exact: true }).click();
  await page.getByRole("button", { name: "family", exact: true }).click();
  await page.getByRole("button", { name: "繼續到 Attention" }).click();

  // Station 3: the arrow keys stand in for the rotary encoder.
  await expect(page.locator("#stage-root")).toHaveAttribute("data-transition-phase", "idle", { timeout: 6_000 });
  const next = page.getByRole("button", { name: "帶著重點前進" });
  await expect(next).toBeDisabled();
  await page.locator("body").click({ position: { x: 5, y: 300 } });
  for (let step = 0; step < 4; step += 1) await page.keyboard.press("ArrowRight");
  await expect(page.locator(".attention-shell")).toHaveAttribute("data-attention-complete", "true");
  await expect(page.locator(".attention-arc.is-strongest")).toHaveCount(3);
  await next.click();

  // Station 4: every pump releases one bubble; stopping stops generation.
  await expect(page.getByRole("heading", { name: "答案不是一次寫好的。" })).toBeVisible({ timeout: 6_000 });
  await expect(page.locator("#stage-root")).toHaveAttribute("data-transition-phase", "idle", { timeout: 6_000 });
  const pump = page.getByRole("button", { name: "壓一下" });
  await pump.click();
  await pump.click();
  await expect(page.locator(".generation-shell")).toHaveAttribute("data-pump-appended", "2", { timeout: 3_000 });
  await page.waitForTimeout(600);
  await expect(page.locator(".generation-shell")).toHaveAttribute("data-pump-appended", "2");
  await expect(page.locator(".answer-line")).toContainText("Humans remember");
  await page.locator("body").click({ position: { x: 5, y: 300 } });
  for (let press = 0; press < 30; press += 1) await page.keyboard.press("Space");

  await expect(page.locator(".answer-card")).toContainText(/Humans remember childhood because early experiences/u, { timeout: 10_000 });
  await page.getByRole("button", { name: "查看這次的路徑" }).click();
  await expect(page.getByText("childhood-answer-v1")).toBeVisible();
  await expect(page.locator(".receipt")).toContainText("emotion · family");
  await expect(page.locator(".receipt")).toContainText("childhood—remember");
});
