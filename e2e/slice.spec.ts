import { expect, test } from "@playwright/test";

test("a mouse slash between 想 and 念 is overruled by the tokenizer's real cut", async ({ page }) => {
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

  // Slash straight down through the gap between 想 (index 5) and 念 (index 6).
  const box = (await page.locator(".slice-sentence span[aria-hidden='true']").nth(5).boundingBox())!;
  const x = box.x + box.width + 1;
  await page.mouse.move(x, box.y - 80);
  await page.mouse.down();
  await page.mouse.move(x, box.y + box.height + 80, { steps: 8 });
  await page.mouse.up();
  await expect(shell).toHaveAttribute("data-slice-cuts", "1");
  await expect(page.getByRole("status").filter({ hasText: "tokenizer 不切那裡" })).toContainText("「人會｜想念」");
});
