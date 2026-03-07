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
      // For cinematic effects, they can stack with motion effects
      // For motion effects, they replace each other
      const currentMeta = (editor.getShape(shapeId as any)?.meta as any) || {};
      const clickedEffect = effects.find((e) => e.id === animType);
      const currentEffect = effects.find((e) => e.id === currentAnimation);

      if (clickedEffect?.group === "cinematic") {
        // Toggle cinematic effects independently via separate meta keys
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
        // Motion effects replace each other
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

  // Close on click outside
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
          {/* Motion effects */}
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

          {/* Separator */}
          <div className="animation-picker-sep" />

          {/* Cinematic effects */}
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

          {/* Clear all */}
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

// ─── Apply all effects to DOM elements ───────────────────────────────
const ALL_ANIM_CLASSES = [
  "anim-wiggle",
  "anim-float",
  "anim-pulse",
  "anim-sway",
  "anim-bounce",
  "fx-kenburns",
  "fx-vignette",
  "fx-filmgrain",
];

export function useShapeAnimations(editor: Editor | null) {
  useEffect(() => {
    if (!editor) return;

    const applyAnimations = () => {
      const allShapes = editor.getCurrentPageShapes();
      for (const shape of allShapes) {
        if (shape.type !== "image") continue;

        const meta = (shape.meta as any) || {};
        const el = document.querySelector(
          `[data-shape-id="${shape.id}"]`
        ) as HTMLElement | null;

        if (!el) continue;

        // Remove all effect classes
        el.classList.remove(...ALL_ANIM_CLASSES);

        // Remove any existing overlay pseudo-element containers
        const existingOverlay = el.querySelector(".fx-overlay");
        if (existingOverlay) existingOverlay.remove();

        // Apply motion animation
        const animType = meta.animation as string | undefined;
        if (animType && animType !== "none") {
          el.classList.add(`anim-${animType}`);
        }

        // Apply cinematic effects (these can stack)
        if (meta.fx_kenburns) el.classList.add("fx-kenburns");
        if (meta.fx_vignette) el.classList.add("fx-vignette");
        if (meta.fx_filmgrain) el.classList.add("fx-filmgrain");

        // For vignette and grain, we need overlay divs (CSS ::after can't target tldraw shapes reliably)
        const needsVignette = meta.fx_vignette;
        const needsGrain = meta.fx_filmgrain;

        if (needsVignette || needsGrain) {
          // Find the image element inside the shape
          const imgContainer =
            el.querySelector(".tl-image-container") ||
            el.querySelector("img")?.parentElement ||
            el;

          // Ensure relative positioning for overlays
          if (imgContainer instanceof HTMLElement) {
            imgContainer.style.position = "relative";
            imgContainer.style.overflow = "hidden";
          }

          if (needsVignette) {
            let vignetteEl = el.querySelector(".vignette-overlay") as HTMLElement;
            if (!vignetteEl) {
              vignetteEl = document.createElement("div");
              vignetteEl.className = "vignette-overlay";
              (imgContainer || el).appendChild(vignetteEl);
            }
          }

          if (needsGrain) {
            let grainEl = el.querySelector(".grain-overlay") as HTMLElement;
            if (!grainEl) {
              grainEl = document.createElement("div");
              grainEl.className = "grain-overlay";
              (imgContainer || el).appendChild(grainEl);
            }
          }
        }
      }
    };

    applyAnimations();
    const unsub = editor.store.listen(applyAnimations, { scope: "document" });
    const viewportUnsub = editor.store.listen(applyAnimations, {
      scope: "session",
    });

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
export function getShapeAnimation(
  editor: Editor,
  shapeId: string
): AnimationType {
  const shape = editor.getShape(shapeId as any);
  if (!shape) return "none";
  return ((shape.meta as any)?.animation as AnimationType) || "none";
}
