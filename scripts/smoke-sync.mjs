// V2.1 T3 smoke: live multiplayer + restart persistence. Self-contained — it owns
// the sync-server child process so it can restart it mid-test. Requires the Next
// dev app already running on :3050.
//   npm run dev &            # once
//   node scripts/smoke-sync.mjs
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const APP = "http://localhost:3050";
const ROOMS_DIR = path.join(process.cwd(), "data", "rooms");

function startSync() {
  const child = spawn("node", ["sync-server/index.mjs"], { stdio: ["ignore", "pipe", "pipe"] });
  return new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error("sync server did not start")), 10_000);
    child.stdout.on("data", (d) => {
      if (d.toString().includes("listening")) { clearTimeout(to); resolve(child); }
    });
    child.stderr.on("data", (d) => process.stderr.write(`[sync] ${d}`));
    child.on("exit", (c) => { if (c) reject(new Error(`sync exited ${c}`)); });
  });
}

function stopSync(child) {
  return new Promise((resolve) => { child.on("exit", () => resolve()); child.kill("SIGTERM"); });
}

const waitEditor = (page) =>
  page.waitForFunction(() => !!(window.__tldrawEditor), null, { timeout: 20_000 });

// Seed a presence name so the first-visit name prompt (T4) doesn't gate the canvas.
async function newCtx(name) {
  const ctx = await browser.newContext();
  await ctx.addInitScript((n) => localStorage.setItem("plan-user-name", n), name);
  return ctx;
}

let sync = await startSync();
const browser = await chromium.launch();
try {
  // Deterministic shared board via the API.
  const ctxA = await newCtx("Alan");
  const pageA = await ctxA.newPage();
  const board = await (await pageA.request.post(`${APP}/api/boards`, { data: { name: "Sync Smoke" } })).json();
  const boardId = board.id;
  const boardUrl = `${APP}/board/${boardId}`;

  await pageA.goto(boardUrl);
  await waitEditor(pageA);

  const ctxB = await newCtx("Nora");
  const pageB = await ctxB.newPage();
  await pageB.goto(boardUrl);
  await waitEditor(pageB);

  // A creates a shape → B must see it within 10s (live sync).
  const shapeId = "shape:synctest";
  await pageA.evaluate((id) => {
    window.__tldrawEditor.createShape({
      id, type: "geo", x: 200, y: 200,
      props: { geo: "rectangle", w: 123, h: 77, color: "blue", fill: "solid" },
    });
  }, shapeId);

  await pageB.waitForFunction((id) => !!window.__tldrawEditor.getShape(id), shapeId, { timeout: 10_000 });
  const wB = await pageB.evaluate((id) => window.__tldrawEditor.getShape(id).props.w, shapeId);
  assert.equal(wB, 123, "shape width did not sync to B");
  console.log("✓ live sync: shape created in A appeared in B");

  // Close both clients → server persists the room, then restart the server.
  await ctxA.close();
  await ctxB.close();
  const roomFile = path.join(ROOMS_DIR, `${boardId}.json`);
  for (let i = 0; i < 40 && !fs.existsSync(roomFile); i++) await new Promise((r) => setTimeout(r, 250));
  assert.ok(fs.existsSync(roomFile), "room snapshot was not persisted on disconnect");

  await stopSync(sync);
  sync = await startSync();

  // Fresh client on the same board → the shape is still there (seeded from disk).
  const ctxC = await newCtx("Sam");
  const pageC = await ctxC.newPage();
  await pageC.goto(boardUrl);
  await waitEditor(pageC);
  await pageC.waitForFunction((id) => !!window.__tldrawEditor.getShape(id), shapeId, { timeout: 10_000 });
  console.log("✓ restart persistence: shape survived a sync-server restart");
  await ctxC.close();

  // Seed-from-sqlite: a board whose only state is a legacy snapshots row (no room
  // file yet) must open non-empty — the room seeds from sqlite on first join.
  const ctxD = await newCtx("Guest");
  const pageD = await ctxD.newPage();
  const legacy = await (await pageD.request.post(`${APP}/api/boards`, { data: { name: "Legacy Seed" } })).json();
  const fixture = JSON.parse(fs.readFileSync("scripts/fixtures/v1-snapshot.json", "utf8"));
  const put = await pageD.request.put(`${APP}/api/boards/${legacy.id}/snapshot`, { data: fixture });
  assert.ok(put.ok(), "failed to seed legacy snapshot");
  await pageD.goto(`${APP}/board/${legacy.id}`);
  await waitEditor(pageD);
  await pageD.waitForFunction(() => window.__tldrawEditor.getCurrentPageShapes().length >= 4, null, { timeout: 10_000 });
  const seeded = await pageD.evaluate(() => window.__tldrawEditor.getCurrentPageShapes().length);
  assert.ok(seeded >= 4, `legacy board seeded ${seeded} shapes, expected >= 4`);
  console.log(`✓ sqlite seed: legacy board opened with ${seeded} shapes (not empty)`);
  await ctxD.close();

  console.log("✓ smoke-sync passed");
} finally {
  await browser.close();
  await stopSync(sync);
}
