import { expect, test } from "@playwright/test";

test("following the arrow guide reaches the band, and Space locks even with focus on ◀", async ({ page }) => {
  await page.goto("/?renderer=2d");
  await page.waitForFunction(() => document.activeElement?.tagName === "H1");
  await page.keyboard.press("d");
  await page.getByLabel("場景").selectOption("vector");
  await page.getByRole("button", { name: "跳至所選場景" }).click();
  await expect(page.locator("#stage-root")).toHaveAttribute("data-transition-phase", "idle", { timeout: 6_000 });
  const shell = page.locator(".vector-shell");
  const guide = page.locator(".aim-guide");
  await expect(guide).toContainText("目標：想念");
  await expect(guide).toContainText("← 往左轉 5 格");
  await page.getByRole("button", { name: "星空往左轉" }).click(); // leaves keyboard focus on the ◀ button

  for (let lock = 1; lock <= 4; lock += 1) {
    for (let turn = 0; turn < 20 && (await shell.getAttribute("data-vector-aligned")) !== "true"; turn += 1) {
      await page.keyboard.press((await guide.innerText()).includes("←") ? "ArrowLeft" : "ArrowRight");
    }
    await expect(shell).toHaveAttribute("data-vector-aligned", "true");
    await page.keyboard.press("Space"); // focus is still on the ◀ ▶ button
    await expect(shell).toHaveAttribute("data-vector-locked", String(lock));
  }
  await expect(page.locator(".vector-result")).toContainText("最先聯想到");
  await expect(page.locator(".clue-bag li")).toHaveCount(4);
});
