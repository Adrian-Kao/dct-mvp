import { expect, test, type Page } from "@playwright/test";

const evidence = "artifacts/integrated-upgrade";

async function openScene(page: Page, scene: string, route = "emotion") {
  await page.keyboard.press("d");
  await page.getByLabel("場景").selectOption(scene);
  await page.getByLabel("安全預設路線").selectOption(route);
  await page.getByRole("button", { name: "跳至所選場景" }).click();
}

async function waitPhase(page: Page, phase: string) {
  await page.waitForFunction((value) => document.querySelector("#stage-root")?.getAttribute("data-transition-phase") === value, phase, { polling: "raf", timeout: 12_000 });
}

async function waitPredictionPhase(page: Page, phase: string) {
  await page.waitForFunction((value) => document.querySelector(".prediction-shell")?.classList.contains(`prediction-phase-${value}`), phase, { polling: "raf", timeout: 12_000 });
}

async function frame(page: Page, phase: string, name: string, delay = 0) {
  await waitPhase(page, phase);
  if (delay) await page.waitForTimeout(delay);
  await page.screenshot({ path: `${evidence}/${name}`, animations: "allow" });
}

test("2D Tokenization removes the source sentence and performs black-center-scatter entry", async ({ page }) => {
  await page.goto("/?renderer=2d");
  await openScene(page, "tokenization");
  await waitPhase(page, "idle");
  await expect(page.locator(".tokenization-shell")).toHaveClass(/token-phase-[234]/, { timeout: 4_000 });
  const source = page.locator(".token-question");
  await expect.poll(() => source.evaluate((element) => ({ opacity: getComputedStyle(element).opacity, visibility: getComputedStyle(element).visibility }))).toEqual({ opacity: "0", visibility: "hidden" });
  await expect(page.locator(".token-chip")).toHaveCount(6);
  await page.screenshot({ path: `${evidence}/2d-token-00-six-cards-no-source.png`, animations: "allow" });
  await frame(page, "compacting", "2d-token-01-compact-at-origins.png");
  await frame(page, "converging", "2d-token-02-six-dots-to-center.png");
  await frame(page, "coreReady", "2d-token-03-one-center-core.png");
  await frame(page, "exiting", "2d-token-04-core-leaves-stage.png", 180);
  await frame(page, "blackHold", "2d-token-05-pure-black-hold.png");
  await expect(page.locator(".stage-blackout")).toHaveCSS("background-color", "rgb(0, 0, 0)");
  await frame(page, "enteringCore", "2d-token-06-same-core-enters.png", 170);
  await frame(page, "centerHold", "2d-token-07-core-at-center-only.png");
  await frame(page, "expanding", "2d-token-08-vector-scatter-reveal.png", 220);
  await waitPhase(page, "idle");
  await page.screenshot({ path: `${evidence}/2d-token-09-vector-ready.png`, animations: "allow" });
});

test("Attention SVG endpoints remain aligned after responsive resize", async ({ page }) => {
  await page.goto("/?renderer=2d");
  await openScene(page, "attention");
  await waitPhase(page, "idle");
  const sizes = [
    { width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.waitForTimeout(120);
    const errors = await page.evaluate(() => {
      const map = document.querySelector<HTMLElement>(".attention-map");
      if (!map) return [999];
      const mapRect = map.getBoundingClientRect();
      return Array.from(document.querySelectorAll<SVGLineElement>("[data-attention-line]")).map((line) => {
        const id = line.dataset.attentionLine;
        const button = document.querySelector<HTMLElement>(`[data-transition-id='attention-${id}']`);
        if (!button) return 999;
        const rect = button.getBoundingClientRect();
        const expectedX = rect.left + rect.width / 2 - mapRect.left;
        const expectedY = rect.top + rect.height / 2 - mapRect.top;
        return Math.hypot(Number(line.getAttribute("x2")) - expectedX, Number(line.getAttribute("y2")) - expectedY);
      });
    });
    expect(Math.max(...errors), `${size.width}x${size.height}: ${errors.join(",")}`).toBeLessThanOrEqual(3);
  }
  await page.screenshot({ path: `${evidence}/2d-attention-geometry-1920x1080.png`, animations: "allow" });
});

test("2D Prediction absorption, two black handoffs, and causal Prediction Loop", async ({ page }) => {
  test.setTimeout(55_000);
  await page.goto("/?renderer=2d");
  await openScene(page, "prediction", "emotion");
  await expect(page.getByRole("button", { name: /emotional/u })).toBeEnabled({ timeout: 10_000 });
  await page.screenshot({ path: `${evidence}/2d-prediction-r1-00-absorbed-ready.png`, animations: "allow" });
  await page.getByRole("button", { name: /vivid/u }).click();
  await frame(page, "resolvingChoice", "2d-prediction-r1-01-unselected-outward.png", 260);
  await frame(page, "compacting", "2d-prediction-r1-02-selected-compact.png");
  await expect(page.locator(".candidate.is-dimmed").first()).toHaveCSS("visibility", "hidden");
  await frame(page, "converging", "2d-prediction-r1-03-selected-to-center.png");
  await frame(page, "blackHold", "2d-prediction-r1-04-black-before-round2.png");
  await frame(page, "centerHold", "2d-prediction-r1-05-center-before-round2.png");
  await frame(page, "expanding", "2d-prediction-r1-06-round2-scatter.png", 180);

  await waitPhase(page, "idle");
  await waitPredictionPhase(page, "distribution");
  await page.screenshot({ path: `${evidence}/2d-prediction-r2-00-wave-a.png`, animations: "allow" });
  await page.waitForTimeout(380);
  await page.screenshot({ path: `${evidence}/2d-prediction-r2-01-wave-b.png`, animations: "allow" });
  await page.waitForTimeout(380);
  await page.screenshot({ path: `${evidence}/2d-prediction-r2-02-wave-c-absorb.png`, animations: "allow" });
  await expect(page.getByRole("button", { name: /events/u })).toBeEnabled({ timeout: 8_000 });
  await page.waitForTimeout(1_000);
  expect(await page.locator(".prediction-flow-2d i").evaluateAll((items) => items.every((item) => Number(getComputedStyle(item).opacity) === 0))).toBe(true);
  await page.getByRole("button", { name: /events/u }).click();
  await frame(page, "blackHold", "2d-prediction-r2-03-black-before-loop.png");
  await frame(page, "centerHold", "2d-prediction-r2-04-center-before-loop.png");
  await frame(page, "expanding", "2d-prediction-r2-05-loop-scatter.png", 180);
  await page.evaluate(() => {
    const shell = document.querySelector<HTMLElement>(".generation-shell");
    if (!shell) throw new Error("Generation shell missing during entry");
    const records: Array<{ phase: string; step: string; length: number }> = [];
    (window as typeof window & { __loopRecords?: typeof records }).__loopRecords = records;
    const record = () => records.push({
      phase: shell.dataset.loopPhase ?? "missing",
      step: shell.dataset.loopStep ?? "missing",
      length: document.querySelector<HTMLElement>(".generation-copy:not(.loop-measure)")?.innerText.length ?? 0,
    });
    record();
    new MutationObserver(record).observe(shell, { attributes: true, attributeFilter: ["data-loop-phase", "data-loop-step"] });
  });
  await waitPhase(page, "idle");

  const loop = page.locator(".generation-shell");
  await expect(loop).toHaveAttribute("data-loop-phase", "predict", { timeout: 5_000 });
  await page.screenshot({ path: `${evidence}/2d-loop-00-predict.png`, animations: "allow" });
  await expect(loop).toHaveAttribute("data-loop-phase", "send", { timeout: 5_000 });
  const before = await page.locator(".generation-copy:not(.loop-measure)").innerText();
  await page.screenshot({ path: `${evidence}/2d-loop-01-send.png`, animations: "allow" });
  await expect.poll(async () => (await page.locator(".generation-copy:not(.loop-measure)").innerText()).length, { timeout: 5_000 }).toBeGreaterThan(before.length);
  const after = await page.locator(".generation-copy:not(.loop-measure)").innerText();
  expect(after.length).toBeGreaterThan(before.length);
  await page.screenshot({ path: `${evidence}/2d-loop-02-arrive-append.png`, animations: "allow" });
  await expect.poll(() => page.evaluate(() => ((window as typeof window & { __loopRecords?: Array<{ phase: string }> }).__loopRecords ?? []).some((item) => item.phase === "feedback")), { timeout: 5_000 }).toBe(true);
  await page.screenshot({ path: `${evidence}/2d-loop-03-update-repeat.png`, animations: "allow" });
  await expect(page.locator(".answer-card")).toContainText(/vivid events can connect/u, { timeout: 30_000 });
  await page.screenshot({ path: `${evidence}/2d-loop-04-output-ready.png`, animations: "allow" });
  const records = await page.evaluate(() => (window as typeof window & { __loopRecords?: Array<{ phase: string; step: string; length: number }> }).__loopRecords ?? []);
  const firstStep = records.filter((item) => item.step === "0");
  const order = ["predict", "send", "append", "feedback"].map((phase) => firstStep.findIndex((item) => item.phase === phase));
  expect(order.every((value, index) => value >= 0 && (index === 0 || value > order[index - 1])), JSON.stringify(firstStep)).toBe(true);
  const growth = records.filter((item, index) => index > 0 && item.length > records[index - 1].length);
  expect(growth.every((item) => item.phase === "append"), JSON.stringify(growth)).toBe(true);
  await expect(page.getByText(/Model choose|模型首選|人機比較/u)).toHaveCount(0);
});

test("WebGL Prediction uses one canvas through finite distribution and absorption", async ({ page }) => {
  await page.goto("/");
  await waitPhase(page, "idle");
  const hold = page.getByRole("button", { name: "按住提問" });
  await hold.hover();
  await page.mouse.down();
  await page.waitForTimeout(680);
  await page.mouse.up();
  await frame(page, "blackHold", "webgl-entry-00-pure-black.png");
  await frame(page, "centerHold", "webgl-entry-01-center-only.png");
  await frame(page, "expanding", "webgl-entry-02-scatter-reveal.png", 220);
  await waitPhase(page, "idle");
  await openScene(page, "prediction", "emotion");
  await waitPhase(page, "idle");
  await waitPredictionPhase(page, "distribution");
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.screenshot({ path: `${evidence}/webgl-prediction-00-distribution-a.png`, animations: "allow" });
  await page.waitForTimeout(650);
  await page.screenshot({ path: `${evidence}/webgl-prediction-01-distribution-b.png`, animations: "allow" });
  await expect(page.getByRole("button", { name: /emotional/u })).toBeEnabled({ timeout: 8_000 });
  await page.waitForTimeout(1_000);
  await page.screenshot({ path: `${evidence}/webgl-prediction-02-absorbed-clean.png`, animations: "allow" });
  await expect(page.locator("canvas")).toHaveCount(1);
});
