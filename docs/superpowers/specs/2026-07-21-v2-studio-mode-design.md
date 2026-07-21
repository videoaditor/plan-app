# V2.3 — Studio-Modus (YouTube-Recording über Boards) — Spec   ·   Größe: M (3 Tasks)

**Erst nach V2.1 bauen** — braucht tldraw v3 (Frames als Szenen, eingebauter Laser-Pointer, Fremd-Cursor ausblendbar).

## Warum
Das Nordstern-Ziel der App: Ideen visualisieren und darüber Screen-Share-YouTube-Videos mit Facecam recorden — interaktiv, direkt auf dem Board. Der heutige Present-Modus ist ein Hack (sucht Text-Shapes wie `#1`) und die App zeigt beim Recorden Toolbars, Sidebar und fremde Cursor. Aufnehmen tut Alan mit seinem eigenen Recorder (Screen Studio/QuickTime) — die App liefert den perfekten Auftritt.

## Was
1. **Szenen = Frames.** Jeder tldraw-Frame, dessen Name mit einer Zahl beginnt („1 Intro", „2 Hook"), ist eine Szene. Sortierung numerisch. Ersetzt den `#1`-Text-Hack komplett (alter Code fliegt raus).
2. **Szenen-Panel:** schmale Liste (Nummer + Name) am rechten Rand außerhalb des Studio-Modus; Klick fährt hin. Reorder = Frame umbenennen.
3. **Studio-Modus** (Button in TopBar + Taste `S`): blendet ALLES aus — ToolRail, TopBar, Sidebar, ZoomControls, Present-Button, Szenen-Panel, fremde Cursor, tldraw-Chrome. Pfeiltasten/Space = sanfte Kamerafahrt zur nächsten/vorigen Szene (~1 s Easing), `Esc` = raus. Laser-Pointer (tldraw built-in) per Taste `L` verfügbar. Der Parallax-Effekt des alten Present-Modus entfällt ersatzlos (wackelt im Recording).
4. **Facecam-Bubble:** runde, draggbare Webcam-Bubble (getUserMedia, gespiegelt, 3 Größen S/M/L, snappt an die vier Ecken, Kamera-Auswahl bei mehreren Geräten). Toggle in TopBar + im Studio-Modus per Taste `C`. Kein Audio — das nimmt der Screen-Recorder. Läuft als DOM-Overlay über dem Canvas, wandert also mit ins Tab-Recording.

## Grenzen
- **Muss:** Im Studio-Modus ist außer Canvas, Bubble und einem dezenten Szenen-Zähler (unten, nach 2 s Inaktivität ausgeblendet) NICHTS sichtbar. Kamerafahrten ruckelfrei (tldraw-Animation, kein CSS-Transform-Hack).
- **Darf nicht:** Kein In-App-Recording/MediaRecorder (steht unter „Später" in der ROADMAP). Keine neuen Dependencies. Die Fokus-Hacks in `TldrawCanvas.tsx` nicht anfassen.
- **Out of Scope (YAGNI):** Teleprompter, Countdown, Audio-Aufnahme, Szenen-Übergangseffekte, Drag-Reorder im Szenen-Panel.

## Ausgangslage
- **Ersetzt:** `src/components/PresentationMode.tsx` — Marker-Suche + Parallax raus; das Overlay-Button-Muster (pill, `var(--surface)`, Border, Shadow) und die Keyboard-Handhabung (Input-Guard) übernehmen.
- **Kamerafahrt:** `editor.zoomToBounds(frameBounds, { animation: { duration: ~1000 } })` — gleiches Prinzip wie `centerOnPoint` im alten Code.
- **UI-Verstecken:** alle eigenen Overlays sind bereits eigene Komponenten (`ToolRail`, `TopBar`, `ZoomControls` …) → ein `studioMode`-State im Board-Screen + CSS-Klasse auf dem Wrapper; tldraw-Chrome/Fremd-Cursor über Components-Overrides bzw. Instance-Flags.
- **Entschieden (nicht neu verhandeln):** Aufnahme extern (Screen Studio/QuickTime), kein In-App-Recording · Bubble ohne Audio.

## Tasks
- **T1 — Szenen-Engine + Panel.** `src/lib/scenes.ts`: pure Funktion `getScenes(editor)` → sortierte Frame-Liste (Name beginnt mit Zahl). Szenen-Panel-Komponente; `PresentationMode.tsx` durch neue Navigation ersetzen (alter Marker-/Parallax-Code gelöscht). · Dateien: `src/lib/scenes.ts`, `src/components/ScenePanel.tsx`, `src/components/PresentationMode.tsx` (ersetzt), Board-Screen · **Verifiziert:** Unit-Smoke `scripts/smoke-scenes.mjs` (pure: Frame-Namen `["2 Hook","1 Intro","Moodboard"]` → 2 Szenen, richtige Reihenfolge) + Playwright: Klick auf Szene 2 bewegt die Kamera.
- **T2 — Studio-Modus.** `studioMode`-State: versteckt alle Overlays + tldraw-Chrome + fremde Cursor; Tastatur: `S` an/aus, Pfeile/Space Szenen, `L` Laser, `Esc` exit; Szenen-Zähler mit Auto-Hide. · Dateien: Board-Screen, `src/components/StudioMode.tsx`, `src/styles/globals.css` · **Verifiziert:** Playwright: Studio-Modus an → `ToolRail`/`TopBar`/`ZoomControls` nicht im DOM sichtbar (assert), Pfeiltaste ändert Kamera; Screenshot davor/danach.
- **T3 — Facecam-Bubble.** `src/components/FacecamBubble.tsx`: getUserMedia-Video, rund, gespiegelt, drag + Ecken-Snap, Größen S/M/L, Geräte-Auswahl, Toggle (TopBar + Taste `C`). Kamera-Fehler (denied/keine) → dezenter Toast, kein Crash. · Dateien: `src/components/FacecamBubble.tsx`, `src/components/TopBar.tsx` · **Verifiziert:** Playwright mit `--use-fake-device-for-media-stream`: Bubble erscheint, snappt nach Drag in eine Ecke; Screenshot mit Bubble im Studio-Modus.

## Done   (maschinell prüfbar)
- `npm run build` grün, `npx tsc --noEmit` clean.
- `node scripts/smoke-scenes.mjs` grün.
- Playwright-Smokes grün: Chrome-Hide-Asserts (T2), Fake-Camera-Bubble (T3).
- Screenshots in `reviews/assets/`: Szenen-Panel · Studio-Modus (leeres Chrome) · Studio-Modus mit Facecam-Bubble.
- `grep -ri "parallax" src/` liefert keine Treffer mehr (alter Present-Hack entfernt).

## Stop & Eskalation
- Fremd-Cursor lassen sich in v3 nicht sauber ausblenden → stoppen + dokumentieren, nicht per CSS-Gewalt über tldraw-Interna.
- Fake-Camera-Flag funktioniert im headless Setup nicht → Bubble-Smoke auslassen, Screenshot ohne Video-Feed + Notiz im PR (Rest bleibt Pflicht).
- Kamerafahrt ruckelt trotz tldraw-Animation → nicht mit CSS-Transforms nachhelfen (bekannter Konflikt, siehe Kommentar in `TldrawCanvas.tsx` Z. 331) — stoppen + dokumentieren.
- Jede Produktentscheidung außerhalb des Specs → Taste-Frage in den PR-Body.

## Doctrine-Gate
- [x] **M1** Spec-first: Purpose (Nordstern: YouTube-Recording über Boards) + Non-Goals explizit.
- [x] **M2** Start simple: externes Recording statt MediaRecorder-Eigenbau; tldraw-Bordmittel (Frames, Laser, zoomToBounds) statt Custom-Engine; null neue Dependencies.
- [x] **M3** Loop-first: Done = Build + Smokes + DOM-Asserts + Screenshots; Stop-Regeln explizit.
- [x] **1 State:** Szenen leben IM Board (Frames = SSoT, kein Parallel-Datenmodell); Bubble-Position/Größe nur localStorage (reine UI-Präferenz).
- [x] **2 Separation of Concerns:** `getScenes` pure + einzeln testbar; StudioMode/FacecamBubble eigene Komponenten.
- [x] **3 Idempotenz:** N/A (reine UI, kein Schreiben); Szenen-Ableitung ist deterministisch aus Frame-Namen.
- [x] **4 Coupling:** Vertrag = Frame-Namenskonvention „beginnt mit Zahl" — im Szenen-Panel als Hint dokumentiert.
- [x] **5 Context Window:** N/A (kein LLM im Loop).
- [x] **6 Error-Taxonomie:** Kamera denied/fehlt → Toast + Bubble aus, kein Crash · 0 Szenen → Studio-Modus geht trotzdem an, Zähler zeigt Hint · getUserMedia nur unter https/localhost → auf plan.aditor.ai gegeben.
- [x] **7 Defensive Design:** Studio-Modus ist rein additiv über State/CSS — Fehler darin lassen Canvas + Speichern unberührt.
- [x] **F1 Richtiger Hebel:** Frame-Konvention (Datenvertrag) zuerst, dann UI.
- [x] **Tests:** pure Szenen-Sortierung als Node-Smoke; Playwright nur für das, was DOM braucht.
