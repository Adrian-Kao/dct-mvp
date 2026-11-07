import { expect, test } from "@playwright/test";
import { lockNextVectorToken, sliceSentence } from "./helpers";

test("complete reduced-motion 2D flow from entrance scan to personal summary", async ({ page }) => {
  await page.goto("/?renderer=2d");
  await page.waitForFunction(() => document.activeElement?.tagName === "H1");
  await page.keyboard.press("d");
  await page.getByLabel("減少動態").check();
  await page.getByRole("button", { name: "關閉演示工具" }).click();
  await expect(page.locator("#stage-root")).toHaveAttribute("data-transition-phase", "idle");
  await expect(page.getByLabel("站 0 · 入口 任務")).toContainText("你就是 AI");
  await expect(page.getByText("站到鏡頭前。")).toBeVisible();
  await expect(page.locator(".progress-band")).not.toHaveClass(/is-lit/u);

  // Station 0: skip the camera, the default face is scanned, then the sealed marble appears.
  await page.getByRole("button", { name: "不掃描、用預設影像" }).click();
  await expect(page.getByText("掃描完成。你現在是一個語言模型。")).toBeVisible({ timeout: 4_000 });
  await expect(page.locator(".model-number")).toContainText("MODEL #");
  await expect(page.locator(".progress-band")).toHaveClass(/is-lit/u);
  const marble = page.getByRole("button", { name: /彈珠 token/u });
  await expect(marble).toBeVisible({ timeout: 4_000 });
  await expect(page.getByText("有人問了一個問題。")).toBeVisible();
  await expect(page.getByText("為什麼人會想念一個人？")).toHaveCount(0); // sealed until station 1
  await marble.click();
  await expect(page.getByText("為什麼人會想念一個人？")).toBeVisible({ timeout: 6_000 });
  await expect(page.locator(".progress-avatar")).toBeVisible();
  await expect(page.locator(".progress-band")).toHaveAttribute("data-progress-station", "tokenization");

  // Station 1: slash the sentence; it only splits at the tokenizer's cut points.
  const toStation2 = page.getByRole("button", { name: /還有 6 刀/u });
  await expect(toStation2).toBeDisabled();
  await sliceSentence(page);
  await expect(page.locator(".token-chip")).toHaveCount(7);
  await expect(page.getByLabel("「想念」→ 編號 117215")).toBeVisible();
  await page.getByRole("button", { name: "帶著編號前往站 2" }).click();

  // Station 2: arrow keys turn the star field; the lock only works inside the aiming band.
  await expect(page.getByRole("heading", { name: /意思的星空/u })).toBeVisible({ timeout: 6_000 });
  await expect(page.locator("#stage-root")).toHaveAttribute("data-transition-phase", "idle", { timeout: 6_000 });
  const toStation3 = page.getByRole("button", { name: /前往站 3|才能前進/u });
  await expect(toStation3).toBeDisabled();
  await lockNextVectorToken(page);
  await expect(page.locator(".star-word.is-near")).toHaveCount(3);
  await expect(page.locator(".mission-learned")).toContainText("「意思」就是「距離」");
  await lockNextVectorToken(page);
  await page.getByRole("button", { name: "帶著星座前往站 3" }).click();

  // Station 3: the arrow keys stand in for the rotary encoder.
  await expect(page.locator(".attention-shell")).toBeVisible({ timeout: 6_000 });
  await expect(page.locator("#stage-root")).toHaveAttribute("data-transition-phase", "idle", { timeout: 6_000 });
  const next = page.getByRole("button", { name: "帶著重點前進" });
  await expect(next).toBeDisabled();
  for (let step = 0; step < 5; step += 1) await page.keyboard.press("ArrowRight");
  await expect(page.locator(".attention-shell")).toHaveAttribute("data-attention-complete", "true");
  await expect(page.getByRole("region", { name: "你的發現" })).toContainText("想念→人 34%");
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
  await expect(page.locator(".answer-line")).toContainText("想念一個");
  await page.locator("body").click({ position: { x: 5, y: 300 } });
  for (let press = 0; press < 50; press += 1) await page.keyboard.press("Space");

  await expect(page.locator(".answer-card")).toContainText(/想念一個人，是因為/u, { timeout: 10_000 });
  await expect(page.locator(".clue-legend")).toContainText("記憶（←想念）");
  await expect(page.locator(".answer-card mark.clue-word").first()).toBeVisible();
  await expect(page.locator(".mission-learned")).toContainText("生成答案，不等於理解答案");
  await page.getByRole("button", { name: "查看這次的路徑" }).click();
  await expect(page.getByText("missing-someone-answer-v1")).toBeVisible();
  await expect(page.locator(".receipt")).toContainText("想念 · 人");
  await expect(page.locator(".receipt")).toContainText("人—想念");
});
