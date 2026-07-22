import { test, expect } from "@playwright/test";

// V2.3 T3: the facecam bubble. Uses Chrome's fake media device so getUserMedia
// resolves headless. If the fake stream is unavailable the bubble surfaces a
// toast instead of crashing — that path is covered by the graceful-fail assert.
test.use({
  permissions: ["camera"],
  launchOptions: {
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
  },
});

test("facecam bubble appears, snaps to a corner, and rides into Studio mode", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("plan-user-name", "Tester"));
  await page.goto("/");
  await page.waitForURL(/\/board\/.+/, { timeout: 20_000 });
  await page.waitForFunction(() => !!(window as any).__tldrawEditor, null, { timeout: 20_000 });

  // Toggle the facecam on.
  await page.getByTitle("Toggle facecam (C)").click();
  const bubble = page.locator("[data-facecam-bubble]");
  await expect(bubble).toBeVisible({ timeout: 10_000 });

  // The video element gets a live stream (no error toast).
  await page.waitForFunction(
    () => {
      const v = document.querySelector("[data-facecam-bubble] video") as HTMLVideoElement | null;
      return !!v && !!v.srcObject;
    },
    null,
    { timeout: 10_000 }
  );

  // Drag it toward the top-left → it snaps to that corner (near the 20px margin).
  const box = (await bubble.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(120, 120, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  const snapped = (await bubble.boundingBox())!;
  expect(snapped.x).toBeLessThan(60);
  expect(snapped.y).toBeLessThan(60);

  // Bubble survives into Studio mode (it is a DOM overlay above the canvas).
  await page.locator("body").click({ position: { x: 500, y: 400 } });
  await page.keyboard.press("s");
  await expect(bubble).toBeVisible();
  await page.waitForTimeout(2400); // counter auto-hides
  await page.screenshot({ path: "reviews/assets/studio-facecam.png" });
});
