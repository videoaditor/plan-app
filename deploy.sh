#!/bin/bash
set -e
cd /opt/plan-app-deploy

echo "[$(date -Iseconds)] Starting deploy..."

# Pull latest
git pull origin main 2>&1 || { echo "[$(date -Iseconds)] git pull failed"; exit 1; }
echo "[$(date -Iseconds)] Git pulled"

# Install deps (clean install only if needed)
npm install 2>&1 || { echo "[$(date -Iseconds)] npm install failed"; exit 1; }

# Ensure typescript is present (required for @/ path aliases)
if [ ! -f node_modules/typescript/package.json ]; then
  npm install typescript --save-dev 2>&1
fi
echo "[$(date -Iseconds)] Deps ready"

# Clean build
rm -rf .next
npm run build 2>&1 || { echo "[$(date -Iseconds)] Build failed"; exit 1; }
echo "[$(date -Iseconds)] Build complete"

# Restart PM2 — try restart first, if fails delete and recreate
pm2 restart plan-app 2>&1 || {
  echo "[$(date -Iseconds)] Restart failed, recreating..."
  pm2 delete plan-app 2>&1 || true
  pm2 start npm --name plan-app -- start 2>&1
}

# Sync server (V2.1) — second process, port 3051. One TLSocketRoom per board.
pm2 restart plan-sync 2>&1 || {
  echo "[$(date -Iseconds)] plan-sync restart failed, recreating..."
  pm2 delete plan-sync 2>&1 || true
  pm2 start node --name plan-sync -- sync-server/index.mjs 2>&1
}

pm2 save 2>&1 || true

echo "[$(date -Iseconds)] Deploy complete ✓"

# ── Rollout note (one-time, done by Alan, not this script) ─────────────
# The browser must reach the sync server over wss. Add an nginx location that
# proxies /sync/ → http://127.0.0.1:3051/ with Upgrade/Connection headers, and
# set NEXT_PUBLIC_SYNC_URL=wss://plan.aditor.ai/sync in the app env before build.
# Without it the client falls back to ws://<host>:3051 (dev only).
