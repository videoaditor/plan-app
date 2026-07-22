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

# Restart PM2 — try restart first, if fails delete and recreate.
# plan-app now runs server.mjs (npm start), which serves the app AND the sync
# WebSocket on the same port — no separate sync process, no extra server config.
pm2 restart plan-app 2>&1 || {
  echo "[$(date -Iseconds)] Restart failed, recreating..."
  pm2 delete plan-app 2>&1 || true
  pm2 start npm --name plan-app -- start 2>&1
}

# Old two-process layout used a separate plan-sync — remove it if present.
pm2 delete plan-sync 2>&1 || true

pm2 save 2>&1 || true

echo "[$(date -Iseconds)] Deploy complete ✓"
