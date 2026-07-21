import { test, expect } from "@playwright/test";

// V2.1 T2: images go through /api/upload → the snapshot references a /uploads/ URL,
// never a data:image base64 blob. Drives the real registered asset handler.
test("image asset is uploaded, not embedded as base64", async ({ page }) => {
  // Skip the first-visit name prompt so the canvas mounts.
  await page.addInitScript(() => localStorage.setItem("plan-user-name", "Tester"));
  await page.goto("/");
  await page.waitForURL(/\/board\/.+/, { timeout: 20_000 });
  await page.waitForFunction(() => !!(window as any).__tldrawEditor, null, { timeout: 20_000 });

  const result = await page.evaluate(async () => {
    const e = (window as any).__tldrawEditor;
    // Real, decodable PNG (createImageBitmap needs valid image bytes).
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#2563EB";
    ctx.fillRect(0, 0, 32, 32);
    const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/png"));
    const file = new File([blob], "dot.png", { type: "image/png" });

    // The registered external asset handler compresses (n/a here) + uploads.
    const asset = await e.getAssetForExternalContent({ type: "file", file });
    e.createAssets([asset]);
    e.createShape({
      id: "shape:" + crypto.randomUUID(),
      type: "image",
      x: 0,
      y: 0,
      props: { assetId: asset.id, w: 100, h: 100 },
    });

    // The uploaded URL must actually serve.
    const head = await fetch(asset.props.src);

    return {
      src: asset.props.src as string,
      snapshot: JSON.stringify(e.store.getStoreSnapshot()),
      served: head.status,
      servedType: head.headers.get("content-type"),
    };
  });

  expect(result.src).toMatch(/^\/uploads\/[a-f0-9]{64}\.\w+$/);
  expect(result.snapshot).not.toContain("data:image");
  expect(result.served).toBe(200);
  expect(result.servedType).toContain("image/");
});
