# V2.1 — Live-Sync + Board-Sharing — Spec   ·   Größe: L (4 sequenzielle Tasks, ein Ready-Item)

Fundament des V2-Reworks. Die Specs V2.2 (Workspaces) und V2.3 (Studio-Modus) bauen hierauf auf — V2.3 zwingend (braucht tldraw v3).

## Warum
Boards teilen ist der meist-vermisste Baustein: Alan will sich mit Team-Membern auf einem Board koordinieren. Heute unmöglich — der Client überschreibt alle 2 s den kompletten Board-Zustand (`PUT /snapshot`, last-writer-wins), zwei gleichzeitige Sessions zerstören sich gegenseitig. Außerdem hängt die App auf tldraw 2.4; echtes Multiplayer gibt es erst mit tldraw v3 + `@tldraw/sync`.

## Was
1. **tldraw v3** (Package heißt jetzt `tldraw`, nicht `@tldraw/tldraw`). Alle bestehenden Boards laden nach dem Upgrade fehlerfrei (tldraw migriert Snapshots beim Load).
2. **Sync-Server** als zweiter PM2-Prozess auf dem VPS (Node + WebSocket, `TLSocketRoom` aus `@tldraw/sync-core`, Port 3051). Ein Board = ein Room (`roomId == boardId`). Live-Cursor mit Name + Farbe.
3. **Share-Link pro Board:** „Share"-Button in der TopBar → Link `/s/<token>` kopieren. Wer den Link hat, kann editieren. „Neuen Link erzeugen" macht den alten ungültig. Beim Erstbesuch wählt man nur einen Namen (localStorage).
4. **Assets raus aus dem Snapshot:** Bilder liegen heute als base64 IM Board-JSON — über WebSocket untragbar. Upload-Endpoint → `data/uploads/<contenthash>.<ext>`, statisch serviert, Snapshot referenziert nur die URL.

## Grenzen
- **Muss:** Bestehende Boards öffnen nach dem Upgrade ohne Datenverlust (Migrations-Smoke ist Pflicht, T1). Zwei Browser auf demselben Board sehen die Änderungen des jeweils anderen live. Sharing ohne Login.
- **Darf nicht:** Keine Accounts, Rollen oder Rechte — Link = Edit-Zugriff, Punkt. Kein Canvas-UI-Redesign. Keine weiteren Dependency-Upgrades außer tldraw/sync (+ Playwright als devDep für die Smokes). Das „Made with tldraw"-Watermark von v3 bleibt sichtbar — keine Lizenz-Umgehung.
- **Out of Scope (YAGNI):** Viewer/Editor-Rollen, Kommentare, Versionshistorie, Offline-Konfliktauflösung, In-App-Recording.

## Ausgangslage
- **Canvas + Persistenz:** `src/components/TldrawCanvas.tsx` — Snapshot-Load/-Save (Z. 353–421), External-Content-Handler (Paste/Drop/URL-Embed, Z. 468–644). Die Fokus-Hacks darin sind hart erkämpft — nicht entfernen (siehe CLAUDE.md Geschmacksregeln).
- **Custom Shape:** `src/components/shapes/EmbedShape.tsx` (YouTube/Vimeo/Video) — muss auf v3-ShapeUtil-API migriert werden.
- **DB:** `src/lib/db.ts` — sqlite `boards` + `snapshots`. Migrationen additiv halten (CREATE/ALTER in try, wie das bestehende `CREATE TABLE IF NOT EXISTS`-Muster).
- **Server-Referenz:** offizielles tldraw-Sync-Node-Beispiel (tldraw-Repo, `templates/simple-server-example`; Doku: tldraw.dev „sync"). Diesem Template folgen, keinen eigenen Sync erfinden.
- **Entschieden (nicht neu verhandeln):** Zugang = Invite-Link pro Board · Live-Multiplayer = ja · kein Login.

## Tasks
- **T1 — tldraw v3 Upgrade (ohne Sync).** Erst-Commit VOR dem Upgrade: Script erzeugt mit dem noch installierten tldraw 2.4 eine V1-Snapshot-Fixture (`scripts/fixtures/v1-snapshot.json` — Store mit Text, Geo, Image-Asset und einem `media-embed`-Shape, per `getStoreSnapshot()` gedumpt; die echte Prod-DB liegt auf dem VPS und ist nachts nicht erreichbar). Dann `@tldraw/tldraw@2.4` → `tldraw@^3`, Imports/APIs migrieren (EmbedShape, ToolRail-Tool-IDs, Components-Overrides, `loadSnapshot`/`getSnapshot`). Migrations-Smoke: `scripts/smoke-migration.mjs` lädt die Fixture in einen v3-Store und asserted: kein Throw, Shape-Anzahl identisch. · Dateien: `package.json`, `src/components/**`, `scripts/` · **Verifiziert:** `npm run build` grün + Smoke grün + Screenshot eines Boards mit den Fixture-Shapes.
- **T2 — Asset-Upload statt base64.** `POST /api/upload` (multipart) → `data/uploads/<sha256>.<ext>` (Dedup über Hash), serviert unter `/uploads/`. `registerExternalAssetHandler` lädt hoch statt data-URL zu bauen; Kompressions-Logik (1 MB / 2048 px) bleibt davor geschaltet. · Dateien: `src/app/api/upload/route.ts`, `TldrawCanvas.tsx`, `next.config.mjs` · **Verifiziert:** Playwright: Bild pasten → gespeicherter Snapshot enthält `/uploads/`-URL und kein `data:image`.
- **T3 — Sync-Server + Client-Umstellung.** `sync-server/` (express + ws + `TLSocketRoom`, Port 3051): Room-Snapshots persistiert nach `data/rooms/<boardId>.json` (bei Room-Close + alle 30 s); lädt beim ersten Join den bestehenden `snapshots`-Eintrag aus sqlite als Seed (einmalig, damit kein Board leer startet). Client: `useSync` statt Snapshot-PUT; Presence = Name + Farbe. Debounce-Save-Code entfernen. `deploy.sh` startet den zweiten PM2-Prozess (`plan-sync`). · Dateien: `sync-server/`, `TldrawCanvas.tsx`, `src/app/board/[id]/page.tsx`, `deploy.sh`, `package.json` · **Verifiziert:** Playwright-Smoke: zwei Browser-Kontexte auf demselben Board, Shape in A erscheint binnen 10 s in B; Server-Neustart → Shapes noch da.
- **T4 — Share-Links.** `boards.share_token` (nanoid, Spalte additiv migrieren). TopBar-Share-Popover: Link kopieren · „Neuen Link erzeugen" (Token rotieren). Route `/s/<token>` → Board auflösen, unbekannter Token → schlichte 404-Seite. Erstbesuch ohne gespeicherten Namen → Namens-Prompt (localStorage), fließt in die Presence ein. · Dateien: `src/lib/db.ts`, `src/app/api/boards/**`, `src/components/TopBar.tsx`, `src/app/s/[token]/page.tsx` · **Verifiziert:** Playwright: `/s/<token>` öffnet das Board mit gewähltem Namen; nach Token-Rotation liefert der alte Link 404.

## Done   (maschinell prüfbar)
- `npm run build` grün und `npx tsc --noEmit` clean.
- `node scripts/smoke-migration.mjs` grün (V1-Fixture lädt in v3-Store, Shape-Count identisch).
- Playwright-Smokes grün: Upload (T2), Zwei-Browser-Sync + Restart-Persistenz (T3), Share-Link + Token-Rotation (T4).
- Screenshots in `reviews/assets/`: Board mit Fixture-Shapes nach Upgrade · zwei Cursor auf einem Board · Share-Popover · Namens-Prompt.
- *(Nicht maschinell, gehört zum Rollout: Alan öffnet nach dem Deploy ein echtes Alt-Board auf plan.aditor.ai, bevor er weiterdeployt — steht so im PR-Body.)*

## Stop & Eskalation
- Migrations-Smoke schlägt fehl oder Shapes fehlen nach dem v3-Load → **stoppen** (Datenverlust-Risiko), Diagnose in den PR, nichts „reparieren" durch Neu-Anlegen.
- EmbedShape lässt sich nicht sauber auf v3 migrieren → stoppen + dokumentieren, das Shape NICHT stillschweigend droppen.
- Das offizielle Sync-Node-Template ist nicht auffindbar/inkompatibel → stoppen; keinen eigenen Sync-Mechanismus improvisieren.
- Peer-Dependency-Konflikte (React etc.): 3 ernsthafte Versuche, dann Status `nicht-geschafft` mit Diagnose.
- Jede Produktentscheidung, die hier nicht steht → Taste-Frage in den PR-Body, nie raten.

## Doctrine-Gate
- [x] **M1** Spec-first: Purpose + Non-Goals explizit; Altitude = Sketch (Template-Verweise statt Vollcode).
- [x] **M2** Start simple: offizielles tldraw-Sync-Template statt Eigenbau; sqlite + Dateisystem statt neuer Infra; kein Auth-System.
- [x] **M3** Loop-first: Done = Build + 3 Smokes + Screenshots (maschinell); Stop & Eskalation explizit.
- [x] **1 State:** SSoT = `data/` auf dem Server (sqlite für Boards/Tokens, `data/rooms/` für Live-Dokumente, `data/uploads/` für Assets). Client-IndexedDB ist nur Cache. Durable-first: Room persistiert, bevor der Prozess stirbt (Close + 30-s-Intervall).
- [x] **2 Separation of Concerns:** Sync-Server eigener Prozess; Upload-Route isoliert; Token-Logik in `db.ts`/API, nicht im Canvas.
- [x] **3 Idempotenz:** Upload-Dedup = Content-Hash; DB-Migrationen additiv/re-runnable; Seed aus `snapshots` nur beim ersten Room-Join.
- [x] **4 Coupling:** Verträge explizit — `roomId == boardId` · Asset-URL `/uploads/<sha256>.<ext>` · Share-URL `/s/<token>` · Room-Persistenz `data/rooms/<boardId>.json`.
- [x] **5 Context Window:** N/A (kein LLM im Loop); Tasks sind einzeln buildbar, T1 allein ist ein reviewbarer Commit.
- [x] **6 Error-Taxonomie:** WS-Verbindung weg → Client reconnected (tldraw-sync-Default), kein Datenverlust (Room hält Zustand) · Room-Persist schlägt fehl → loggen + weiter servieren, beim nächsten Intervall erneut · unbekannter Token → 404, kein Retry · Upload schlägt fehl → Fehler-Toast, Shape wird nicht angelegt.
- [x] **7 Defensive Design:** Fail-and-recover — ein kaputter Room reißt den Server nicht (Room-Fehler isoliert); Migration liest alt, schreibt neu, löscht nie.
- [x] **F1 Richtiger Hebel:** erst Datenvertrag (Rooms/Assets/Tokens) fixiert, dann UI.
- [x] **Tests:** Smokes sind gezielte Skripte (Migration pure per Node-Script; Sync/Share als schmale Playwright-Checks), kein Test-Framework-Aufbau.
