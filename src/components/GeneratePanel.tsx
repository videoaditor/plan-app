"use client";

import { useState, useRef } from "react";
import { Wand2, Loader2, X } from "lucide-react";
import type { Editor } from "@tldraw/tldraw";
import { generateImage } from "@/lib/ai";

interface GeneratePanelProps {
  editor: Editor | null;
  onClose: () => void;
  referenceImageSrc?: string;
  mode?: "generate" | "edit";
  referenceShapeId?: string;
}

export default function GeneratePanel({
  editor,
  onClose,
  referenceImageSrc,
  mode = "generate",
  referenceShapeId,
}: GeneratePanelProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isEdit = mode === "edit" && !!referenceImageSrc;

  const handleGenerate = async () => {
    if (!prompt.trim() || !editor || loading) return;

    const maxSize = 512;
    const w = maxSize;
    const h = maxSize;

    const vp = editor.getViewportPageBounds();
    const center = { x: vp.x + vp.w / 2, y: vp.y + vp.h / 2 };

    // If editing an existing image, keep the bar until done
    if (isEdit && referenceShapeId) {
      setLoading(true);
      try {
        const result = await generateImage({
          prompt: prompt.trim(),
          aspectRatio: "1:1",
          referenceImageUrl: referenceImageSrc,
        });

        const { AssetRecordType } = await import("@tldraw/tldraw");
        const newAssetId = AssetRecordType.createId();

        editor.createAssets([{
          id: newAssetId,
          type: "image",
          typeName: "asset",
          props: {
            name: "ai-edit.png",
            src: result.imageUrl,
            w: result.width || w,
            h: result.height || h,
            mimeType: "image/png",
            isAnimated: false,
          },
          meta: {},
        }]);

        editor.updateShapes([{
          id: referenceShapeId as any,
          type: "image",
          props: { assetId: newAssetId },
        }]);
        onClose();
      } catch (err) {
        console.error("Edit failed:", err);
      } finally {
        setLoading(false);
      }
      return;
    }

    // For new images: place placeholder → close → generate in background
    const { createShapeId } = await import("@tldraw/tldraw");
    const placeholderId = createShapeId();
    const px = center.x - w / 2;
    const py = center.y - h / 2;

    editor.createShape({
      id: placeholderId,
      type: "geo",
      x: px,
      y: py,
      props: {
        geo: "rectangle",
        w,
        h,
        color: "grey",
        fill: "solid",
        text: "Generating…",
        align: "middle",
        verticalAlign: "middle",
        font: "mono",
        size: "m",
      },
    });

    const capturedPrompt = prompt.trim();
    onClose();

    // Background generation
    try {
      const result = await generateImage({
        prompt: capturedPrompt,
        aspectRatio: "1:1",
      });

      const { AssetRecordType } = await import("@tldraw/tldraw");
      const assetId = AssetRecordType.createId();
      const iw = result.width || w;
      const ih = result.height || h;

      editor.createAssets([{
        id: assetId,
        type: "image",
        typeName: "asset",
        props: {
          name: "generated.png",
          src: result.imageUrl,
          w: iw,
          h: ih,
          mimeType: "image/png",
          isAnimated: false,
        },
        meta: {},
      }]);

      editor.deleteShape(placeholderId);
      const imgId = createShapeId();
      editor.createShape({
        id: imgId,
        type: "image",
        x: px,
        y: py,
        props: { assetId, w: iw, h: ih },
      });
    } catch {
      try {
        editor.updateShape({
          id: placeholderId,
          type: "geo",
          props: { text: "Generation failed", color: "red" },
        });
      } catch { /* placeholder may be deleted */ }
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
        alignItems: "center",
        gap: 8,
        padding: "6px 6px 6px 14px",
        background: "var(--surface-panel)",
        borderRadius: 999,
        border: "1px solid var(--border)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.08)",
        backdropFilter: "blur(12px)",
        minWidth: 340,
        maxWidth: 520,
      }}
    >
      <Wand2 size={15} strokeWidth={1.75} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
      <input
        ref={inputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleGenerate();
          if (e.key === "Escape") onClose();
        }}
        placeholder={isEdit ? "Describe the edit…" : "Describe what to generate…"}
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
        onClick={handleGenerate}
        disabled={!prompt.trim() || loading}
        style={{
          padding: "6px 14px",
          borderRadius: 999,
          border: "none",
          background:
            !prompt.trim() || loading
              ? "var(--border)"
              : "var(--accent-blue)",
          color: !prompt.trim() || loading ? "var(--text-muted)" : "#fff",
          fontSize: 12,
          fontWeight: 700,
          cursor: !prompt.trim() || loading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: 4,
          flexShrink: 0,
          transition: "background 120ms ease",
        }}
      >
        {loading ? (
          <Loader2 size={13} strokeWidth={2} style={{ animation: "spin 0.8s linear infinite" }} />
        ) : (
          isEdit ? "Edit" : "Go"
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
  );
}
