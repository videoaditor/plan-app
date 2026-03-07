"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Wand2, Scissors, Loader2, Send, X, Video } from "lucide-react";
import type { Editor } from "@tldraw/tldraw";
import { removeBackground, generateImage, animateImage } from "@/lib/ai";

interface AiToolbarProps {
  editor: Editor;
  position: { x: number; y: number };
  onAiEdit: () => void;
}

export default function AiToolbar({ editor, position, onAiEdit }: AiToolbarProps) {
  const [removingBg, setRemovingBg] = useState(false);
  const [editMode, setEditMode] = useState<false | "image" | "video">(false);
  const [prompt, setPrompt] = useState("");
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editMode && inputRef.current) inputRef.current.focus();
  }, [editMode]);

  const getSelectedImageInfo = () => {
    const shapes = editor.getSelectedShapes();
    const imageShape = shapes.find((s) => s.type === "image");
    if (!imageShape) return null;
    const assetId = (imageShape.props as any).assetId;
    if (!assetId) return null;
    const asset = editor.getAsset(assetId);
    if (!asset) return null;
    const src = (asset.props as any).src as string;
    if (!src) return null;
    return { shape: imageShape, asset, src };
  };

  const replaceImageAsset = useCallback(async (imageUrl: string) => {
    const info = getSelectedImageInfo();
    if (!info) return;
    const { AssetRecordType } = await import("@tldraw/tldraw");
    const newAssetId = AssetRecordType.createId();
    editor.createAssets([{
      id: newAssetId, type: "image", typeName: "asset",
      props: {
        name: "processed.png", src: imageUrl,
        w: (info.asset.props as any).w || 512,
        h: (info.asset.props as any).h || 512,
        mimeType: "image/png", isAnimated: false,
      },
      meta: {},
    }]);
    editor.updateShapes([{
      id: info.shape.id, type: "image",
      props: { assetId: newAssetId },
    }]);
  }, [editor]);

  const handleRemoveBg = async () => {
    const info = getSelectedImageInfo();
    if (!info || removingBg) return;
    setRemovingBg(true);
    try {
      const { imageUrl } = await removeBackground(info.src);
      if (imageUrl) await replaceImageAsset(imageUrl);
    } catch (err) {
      console.error("Remove BG failed:", err);
    } finally {
      setRemovingBg(false);
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim() || processing) return;
    const info = getSelectedImageInfo();
    if (!info) return;

    setProcessing(true);
    try {
      if (editMode === "video") {
        // Animate: image → video with bg removal
        const result = await animateImage(info.src, prompt.trim());
        if (result.videoUrl) {
          // For now, copy URL — tldraw doesn't natively support video shapes
          await navigator.clipboard.writeText(result.videoUrl);
          // TODO: add custom video shape type
          console.log("[plan] Video ready:", result.videoUrl);
        }
      } else {
        // AI Edit: image + prompt → new image
        const result = await generateImage({
          prompt: prompt.trim(),
          referenceImageUrl: info.src,
        });
        if (result.imageUrl) await replaceImageAsset(result.imageUrl);
      }
      setEditMode(false);
      setPrompt("");
    } catch (err) {
      console.error(editMode === "video" ? "Animate failed:" : "AI Edit failed:", err);
    } finally {
      setProcessing(false);
    }
  };

  const switchMode = (mode: "image" | "video") => {
    setEditMode(mode);
    setPrompt("");
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
      {!editMode ? (
        <>
          <button onClick={handleRemoveBg} disabled={removingBg} className="ai-toolbar-btn">
            {removingBg ? (
              <Loader2 size={14} strokeWidth={2} className="spin" />
            ) : (
              <Scissors size={14} strokeWidth={1.75} />
            )}
            {removingBg ? "Removing…" : "Remove BG"}
          </button>

          <div className="ai-toolbar-sep" />

          <button onClick={() => switchMode("image")} className="ai-toolbar-btn ai-edit-btn">
            <Wand2 size={14} strokeWidth={1.75} />
            AI Edit
          </button>
        </>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 4px" }}>
          {/* Mode toggle: image / video */}
          <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)", flexShrink: 0 }}>
            <button
              onClick={() => switchMode("image")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 28, height: 26, border: "none",
                background: editMode === "image" ? "var(--accent-blue)" : "transparent",
                color: editMode === "image" ? "#fff" : "var(--text-muted)",
                cursor: "pointer", transition: "all 100ms",
              }}
              title="AI Edit (image)"
            >
              <Wand2 size={13} strokeWidth={2} />
            </button>
            <button
              onClick={() => switchMode("video")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 28, height: 26, border: "none",
                borderLeft: "1px solid var(--border)",
                background: editMode === "video" ? "var(--accent-blue)" : "transparent",
                color: editMode === "video" ? "#fff" : "var(--text-muted)",
                cursor: "pointer", transition: "all 100ms",
              }}
              title="Animate (video)"
            >
              <Video size={13} strokeWidth={2} />
            </button>
          </div>

          {/* Prompt input */}
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") { setEditMode(false); setPrompt(""); }
            }}
            placeholder={editMode === "video" ? "Describe the motion…" : "Describe the edit…"}
            disabled={processing}
            style={{
              width: 200, padding: "5px 8px",
              background: "var(--surface-hover)",
              border: "1px solid var(--border)", borderRadius: 6,
              fontSize: 12, color: "var(--text-primary)",
              outline: "none", fontFamily: "inherit",
            }}
          />

          {/* Send / loading */}
          {processing ? (
            <Loader2 size={14} strokeWidth={2} className="spin" color="var(--accent-blue)" style={{ flexShrink: 0 }} />
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim()}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 26, height: 26, borderRadius: 6, border: "none",
                background: prompt.trim() ? "var(--accent-blue)" : "var(--border)",
                color: prompt.trim() ? "#fff" : "var(--text-muted)",
                cursor: prompt.trim() ? "pointer" : "not-allowed", flexShrink: 0,
              }}
            >
              <Send size={12} strokeWidth={2} />
            </button>
          )}

          {/* Close */}
          <button
            onClick={() => { setEditMode(false); setPrompt(""); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 22, height: 22, borderRadius: 4, border: "none",
              background: "transparent", color: "var(--text-muted)",
              cursor: "pointer", flexShrink: 0,
            }}
          >
            <X size={12} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}
