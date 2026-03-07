"use client";

import { useState, useEffect, useRef } from "react";
import { Palette } from "lucide-react";

// ─── Canvas background options ───────────────────────────────────────
export type CanvasBgId = "dots" | "grid" | "paper" | "blank" | "blueprint" | "cork";

interface CanvasBgOption {
  id: CanvasBgId;
  label: string;
  preview: string;
}

const canvasBgs: CanvasBgOption[] = [
  { id: "dots", label: "Dots", preview: "●" },
  { id: "grid", label: "Grid", preview: "▦" },
  { id: "paper", label: "Paper", preview: "📄" },
  { id: "blank", label: "Blank", preview: "◻" },
  { id: "blueprint", label: "Blueprint", preview: "🔵" },
  { id: "cork", label: "Cork", preview: "🟤" },
];

const CANVAS_BG_KEY = "plan-canvas-bg";

export function getSavedCanvasBg(): CanvasBgId {
  if (typeof window === "undefined") return "dots";
  return (localStorage.getItem(CANVAS_BG_KEY) as CanvasBgId) || "dots";
}

export function applyCanvasBg(bgId: CanvasBgId) {
  document.documentElement.setAttribute("data-canvas-bg", bgId);
  localStorage.setItem(CANVAS_BG_KEY, bgId);
}

export default function CanvasSettings() {
  const [open, setOpen] = useState(false);
  const [selectedBg, setSelectedBg] = useState<CanvasBgId>("dots");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedBg = getSavedCanvasBg();
    setSelectedBg(savedBg);
    applyCanvasBg(savedBg);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleBgChange = (bgId: CanvasBgId) => {
    setSelectedBg(bgId);
    applyCanvasBg(bgId);
  };

  return (
    <div style={{ position: "relative" }} ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-icon"
        title="Canvas background"
        style={{ color: open ? "var(--accent-blue)" : undefined }}
      >
        <Palette size={18} strokeWidth={1.75} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 600,
            width: 200,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            boxShadow: "var(--shadow-float-lg)",
            padding: 12,
            animation: "scaleIn 120ms ease",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 8,
            }}
          >
            Canvas
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 4,
            }}
          >
            {canvasBgs.map((bg) => (
              <button
                key={bg.id}
                onClick={() => handleBgChange(bg.id)}
                title={bg.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  padding: "8px 4px",
                  borderRadius: 8,
                  border:
                    selectedBg === bg.id
                      ? "1.5px solid var(--accent-blue)"
                      : "1.5px solid transparent",
                  background:
                    selectedBg === bg.id
                      ? "rgba(37, 99, 235, 0.06)"
                      : "var(--surface-hover)",
                  cursor: "pointer",
                  transition: "all 100ms ease",
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>{bg.preview}</span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 500,
                    color:
                      selectedBg === bg.id
                        ? "var(--accent-blue)"
                        : "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {bg.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
