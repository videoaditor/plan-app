# V2.2 — Workspaces — Spec   ·   Größe: M (2 Tasks)

Unabhängig von V2.1 baubar (reines DB+Sidebar-Thema, berührt den Canvas nicht).

## Warum
Alan mischt aktuell Aditor-Arbeit und privates Content-Zeug in einer einzigen flachen Board-Liste. Zwei Welten, ein Topf — beim Sharen mit Team-Membern (V2.1) wird das auch noch peinlich. Workspaces trennen die Kontexte sauber.

## Was
Frei anlegbare Workspaces (z. B. „Aditor", „Content"), jeder mit eigener Board-Liste. Oben in der Sidebar ein Workspace-Switcher (Name + Farbpunkt). Boards lassen sich per Kontextmenü in einen anderen Workspace verschieben. Share-Links (V2.1) bleiben pro Board und ignorieren Workspaces.

## Grenzen
- **Muss:** Migration ordnet ALLE bestehenden Boards dem Default-Workspace „Aditor" zu; ein zweiter Workspace „Content" wird gleich mit angelegt. Löschen eines Workspace nur, wenn er leer ist.
- **Darf nicht:** Keine Workspace-Rechte/Mitglieder (Sharing bleibt pro Board). Kein Umbau der Board-Kacheln/Canvas. Keine neuen Dependencies (Ausnahme: Playwright als devDep, falls V2.1 es noch nicht installiert hat).
- **Out of Scope (YAGNI):** Verschachtelte Ordner in Workspaces, Workspace-Sharing, Sortier-/Filteroptionen.

## Ausgangslage
- **DB:** `src/lib/db.ts` — additive Migration im bestehenden `CREATE TABLE IF NOT EXISTS`-Stil; `ALTER TABLE boards ADD COLUMN workspace_id` in try/catch (sqlite kennt kein IF NOT EXISTS für Spalten).
- **API:** `src/app/api/boards/route.ts` — bestehendes dünnes Route-Muster kopieren für `/api/workspaces`.
- **UI:** `src/components/Sidebar.tsx` (Board-Liste, Kontextmenü, Farb-Icons — bestehendes Popover-/Hover-Muster wiederverwenden), `src/app/page.tsx` (Board-Übersicht).
- **Entschieden (nicht neu verhandeln):** frei anlegbare Workspaces, kein Ordner-Modell.

## Tasks
- **T1 — Datenmodell + API.** `workspaces` (id, name, color, sort, created_at) + `boards.workspace_id`. Migration beim DB-Init: Workspace „Aditor" + „Content" anlegen (idempotent: nur wenn Tabelle leer), alle Boards ohne workspace_id → „Aditor". CRUD `/api/workspaces` (DELETE nur bei leerem Workspace → sonst 409), `GET /api/boards?workspace=<id>`, `PUT /api/boards/:id` akzeptiert `workspaceId`. · Dateien: `src/lib/db.ts`, `src/app/api/workspaces/route.ts`, `src/app/api/boards/**`, `src/lib/boards.ts` · **Verifiziert:** Node-Smoke `scripts/smoke-workspaces.mjs`: frische DB → 2 Workspaces existieren, `SELECT count(*) FROM boards WHERE workspace_id IS NULL` = 0, Delete auf nicht-leeren Workspace schlägt fehl; zweiter Lauf ändert nichts (Idempotenz).
- **T2 — Switcher + Verschieben.** Sidebar: Workspace-Switcher ganz oben (aktueller Name + Farbpunkt, Dropdown: wechseln · anlegen · umbenennen · löschen-wenn-leer); Board-Liste zeigt nur den aktiven Workspace (Auswahl in localStorage). Board-Kontextmenü: „Move to …". · Dateien: `src/components/Sidebar.tsx`, `src/app/page.tsx` · **Verifiziert:** Playwright: Board in „Content" verschieben → verschwindet aus „Aditor"-Liste, erscheint nach Switch; Screenshot Switcher offen.

## Done   (maschinell prüfbar)
- `npm run build` grün, `npx tsc --noEmit` clean.
- `node scripts/smoke-workspaces.mjs` grün (inkl. Idempotenz-Doppellauf).
- Playwright-Move-Smoke grün; Screenshots in `reviews/assets/` (Switcher offen · Move-Menü).

## Stop & Eskalation
- Unklar, wohin ein Board bei Workspace-Löschung soll → gibt es nicht (nur leere löschen); falls der Fall doch auftaucht: stoppen, nicht auto-verschieben.
- Konflikt mit parallel gemergtem V2.1-Schema → stoppen + Diagnose statt Migrations-Raterei.
- Jede Produktentscheidung außerhalb des Specs → Taste-Frage in den PR-Body.

## Doctrine-Gate
- [x] **M1** Spec-first: Purpose + Non-Goals explizit; bewusst klein gehalten (kein Ordner-Baum).
- [x] **M2** Start simple: eine Tabelle, eine Spalte, ein Dropdown. Kein Rechte-Modell.
- [x] **M3** Loop-first: Done = Build + 2 Smokes + Screenshots; Stop-Regeln explizit.
- [x] **1 State:** SSoT = sqlite (`workspaces`, `boards.workspace_id`); localStorage hält nur die UI-Auswahl.
- [x] **2 Separation of Concerns:** Migration/CRUD in `db.ts` + Routes; Sidebar rein darstellend.
- [x] **3 Idempotenz:** Seed nur bei leerer Tabelle; Migration re-runnable; Smoke prüft Doppellauf.
- [x] **4 Coupling:** Vertrag = `boards.workspace_id` (FK) + `GET /api/boards?workspace=`; V2.1 bleibt unberührt (Share pro Board).
- [x] **5 Context Window:** N/A (kein LLM im Loop).
- [x] **6 Error-Taxonomie:** Delete auf nicht-leer → 409 + UI-Hinweis · unbekannte workspace_id im Filter → leere Liste, kein Crash.
- [x] **7 Defensive Design:** Migration additiv, löscht nie; Boards ohne Workspace fallen immer auf „Aditor" zurück.
- [x] **F1 Richtiger Hebel:** Datenmodell zuerst, UI folgt.
- [x] **Tests:** Node-Smoke gegen frische sqlite-Datei (pure, kein laufender Server nötig).
