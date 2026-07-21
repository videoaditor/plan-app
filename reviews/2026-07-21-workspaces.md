<!-- abnahme
repo: videoaditor/plan-app
branch: nacht/2026-07-21-workspaces
base: main
title: V2.2 — Workspaces
status: fertig
preview: none
preview_url: none
verify: npm run build · npx tsc --noEmit · npm run smoke:workspaces · npm run test:e2e
-->

# V2.2 — Workspaces — Nachtschicht-Report (2026-07-21)

## Kurz
Workspaces trennen Aditor-Arbeit von privatem Content. Neuer Workspace-Switcher oben in der Sidebar, Board-Liste zeigt nur den aktiven Workspace, Boards lassen sich per „Move to…" verschieben. Migration legt „Aditor" + „Content" an und ordnet alle bestehenden Boards „Aditor" zu.

## Screenshots
- Switcher offen: `reviews/assets/switcher-open.png`
- Move-Menü: `reviews/assets/move-menu.png`

## Was gebaut wurde (Spec-Tasks)

### T1 — Datenmodell + API
- `src/lib/migrate.mjs` (neu): Single-Source-of-Truth für Schema + Seed. Additiv/idempotent — `CREATE TABLE IF NOT EXISTS workspaces`, `ALTER TABLE boards ADD COLUMN workspace_id` in try/catch (sqlite kennt kein IF-NOT-EXISTS für Spalten), Seed nur bei leerer Workspace-Tabelle, Backfill aller `workspace_id IS NULL`-Boards auf den ersten Workspace. `src/lib/db.ts` ruft nur noch `migrate(db)`.
- Warum ausgelagert: Der Smoke testet damit die **echte** Migrationslogik statt einer Kopie — kein Drift.
- `src/app/api/workspaces/route.ts` (GET/POST) + `src/app/api/workspaces/[id]/route.ts` (PUT rename/recolor, DELETE nur bei leerem Workspace → sonst **409**).
- `src/app/api/boards/route.ts`: `GET ?workspace=<id>`-Filter, `workspaceId` im Payload, POST akzeptiert `workspaceId` (Default = erster Workspace).
- `src/app/api/boards/[id]/route.ts`: PUT akzeptiert `workspaceId` (der Move-Write-Pfad); GET liefert `workspaceId`.
- `src/lib/boards.ts`: `Board.workspaceId`, `Workspace`-Typ + `getWorkspaces/createWorkspace/renameWorkspace/deleteWorkspace`, `moveBoard`, `getBoards(workspaceId?)`.

### T2 — Switcher + Verschieben
- `src/components/Sidebar.tsx`: Switcher-Pill oben (Farbpunkt + Name + Chevron), Dropdown im bestehenden `.context-menu`-Muster (wechseln · New workspace · Rename workspace · Delete-wenn-leer). Board-Liste auf aktiven Workspace gefiltert, Auswahl in `localStorage`. Board-Kontextmenü um „Move to…" → Ziel-Workspace erweitert.
- Aktiver Workspace wird **einmal beim Mount** aufgelöst (bevorzugt der Workspace des offenen Boards, dann `localStorage`, dann erster). Bewusst kein Live-„Follow": das offene Board in einen anderen Workspace zu verschieben soll es aus der aktuellen Liste verschwinden lassen (so verlangt es der Move-Smoke).

## Verifikation (alle grün)
| Check | Ergebnis |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm run build` | Compiled successfully; `/api/workspaces` + `/api/workspaces/[id]` registriert |
| `npm run smoke:workspaces` | ✓ — 2 Workspaces, `count(boards WHERE workspace_id IS NULL) = 0`, Delete-Guard (non-empty verweigert / empty erlaubt), Idempotenz-Doppellauf ändert nichts |
| `npm run test:e2e` (Playwright) | ✓ 1 passed — Board von Aditor → Content verschoben verschwindet aus der Aditor-Liste und erscheint nach dem Switch |

## Entscheidungen / Notizen
- **V2.1 (oberstes Ready-Item) bewusst zurückgestellt.** Es ist ein L-Item: tldraw-Major-Upgrade + neuer WebSocket-Sync-Server (zweiter PM2-Prozess) + Zwei-Browser-/Restart-Playwright-Smokes, mit expliziten Datenverlust-STOP-Regeln. Unbeaufsichtigt in einer Nacht nicht sauber bis zur „Done"-Latte zu bringen; ein halbfertiges V2.1 wäre ein großer, unreviewbarer PR mit Migrationsrisiko. Empfehlung: V2.1 in einer Tagsession oder nach T1 (Upgrade-only) splitten. V2.2 ist laut Spec unabhängig und komplett lieferbar — deshalb diese Nacht V2.2.
- **Workspace-Farben:** Aditor = `#F5D547` (accent-yellow), Content = `#2563EB` (accent-blue) — nur bestehende Palette, keine neuen Farbwelten (Geschmacksregeln).
- **Dev-Doppel-Boards:** In `next dev` erzeugt React StrictMode den Auto-Seed-Redirect (`/` → createBoard) doppelt → zwei „My First Board" lokal. Vorbestehend, produktionsirrelevant (StrictMode nur im Dev); der Smoke legt daher ein eigenes eindeutig benanntes Board an. Nicht Teil dieses Items.
- **Playwright** als devDep neu (`@playwright/test`), vom Spec ausdrücklich erlaubt. `playwright.config.ts` startet `npm run dev` auf 3050. Kein anderer Dependency-Change.
- **Deploy-Policy eingehalten:** kein Deploy, kein SSH/PM2/VPS, keine externen Writes. `data/` bleibt gitignored (keine DB im Commit).

## Offene Taste-Fragen
1. **Zweiter Default-Workspace „Content" sinnvoll?** Ich lege beim Seed „Aditor" + „Content" an (so im Spec). Falls du lieber nur „Aditor" willst und „Content" selbst anlegst — sag Bescheid, ist eine Zeile im Seed.
2. **Verschieben des gerade offenen Boards:** aktuell verschwindet es aus der Liste (du bleibst im aktuellen Workspace), das Canvas zeigt es weiter. Alternative wäre „Sidebar folgt dem Board in den neuen Workspace". Ich hab bewusst Ersteres gewählt (klarer, und der Move ist im UI sichtbar). Okay so?
