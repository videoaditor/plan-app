// Schema + migrations for plan-app. Plain ESM so both db.ts (app) and
// scripts/smoke-workspaces.mjs (node) run the exact same logic — no drift.
// Every step is additive and re-runnable (idempotent): it creates/alters/seeds,
// never drops or reassigns existing data.

/** @param {import('better-sqlite3').Database} db */
export function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#F5D547',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS snapshots (
      board_id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#F5D547',
      sort INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);

  // sqlite has no "ADD COLUMN IF NOT EXISTS" — swallow the dup-column error on re-run.
  try {
    db.exec(`ALTER TABLE boards ADD COLUMN workspace_id TEXT`);
  } catch {
    // column already exists
  }

  seedWorkspaces(db);
}

/** Seed the two default workspaces once, then backfill any board without one. */
function seedWorkspaces(db) {
  const now = Date.now();
  const count = db.prepare(`SELECT COUNT(*) AS c FROM workspaces`).get().c;
  if (count === 0) {
    const insert = db.prepare(
      `INSERT INTO workspaces (id, name, color, sort, created_at) VALUES (?, ?, ?, ?, ?)`
    );
    insert.run(genId(), "Aditor", "#F5D547", 0, now);
    insert.run(genId(), "Content", "#2563EB", 1, now);
  }

  // Boards predating workspaces (or created without one) fall back to the first workspace.
  const nullBoards = db
    .prepare(`SELECT COUNT(*) AS c FROM boards WHERE workspace_id IS NULL`)
    .get().c;
  if (nullBoards > 0) {
    const fallback = db
      .prepare(`SELECT id FROM workspaces ORDER BY sort ASC, created_at ASC LIMIT 1`)
      .get();
    if (fallback) {
      db.prepare(`UPDATE boards SET workspace_id = ? WHERE workspace_id IS NULL`).run(
        fallback.id
      );
    }
  }
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
