import { expect, test } from "@playwright/test";

test("a mouse slash only splits on a real tokenizer seam", async ({ page }) => {
  await page.goto("/?renderer=2d");
  await page.waitForFunction(() => document.activeElement?.tagName === "H1");
  await page.keyboard.press("d");
  await page.getByLabel("減少動態").check();
  await page.getByLabel("場景").selectOption("tokenization");
  await page.getByRole("button", { name: "跳至所選場景" }).click();
  await expect(page.locator("#stage-root")).toHaveAttribute("data-transition-phase", "idle", { timeout: 6_000 });
  const shell = page.locator(".tokenization-shell");

  // A stroke that misses the sentence is a whiff.
  await page.mouse.move(200, 560);
  await page.mouse.down();
  await page.mouse.move(400, 600, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByRole("status").filter({ hasText: "劈空了" })).toBeVisible();
  await expect(shell).toHaveAttribute("data-slice-cuts", "0");

  const chars = page.locator(".slice-sentence span[aria-hidden='true']");
  const swipeAt = async (x: number) => {
    const box = (await chars.first().boundingBox())!;
    await page.mouse.move(x, box.y - 80);
    await page.mouse.down();
    await page.mouse.move(x, box.y + box.height + 80, { steps: 8 });
    await page.mouse.up();
  };

  // Between 想 and 念: same token, the blade bounces off.
  const xiang = (await chars.nth(5).boundingBox())!;
  const nian = (await chars.nth(6).boundingBox())!;
  await swipeAt((xiang.x + xiang.width + nian.x) / 2);
  await expect(page.getByRole("status")).toContainText("「想念」是同一塊 token");
  await expect(shell).toHaveAttribute("data-slice-cuts", "0");

  // Through the middle of 人: a character can't be split either.
  const ren = (await chars.nth(3).boundingBox())!;
  await swipeAt(ren.x + ren.width / 2);
  await expect(page.getByRole("status")).toContainText("「人」字中間");
  await expect(shell).toHaveAttribute("data-slice-cuts", "0");

  // On the seam between 念 and 一: a real cut.
  const yi = (await chars.nth(7).boundingBox())!;
  await swipeAt((nian.x + nian.width + yi.x) / 2);
  await expect(page.getByRole("status")).toContainText("切中了");
  await expect(shell).toHaveAttribute("data-slice-cuts", "1");
});
