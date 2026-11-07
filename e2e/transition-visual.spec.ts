import { expect, test, type Page } from "@playwright/test";
import { sliceSentence } from "./helpers";

const evidenceRoot = "artifacts/integrated-upgrade/legacy-regression";

async function capturePhase(page: Page, phase: string, filename: string, delayMs = 0) {
  const stage = page.locator("#stage-root");
  await expect(stage).toHaveAttribute("data-transition-phase", phase, { timeout: 10_000 });
  if (delayMs > 0) await page.waitForTimeout(delayMs);
  expect(await stage.getAttribute("data-transition-phase")).toBe(phase);
  await page.screenshot({ path: `${evidenceRoot}/${filename}`, animations: "allow" });
}

async function openPresenterScene(page: Page, scene: string) {
  await page.keyboard.press("d");
  await page.getByLabel("場景").selectOption(scene);
  await page.getByRole("button", { name: "跳至所選場景" }).click();
}

async function startPhaseLog(page: Page) {
  await page.evaluate(() => {
    const stage = document.querySelector("#stage-root");
    if (!stage) throw new Error("stageRoot is unavailable");
    const values: string[] = [stage.getAttribute("data-transition-phase") ?? "missing"];
    (window as typeof window & { __phaseLog?: string[] }).__phaseLog = values;
    const coreOffsets: Array<{ x: number; y: number }> = [];
    (window as typeof window & { __coreOffsets?: Array<{ x: number; y: number }> }).__coreOffsets = coreOffsets;
    const exitMaxNormalizedX = [0];
    (window as typeof window & { __exitMaxNormalizedX?: number[] }).__exitMaxNormalizedX = exitMaxNormalizedX;
    const phaseScenes: Array<{ phase: string; heading: string }> = [];
    (window as typeof window & { __phaseScenes?: Array<{ phase: string; heading: string }> }).__phaseScenes = phaseScenes;
    const observer = new MutationObserver(() => {
      const value = stage.getAttribute("data-transition-phase") ?? "missing";
      if (values.at(-1) !== value) values.push(value);
      phaseScenes.push({ phase: value, heading: document.querySelector(".scene-heading h1")?.textContent ?? "" });
      if (value === "coreReady") {
        const orb = document.querySelector<HTMLElement>("[data-testid='transfer-orb']");
        if (!orb) return;
        const stageRect = stage.getBoundingClientRect();
        const orbRect = orb.getBoundingClientRect();
        coreOffsets.push({
          x: orbRect.left + orbRect.width / 2 - (stageRect.left + stageRect.width / 2),
          y: orbRect.top + orbRect.height / 2 - (stageRect.top + stageRect.height / 2),
        });
      }
      if (value === "exiting") {
        const sampleExit = () => {
          if (stage.getAttribute("data-transition-phase") !== "exiting") return;
          const orb = document.querySelector<HTMLElement>("[data-testid='transfer-orb']");
          if (orb) {
            const stageRect = stage.getBoundingClientRect();
            const orbRect = orb.getBoundingClientRect();
            const normalizedX = (orbRect.left + orbRect.width / 2 - stageRect.left) / stageRect.width;
            exitMaxNormalizedX[0] = Math.max(exitMaxNormalizedX[0], normalizedX);
          }
          requestAnimationFrame(sampleExit);
        };
        requestAnimationFrame(sampleExit);
      }
    });
    observer.observe(stage, { attributes: true, attributeFilter: ["data-transition-phase"] });
  });
}

async function expectOrderedPhases(page: Page, expected: string[]) {
  const values = await page.evaluate(() => (window as typeof window & { __phaseLog?: string[] }).__phaseLog ?? []);
  let cursor = -1;
  for (const phase of expected) {
    const next = values.indexOf(phase, cursor + 1);
    expect(next, `phase ${phase} should follow ${values.join(" → ")}`).toBeGreaterThan(cursor);
    cursor = next;
  }
}

async function expectRecordedCoreAtStageCenter(page: Page) {
  const offsets = await page.evaluate(() => (window as typeof window & { __coreOffsets?: Array<{ x: number; y: number }> }).__coreOffsets ?? []);
  expect(offsets).toHaveLength(1);
  expect(Math.abs(offsets[0].x)).toBeLessThan(4);
  expect(Math.abs(offsets[0].y)).toBeLessThan(4);
}

async function expectRecordedRightExit(page: Page) {
  const maximum = await page.evaluate(() => (window as typeof window & { __exitMaxNormalizedX?: number[] }).__exitMaxNormalizedX?.[0] ?? 0);
  expect(maximum).toBeGreaterThan(1);
}


test("Tokenization converges six local data dots into one central transfer orb before Vector", async ({ page }) => {
  await page.goto("/?renderer=2d");
  await page.waitForFunction(() => document.activeElement?.tagName === "H1");
  await openPresenterScene(page, "tokenization");
  await sliceSentence(page);
  await startPhaseLog(page);

  await expect(page.locator(".token-chip")).toHaveCount(7);
  await page.screenshot({ path: `${evidenceRoot}/token-00-six-cards.png`, animations: "allow" });
  await page.getByRole("button", { name: "帶著編號前往站 2" }).click();
  await capturePhase(page, "converging", "token-02-six-dots-converging.png");
  await expect(page.locator("[data-retained-dot='true']")).toHaveCount(7);
  await expect(page.getByRole("heading", { name: /意思的星空/u })).toBeVisible();
  await expect(page.locator("#stage-root")).toHaveAttribute("data-transition-phase", "idle");
  await expectRecordedCoreAtStageCenter(page);
  await expectRecordedRightExit(page);
  await expectOrderedPhases(page, ["locking", "compacting", "converging", "coreReady", "exiting", "blackSwap", "blackHold", "enteringCore", "centerHold", "expanding", "idle"]);
});
