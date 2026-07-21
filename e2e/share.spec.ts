import { test, expect } from "@playwright/test";

// V2.1 T4: a /s/<token> link opens the board (after the first-visit name prompt),
// and rotating the token 404s the old link.
test("share link opens the board with a chosen name; rotation 404s the old link", async ({ page }) => {
  const boardName = `Share ${Date.now()}`;
  const board = await (
    await page.request.post("/api/boards", { data: { name: boardName } })
  ).json();
  const token = board.shareToken as string;
  expect(token).toBeTruthy();

  // Fresh visitor (no stored name) → name prompt, then the board opens.
  await page.addInitScript(() => localStorage.clear());
  await page.goto(`/s/${token}`);

  const nameInput = page.getByPlaceholder("Your name");
  await expect(nameInput).toBeVisible();
  await nameInput.fill("Guest Gwen");
  await page.getByRole("button", { name: "Continue" }).click();

  // Board chrome shows the right board; the chosen name is persisted for presence.
  await expect(page.getByTitle("Click to rename board")).toHaveText(boardName, { timeout: 15_000 });
  const storedName = await page.evaluate(() => localStorage.getItem("plan-user-name"));
  expect(storedName).toBe("Guest Gwen");

  // Rotate the token → new token differs, old link 404s.
  const rotated = await (await page.request.post(`/api/boards/${board.id}/share`)).json();
  expect(rotated.shareToken).toBeTruthy();
  expect(rotated.shareToken).not.toBe(token);

  const oldLink = await page.request.get(`/s/${token}`, { maxRedirects: 0 });
  expect(oldLink.status()).toBe(404);

  const newLink = await page.request.get(`/s/${rotated.shareToken}`, { maxRedirects: 0 });
  expect(newLink.status()).toBe(200);
});
