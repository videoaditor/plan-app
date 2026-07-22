import { test, expect } from "@playwright/test";

// V2.3 T1+T2: numbered frames become scenes; the scene panel jumps the camera;
// Studio mode hides all chrome and drives the camera with the keyboard.
test("scenes drive the camera and Studio mode hides all chrome", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("plan-user-name", "Tester"));
  await page.goto("/");
  await page.waitForURL(/\/board\/.+/, { timeout: 20_000 });
  await page.waitForFunction(() => !!(window as any).__tldrawEditor, null, { timeout: 20_000 });

  // Two numbered frames (a scene) + one plain frame (not a scene), created apart
  // so each zoom target is clearly different.
  await page.evaluate(() => {
    const e = (window as any).__tldrawEditor;
    const mk = (name: string, x: number, y: number) =>
      e.createShape({ id: "shape:" + crypto.randomUUID(), type: "frame", x, y, props: { name, w: 500, h: 350 } });
    mk("2 Hook", 1600, 1200);
    mk("1 Intro", 0, 0);
    mk("Moodboard", -1400, 800);
  });

  // Scene panel lists exactly the two numbered frames, in order.
  await expect(page.getByTitle("1 Intro")).toBeVisible();
  await expect(page.getByTitle("2 Hook")).toBeVisible();
  await expect(page.getByTitle("Moodboard")).toHaveCount(0);

  await page.screenshot({ path: "reviews/assets/studio-panel.png" });

  // Clicking a scene moves the camera.
  const cam0 = await page.evaluate(() => (window as any).__tldrawEditor.getCamera());
  await page.getByTitle("2 Hook").click();
  await page.waitForTimeout(1400); // ~1s zoom animation
  const cam1 = await page.evaluate(() => (window as any).__tldrawEditor.getCamera());
  expect(cam1.x !== cam0.x || cam1.y !== cam0.y || cam1.z !== cam0.z).toBeTruthy();

  // Enter Studio mode (S) → all chrome gone.
  await page.locator("body").click({ position: { x: 500, y: 400 } });
  await page.keyboard.press("s");
  await expect(page.locator(".tool-rail")).toBeHidden();
  await expect(page.locator(".zoom-controls")).toBeHidden();
  await expect(page.locator("header")).toBeHidden();

  // Arrow key moves the camera to the previous scene while in Studio.
  const camA = await page.evaluate(() => (window as any).__tldrawEditor.getCamera());
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(1400);
  const camB = await page.evaluate(() => (window as any).__tldrawEditor.getCamera());
  expect(camB.x !== camA.x || camB.y !== camA.y || camB.z !== camA.z).toBeTruthy();

  // Let the scene counter auto-hide, then capture the clean stage.
  await page.waitForTimeout(2400);
  await page.screenshot({ path: "reviews/assets/studio-empty.png" });

  // Esc leaves Studio → chrome returns.
  await page.keyboard.press("Escape");
  await expect(page.locator(".tool-rail")).toBeVisible();
  await expect(page.locator("header")).toBeVisible();
});
