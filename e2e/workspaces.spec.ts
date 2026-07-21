import { test, expect } from "@playwright/test";

const ASSETS = "reviews/assets";

// V2.2 move smoke: move a board from Aditor → Content, it leaves the Aditor
// list, then reappears after switching to Content. Screenshots along the way.
test("move a board between workspaces", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL(/\/board\/.+/, { timeout: 20_000 });

  const sidebar = page.locator(".sidebar");
  const switcher = page.getByTitle("Switch workspace");
  await expect(switcher).toContainText("Aditor");

  // Create our own uniquely-named board in Aditor (avoids fixture ambiguity).
  const boardName = `WS Move ${Date.now()}`;
  await sidebar.getByTitle("New board").click();
  const input = sidebar.getByPlaceholder("Board name…");
  await input.fill(boardName);
  await input.press("Enter");

  const inList = sidebar.getByText(boardName, { exact: true });
  await expect(inList).toBeVisible();

  // Open the board's options menu → "Move to…" → "Content".
  const row = page.locator(".group", { hasText: boardName });
  await row.hover();
  await row.getByTitle("Board options").click({ force: true });
  await page.getByText("Move to…", { exact: true }).click();
  const moveTarget = page.getByRole("button", { name: "Content" });
  await expect(moveTarget).toBeVisible();
  await page.waitForTimeout(250); // let the menu's scaleIn settle before the shot
  await page.screenshot({ path: `${ASSETS}/move-menu.png` });
  await moveTarget.click();

  // It has left the Aditor list.
  await expect(inList).toHaveCount(0);

  // Switch to Content — the board is there.
  await switcher.click();
  const switchTarget = page.getByRole("button", { name: "Content" });
  await expect(switchTarget).toBeVisible();
  await page.waitForTimeout(250); // let the dropdown's scaleIn settle before the shot
  await page.screenshot({ path: `${ASSETS}/switcher-open.png` });
  await switchTarget.click();
  await expect(switcher).toContainText("Content");
  await expect(sidebar.getByText(boardName, { exact: true })).toBeVisible();
});
