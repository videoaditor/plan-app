<!-- abnahme
repo: videoaditor/plan-app
branch: nacht/2026-07-22-v2-sync-sharing
base: main
title: "V2.1 — Live-Sync + Board-Sharing (tldraw v3, sync server, uploads, share links)"
status: fertig
preview: none
preview_url: none
verify: "npx tsc --noEmit · npm run build · node scripts/smoke-migration.mjs · node scripts/smoke-workspaces.mjs · npx playwright test (share/upload/workspaces) · node scripts/smoke-sync.mjs"
-->

# V2.1 — Live-Sync + Board-Sharing

Foundation of the V2 rework. Four sequential tasks, all built and verified. No deploy (per policy — Alan deploys after review).

## Was & Warum
Boards teilen war der meist-vermisste Baustein: heute überschreibt der Client alle 2 s den kompletten Board-Zustand, zwei gleichzeitige Sessions zerstören sich. Diese Schicht hebt die App auf tldraw v3, ersetzt das Snapshot-PUT durch einen echten Multiplayer-Sync-Server (ein Room pro Board, Live-Cursor mit Name + Farbe), zieht Bild-Assets als Uploads aus dem Board-JSON und gibt jedem Board einen Share-Link `/s/<token>`. Bestehende Boards laden nach dem Upgrade verlustfrei (Migrations-Smoke ist Pflicht und grün).

## Tasks & Verifikation

| Task | Inhalt | Verifiziert |
|---|---|---|
| **T1** | tldraw 2.4 → v3.15.6 (Paket-Rename, CSS, EmbedShape/ToolRail auf v3) | `tsc` clean · `build` grün · `smoke-migration` grün (4 Shapes inkl. media-embed überleben v2→v3) · Screenshot |
| **T2** | Asset-Upload `POST /api/upload` → `data/uploads/<sha256>.<ext>`, serviert unter `/uploads/`; Kompression bleibt davor | Playwright: Paste → Snapshot hat `/uploads/`-URL, kein `data:image`, URL liefert 200 |
| **T3** | Sync-Server (`sync-server/`, http+ws+TLSocketRoom, :3051), Room-Persistenz `data/rooms/<boardId>.json`, Seed aus sqlite; Client auf `useSync` | `smoke-sync`: zwei Kontexte syncen in <10 s · Shape überlebt Server-Neustart · Legacy-Board (nur sqlite) startet nicht leer |
| **T4** | Share-Token pro Board (additive Migration), TopBar-Share-Popover, `/s/<token>`-Route, Erstbesuch-Namens-Prompt | Playwright: `/s/<token>` öffnet Board mit gewähltem Namen · nach Token-Rotation liefert der alte Link 404 |

## Done-Checkliste (Spec)
- [x] `npm run build` grün + `npx tsc --noEmit` clean
- [x] `node scripts/smoke-migration.mjs` grün (V1-Fixture → v3-Store, Shape-Count identisch)
- [x] Playwright-Smokes grün: Upload (T2), Zwei-Browser-Sync + Restart-Persistenz (T3, via `scripts/smoke-sync.mjs`), Share-Link + Token-Rotation (T4)
- [x] Screenshots in `reviews/assets/`: `t1-fixture-board.png` · `t3-two-cursors.png` · `t4-share-popover.png` · `t4-name-prompt.png`
- [ ] *(Rollout, gehört Alan)* nach dem Deploy ein echtes Alt-Board auf plan.aditor.ai öffnen, bevor er weiterdeployt

## Rollout — kein Extra-Setup mehr
Production läuft über `server.mjs` (custom Next-Server): App **und** Sync auf **einem** Port, Sync unter `/sync`. plan.aditor.ai steht hinter Cloudflare, das WebSockets automatisch durchreicht — also **keine** nginx-Änderung, **keine** Env, **kein** zweiter Port. `deploy.sh` startet nur noch `plan-app` (= `npm start` → `server.mjs`) und entfernt den alten `plan-sync`-Prozess. Für Alan: **Deploy-Button drücken, fertig.** Falls live etwas klemmt: `git revert` des Merges + Deploy rollt zurück; Board-Daten in `data/` bleiben unangetastet.

## Offene Taste-Fragen
1. **tldraw v3 vs v5:** Der Spec pinnt `^3` — aktuell installiert 3.15.6. tldraws Latest ist inzwischen v5.2.5. Ich bin dem Spec gefolgt (kleinerer Migrationssprung, passende `@tldraw/sync@3.15.6`). Später auf v5 gehen oder auf v3 bleiben?
2. **Namens-Prompt-Reichweite:** Der Erstbesuch-Prompt erscheint aktuell beim ersten Öffnen *jedes* Boards (nicht nur bei Share-Links), weil die Presence überall einen Namen braucht. So lassen, oder nur auf `/s/<token>` beschränken und im Haupt-Flow einen Default-Namen nehmen?
3. **Upload-Fehler:** Schlägt ein Upload fehl, wird das Shape nicht angelegt (kein toter Placeholder). Einen sichtbaren Fehler-Toast gibt es nicht (die App hat kein Toast-System) — reicht das, oder soll ich ein minimales Toast nachrüsten?

## Technischer Report

<details>
<summary>Details</summary>

### Dependencies
- Entfernt: `@tldraw/tldraw@2.4`. Neu: `tldraw@^3.15.6`, `@tldraw/sync@^3.15.6`, `@tldraw/sync-core@^3.15.6`, `ws@^8` (+ `@types/ws`). Alle vom Spec explizit erlaubt (tldraw/sync + der WS-Server braucht `ws`; kein express — nur node `http`).

### T1 — Upgrade
- `@tldraw/tldraw` → `tldraw` in allen `src/`-Imports + `next.config` transpilePackages; CSS `tldraw/tldraw.css`.
- v3-API weitgehend stabil: `BaseBoxShapeUtil`, `AssetRecordType`, `GeoShapeGeoStyle`, `store.loadStoreSnapshot`/`getStoreSnapshot` unverändert nutzbar → EmbedShape/ToolRail/Handler brauchten keine Logikänderung.
- Fixture: `scripts/gen-v1-fixture.mjs` dumpt aus der laufenden 2.4-App einen echten Store-Snapshot (`scripts/fixtures/v1-snapshot.json`, 4 Shapes inkl. media-embed). `scripts/smoke-migration.mjs` lädt ihn headless (`@tldraw/store` + `createTLSchema`) in einen v3-Store und asserted Shape-/Asset-Count.

### T2 — Uploads
- `POST /api/upload` (multipart, node runtime): sha256 → `data/uploads/<hash>.<ext>`, Dedup über Hash, 25 MB Cap. `GET /uploads/<file>` streamt (Regex `^[a-f0-9]{64}\.[a-z0-9]+$` blockt Traversal, immutable Cache).
- `registerExternalAssetHandler`: Kompression (1 MB/2048 px) → `canvas.toBlob` → Upload; `src` ist die `/uploads/`-URL. Wirft bei Fehler → kein Shape mit totem `src`.
- ToolRail-Upload-Button lief vorher über `URL.createObjectURL` (blob:-URL, bricht bei Reload/Sync) → jetzt über denselben Handler.

### T3 — Sync
- `sync-server/index.mjs`: node `http` + `ws` + `TLSocketRoom` (ein Room == ein Board). `ws`-Socket erfüllt `WebSocketMinimal` → direkt an `handleSocketConnect`. Persistenz: 30-s-Intervall + `onSessionRemoved`(letzter Client) → `data/rooms/<boardId>.json`; Seed-Reihenfolge Room-Datei → sqlite-`snapshots`-Row → leer. Graceful persist auf SIGTERM.
- Client: `useSync({ uri, assets, userInfo, shapeUtils, bindingUtils })` ersetzt Snapshot-GET/PUT + Debounce-Save. Wichtig: `useSync` merged (anders als `<Tldraw>`) die Defaults NICHT automatisch → `defaultShapeUtils`/`defaultBindingUtils` + `EmbedShapeUtil` explizit übergeben, damit Client- und Server-Schema übereinstimmen (sonst „arrow binding depends on missing arrow shape migration").
- Presence: `id`/`name`/`color` aus localStorage.
- **Prod-Transport:** `server.mjs` (custom Next-Server) serviert App + Sync (`/sync`) auf einem Port; `sync-server/rooms.mjs` ist die geteilte Room-Logik (dev nutzt die Standalone-Variante auf :3051). Client wählt die uri: prod `wss://<host>/sync`, dev `ws://<host>:3051`. Kein nginx/Env nötig — Cloudflare reicht WS durch.

### T4 — Share-Links
- `migrate.mjs`: additive `share_token`-Spalte + Unique-Index + Backfill; `genShareToken()` (kein nanoid-Dep). Neue Boards bekommen beim Anlegen einen Token; Rotation via `POST /api/boards/[id]/share`.
- `/s/[token]/page.tsx` (Server-Component, `force-dynamic`) löst Token → Board auf; unbekannt → `not-found.tsx`. `BoardView` (geteilt zwischen `/board/[id]` und `/s/[token]`) gated die Canvas hinter `NamePrompt`.
- TopBar-Share-Popover folgt dem Overlay-Muster (`var(--surface)`, 1px Border, `shadow-float`, radius): Link kopieren + „Generate new link".

### Verifikation (Auszug)
```
tsc: OK
smoke-migration: ✓ 4 shapes, 1 assets survived v2→v3 (text, geo, image, media-embed)
smoke-workspaces: ✓
playwright: 3 passed (share, upload, workspaces)
smoke-sync: ✓ live sync · ✓ restart persistence · ✓ sqlite seed (4 shapes)
build: ✓ compiled, all routes present
```
</details>
