// Screenshots for T4: the first-visit name prompt and the Share popover.
// Needs the Next dev app on :3050. Manages its own sync server for a clean board.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";

const APP = "http://localhost:3050";
const sync = spawn("node", ["sync-server/index.mjs"], { stdio: ["ignore", "pipe", "pipe"] });
await new Promise((res) => sync.stdout.on("data", (d) => d.toString().includes("listening") && res()));

const browser = await chromium.launch();
fs.mkdirSync("reviews/assets", { recursive: true });
try {
  const board = await (await (await browser.newContext()).newPage()).request.post(`${APP}/api/boards`, { data: { name: "Q3 Launch Board" } }).then((r) => r.json());

  // 1) Name prompt (fresh visitor via the share link).
  const ctx1 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx1.addInitScript(() => localStorage.clear());
  const p1 = await ctx1.newPage();
  await p1.goto(`${APP}/s/${board.shareToken}`);
  await p1.getByPlaceholder("Your name").waitFor({ timeout: 20000 });
  await p1.getByPlaceholder("Your name").fill("Nora");
  await p1.waitForTimeout(300);
  await p1.screenshot({ path: "reviews/assets/t4-name-prompt.png" });
  console.log("✓ shot reviews/assets/t4-name-prompt.png");

  // 2) Share popover (name already set → straight into the board).
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx2.addInitScript(() => localStorage.setItem("plan-user-name", "Alan"));
  const p2 = await ctx2.newPage();
  await p2.goto(`${APP}/board/${board.id}`);
  await p2.waitForFunction(() => !!window.__tldrawEditor, null, { timeout: 20000 });
  await p2.getByRole("button", { name: "Share" }).click();
  await p2.waitForTimeout(400);
  await p2.screenshot({ path: "reviews/assets/t4-share-popover.png" });
  console.log("✓ shot reviews/assets/t4-share-popover.png");
} finally {
  await browser.close();
  sync.kill("SIGTERM");
}
