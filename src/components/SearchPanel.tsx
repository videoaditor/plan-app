"use client";

import { useState, useCallback } from "react";
import { X, Search, Loader2, Image as ImageIcon } from "lucide-react";
import type { Editor } from "@tldraw/tldraw";
import { searchImages, type ImageSearchResult } from "@/lib/ai";

interface SearchPanelProps {
  editor: Editor | null;
  onClose: () => void;
}

export default function SearchPanel({ editor, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ImageSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placingId, setPlacingId] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const images = await searchImages(query.trim());
      setResults(images);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceImage = async (img: ImageSearchResult) => {
    if (!editor || placingId) return;
    setPlacingId(img.id);

    try {
      const { AssetRecordType, createShapeId } = await import("@tldraw/tldraw");
      const assetId = AssetRecordType.createId();
      const vp = editor.getViewportPageBounds();
      const center = { x: vp.x + vp.w / 2, y: vp.y + vp.h / 2 };

      const maxSize = 600;
      const scale = Math.min(
        1,
        maxSize / (img.width || 800),
        maxSize / (img.height || 600)
      );
      const w = Math.round((img.width || 800) * scale);
      const h = Math.round((img.height || 600) * scale);

      editor.createAssets([{
        id: assetId,
        type: "image",
        typeName: "asset",
        props: {
          name: img.description || "image.jpg",
          src: img.url,
          w,
          h,
          mimeType: "image/jpeg",
          isAnimated: false,
        },
        meta: {},
      }]);

      editor.createShapes([{
        id: createShapeId(),
        type: "image",
        x: center.x - w / 2,
        y: center.y - h / 2,
        props: { assetId, w, h },
      }]);

      onClose();
    } catch (err) {
      console.error("Place image failed:", err);
    } finally {
      setPlacingId(null);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 80,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 500,
        display: "flex",
        flexDirection: "column",
        background: "var(--surface-panel)",
        borderRadius: 16,
        border: "1px solid var(--border)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.08)",
        backdropFilter: "blur(12px)",
        width: 420,
        maxHeight: 400,
        overflow: "hidden",
      }}
    >
      {/* Search bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 8px 8px 14px",
          borderBottom: results.length > 0 || error ? "1px solid var(--border)" : "none",
        }}
      >
        <Search size={15} strokeWidth={1.75} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
            if (e.key === "Escape") onClose();
          }}
          placeholder="Search for images…"
          autoFocus
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            fontSize: 13,
            color: "var(--text-primary)",
            outline: "none",
            fontFamily: "Inter, sans-serif",
            minWidth: 0,
          }}
        />
        <button
          onClick={handleSearch}
          disabled={!query.trim() || loading}
          style={{
            padding: "5px 12px",
            borderRadius: 999,
            border: "none",
            background: !query.trim() || loading ? "var(--border)" : "var(--accent-blue)",
            color: !query.trim() || loading ? "var(--text-muted)" : "#fff",
            fontSize: 12,
            fontWeight: 700,
            cursor: !query.trim() || loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            flexShrink: 0,
          }}
        >
          {loading ? (
            <Loader2 size={13} strokeWidth={2} style={{ animation: "spin 0.8s linear infinite" }} />
          ) : (
            "Search"
          )}
        </button>
        <button
          onClick={onClose}
          style={{
            width: 24,
            height: 24,
            borderRadius: 999,
            border: "none",
            background: "transparent",
            color: "var(--text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "8px 14px",
            fontSize: 12,
            color: "var(--accent-red)",
            background: "rgba(239,68,68,0.06)",
          }}
        >
          {error}
        </div>
      )}

      {/* Results grid */}
      {results.length > 0 && (
        <div
          style={{
            overflowY: "auto",
            padding: 8,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 6,
          }}
        >
          {results.map((img) => (
            <div
              key={img.id}
              onClick={() => handlePlaceImage(img)}
              style={{
                position: "relative",
                borderRadius: 8,
                overflow: "hidden",
                cursor: placingId ? "not-allowed" : "pointer",
                border: "1px solid var(--border)",
                aspectRatio: "4/3",
                background: "var(--surface-hover)",
              }}
            >
              <img
                src={img.thumbnailUrl || img.url}
                alt={img.description || ""}
                loading="lazy"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transition: "transform 200ms ease",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLImageElement).style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLImageElement).style.transform = "scale(1)";
                }}
              />
              {placingId === img.id && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Loader2
                    size={20}
                    strokeWidth={2}
                    color="#fff"
                    style={{ animation: "spin 0.8s linear infinite" }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
