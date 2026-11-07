import { expect, test, type Page } from "@playwright/test";
import { sliceSentence } from "./helpers";

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
  await sliceSentence(page);
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
