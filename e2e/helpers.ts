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
