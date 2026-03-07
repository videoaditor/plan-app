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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
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

      editor.createAssets([
        {
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
        },
      ]);

      editor.createShapes([
        {
          id: createShapeId(),
          type: "image",
          x: center.x - w / 2,
          y: center.y - h / 2,
          props: { assetId, w, h },
        },
      ]);

      onClose();
    } catch (err) {
      console.error("Place image failed:", err);
    } finally {
      setPlacingId(null);
    }
  };

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div
        className="panel-card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 600, maxHeight: "80vh" }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "rgba(20,184,166,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Search size={15} strokeWidth={1.75} color="var(--accent-teal)" />
            </div>
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Image Search
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{ width: 28, height: 28, borderRadius: 8 }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Search input */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              background: "var(--surface-hover)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              transition: "border-color 120ms ease",
            }}
            onFocusCapture={(e) =>
              (e.currentTarget.style.borderColor = "var(--accent-blue)")
            }
            onBlurCapture={(e) =>
              (e.currentTarget.style.borderColor = "var(--border)")
            }
          >
            <Search size={16} strokeWidth={1.75} color="var(--text-muted)" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search for images…"
              autoFocus
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                fontSize: 14,
                color: "var(--text-primary)",
                outline: "none",
                fontFamily: "Inter, sans-serif",
              }}
            />
            <button
              onClick={handleSearch}
              disabled={!query.trim() || loading}
              style={{
                padding: "4px 12px",
                borderRadius: 7,
                border: "none",
                background:
                  !query.trim() || loading
                    ? "var(--border)"
                    : "var(--accent-blue)",
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
          </div>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {error && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.2)",
                fontSize: 12,
                color: "var(--accent-red)",
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}

          {results.length === 0 && !loading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px 24px",
                color: "var(--text-muted)",
                gap: 10,
              }}
            >
              <ImageIcon size={36} strokeWidth={1.25} />
              <p style={{ fontSize: 13, margin: 0, textAlign: "center" }}>
                {query ? "No results. Try a different search." : "Search for any image to place on your canvas."}
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
              }}
            >
              {results.map((img) => (
                <div
                  key={img.id}
                  onClick={() => handlePlaceImage(img)}
                  style={{
                    position: "relative",
                    borderRadius: 10,
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
                      transition: "transform 200ms ease, opacity 200ms ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLImageElement).style.transform = "scale(1.03)";
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
                        size={24}
                        strokeWidth={2}
                        color="#fff"
                        style={{ animation: "spin 0.8s linear infinite" }}
                      />
                    </div>
                  )}
                  {img.photographer && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: "4px 8px",
                        background:
                          "linear-gradient(transparent, rgba(0,0,0,0.5))",
                        fontSize: 10,
                        color: "rgba(255,255,255,0.8)",
                        opacity: 0,
                        transition: "opacity 150ms ease",
                      }}
                      className="photo-credit"
                    >
                      {img.photographer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
