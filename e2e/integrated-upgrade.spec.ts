import { expect, test, type Page } from "@playwright/test";

const evidence = "artifacts/integrated-upgrade";

async function openScene(page: Page, scene: string) {
  await page.keyboard.press("d");
  await page.getByLabel("場景").selectOption(scene);
  await page.getByRole("button", { name: "跳至所選場景" }).click();
}

async function waitPhase(page: Page, phase: string) {
  await page.waitForFunction((value) => document.querySelector("#stage-root")?.getAttribute("data-transition-phase") === value, phase, { polling: "raf", timeout: 12_000 });
}

async function frame(page: Page, phase: string, name: string, delay = 0) {
  await waitPhase(page, phase);
  if (delay) await page.waitForTimeout(delay);
  await page.screenshot({ path: `${evidence}/${name}`, animations: "allow" });
}

test("2D Tokenization removes the source sentence and performs black-center-scatter entry", async ({ page }) => {
  await page.goto("/?renderer=2d");
  await page.waitForFunction(() => document.activeElement?.tagName === "H1");
  await openScene(page, "tokenization");
  await waitPhase(page, "idle");
  await expect(page.locator(".tokenization-shell")).toHaveClass(/token-phase-[234]/, { timeout: 4_000 });
  const source = page.locator(".token-question");
  await expect.poll(() => source.evaluate((element) => ({ opacity: getComputedStyle(element).opacity, visibility: getComputedStyle(element).visibility }))).toEqual({ opacity: "0", visibility: "hidden" });
  await expect(page.locator(".token-chip")).toHaveCount(7);
  await page.screenshot({ path: `${evidence}/2d-token-00-six-cards-no-source.png`, animations: "allow" });
  await page.getByRole("button", { name: "帶著編號前往站 2" }).click();
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

test("Attention dial arcs stay anchored on the token chips after responsive resize", async ({ page }) => {
  await page.goto("/?renderer=2d");
  await page.waitForFunction(() => document.activeElement?.tagName === "H1");
  await openScene(page, "attention");
  await waitPhase(page, "idle");
  const sizes = [
    { width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.waitForTimeout(160);
    const errors = await page.evaluate(() => {
      const row = document.querySelector<HTMLElement>(".attention-row");
      if (!row) return [999];
      const rowRect = row.getBoundingClientRect();
      return Array.from(document.querySelectorAll<SVGPathElement>("[data-attention-link]")).map((path) => {
        const [fromId, toId] = (path.dataset.attentionLink ?? "").split("-");
        const match = /M ([\d.]+) ([\d.]+) Q [\d.-]+ [\d.-]+ ([\d.]+) ([\d.]+)/u.exec(path.getAttribute("d") ?? "");
        const from = document.querySelector<HTMLElement>(`[data-transition-id='attention-${fromId}']`)?.getBoundingClientRect();
        const to = document.querySelector<HTMLElement>(`[data-transition-id='attention-${toId}']`)?.getBoundingClientRect();
        if (!match || !from || !to) return 999;
        const [, x1, y1, x2, y2] = match.map(Number);
        return Math.max(
          Math.hypot(x1 - (from.left + from.width / 2 - rowRect.left), y1 - (from.top - rowRect.top)),
          Math.hypot(x2 - (to.left + to.width / 2 - rowRect.left), y2 - (to.top - rowRect.top)),
        );
      });
    });
    expect(errors.length, `${size.width}x${size.height} arc count`).toBe(6);
    expect(Math.max(...errors), `${size.width}x${size.height}: ${errors.join(",")}`).toBeLessThanOrEqual(3);
  }
});
