// Smoke test for V2.2 workspaces — runs the REAL migration (src/lib/migrate.mjs)
// against a throwaway sqlite file. Pure: no dev server needed.
//   node scripts/smoke-workspaces.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { migrate } from "../src/lib/migrate.mjs";

const DB_PATH = path.join(os.tmpdir(), `plan-smoke-ws-${process.pid}-${Date.now()}.db`);

function open() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  return db;
}

// Mirrors the DELETE guard in /api/workspaces/[id]: refuse if the workspace holds boards.
function canDelete(db, id) {
  const n = db.prepare("SELECT COUNT(*) AS c FROM boards WHERE workspace_id = ?").get(id).c;
  return n === 0;
}

try {
  let db = open();

  // 1) Fresh DB → migrate seeds exactly the two default workspaces.
  migrate(db);
  const ws = db.prepare("SELECT * FROM workspaces ORDER BY sort ASC").all();
  assert.equal(ws.length, 2, `expected 2 workspaces, got ${ws.length}`);
  assert.deepEqual(ws.map((w) => w.name), ["Aditor", "Content"]);
  const aditor = ws[0];

  // 2) A legacy board with no workspace_id gets backfilled to the first workspace.
  db.prepare(
    "INSERT INTO boards (id, name, color, workspace_id, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?)"
  ).run("legacy1", "Old Board", "#F5D547", Date.now(), Date.now());
  migrate(db); // re-run: backfill NULL → Aditor
  const nullCount = db
    .prepare("SELECT COUNT(*) AS c FROM boards WHERE workspace_id IS NULL")
    .get().c;
  assert.equal(nullCount, 0, "no board should be left without a workspace");
  const legacyWs = db.prepare("SELECT workspace_id FROM boards WHERE id = 'legacy1'").get()
    .workspace_id;
  assert.equal(legacyWs, aditor.id, "legacy board should land in the first workspace");

  // 3) Delete guard: non-empty workspace must be refused, empty one allowed.
  assert.equal(canDelete(db, aditor.id), false, "non-empty workspace must not be deletable");
  assert.equal(canDelete(db, ws[1].id), true, "empty workspace must be deletable");

  // 4) Idempotency: another migrate changes nothing (still 2 ws, same rows, no NULLs).
  const before = db.prepare("SELECT * FROM workspaces ORDER BY sort ASC").all();
  migrate(db);
  const after = db.prepare("SELECT * FROM workspaces ORDER BY sort ASC").all();
  assert.deepEqual(after, before, "second migrate must not change workspaces");
  assert.equal(
    db.prepare("SELECT COUNT(*) AS c FROM workspaces").get().c,
    2,
    "re-run must not duplicate the seed"
  );

  db.close();
  console.log("✓ smoke-workspaces passed");
} finally {
  for (const f of [DB_PATH, `${DB_PATH}-wal`, `${DB_PATH}-shm`]) {
    if (fs.existsSync(f)) fs.rmSync(f);
  }
}
