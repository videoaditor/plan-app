"use client";

import { useState, useEffect, useRef } from "react";
import { Palette } from "lucide-react";

// ─── Font options ────────────────────────────────────────────────────
export type FontId = "inter" | "playfair" | "libre-baskerville" | "eb-garamond" | "lora";

interface FontOption {
  id: FontId;
  label: string;
  family: string;
  googleParam: string; // for Google Fonts URL
  preview: string; // sample text style
}

const fonts: FontOption[] = [
  {
    id: "inter",
    label: "Inter",
    family: '"Inter", system-ui, sans-serif',
    googleParam: "Inter:wght@300;400;500;600;700",
    preview: "Modern Sans",
  },
  {
    id: "playfair",
    label: "Playfair Display",
    family: '"Playfair Display", Georgia, serif',
    googleParam: "Playfair+Display:wght@400;500;600;700;800",
    preview: "Editorial Serif",
  },
  {
    id: "libre-baskerville",
    label: "Libre Baskerville",
    family: '"Libre Baskerville", Georgia, serif',
    googleParam: "Libre+Baskerville:wght@400;700",
    preview: "Classic Print",
  },
  {
    id: "eb-garamond",
    label: "EB Garamond",
    family: '"EB Garamond", Georgia, serif',
    googleParam: "EB+Garamond:wght@400;500;600;700;800",
    preview: "Old-World Book",
  },
  {
    id: "lora",
    label: "Lora",
    family: '"Lora", Georgia, serif',
    googleParam: "Lora:wght@400;500;600;700",
    preview: "Warm Editorial",
  },
];

// ─── Canvas background options ───────────────────────────────────────
export type CanvasBgId = "dots" | "grid" | "paper" | "blank" | "blueprint" | "cork";

interface CanvasBgOption {
  id: CanvasBgId;
  label: string;
  preview: string; // small color swatch
}

const canvasBgs: CanvasBgOption[] = [
  { id: "dots", label: "Dots", preview: "●" },
  { id: "grid", label: "Grid", preview: "▦" },
  { id: "paper", label: "Paper", preview: "📄" },
  { id: "blank", label: "Blank", preview: "◻" },
  { id: "blueprint", label: "Blueprint", preview: "🔵" },
  { id: "cork", label: "Cork", preview: "🟤" },
];

// ─── Storage keys ────────────────────────────────────────────────────
const FONT_KEY = "plan-font";
const CANVAS_BG_KEY = "plan-canvas-bg";

export function getSavedFont(): FontId {
  if (typeof window === "undefined") return "inter";
  return (localStorage.getItem(FONT_KEY) as FontId) || "inter";
}

export function getSavedCanvasBg(): CanvasBgId {
  if (typeof window === "undefined") return "dots";
  return (localStorage.getItem(CANVAS_BG_KEY) as CanvasBgId) || "dots";
}

// ─── Apply font to document ─────────────────────────────────────────
export function applyFont(fontId: FontId) {
  const font = fonts.find((f) => f.id === fontId);
  if (!font) return;

  // Load the Google Font if not already loaded
  const existingLink = document.querySelector(`link[data-font-id="${fontId}"]`);
  if (!existingLink && fontId !== "inter") {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${font.googleParam}&display=swap`;
    link.setAttribute("data-font-id", fontId);
    document.head.appendChild(link);
  }

  document.documentElement.style.setProperty("--font-canvas", font.family);
  localStorage.setItem(FONT_KEY, fontId);
}

// ─── Apply canvas background ────────────────────────────────────────
export function applyCanvasBg(bgId: CanvasBgId) {
  document.documentElement.setAttribute("data-canvas-bg", bgId);
  localStorage.setItem(CANVAS_BG_KEY, bgId);
}

// ─── Component ───────────────────────────────────────────────────────
export default function CanvasSettings() {
  const [open, setOpen] = useState(false);
  const [selectedFont, setSelectedFont] = useState<FontId>("inter");
  const [selectedBg, setSelectedBg] = useState<CanvasBgId>("dots");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedFont = getSavedFont();
    const savedBg = getSavedCanvasBg();
    setSelectedFont(savedFont);
    setSelectedBg(savedBg);
    applyFont(savedFont);
    applyCanvasBg(savedBg);
  }, []);

  // Close on click outside
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

  const handleFontChange = (fontId: FontId) => {
    setSelectedFont(fontId);
    applyFont(fontId);
  };

  const handleBgChange = (bgId: CanvasBgId) => {
    setSelectedBg(bgId);
    applyCanvasBg(bgId);
  };

  return (
    <div style={{ position: "relative" }} ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-icon"
        title="Canvas settings"
        style={{
          color: open ? "var(--accent-blue)" : undefined,
        }}
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
            width: 240,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            boxShadow: "var(--shadow-float-lg)",
            padding: "12px 0",
            animation: "scaleIn 120ms ease",
          }}
        >
          {/* Font section */}
          <div style={{ padding: "0 14px 8px" }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              Typography
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {fonts.map((font) => (
                <button
                  key={font.id}
                  onClick={() => handleFontChange(font.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: "none",
                    background:
                      selectedFont === font.id
                        ? "rgba(37, 99, 235, 0.08)"
                        : "transparent",
                    cursor: "pointer",
                    transition: "background 80ms ease",
                    width: "100%",
                  }}
                  onMouseEnter={(e) => {
                    if (selectedFont !== font.id) {
                      (e.currentTarget as HTMLElement).style.background =
                        "var(--surface-hover)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedFont !== font.id) {
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                    }
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: selectedFont === font.id ? 600 : 400,
                      color:
                        selectedFont === font.id
                          ? "var(--accent-blue)"
                          : "var(--text-primary)",
                      fontFamily: font.family,
                    }}
                  >
                    {font.label}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--text-muted)",
                      fontFamily: font.family,
                      fontStyle: "italic",
                    }}
                  >
                    {font.preview}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Separator */}
          <div
            style={{
              height: 1,
              background: "var(--border)",
              margin: "4px 14px 8px",
            }}
          />

          {/* Canvas background section */}
          <div style={{ padding: "0 14px" }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 6,
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
                  <span style={{ fontSize: 16, lineHeight: 1 }}>
                    {bg.preview}
                  </span>
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
        </div>
      )}
    </div>
  );
}
