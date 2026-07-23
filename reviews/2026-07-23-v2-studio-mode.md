<!-- abnahme
repo: videoaditor/plan-app
branch: nacht/2026-07-23-v2-studio-mode
base: main
title: "V2.3 — Studio-Modus (Szenen + Recording-Bühne)"
status: fertig
preview: none
preview_url: none
verify: "npx tsc --noEmit · npm run build · node scripts/smoke-scenes.mjs · npx playwright test (studio) · grep -ri parallax src/ (leer)"
-->

# V2.3 — Studio-Modus

Der Nordstern-Baustein: Ideen visualisieren und direkt darüber ein Screen-Share-YouTube-Video recorden. Gebaut, verifiziert, im Review nachgeschärft. Kein Deploy (Policy — Alan deployt nach dem Review).

## Was & Warum
Der alte Present-Modus war ein Hack: er suchte Text-Shapes wie `#1` und wackelte per CSS-Parallax. Diese Schicht macht **Szenen aus Frames** (jeder Frame, dessen Name mit einer Zahl beginnt — „1 Intro", „2 Hook") und einen echten **Studio-Modus**, der die komplette Oberfläche ausblendet und mit Pfeiltasten sanfte tldraw-Kamerafahrten zwischen den Szenen macht. Aufgenommen wird extern (Screen Studio/Tella/QuickTime) — die App liefert nur die saubere Bühne.

## Review-Änderungen (Alans Feedback, eingearbeitet)
- **Szenen-Panel versteckt:** am rechten Rand sitzt nur ein schmaler Griff; das Panel fährt erst beim Hover raus — nichts schwebt beim Arbeiten über dem Canvas.
- **Facecam entfernt:** die App nimmt nicht auf, und der externe Recorder (Tella) bringt seine eigene Facecam mit — eine zweite in der App wäre doppelt. Studio-Entry sitzt jetzt zusammen mit den Szenen im Hover-Panel; die schwebenden Pills unten links sind weg.

## Tasks & Verifikation
- **T1 — Szenen-Engine + Panel.** `src/lib/scenes.mjs` (`getScenes`/`toScenes`/`zoomToScene`), `ScenePanel.tsx` (Hover-Reveal + Studio-Entry). Der alte Marker-/Parallax-Code ist gelöscht (`PresentationMode.tsx` entfernt). → `node scripts/smoke-scenes.mjs` grün; Playwright: Hover öffnet das Panel, Klick auf Szene 2 bewegt die Kamera.
- **T2 — Studio-Modus.** `StudioMode.tsx` + `body.studio-mode`-CSS. `S` an/aus, Pfeile/Space Szenen, `L` Laser, `Esc` raus; Szenen-Zähler mit 2-s-Auto-Hide. → Playwright: „Studio mode"-Button versteckt `.tool-rail`/`.zoom-controls`/`header`; Pfeiltaste ändert die Kamera; Screenshot leeres Chrome.

## Done-Checks (alle grün)
- `npx tsc --noEmit` clean · `npm run build` grün.
- `node scripts/smoke-scenes.mjs` grün.
- Playwright `studio.spec.ts` (Hover-Panel, Kamera, Chrome-Hide) grün.
- Screenshots in `reviews/assets/`: `studio-panel.png` · `studio-empty.png`.
- `grep -ri "parallax" src/` liefert nichts mehr.

## Screenshots
![Szenen-Panel im Hover — mit Studio-Entry](assets/studio-panel.png)
![Studio-Modus — leeres Chrome](assets/studio-empty.png)

## Offene Taste-Fragen
1. **tldraw-Watermark.** Unten rechts bleibt „MADE WITH TLDRAW" auch im Studio-Modus stehen (tldraw-Lizenz, kein App-Chrome). Sauber entfernen = kostenpflichtige tldraw-Business-Lizenz (License-Key → `licenseKey`-Prop). Steht als „Später"-Item in der ROADMAP. Priorisieren?

## Umsetzungsnotizen (technisch)
- **Fremd-Cursor** werden im Studio-Modus über reaktive `Collaborator*: null`-Overrides an `<Tldraw>` ausgeblendet (sauberer tldraw-Weg, kein CSS-Zwang über Interna).
- **Chrome-Verstecken** via `body.studio-mode`-Klasse (versteckt `header`, `.sidebar`, unsere Rails und die ganze `.tlui-layout`-Ebene).
- **Kamerafahrt** = `editor.zoomToBounds(frameBounds, { animation: { duration: 1000 } })`, keine CSS-Transforms (bekannter tldraw-Konflikt).
- **Datei-Konvention:** reine, node-testbare Szenen-Logik in `scenes.mjs` — folgt dem bestehenden Repo-Muster (`migrate.mjs`), das die Smokes ohne Build importieren.
