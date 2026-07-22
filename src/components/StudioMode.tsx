"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Editor } from "tldraw";
import { Clapperboard, Video } from "lucide-react";
import { getScenes, zoomToScene } from "@/lib/scenes.mjs";
import ScenePanel from "./ScenePanel";
import FacecamBubble from "./FacecamBubble";

export interface Scene {
  id: string;
  num: number;
  name: string;
}

// Studio mode: a distraction-free stage for recording over a board with an
// external screen recorder. Replaces the old marker-hunting Present mode. Owns
// the scene list, camera navigation, the entry pills + scene panel, and the
// facecam bubble. Chrome-hiding is CSS (body.studio-mode); foreign cursors are
// hidden via the reactive Collaborator* overrides in TldrawCanvas.
export default function StudioMode({
  editor,
  studio,
  setStudio,
}: {
  editor: Editor;
  studio: boolean;
  setStudio: (v: boolean) => void;
}) {
  const [scenes, setScenes] = useState<Scene[]>(() => getScenes(editor));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [facecam, setFacecam] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [counterOn, setCounterOn] = useState(false);
  const counterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the scene list in sync with frame add/remove/rename.
  useEffect(() => {
    const update = () => setScenes(getScenes(editor));
    update();
    const unsub = editor.store.listen(update, { scope: "document" });
    return () => unsub();
  }, [editor]);

  const goTo = useCallback(
    (id: string) => {
      if (zoomToScene(editor, id)) setActiveId(id);
    },
    [editor]
  );

  const activeIndex = activeId ? scenes.findIndex((s) => s.id === activeId) : -1;

  const step = useCallback(
    (dir: 1 | -1) => {
      if (scenes.length === 0) return;
      const next = Math.max(0, Math.min(scenes.length - 1, (activeIndex === -1 ? (dir === 1 ? -1 : 0) : activeIndex) + dir));
      goTo(scenes[next].id);
    },
    [scenes, activeIndex, goTo]
  );

  const bumpCounter = useCallback(() => {
    setCounterOn(true);
    if (counterTimer.current) clearTimeout(counterTimer.current);
    counterTimer.current = setTimeout(() => setCounterOn(false), 2000);
  }, []);

  const enter = useCallback(() => {
    setStudio(true);
    editor.focus();
  }, [editor, setStudio]);

  const exit = useCallback(() => {
    setStudio(false);
    editor.setCurrentTool("select");
  }, [editor, setStudio]);

  // Body class drives chrome hiding (header, sidebar, our rails, tldraw UI layer).
  useEffect(() => {
    document.body.classList.toggle("studio-mode", studio);
    if (studio) bumpCounter();
    return () => document.body.classList.remove("studio-mode");
  }, [studio, bumpCounter]);

  // Keyboard: S toggles studio anywhere; the rest only inside it. Capture phase +
  // stopPropagation so tldraw doesn't also act on space/l. Never fire while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el?.tagName === "INPUT" ||
        el?.tagName === "TEXTAREA" ||
        (el as HTMLElement)?.isContentEditable ||
        !!editor.getEditingShapeId();
      if (typing) return;

      const k = e.key.toLowerCase();

      if (k === "s") {
        e.preventDefault();
        e.stopPropagation();
        studio ? exit() : enter();
        return;
      }
      if (!studio) return;

      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        step(1);
        bumpCounter();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        step(-1);
        bumpCounter();
      } else if (k === "l") {
        e.preventDefault();
        e.stopPropagation();
        editor.setCurrentTool("laser");
      } else if (k === "c") {
        e.preventDefault();
        e.stopPropagation();
        setFacecam((v) => !v);
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        exit();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true } as any);
  }, [studio, enter, exit, step, bumpCounter, editor]);

  // Auto-hide counter also resets on mouse movement while in studio.
  useEffect(() => {
    if (!studio) return;
    const onMove = () => bumpCounter();
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [studio, bumpCounter]);

  const counterLabel =
    scenes.length === 0
      ? "No scenes — name a frame 1, 2, 3…"
      : activeIndex >= 0
        ? `Scene ${activeIndex + 1} / ${scenes.length}`
        : `${scenes.length} scenes · → to start`;

  return (
    <>
      {/* Entry pills + scene panel (only outside studio) */}
      {!studio && (
        <>
          <div style={{ position: "absolute", bottom: 24, left: 24, zIndex: 400, display: "flex", gap: 8 }}>
            <button onClick={enter} title="Studio mode (S)" style={pillStyle(false)}>
              <Clapperboard size={16} strokeWidth={2} />
              Studio
            </button>
            <button
              onClick={() => setFacecam((v) => !v)}
              title="Toggle facecam (C)"
              style={pillStyle(facecam)}
            >
              <Video size={16} strokeWidth={2} />
              Facecam
            </button>
          </div>
          <ScenePanel scenes={scenes} activeId={activeId} onGoTo={goTo} />
        </>
      )}

      {/* Scene counter — subtle, bottom center, auto-hides */}
      {studio && (
        <div
          className="studio-counter"
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 600,
            padding: "7px 14px",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 100,
            boxShadow: "var(--shadow-float)",
            fontVariantNumeric: "tabular-nums",
            opacity: counterOn ? 1 : 0,
            transition: "opacity 400ms ease",
            pointerEvents: "none",
          }}
        >
          {counterLabel}
        </div>
      )}

      {facecam && <FacecamBubble onError={(msg) => { setToast(msg); setFacecam(false); }} />}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      style={{
        position: "fixed",
        bottom: 80,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 700,
        padding: "10px 16px",
        fontSize: 13,
        fontWeight: 600,
        color: "var(--text-primary)",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 100,
        boxShadow: "var(--shadow-float)",
      }}
    >
      {message}
    </div>
  );
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 100,
    color: active ? "var(--accent-blue)" : "var(--text-primary)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  };
}
