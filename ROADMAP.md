# ROADMAP — plan-app

Nordstern: unsere Miro-Variante für den Aditor-Use-Case — Ideen visualisieren und darüber Screen-Share-YouTube-Videos mit Facecam recorden. V2 = Sharing + Workspaces + Studio-Modus.

## Ready
_(leer — nächste Specs entstehen tagsüber via /spec)_

## Proposed (Nordstern)
<!-- Von der Nordstern-Abendroutine 2026-07-23 vorgeschlagen. NICHT ready — Alan gatet in der Abnahme: promote (→ Ready) / reject / park (→ Später). Specs liegen unter docs/superpowers/specs/proposed/. -->

- **Instant-Overview: Text-Dump → Board** `#proposed` · Eingefügte Bullet-Outline wird per Klick zum strukturierten Start-Board (Frames + Nodes, deterministisch, kein KI-Call) — schließt die einzige Lücke zum Nordstern „Time-to-Overview ↓": leer → Übersicht in Sekunden statt Stunden. Evidenz: die 4 V2-Läufe (#1/#2/#4/#6, 21.–23.07.) bauten alle nur Teilen/Präsentieren, keiner das schnelle Erstellen. · Spec: [`docs/superpowers/specs/proposed/2026-07-23-instant-overview-text-to-board-design.md`](docs/superpowers/specs/proposed/2026-07-23-instant-overview-text-to-board-design.md)

- **ROADMAP → Board (Aditor-Use-Case)** `#proposed` · Zieht `ROADMAP.md`-Dateien in Frames (pro Repo ein Frame, pro Sektion eine Gruppe, Status-Chips) — der Cross-Repo-Roadmap-Stand als eine Fläche statt 7 getrennter Textdateien. Baut auf Instant-Overview + V2.2-Workspaces auf (⚠ erst nach dessen Merge). Evidenz: Abnahme + Nachtschichten + diese Routine lesen täglich 7 ROADMAPs/NORTHSTARS — genau die „Übersicht in Minuten", für die die App im Namen gebaut ist. · Spec: [`docs/superpowers/specs/proposed/2026-07-23-roadmap-to-board-workspace-design.md`](docs/superpowers/specs/proposed/2026-07-23-roadmap-to-board-workspace-design.md)

- **Kill-Nominierung:** „In-App-Recording (MediaRecorder-Export)" aus `## Später` streichen. Die V2.3-Abnahme (PR #6, 23.07.) hat bewusst entschieden: **die App nimmt nie selbst auf**, das externe Tool (Tella/Screen Studio) recordet inkl. Facecam — deshalb flog die Facecam-Bubble raus. Ein „In-App-Recording"-Later-Item widerspricht dieser frischen Entscheidung direkt und zieht den Fokus zurück auf einen abgewählten Pfad → löschen (Kuratieren statt anhäufen).

## In Review
- **V2.3 — Studio-Modus** · Frames als Szenen mit Szenen-Panel, Studio-Modus (alles ausgeblendet, sanfte Kamerafahrten, Laser), Facecam-Bubble fürs externe Recording. → Branch `nacht/2026-07-23-v2-studio-mode` · Report: [reviews/2026-07-23-v2-studio-mode.md](reviews/2026-07-23-v2-studio-mode.md) · `tsc` + `build` + `smoke-scenes` + Playwright-Smokes (Chrome-Hide, Fake-Camera) grün; Screenshots in `reviews/assets/`.
- **V2.1 — Live-Sync + Board-Sharing** · tldraw-v3-Upgrade, Sync-Server (Live-Cursor, gleichzeitiges Arbeiten), Share-Link pro Board, Asset-Uploads statt base64 im Snapshot. → Branch `nacht/2026-07-22-v2-sync-sharing` · Report: [reviews/2026-07-22-v2-sync-sharing.md](reviews/2026-07-22-v2-sync-sharing.md) · `tsc` + `build` + `smoke-migration` + Playwright-Smokes (Upload, Zwei-Browser-Sync, Share-Link) grün; Screenshots in `reviews/assets/`.
- **V2.2 — Workspaces** · Frei anlegbare Workspaces („Aditor", „Content"), Switcher in der Sidebar, Boards verschiebbar; Migration ordnet Bestand „Aditor" zu. → Branch `nacht/2026-07-21-workspaces` · Report: [reviews/2026-07-21-workspaces.md](reviews/2026-07-21-workspaces.md) · Build + `smoke-workspaces` + Playwright-Move-Smoke grün.

## Später
- In-App-Recording (MediaRecorder-Export als Videodatei) — erst wenn der Studio-Modus im Alltag läuft.
- Viewer/Editor-Rollen auf Share-Links.
- Kommentare für Async-Feedback auf Boards.
- tldraw-Business-Lizenz, falls das „Made with tldraw"-Watermark stört.
