"use client";

import { useState } from "react";
import { Wand2, Scissors, Loader2 } from "lucide-react";
import type { Editor } from "@tldraw/tldraw";
import { removeBackground, generateImage } from "@/lib/ai";

interface AiToolbarProps {
  editor: Editor;
  position: { x: number; y: number };
  onAiEdit: () => void;
}

export default function AiToolbar({ editor, position, onAiEdit }: AiToolbarProps) {
  const [removingBg, setRemovingBg] = useState(false);

  const getSelectedImageInfo = () => {
    const shapes = editor.getSelectedShapes();
    const imageShape = shapes.find((s) => s.type === "image");
    if (!imageShape) return null;

    const asset = editor.getAsset((imageShape.props as any).assetId);
    if (!asset) return null;

    return {
      shape: imageShape,
      asset,
      src: (asset.props as any).src as string,
    };
  };

  const handleRemoveBg = async () => {
    const info = getSelectedImageInfo();
    if (!info || removingBg) return;

    setRemovingBg(true);
    try {
      const { imageUrl } = await removeBackground(info.src);

      // Create new asset with processed image
      const { AssetRecordType, createShapeId } = await import("@tldraw/tldraw");
      const newAssetId = AssetRecordType.createId();

      const img = new window.Image();
      img.onload = () => {
        editor.createAssets([
          {
            id: newAssetId,
            type: "image",
            typeName: "asset",
            props: {
              name: "removed-bg.png",
              src: imageUrl,
              w: img.naturalWidth || (info.asset.props as any).w,
              h: img.naturalHeight || (info.asset.props as any).h,
              mimeType: "image/png",
              isAnimated: false,
            },
            meta: {},
          },
        ]);

        editor.updateShapes([
          {
            id: info.shape.id,
            type: "image",
            props: {
              assetId: newAssetId,
            },
          },
        ]);
      };
      img.src = imageUrl;
    } catch (err) {
      console.error("Remove BG failed:", err);
    } finally {
      setRemovingBg(false);
    }
  };

  return (
    <div
      className="ai-toolbar"
      style={{
        left: position.x,
        top: position.y,
        transform: "translateX(-50%)",
        pointerEvents: "auto",
      }}
    >
      <button
        onClick={handleRemoveBg}
        disabled={removingBg}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px",
          borderRadius: 8,
          border: "none",
          background: "transparent",
          color: removingBg ? "var(--text-muted)" : "var(--text-primary)",
          fontSize: 12,
          fontWeight: 600,
          cursor: removingBg ? "not-allowed" : "pointer",
          transition: "background 80ms ease",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => {
          if (!removingBg)
            (e.currentTarget as HTMLButtonElement).style.background =
              "var(--surface-hover)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        }}
        title="Remove background"
      >
        {removingBg ? (
          <Loader2 size={14} strokeWidth={2} style={{ animation: "spin 0.8s linear infinite" }} />
        ) : (
          <Scissors size={14} strokeWidth={1.75} />
        )}
        Remove BG
      </button>

      <div
        style={{ width: 1, height: 18, background: "var(--border)", margin: "0 2px" }}
      />

      <button
        onClick={onAiEdit}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px",
          borderRadius: 8,
          border: "none",
          background: "transparent",
          color: "var(--text-primary)",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          transition: "background 80ms ease",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background =
            "rgba(37,99,235,0.08)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--accent-blue)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
        }}
        title="AI Edit with prompt"
      >
        <Wand2 size={14} strokeWidth={1.75} />
        AI Edit
      </button>
    </div>
  );
}
