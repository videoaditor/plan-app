// One-off: builds a real tldraw 2.4 store snapshot (text + geo + image asset +
// media-embed) via the running dev app and writes scripts/fixtures/v1-snapshot.json.
// Run with tldraw 2.4 still installed, dev server up on :3050:
//   node scripts/gen-v1-fixture.mjs
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "scripts/fixtures/v1-snapshot.json");

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:3050/", { waitUntil: "networkidle" });
await page.waitForURL(/\/board\/.+/, { timeout: 20_000 });
// wait for the editor to be exposed
await page.waitForFunction(() => !!window.__tldrawEditor, null, { timeout: 20_000 });

const snapshot = await page.evaluate(async () => {
  const e = window.__tldrawEditor;
  const sid = () => "shape:" + crypto.randomUUID();
  const aid = "asset:" + crypto.randomUUID();

  // text
  e.createShape({ id: sid(), type: "text", x: 100, y: 100, props: { text: "Fixture headline", size: "xl", color: "black" } });
  // geo
  e.createShape({ id: sid(), type: "geo", x: 100, y: 300, props: { geo: "rectangle", w: 200, h: 120, color: "blue", fill: "solid" } });
  // image asset + shape (base64 1x1 png — the pre-upload world)
  e.createAssets([{ id: aid, type: "image", typeName: "asset", props: { name: "dot.png", src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", w: 1, h: 1, mimeType: "image/png", isAnimated: false }, meta: {} }]);
  e.createShape({ id: sid(), type: "image", x: 400, y: 300, props: { assetId: aid, w: 160, h: 160 } });
  // media-embed (custom shape)
  e.createShape({ id: sid(), type: "media-embed", x: 100, y: 500, props: { url: "https://youtu.be/dQw4w9WgXcQ", embedType: "youtube", embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1", w: 480, h: 270 } });

  return e.store.getStoreSnapshot();
});

await browser.close();
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2));
const shapes = Object.values(snapshot.store).filter((r) => r.typeName === "shape");
console.log(`✓ wrote ${OUT} — ${shapes.length} shapes, schema v${snapshot.schema?.schemaVersion}`);
