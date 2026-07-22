// Production server: serves the Next app AND the multiplayer sync on ONE port,
// so live-together works through the same connection the app already uses — no
// separate port to expose, nothing to configure on the server (Cloudflare passes
// the WebSocket through automatically). Sync lives at /sync/*; everything else is
// Next. Shares the room logic with the dev server via sync-server/rooms.mjs.
import http from "node:http";
import { parse } from "node:url";
import next from "next";
import { WebSocketServer } from "ws";
import { handleConnection, startPersistLoop, persistAll } from "./sync-server/rooms.mjs";

const PORT = Number(process.env.PORT) || 3050;
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev });
const handle = app.getRequestHandler();
const upgradeNext = app.getUpgradeHandler();
await app.prepare();

const server = http.createServer((req, res) => handle(req, res, parse(req.url ?? "", true)));

const wss = new WebSocketServer({ noServer: true });
wss.on("connection", (socket, req) => handleConnection(socket, req));

server.on("upgrade", (req, socket, head) => {
  const { pathname } = new URL(req.url ?? "", "http://localhost");
  if (pathname.startsWith("/sync/")) {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  } else {
    // Next's own upgrades (dev HMR at /_next/webpack-hmr); harmless in prod.
    upgradeNext(req, socket, head);
  }
});

startPersistLoop();
function shutdown() {
  persistAll();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.listen(PORT, () => console.log(`[plan] app + sync on :${PORT} (dev=${dev})`));
