// One-off: opens a board in the v3 app, loads the v1 fixture into the live store,
// screenshots it. Proves old boards render after the upgrade + surfaces client
// runtime errors the production build can't. → reviews/assets/<name>.png
//   node scripts/shot-fixture.mjs reviews/assets/t1-fixture-board.png
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const OUT = process.argv[2] || "reviews/assets/t1-fixture-board.png";
const fixture = JSON.parse(fs.readFileSync("scripts/fixtures/v1-snapshot.json", "utf8"));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

await page.goto("http://localhost:3050/", { waitUntil: "networkidle" });
await page.waitForURL(/\/board\/.+/, { timeout: 20_000 });
await page.waitForFunction(() => !!window.__tldrawEditor, null, { timeout: 20_000 });

await page.evaluate((snap) => {
  const e = window.__tldrawEditor;
  e.store.loadStoreSnapshot(snap);
  e.zoomToFit();
}, fixture);

await page.waitForTimeout(1500);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
await page.screenshot({ path: OUT });

const shapeCount = await page.evaluate(() => window.__tldrawEditor.getCurrentPageShapes().length);
await browser.close();

console.log(`✓ shot ${OUT} — ${shapeCount} shapes on page`);
if (errors.length) {
  console.log("⚠ console/page errors:\n" + errors.slice(0, 15).join("\n"));
  process.exit(1);
}
