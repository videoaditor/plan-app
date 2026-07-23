# ROADMAP → Board — der Aditor-Use-Case den die App im Namen trägt — Spec (PROPOSED)

**Status: proposed (Nordstern) · Evidenz:** plan-app ist laut eigenem ROADMAP-Kopf **„unsere Miro-Variante für den Aditor-Use-Case"** — interne Strategie visualisieren. Genau diese interne Strategie lebt heute als Markdown-`ROADMAP.md` + `NORTHSTARS.md` über **7 Repos** (aditor-ops, -hub, -agent, capper, dispatch-agent, admixer, plan-app). Alan gatet **jeden Morgen** in der Abnahme über diese Dokumente; die Nordstern-Routine und die Nachtschichten lesen sie **täglich, in jedem Repo** (dieser Lauf selbst ist der Beleg — er hat gerade 7 ROADMAPs + NORTHSTARS.md gescannt). Die „umfassende Übersicht in Minuten", die der Nordstern verspricht, ist für Aditor **buchstäblich der Cross-Repo-Roadmap-Stand** — und die gibt es heute nur als 7 getrennte Textdateien, nirgends als eine Fläche.

> Nordstern (plan-app): *umfassende Übersichten in Minuten statt Stunden.* Metrik: **Time-to-Overview ↓ · wöchentlich aktive Pläne ↑**. Denk-Anker (NORTHSTARS): *Rockefeller — ein Tool statt fünf; kuratieren statt anhäufen.*

## Warum
Der einzige Ort, an dem der Gesamt-Stand aller Aditor-Initiativen sichtbar wird, ist heute „sieben Dateien nacheinander lesen". Das ist die Stunden-Arbeit, die der Nordstern töten will — und der Use-Case, für den die App gebaut wurde, sitzt ungenutzt daneben. Diese Spec zieht eine oder mehrere `ROADMAP.md` in ein Board: pro Repo ein Frame, pro Roadmap-Sektion (`## Ready`, `## In Review`, `## Später`) eine Spalte/Gruppe, pro Item ein Node mit seinem Status-Tag. Ergebnis: der komplette Cross-Repo-Stand als eine scanbare Fläche in Sekunden — und weil es ein echtes Board ist, weiter-annotierbar (Pfeile zwischen abhängigen Items, Prioritäts-Marker).

## Was
1. **Baut auf `Instant-Overview` (T1/T2) auf.** Nutzt denselben Parser/Layout-Kern (`outline.ts`/`outlineToShapes.ts`); Markdown-Header (`## …`) → Gruppen, `### Item` / `- Item` → Nodes, `` `#tag` `` → Status-Chip am Node. **Sequenz-Gate: erst NACH Merge von `Instant-Overview`.**
2. **Ein Frame pro Repo** — passt in die V2.2-**Workspaces** (ein Workspace „Aditor-Roadmaps", ein Board, N Frames). Reuse, kein neues Konzept.
3. **Quelle = eingefügter Text (v1).** Man kopiert eine `ROADMAP.md` rein → Frame. Kein Git-/GitHub-Fetch, kein Token, kein Netzwerk im Client. (Auto-Pull ist explizit v2 und braucht eine eigene Entscheidung — siehe Stop.)
4. **Status-Chips.** `#ready`/`#built-pr-open`/`#built-merged`/`#blocked-alan` → farbcodierter Chip (dark-mode-Palette). Rein visuell, kein Datenmodell.

## Grenzen
- **Muss:** Eine echte `ROADMAP.md` (z. B. aus einem der 7 Repos) rein → lesbares, überlappungsfreies Frame mit Sektions-Gruppen + Status-Chips.
- **Darf nicht:** Kein GitHub-Fetch/Token/Sync im Client (v1). Keine schweren PM-Features (Gantt/Board-Sync/Fälligkeiten) — Anti-Goal. Keine neuen Dependencies.
- **Out of Scope (YAGNI):** Live-Sync mit den Repos, Zwei-Wege-Edit (Board → ROADMAP.md), Cross-Item-Abhängigkeits-Autoerkennung. Bleibt eine effortless Lese-Übersicht.

## Ausgangslage
- Parser/Layout kommen aus `Instant-Overview` (Markdown ist eine Outline-Obermenge → dortigen Parser um `##`/`###`/`` `#tag` ``-Erkennung erweitern, nicht neu bauen).
- Workspaces (V2.2) + Frame-Konvention (V2.3 `scenes.ts`) existieren — beide wiederverwendet.

## Tasks
- **T1 — Markdown-Erweiterung des Outline-Parsers.** `##`→Gruppe, `###`/`-`→Item, `` `#tag` ``→Status. · **Verifiziert:** Node-Smoke gegen eine echte `ROADMAP.md`-Fixture → erwartete Gruppen/Items/Tags.
- **T2 — Repo-Frame-Layout.** Eine Roadmap → ein Frame mit Sektions-Spalten + Status-Chips (dark palette). · **Verifiziert:** Node-Smoke: Sektionszahl = Spaltenzahl, keine Overlaps; Playwright-Screenshot eines gerenderten Roadmap-Frames.
- **T3 — Workspace-Einstieg.** „Roadmap einfügen"-Aktion im Aditor-Workspace; mehrere nebeneinander. · **Verifiziert:** Playwright: zwei ROADMAPs → zwei Frames nebeneinander; Screenshot.

## Done (maschinell prüfbar)
- `npm run build` grün, `npx tsc --noEmit` clean.
- Node-Smoke grün (Markdown-Parse gegen echte ROADMAP-Fixture + Overlap-Assert).
- Playwright-Smoke grün: zwei eingefügte ROADMAPs → zwei Frames.
- Screenshot in `reviews/assets/`: ein Repo-Roadmap-Frame mit Status-Chips.

## Stop & Eskalation
- `Instant-Overview` noch nicht gemerged → **nicht bauen** (Sequenz-Gate), Item bleibt Proposal.
- **Produktentscheidung offen (Taste-Fragen an Alan):** (a) Ist die Text-Paste-Quelle genug, oder will Alan echten GitHub-Auto-Pull (dann eigene Spec: Token, Rate-Limits, welcher Client)? (b) Reicht ein interner Aditor-Workspace, oder wird „Roadmap-Board" ein Feature für alle plan-app-Nutzer (Skalierungsfrage)?
- Markdown der 7 Repos ist uneinheitlich (Tags mal `#ready`, mal `status: ready`) → Parser tolerant halten, Varianten im PR listen, nicht raten.

## Doctrine-Gate
- [x] **M1** Spec-first: Purpose (Cross-Repo-Overview in Minuten) + Non-Goals (kein Git-Sync, keine PM-Features) explizit.
- [x] **M2** Start simple: Text-Paste statt GitHub-Integration; Reuse von Instant-Overview + Workspaces + Frame-Konvention; null neue Dependencies.
- [x] **M3** Loop-first: Done = Build + Node-Smoke gegen echte Fixture + Playwright + Screenshot.
- [x] **1 State:** Ergebnis = normale tldraw-Shapes im Board; die ROADMAP.md bleibt SSoT im jeweiligen Repo, das Board ist eine Momentaufnahme (kein Zwei-Wege-Zustand).
- [x] **2 Separation of Concerns:** Parser-Erweiterung pure + gegen Fixture testbar; Layout und Workspace-Einstieg getrennt.
- [x] **3 Idempotenz:** erneutes Einfügen = neues Frame (bewusst, kein Merge/Sync) — im UI klargestellt.
- [x] **4 Coupling:** loses Coupling zur Repo-Welt über *Text-Paste*, kein API-Vertrag mit GitHub in v1 (bewusst, hält den Client tokenfrei).
- [x] **5 Context Window:** N/A — deterministischer Parser, kein LLM.
- [x] **6 Error-Taxonomie:** Nicht-Roadmap-Markdown → generisches Outline-Board (Fallback auf Instant-Overview-Verhalten) · unbekanntes Tag → neutraler Chip · leere Sektion → leere Gruppe, kein Crash.
- [x] **7 Defensive Design:** additiv; scheitert die Roadmap-Erkennung, fällt es auf ein normales Outline-Board zurück statt zu crashen.
- [x] **F1 Richtiger Hebel:** Erst Instant-Overview (Fundament), dann Markdown-Layer darauf — kein Parallel-Parser.
- [x] **Anti-Goal-Check:** Kein Gantt/Jira (nur Lese-Übersicht) · keine Collaboration-Komplexität (Solo-Paste) · Feature-Path zu „Time-to-Overview ↓" in einem Schritt (7 Dateien lesen → eine Fläche). ✅ kein Anti-Goal verletzt.
