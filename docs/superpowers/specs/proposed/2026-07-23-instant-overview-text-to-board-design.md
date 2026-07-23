# Instant-Overview — Text-Dump → Board — Spec (PROPOSED)

**Status: proposed (Nordstern) · Evidenz:** Vier aufeinanderfolgende plan-app-Läufe 2026-07-21→23 (Spec-PR #1, Nacht-PRs #2/#4/#6) bauten V2.1 Sync-Sharing, V2.2 Workspaces, V2.3 Studio-Modus — **alle betreffen Teilen/Präsentieren, keiner senkt die Zeit von leer → fertige Übersicht.** Der Nordstern-Metrikpfad der App ist aber genau **„Time-to-Overview ↓ · umfassende Übersichten in Minuten statt Stunden"**. Das Erstellen selbst ist heute reines Shape-für-Shape-Ziehen.

> Nordstern (plan-app): *Strategie planen und Ideen visualisieren ohne Anstrengung — umfassende Übersichten in Minuten statt Stunden.* Metrik: **Time-to-Overview ↓ · wöchentlich aktive Pläne ↑**.

## Warum
Wer heute eine Übersicht will, startet mit leerem Canvas und zieht jede Box, jeden Titel, jeden Pfeil von Hand — das dauert die „Stunden", die der Nordstern eliminieren will. Die schnellste Übersicht der Welt existiert schon: **die rohe Gedanken-Liste, die man in 30 Sekunden runtertippt.** Diese Spec macht aus einem eingefügten Text-Dump (Bullet-Outline, eingerückt) mit einem Klick ein strukturiertes Start-Board — Frames für Top-Level-Punkte, Nodes für Unterpunkte, sauber gelayoutet. Von leer → Übersicht in Sekunden; danach editiert man normal weiter.

Referenz-Muster (Design-Inspiration, nicht load-bearing): Excalidraws „Mermaid → Excalidraw"-Import und Napkin.ai machen Text→Visual als Ein-Schritt-Aktion — genau die Reibungslosigkeit, die hier fehlt.

## Was
1. **Paste-to-Board-Aktion.** Ein Einstieg im leeren/aktiven Board (Button „Aus Text" + Cmd/Ctrl+V von reinem Text auf leerem Canvas fragt „als Board anlegen?"). Eingabe: ein Textarea-Sheet, in das man eine eingerückte Bullet-Outline kippt.
2. **Parser (pure).** Reiner Parser `outlineToNodes(text)`: erkennt Einrückung (Tab/2-Space) + `-`/`*`/`1.`-Marker → Baum aus `{title, depth, children}`. Robust gegen gemischte Einrückung, Leerzeilen, führende/abschließende Whitespaces.
3. **Auto-Layout → tldraw-Shapes.** Top-Level-Knoten (depth 0) → benannte tldraw-**Frames** (nutzt dieselbe Frame-Konvention wie der Studio-Modus: „1 …", „2 …", damit die neue Übersicht sofort präsentierbar ist). Kinder → Text-/Geo-Shapes im Frame, vertikal gestapelt; Tiefe > 1 eingerückt. Deterministisches Grid-Layout, keine Overlaps.
4. **Additiv.** Legt Shapes über die normale tldraw-API an; kein neues Datenmodell, keine Migration. Rückgängig via tldraw-Undo (ein Batch).

## Grenzen
- **Muss:** Reine Outline (Text) rein → valides, überlappungsfreies Board raus, in < 2 s für ≤ 200 Zeilen. Ergebnis ist ab Sekunde 1 normal editierbar. Frame-Namen numerisch-präfixiert (Studio-Modus-kompatibel).
- **Darf nicht:** Kein KI-Call (der Parser ist deterministisch — kein Context-Window, kein Spend, keine Latenz). Keine neuen Dependencies. Bestehende Boards/Snapshots nicht anfassen.
- **Out of Scope (YAGNI):** Markdown-Volltext (Tabellen/Bilder), Reverse (Board→Text), Live-Re-Sync bei Textänderung, Import aus Dateien (kommt evtl. als eigene Spec — siehe Kill/Park unten & die Roadmap-Board-Idee).

## Ausgangslage
- tldraw-Editor-API ist bereits im Board-Screen verfügbar (`editor.createShapes`, `createBinding`, Frame-Shapes — dasselbe API, das V2.3 `scenes.ts`/`getScenes(editor)` liest).
- Frame-Namenskonvention „beginnt mit Zahl = Szene" existiert bereits (`src/lib/scenes.ts`) — hier wiederverwendet, damit Instant-Boards sofort in den Studio-Modus passen.
- Overlay-/Sheet-Muster (pill, `var(--surface)`, Border, Shadow, Input-Guard) aus `PresentationMode`/`TopBar` übernehmen.

## Tasks
- **T1 — Parser (pure).** `src/lib/outline.ts`: `outlineToNodes(text) → Node[]`. · **Verifiziert:** Node-Smoke `scripts/smoke-outline.mjs` (gemischte Einrückung, `-`/`1.`, Leerzeilen → korrekter Baum + Tiefen).
- **T2 — Layout + Shape-Erzeugung.** `src/lib/outlineToShapes.ts`: Baum → tldraw-Shape-Deskriptoren (Frames für depth 0, Text-Shapes für Kinder, Grid, keine Overlaps). · **Verifiziert:** Node-Smoke: N Top-Level → N Frames, Bounding-Boxes überlappen nicht.
- **T3 — UI-Einstieg + Undo-Batch.** Textarea-Sheet + Button „Aus Text"; Erzeugung als ein `editor.batch` (ein Undo). · **Verifiziert:** Playwright: Outline einfügen → erwartete Frame-Anzahl im DOM/Canvas, ein Cmd+Z entfernt alles wieder; Screenshot davor/danach.

## Done (maschinell prüfbar)
- `npm run build` grün, `npx tsc --noEmit` clean.
- `node scripts/smoke-outline.mjs` grün (Parser + Layout-Overlap-Assert).
- Playwright-Smoke grün: Outline → Board mit erwarteter Frame-Zahl, Undo leert es.
- Screenshot in `reviews/assets/`: leeres Board → eingefügte Outline → generiertes Board.

## Stop & Eskalation
- tldraw-v3-API erzeugt Frames nicht ohne Weiteres per Code (Binding-/Parent-Regeln) → stoppen + dokumentieren, nicht per Snapshot-JSON-Injection erzwingen.
- Layout-Heuristik produziert bei realen Outlines Overlaps → stoppen, Heuristik im PR zeigen, nicht mit Magie-Konstanten überdecken.
- **Produktentscheidung offen (Taste-Fragen an Alan, siehe Gate):** genaues Eingabeformat (nur Bullets, oder auch Tab-Indent aus Notion-Paste?) · sollen depth-0-Knoten immer Frames sein, oder ab N Kindern?

## Doctrine-Gate
- [x] **M1** Spec-first: Purpose (Time-to-Overview ↓) + Non-Goals (kein KI-Call, kein Markdown-Volltext) explizit.
- [x] **M2** Start simple: deterministischer Parser + tldraw-Bordmittel, null neue Dependencies, kein LLM.
- [x] **M3** Loop-first: Done = Build + Node-Smoke + Playwright + Screenshot; Stop-Regeln explizit.
- [x] **1 State:** Ergebnis lebt sofort als normale tldraw-Shapes IM Board (SSoT = Snapshot); kein Parallel-Datenmodell, keine Rück-Bindung an den Ursprungstext.
- [x] **2 Separation of Concerns:** Parser (`outline.ts`) und Layout (`outlineToShapes.ts`) pure + einzeln testbar; UI nur dünner Einstieg.
- [x] **3 Idempotenz:** Erzeugung ist ein Undo-Batch; zweimal Einfügen = zwei Boards (bewusst, kein Merge) — im UI-Text klargestellt.
- [x] **4 Coupling:** Vertrag = Einrückungs-Outline rein / tldraw-Shapes raus; Frame-Namenskonvention mit `scenes.ts` geteilt (dokumentiert).
- [x] **5 Context Window:** N/A — kein LLM im Loop (bewusste Entscheidung gegen KI-Layout).
- [x] **6 Error-Taxonomie:** leerer/nur-Whitespace-Text → No-op + dezenter Hinweis · unparsebare Zeile → als flacher Top-Level-Knoten aufnehmen, nie crashen · > 200 Zeilen → Warnung, trotzdem anlegen.
- [x] **7 Defensive Design:** rein additiv über die Editor-API; ein Fehler lässt bestehende Shapes + Autosave unberührt.
- [x] **F1 Richtiger Hebel:** Datenvertrag (Outline→Baum) zuerst, dann Layout, dann UI.
- [ ] **Anti-Goal-Check → Taste-Frage:** Anti-Goal „kein Feature, das eine Anleitung braucht". Paste-to-Board ist ein Klick, aber die *Outline-Konvention* (Einrückung = Hierarchie) ist implizites Wissen. **Frage an Alan:** reicht ein Platzhalter-Beispiel im Textarea, oder ist selbst das schon „Anleitung"?
