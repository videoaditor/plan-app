// Shared multiplayer room logic (V2.1). Used by both the standalone dev sync
// server (sync-server/index.mjs, port 3051) and the production single-port
// server (server.mjs), so behaviour is identical in both.
//
// One TLSocketRoom per board (roomId == boardId). Room snapshots persist to
// data/rooms/<boardId>.json on a 30s interval and when the last client leaves;
// a room seeds from that file → the legacy sqlite `snapshots` row → empty. data/
// is the SSoT; client IndexedDB is only a cache.
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { TLSocketRoom } from "@tldraw/sync-core";
import { createTLSchema, defaultShapeSchemas, defaultBindingSchemas } from "@tldraw/tlschema";

const DATA_DIR = path.join(process.cwd(), "data");
const ROOMS_DIR = path.join(DATA_DIR, "rooms");
const DB_PATH = path.join(DATA_DIR, "plan.db");
const PERSIST_INTERVAL_MS = 30_000;

fs.mkdirSync(ROOMS_DIR, { recursive: true });

// Defaults + the custom media-embed shape (empty props/migrations, matching the
// client EmbedShapeUtil). Same schema the migration smoke uses.
const schema = createTLSchema({
  shapes: { ...defaultShapeSchemas, "media-embed": {} },
  bindings: defaultBindingSchemas,
});

/** @type {Map<string, { room: import('@tldraw/sync-core').TLSocketRoom, dirty: boolean }>} */
const rooms = new Map();

const roomFile = (boardId) => path.join(ROOMS_DIR, `${boardId}.json`);

function readSeed(boardId) {
  try {
    if (fs.existsSync(roomFile(boardId))) {
      return JSON.parse(fs.readFileSync(roomFile(boardId), "utf8"));
    }
  } catch (e) {
    console.error(`[plan-sync] bad room file for ${boardId}: ${e.message}`);
  }
  try {
    const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
    const row = db.prepare("SELECT data FROM snapshots WHERE board_id = ?").get(boardId);
    db.close();
    if (row) return JSON.parse(row.data); // TLStoreSnapshot {store, schema}
  } catch {
    // no db / no row — room starts empty
  }
  return undefined;
}

export function persist(boardId) {
  const entry = rooms.get(boardId);
  if (!entry) return;
  try {
    fs.writeFileSync(roomFile(boardId), JSON.stringify(entry.room.getCurrentSnapshot()));
    entry.dirty = false;
  } catch (e) {
    console.error(`[plan-sync] persist failed for ${boardId}: ${e.message}`);
  }
}

function getRoom(boardId) {
  const existing = rooms.get(boardId);
  if (existing) return existing;

  const entry = { room: null, dirty: false };
  entry.room = new TLSocketRoom({
    schema,
    initialSnapshot: readSeed(boardId),
    onDataChange() {
      entry.dirty = true;
    },
    onSessionRemoved(room, { numSessionsRemaining }) {
      if (numSessionsRemaining === 0) {
        persist(boardId);
        room.close();
        rooms.delete(boardId);
      }
    },
  });
  rooms.set(boardId, entry);
  return entry;
}

// Accept a WebSocket + its upgrade request. Parses the board id from the path
// (…/connect/<boardId>) and the sessionId from the query. Works whether the path
// is /connect/<id> (dev, port 3051) or /sync/connect/<id> (prod, same origin).
export function handleConnection(socket, req) {
  try {
    const url = new URL(req.url ?? "", "http://localhost");
    const match = url.pathname.match(/(?:^|\/)connect\/([^/?]+)/);
    const boardId = match ? decodeURIComponent(match[1]) : null;
    const sessionId = url.searchParams.get("sessionId");
    if (!boardId || !sessionId) {
      socket.close();
      return;
    }
    getRoom(boardId).room.handleSocketConnect({ sessionId, socket });
  } catch (e) {
    console.error(`[plan-sync] connection error: ${e.message}`);
    try { socket.close(); } catch {}
  }
}

let persistTimer = null;
export function startPersistLoop() {
  if (persistTimer) return;
  persistTimer = setInterval(() => {
    for (const [boardId, entry] of rooms) if (entry.dirty) persist(boardId);
  }, PERSIST_INTERVAL_MS);
}

export function persistAll() {
  for (const [boardId] of rooms) persist(boardId);
}
