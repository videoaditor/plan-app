# plan-app

Unsere Miro-Variante für den Aditor-Use-Case (plan.aditor.ai). Nordstern: Ideen visualisieren + darüber Screen-Share-YouTube-Videos mit Facecam recorden. Next.js 14 · tldraw · sqlite (`data/plan.db`) · PM2 auf dem VPS. AI-Features laufen als Proxy über gen.aditor.ai.

- Dev: `npm run dev` (Port 3050). Build-Check: `npm run build` + `npx tsc --noEmit`.
- Deploy macht NUR Alan (Deploy-Button → `deploy.sh` auf dem VPS). Nie von Sessions aus deployen.
- Specs & Nacht-Loop: `ROADMAP.md` (`## Ready`) → `docs/superpowers/specs/` → `docs/NIGHTSHIFT.md`.

## Geschmacksregeln
- **Look:** Premium/editorial, Vox-Style — helle Flächen, kräftige Akzente. NUR die bestehenden CSS-Variablen aus `src/styles/globals.css` benutzen, keine neuen Farbwelten.
- **Overlay-Muster:** schwebende Pills wie der Present-Button in `PresentationMode.tsx` (`var(--surface)`, 1px Border, weicher Shadow, `borderRadius: 100`). Neue Overlays folgen exakt diesem Muster.
- **UI-Copy:** Englisch, kurz, ohne Ausrufezeichen („Share", „Present", „Move to…").
- **Kein Lorem, keine Platzhalter** — echte Labels oder gar nicht.
- **Canvas-Fokus-Hacks in `TldrawCanvas.tsx` sind hart erkämpft** (Fokus-Verlust, Viewport-Bounds, Wheel-Redispatch). Nicht entfernen, nicht „aufräumen".
- **Keine CSS-Transforms auf Canvas-Inhalte** — kollidiert mit tldraw (deshalb flog die Shape-Animation raus, Kommentar in `TldrawCanvas.tsx`).
- Dependencies nur, wenn ein Ready-Item sie explizit nennt.
