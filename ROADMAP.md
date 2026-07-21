# ROADMAP — plan-app

Nordstern: unsere Miro-Variante für den Aditor-Use-Case — Ideen visualisieren und darüber Screen-Share-YouTube-Videos mit Facecam recorden. V2 = Sharing + Workspaces + Studio-Modus.

## Ready
1. **V2.1 — Live-Sync + Board-Sharing** · tldraw-v3-Upgrade, Sync-Server (Live-Cursor, gleichzeitiges Arbeiten), Share-Link pro Board, Asset-Uploads statt base64 im Snapshot. → Spec: [docs/superpowers/specs/2026-07-21-v2-sync-sharing-design.md](docs/superpowers/specs/2026-07-21-v2-sync-sharing-design.md) · **Fertig wenn:** `npm run build` + `tsc --noEmit` + `scripts/smoke-migration.mjs` + Playwright-Smokes (Upload, Zwei-Browser-Sync, Share-Link) grün; Screenshots in `reviews/assets/`.
2. **V2.3 — Studio-Modus** ⚠️ *erst starten, wenn V2.1 gemergt ist (braucht tldraw v3)* · Frames als Szenen mit Szenen-Panel, Studio-Modus (alles ausgeblendet, sanfte Kamerafahrten, Laser), Facecam-Bubble fürs externe Recording. → Spec: [docs/superpowers/specs/2026-07-21-v2-studio-mode-design.md](docs/superpowers/specs/2026-07-21-v2-studio-mode-design.md) · **Fertig wenn:** Build + `scripts/smoke-scenes.mjs` + Playwright-Smokes (Chrome-Hide, Fake-Camera) grün; Screenshots inkl. Bubble.

## In Review
- **V2.2 — Workspaces** · Frei anlegbare Workspaces („Aditor", „Content"), Switcher in der Sidebar, Boards verschiebbar; Migration ordnet Bestand „Aditor" zu. → Branch `nacht/2026-07-21-workspaces` · Report: [reviews/2026-07-21-workspaces.md](reviews/2026-07-21-workspaces.md) · Build + `smoke-workspaces` + Playwright-Move-Smoke grün.

## Später
- In-App-Recording (MediaRecorder-Export als Videodatei) — erst wenn der Studio-Modus im Alltag läuft.
- Viewer/Editor-Rollen auf Share-Links.
- Kommentare für Async-Feedback auf Boards.
- tldraw-Business-Lizenz, falls das „Made with tldraw"-Watermark stört.
