"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Editor, TLShape } from "@tldraw/tldraw";

export type AnimationType =
  | "none"
  | "wiggle"
  | "float"
  | "pulse"
  | "sway"
  | "bounce"
  | "kenburns"
  | "vignette"
  | "filmgrain";

interface EffectOption {
  id: AnimationType;
  label: string;
  icon: string;
  group: "motion" | "cinematic";
}

const effects: EffectOption[] = [
  // Motion group — continuous idle
  { id: "wiggle", label: "Wiggle", icon: "〰️", group: "motion" },
  { id: "float", label: "Float", icon: "🫧", group: "motion" },
  { id: "sway", label: "Sway", icon: "🌿", group: "motion" },
  // Motion group — hover-triggered
  { id: "pulse", label: "Pulse (on hover)", icon: "💫", group: "motion" },
  { id: "bounce", label: "Bounce (on hover)", icon: "⚡", group: "motion" },
  // Cinematic group
  { id: "kenburns", label: "Ken Burns", icon: "🎬", group: "cinematic" },
  { id: "vignette", label: "Vignette", icon: "🔲", group: "cinematic" },
  { id: "filmgrain", label: "Film Grain", icon: "📽", group: "cinematic" },
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
      const clickedEffect = effects.find((e) => e.id === animType);

      if (clickedEffect?.group === "cinematic") {
        const key = `fx_${animType}`;
        const isOn = currentMeta[key];
        editor.updateShapes([
          {
            id: shapeId as any,
            type: "image",
            meta: { ...currentMeta, [key]: !isOn },
          },
        ]);
      } else {
        const newAnim = currentMeta.animation === animType ? "none" : animType;
        editor.updateShapes([
          {
            id: shapeId as any,
            type: "image",
            meta: { ...currentMeta, animation: newAnim },
          },
        ]);
      }
    },
    [editor, shapeId, currentAnimation]
  );

  const clearAll = useCallback(() => {
    editor.updateShapes([
      {
        id: shapeId as any,
        type: "image",
        meta: {
          animation: "none",
          fx_kenburns: false,
          fx_vignette: false,
          fx_filmgrain: false,
        },
      },
    ]);
    setExpanded(false);
  }, [editor, shapeId]);

  useEffect(() => {
    if (!expanded) return;
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [expanded]);

  const shapeMeta = (editor.getShape(shapeId as any)?.meta as any) || {};
  const hasMotion = shapeMeta.animation && shapeMeta.animation !== "none";
  const hasCinematic =
    shapeMeta.fx_kenburns || shapeMeta.fx_vignette || shapeMeta.fx_filmgrain;
  const hasAny = hasMotion || hasCinematic;

  const isEffectActive = (id: AnimationType): boolean => {
    const fx = effects.find((e) => e.id === id);
    if (!fx) return false;
    if (fx.group === "cinematic") {
      return !!shapeMeta[`fx_${id}`];
    }
    return shapeMeta.animation === id;
  };

  const motionEffects = effects.filter((e) => e.group === "motion");
  const cinematicEffects = effects.filter((e) => e.group === "cinematic");

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
          {motionEffects.map((eff) => (
            <button
              key={eff.id}
              className={`animation-option ${
                isEffectActive(eff.id) ? "active" : ""
              }`}
              onClick={() => setAnimation(eff.id)}
              title={eff.label}
            >
              <span className="animation-option-icon">{eff.icon}</span>
            </button>
          ))}
          <div className="animation-picker-sep" />
          {cinematicEffects.map((eff) => (
            <button
              key={eff.id}
              className={`animation-option ${
                isEffectActive(eff.id) ? "active" : ""
              }`}
              onClick={() => setAnimation(eff.id)}
              title={eff.label}
            >
              <span className="animation-option-icon">{eff.icon}</span>
            </button>
          ))}
          {hasAny && (
            <>
              <div className="animation-picker-sep" />
              <button
                className="animation-option stop"
                onClick={clearAll}
                title="Remove all effects"
              >
                <span className="animation-option-icon">✕</span>
              </button>
            </>
          )}
        </div>
      ) : (
        <button
          className={`animation-trigger ${hasAny ? "has-animation" : ""}`}
          onClick={() => setExpanded(true)}
          title="Add effects"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Stamp shape IDs onto DOM elements ───────────────────────────────
// tldraw doesn't render data-shape-id, so we stamp it ourselves
// by matching shapes to their DOM containers via CSS transform strings
function stampShapeIds(editor: Editor) {
  const shapes = editor.getCurrentPageShapes();
  const imageShapes = shapes.filter((s) => s.type === "image");
  if (imageShapes.length === 0) return;

  // Get all image shape DOM elements
  const domEls = document.querySelectorAll<HTMLElement>(
    '.tl-shape[data-shape-type="image"]'
  );
  if (domEls.length === 0) return;

  // Build a map of transform string → shape id
  // Import Mat at module level would fail (SSR), so we use getComputedStyle
  for (const shape of imageShapes) {
    const pageTransform = editor.getShapePageTransform(shape.id);
    if (!pageTransform) continue;

    // tldraw uses Mat.toCssString which produces matrix(a, b, c, d, e, f)
    const { a, b, c, d, e, f } = pageTransform;
    // Round to avoid floating point mismatch
    const matStr = `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`;

    for (let i = 0; i < domEls.length; i++) {
      const el = domEls[i];
      const elTransform = el.style.transform;
      if (!elTransform) continue;

      // Compare the transforms — tldraw sets them inline
      if (normalizeTransform(elTransform) === normalizeTransform(matStr)) {
        el.setAttribute("data-shape-id", shape.id);
        break;
      }
    }
  }
}

function normalizeTransform(t: string): string {
  // Extract numbers from matrix(...) and round to 2 decimals
  const nums = t.match(/-?[\d.]+/g);
  if (!nums) return t;
  return nums.map((n) => Math.round(parseFloat(n) * 100) / 100).join(",");
}

// ─── All animation/effect classes ────────────────────────────────────
const ALL_CLASSES = [
  "anim-wiggle",
  "anim-float",
  "anim-pulse",
  "anim-sway",
  "anim-bounce",
  "fx-kenburns",
  "fx-vignette",
  "fx-filmgrain",
];

// ─── Apply all effects to DOM elements ───────────────────────────────
export function useShapeAnimations(editor: Editor | null) {
  useEffect(() => {
    if (!editor) return;

    const applyAnimations = () => {
      // First, stamp shape IDs onto DOM elements
      stampShapeIds(editor);

      const allShapes = editor.getCurrentPageShapes();
      for (const shape of allShapes) {
        if (shape.type !== "image") continue;

        const meta = (shape.meta as any) || {};
        const el = document.querySelector(
          `[data-shape-id="${shape.id}"]`
        ) as HTMLElement | null;

        if (!el) continue;

        // Remove all effect classes
        el.classList.remove(...ALL_CLASSES);

        // Remove any existing overlay elements
        el.querySelectorAll(".vignette-overlay, .grain-overlay, .processing-overlay").forEach((o) =>
          o.remove()
        );

        // Processing indicator — show spinner on shape while AI runs
        const processingType = meta.processing;
        if (processingType) {
          el.style.position = "relative";
          el.style.overflow = "hidden";
          if (!el.querySelector(".processing-overlay")) {
            const p = document.createElement("div");
            p.className = "processing-overlay";
            el.appendChild(p);
          }
        }

        // Apply motion animation
        const animType = meta.animation as string | undefined;
        if (animType && animType !== "none") {
          el.classList.add(`anim-${animType}`);
        }

        // Apply cinematic effects (stackable)
        if (meta.fx_kenburns) el.classList.add("fx-kenburns");

        if (meta.fx_vignette) {
          el.classList.add("fx-vignette");
          if (!el.querySelector(".vignette-overlay")) {
            const v = document.createElement("div");
            v.className = "vignette-overlay";
            el.appendChild(v);
          }
        }

        if (meta.fx_filmgrain) {
          el.classList.add("fx-filmgrain");
          if (!el.querySelector(".grain-overlay")) {
            const g = document.createElement("div");
            g.className = "grain-overlay";
            el.appendChild(g);
          }
        }
      }
    };

    // Run on a short interval to catch tldraw re-renders
    // (tldraw doesn't expose hooks for shape DOM lifecycle)
    applyAnimations();
    const unsub = editor.store.listen(() => {
      requestAnimationFrame(applyAnimations);
    }, { scope: "document" });

    const sessionUnsub = editor.store.listen(() => {
      requestAnimationFrame(applyAnimations);
    }, { scope: "session" });

    // Also poll every 500ms as a fallback for viewport changes
    const interval = setInterval(applyAnimations, 500);

    return () => {
      unsub();
      sessionUnsub();
      clearInterval(interval);
    };
  }, [editor]);
}

// ─── Get animation type for a shape ──────────────────────────────────
export function getShapeAnimation(
  editor: Editor,
  shapeId: string
): AnimationType {
  const shape = editor.getShape(shapeId as any);
  if (!shape) return "none";
  return ((shape.meta as any)?.animation as AnimationType) || "none";
}
