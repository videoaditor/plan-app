"use client";

import { useEffect, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import type { Editor } from "@tldraw/tldraw";

interface ZoomControlsProps {
  editor: Editor | null;
}

export default function ZoomControls({ editor }: ZoomControlsProps) {
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (!editor) return;

    const updateZoom = () => {
      const z = editor.getZoomLevel();
      setZoom(Math.round(z * 100));
    };

    updateZoom();
    const unsub = editor.store.listen(updateZoom, { scope: "session" });
    return () => unsub();
  }, [editor]);

  if (!editor) return null;

  const handleZoomIn = () => { editor.zoomIn(); editor.focus(); };
  const handleZoomOut = () => { editor.zoomOut(); editor.focus(); };
  const handleFit = () => { editor.zoomToFit(); editor.focus(); };
  const handleReset = () => { editor.resetZoom(); editor.focus(); };

  return (
    <div className="zoom-controls">
      <button
        onClick={handleZoomOut}
        className="btn-icon"
        style={{ width: 28, height: 28, borderRadius: 7 }}
        title="Zoom out"
      >
        <ZoomOut size={14} strokeWidth={2} />
      </button>

      <button
        onClick={handleReset}
        style={{
          padding: "0 8px",
          height: 28,
          borderRadius: 7,
          border: "none",
          background: "transparent",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-secondary)",
          cursor: "pointer",
          transition: "background 80ms ease, color 80ms ease",
          minWidth: 52,
          textAlign: "center",
          letterSpacing: "-0.01em",
          fontVariantNumeric: "tabular-nums",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background =
            "var(--surface-hover)";
          (e.currentTarget as HTMLButtonElement).style.color =
            "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background =
            "transparent";
          (e.currentTarget as HTMLButtonElement).style.color =
            "var(--text-secondary)";
        }}
        title="Reset zoom (100%)"
      >
        {zoom}%
      </button>

      <button
        onClick={handleZoomIn}
        className="btn-icon"
        style={{ width: 28, height: 28, borderRadius: 7 }}
        title="Zoom in"
      >
        <ZoomIn size={14} strokeWidth={2} />
      </button>

      <div
        style={{
          width: 1,
          height: 18,
          background: "var(--border)",
          margin: "0 2px",
        }}
      />

      <button
        onClick={handleFit}
        className="btn-icon"
        style={{ width: 28, height: 28, borderRadius: 7 }}
        title="Fit to screen"
      >
        <Maximize2 size={13} strokeWidth={2} />
      </button>
    </div>
  );
}
