"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Editor } from "@tldraw/tldraw";

export type AnimationType = "none" | "wiggle" | "float" | "pulse" | "sway" | "bounce";

interface AnimationOption {
  id: AnimationType;
  label: string;
  icon: string;
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
      const currentMeta = (editor.getShape(shapeId as any)?.meta as any) || {};
      const newAnim = currentMeta.animation === animType ? "none" : animType;
      editor.updateShapes([
        {
          id: shapeId as any,
          type: "image",
          meta: { ...currentMeta, animation: newAnim },
        },
      ]);
    },
    [editor, shapeId, currentAnimation]
  );

  const clearAnimation = useCallback(() => {
    const currentMeta = (editor.getShape(shapeId as any)?.meta as any) || {};
    editor.updateShapes([
      {
        id: shapeId as any,
        type: "image",
        meta: { ...currentMeta, animation: "none" },
      },
    ]);
    setExpanded(false);
  }, [editor, shapeId]);

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
              className={`animation-option ${currentAnimation === anim.id ? "active" : ""}`}
              onClick={() => setAnimation(anim.id)}
              title={anim.label}
            >
              <span className="animation-option-icon">{anim.icon}</span>
            </button>
          ))}
          {hasAnimation && (
            <button
              className="animation-option stop"
              onClick={clearAnimation}
              title="Stop"
            >
              <span className="animation-option-icon">✕</span>
            </button>
          )}
        </div>
      ) : (
        <button
          className={`animation-trigger ${hasAnimation ? "has-animation" : ""}`}
          onClick={() => setExpanded(true)}
          title="Add animation"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Get animation type for a shape ──────────────────────────────────
export function getShapeAnimation(editor: Editor, shapeId: string): AnimationType {
  const shape = editor.getShape(shapeId as any);
  if (!shape) return "none";
  return ((shape.meta as any)?.animation as AnimationType) || "none";
}
