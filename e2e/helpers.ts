import { expect, type Page } from "@playwright/test";

/** Spin the station 2 star field with the arrow key until the asked-for token is in the aiming band, then lock it. */
export async function lockNextVectorToken(page: Page) {
  const shell = page.locator(".vector-shell");
  const before = Number(await shell.getAttribute("data-vector-locked"));
  for (let turn = 0; turn < 80; turn += 1) {
    if ((await shell.getAttribute("data-vector-aligned")) === "true") break;
    await page.keyboard.press("ArrowRight");
  }
  await expect(shell).toHaveAttribute("data-vector-aligned", "true");
  await page.getByRole("button", { name: "鎖定", exact: true }).click();
  await expect(shell).toHaveAttribute("data-vector-locked", String(before + 1));
}

/** Station 1: swing the keyboard "blade" until the sentence is cut into all its tokens. */
export async function sliceSentence(page: Page) {
  const shell = page.locator(".tokenization-shell");
  await expect(shell).toBeVisible();
  await expect(page.locator("#stage-root")).toHaveAttribute("data-transition-phase", "idle", { timeout: 6_000 });
  for (let swing = 0; swing < 6; swing += 1) {
    await page.keyboard.press("Space");
    await expect(shell).toHaveAttribute("data-slice-cuts", String(swing + 1));
  }
  await expect(shell).toHaveAttribute("data-slice-complete", "true");
}
