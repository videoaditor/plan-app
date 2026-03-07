"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Editor, TLShape } from "@tldraw/tldraw";

export type AnimationType = "none" | "wiggle" | "float" | "pulse" | "sway" | "bounce";

interface AnimationOption {
  id: AnimationType;
  label: string;
  icon: string; // tiny emoji/symbol
}

const animations: AnimationOption[] = [
  { id: "wiggle", label: "Wiggle", icon: "〰️" },
  { id: "float", label: "Float", icon: "🫧" },
  { id: "pulse", label: "Pulse", icon: "💫" },
  { id: "sway", label: "Sway", icon: "🌿" },
  { id: "bounce", label: "Bounce", icon: "⚡" },
];

interface AnimationPickerProps {
  editor: Editor;
  position: { x: number; y: number };
  shapeId: string;
  currentAnimation: AnimationType;
}

export default function AnimationPicker({
  editor,
  position,
  shapeId,
  currentAnimation,
}: AnimationPickerProps) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const setAnimation = useCallback(
    (animType: AnimationType) => {
      editor.updateShapes([
        {
          id: shapeId as any,
          type: "image",
          meta: { animation: animType },
        },
      ]);
      // Don't close — let user preview different animations
    },
    [editor, shapeId]
  );

  const clearAnimation = useCallback(() => {
    editor.updateShapes([
      {
        id: shapeId as any,
        type: "image",
        meta: { animation: "none" },
      },
    ]);
    setExpanded(false);
  }, [editor, shapeId]);

  // Close on click outside
  useEffect(() => {
    if (!expanded) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [expanded]);

  const hasAnimation = currentAnimation && currentAnimation !== "none";

  return (
    <div
      ref={containerRef}
      className="animation-picker"
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 490,
        pointerEvents: "auto",
      }}
    >
      {expanded ? (
        <div className="animation-picker-expanded">
          {animations.map((anim) => (
            <button
              key={anim.id}
              className={`animation-option ${
                currentAnimation === anim.id ? "active" : ""
              }`}
              onClick={() => setAnimation(anim.id)}
              title={anim.label}
            >
              <span className="animation-option-icon">{anim.icon}</span>
            </button>
          ))}
          {/* Stop button — only show if has animation */}
          {hasAnimation && (
            <button
              className="animation-option stop"
              onClick={clearAnimation}
              title="Stop animation"
            >
              <span className="animation-option-icon">✕</span>
            </button>
          )}
        </div>
      ) : (
        <button
          className={`animation-trigger ${hasAnimation ? "has-animation" : ""}`}
          onClick={() => setExpanded(true)}
          title="Add idle animation"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Apply animations to DOM elements ────────────────────────────────
export function useShapeAnimations(editor: Editor | null) {
  useEffect(() => {
    if (!editor) return;

    const applyAnimations = () => {
      const allShapes = editor.getCurrentPageShapes();
      for (const shape of allShapes) {
        if (shape.type !== "image") continue;

        const animType = (shape.meta as any)?.animation as AnimationType | undefined;
        const el = document.querySelector(
          `[data-shape-id="${shape.id}"]`
        ) as HTMLElement | null;

        if (!el) continue;

        // Remove all animation classes first
        el.classList.remove(
          "anim-wiggle",
          "anim-float",
          "anim-pulse",
          "anim-sway",
          "anim-bounce"
        );

        // Apply if set
        if (animType && animType !== "none") {
          el.classList.add(`anim-${animType}`);
        }
      }
    };

    // Apply immediately and on every store change
    applyAnimations();
    const unsub = editor.store.listen(applyAnimations, { scope: "document" });

    // Also re-apply after viewport changes (shapes may re-render)
    const viewportUnsub = editor.store.listen(applyAnimations, { scope: "session" });

    // MutationObserver to catch tldraw re-renders
    const observer = new MutationObserver(() => {
      requestAnimationFrame(applyAnimations);
    });

    const container = document.querySelector(".tl-shapes");
    if (container) {
      observer.observe(container, { childList: true, subtree: true });
    }

    return () => {
      unsub();
      viewportUnsub();
      observer.disconnect();
    };
  }, [editor]);
}

// ─── Get animation type for a shape ──────────────────────────────────
export function getShapeAnimation(editor: Editor, shapeId: string): AnimationType {
  const shape = editor.getShape(shapeId as any);
  if (!shape) return "none";
  return ((shape.meta as any)?.animation as AnimationType) || "none";
}
