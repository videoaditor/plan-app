// plan-sync — the multiplayer sync server (V2.1 T3). One TLSocketRoom per board
// (roomId == boardId). Runs as its own PM2 process on the VPS, port 3051.
//
// Durability: each room's snapshot is written to data/rooms/<boardId>.json on the
// 30s interval and when the last client leaves. A room seeds, in order, from that
// file → the existing sqlite `snapshots` row (so pre-sync boards aren't empty) →
// empty. data/ is the SSoT; client IndexedDB is only a cache.
//
// Follows the official tldraw sync node example (TLSocketRoom + a ws socket, which
// satisfies WebSocketMinimal). No custom sync protocol.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { WebSocketServer } from "ws";
import Database from "better-sqlite3";
import { TLSocketRoom } from "@tldraw/sync-core";
import { createTLSchema, defaultShapeSchemas, defaultBindingSchemas } from "@tldraw/tlschema";

const PORT = Number(process.env.SYNC_PORT) || 3051;
const DATA_DIR = path.join(process.cwd(), "data");
const ROOMS_DIR = path.join(DATA_DIR, "rooms");
const DB_PATH = path.join(DATA_DIR, "plan.db");
const PERSIST_INTERVAL_MS = 30_000;

fs.mkdirSync(ROOMS_DIR, { recursive: true });

// Same schema the app + migration smoke use: defaults + the custom media-embed
// shape (empty props/migrations, matching the client EmbedShapeUtil).
const schema = createTLSchema({
  shapes: { ...defaultShapeSchemas, "media-embed": {} },
  bindings: defaultBindingSchemas,
});

/** @type {Map<string, { room: import('@tldraw/sync-core').TLSocketRoom, dirty: boolean }>} */
const rooms = new Map();

const roomFile = (boardId) => path.join(ROOMS_DIR, `${boardId}.json`);

// Seed order: durable room snapshot → legacy sqlite snapshot → nothing.
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
    // no db / no row — fine, room starts empty
  }
  return undefined;
}

function persist(boardId) {
  const entry = rooms.get(boardId);
  if (!entry) return;
  try {
    fs.writeFileSync(roomFile(boardId), JSON.stringify(entry.room.getCurrentSnapshot()));
    entry.dirty = false;
  } catch (e) {
    // Keep serving; retry on the next interval (error taxonomy from the spec).
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
      // Last client gone → persist and drop the room (frees memory; re-seeds on rejoin).
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

setInterval(() => {
  for (const [boardId, entry] of rooms) if (entry.dirty) persist(boardId);
}, PERSIST_INTERVAL_MS);

const server = http.createServer((req, res) => {
  // Plain health check — everything real happens over WebSocket.
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("plan-sync ok");
});

const wss = new WebSocketServer({ server });
wss.on("connection", (socket, req) => {
  try {
    const url = new URL(req.url ?? "", "http://localhost");
    const match = url.pathname.match(/^\/connect\/(.+)$/);
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
});

function shutdown() {
  for (const [boardId] of rooms) persist(boardId);
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.listen(PORT, () => console.log(`[plan-sync] listening on :${PORT}`));
