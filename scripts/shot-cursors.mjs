// Screenshot two live cursors on one board (presence = name + color). Needs the
// Next dev app on :3050 and a sync server on :3051 running. → reviews/assets/
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const APP = "http://localhost:3050";
const OUT = process.argv[2] || "reviews/assets/t3-two-cursors.png";

const sync = spawn("node", ["sync-server/index.mjs"], { stdio: ["ignore", "pipe", "pipe"] });
await new Promise((res) => sync.stdout.on("data", (d) => d.toString().includes("listening") && res()));

const browser = await chromium.launch();
const mk = async (name, color) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(([n, c]) => {
    localStorage.setItem("plan-user-name", n);
    localStorage.setItem("plan-user-color", c);
    localStorage.setItem("plan-user-id", "u-" + n);
  }, [name, color]);
  return ctx;
};

try {
  const ctxA = await mk("Alan", "#2563EB");
  const pageA = await ctxA.newPage();
  const board = await (await pageA.request.post(`${APP}/api/boards`, { data: { name: "Cursors" } })).json();
  const url = `${APP}/board/${board.id}`;
  await pageA.goto(url);
  await pageA.waitForFunction(() => !!window.__tldrawEditor, null, { timeout: 20000 });

  const ctxB = await mk("Nora", "#EC4899");
  const pageB = await ctxB.newPage();
  await pageB.goto(url);
  await pageB.waitForFunction(() => !!window.__tldrawEditor, null, { timeout: 20000 });

  // Give each a shape + move pointers so both cursors broadcast into the shared area.
  await pageA.evaluate(() => window.__tldrawEditor.createShape({ id: "shape:a", type: "geo", x: 250, y: 250, props: { geo: "rectangle", w: 160, h: 100, color: "blue", fill: "semi" } }));
  await pageB.mouse.move(700, 300);
  await pageB.mouse.move(720, 320);
  await pageA.mouse.move(500, 450);
  await pageA.mouse.move(520, 470);
  await pageA.waitForTimeout(1500);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await pageA.screenshot({ path: OUT });
  console.log(`✓ shot ${OUT}`);
} finally {
  await browser.close();
  sync.kill("SIGTERM");
}
