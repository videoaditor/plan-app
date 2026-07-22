// Dev runner: starts the Next app (:3050) AND the sync server (:3051) together,
// so a single `npm run dev` loads boards (useSync needs the sync server, else the
// canvas hangs on its loading spinner). Kills both children on exit.
import { spawn } from "node:child_process";

const run = (args) => spawn("npm", ["run", ...args], { stdio: "inherit" });
const procs = [run(["dev:app"]), run(["sync"])];

let exiting = false;
function killAll(code) {
  if (exiting) return;
  exiting = true;
  for (const p of procs) {
    try {
      p.kill("SIGTERM");
    } catch {
      // already gone
    }
  }
  process.exit(code ?? 0);
}

process.on("SIGINT", () => killAll(0));
process.on("SIGTERM", () => killAll(0));
for (const p of procs) p.on("exit", (code) => killAll(code ?? 0));
