// Standalone sync server for local dev (port 3051). Production instead serves
// sync on the app's own port via server.mjs — both share sync-server/rooms.mjs.
import http from "node:http";
import { WebSocketServer } from "ws";
import { handleConnection, startPersistLoop, persistAll } from "./rooms.mjs";

const PORT = Number(process.env.SYNC_PORT) || 3051;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("plan-sync ok");
});

const wss = new WebSocketServer({ server });
wss.on("connection", (socket, req) => handleConnection(socket, req));

startPersistLoop();

function shutdown() {
  persistAll();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.listen(PORT, () => console.log(`[plan-sync] listening on :${PORT}`));
