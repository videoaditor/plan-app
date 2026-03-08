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

// ─── Detached operations (survive component unmount) ─────────────────
// These run at module scope so deselecting the image doesn't kill them

async function runRemoveBg(
  editor: Editor,
  shapeId: string,
  assetId: string,
  src: string,
  assetW: number,
  assetH: number
) {
  try {
    const { imageUrl } = await removeBackground(src);
    if (!imageUrl) throw new Error("No result URL");

    // Create new asset + update shape (even if no longer selected)
    const { AssetRecordType } = await import("@tldraw/tldraw");
    const newAssetId = AssetRecordType.createId();
    editor.createAssets([
      {
        id: newAssetId,
        type: "image",
        typeName: "asset",
        props: {
          name: "no-bg.png",
          src: imageUrl,
          w: assetW,
          h: assetH,
          mimeType: "image/png",
          isAnimated: false,
        },
        meta: {},
      },
    ]);
    editor.updateShapes([
      {
        id: shapeId as any,
        type: "image",
        props: { assetId: newAssetId },
      },
    ]);

    // Remove loading indicator
    editor.updateShapes([
      {
        id: shapeId as any,
        type: "image",
        meta: {
          ...(editor.getShape(shapeId as any)?.meta || {}),
          processing: false,
        },
      },
    ]);
  } catch (err: any) {
    console.error("Remove BG failed:", err);
    // Show error briefly, then clear
    try {
      editor.updateShapes([
        {
          id: shapeId as any,
          type: "image",
          meta: {
            ...(editor.getShape(shapeId as any)?.meta || {}),
            processing: false,
            processingError: err?.message || "Remove BG failed",
          },
        },
      ]);
      setTimeout(() => {
        try {
          editor.updateShapes([{
            id: shapeId as any,
            type: "image",
            meta: { ...(editor.getShape(shapeId as any)?.meta || {}), processingError: undefined },
          }]);
        } catch { }
      }, 4000);
    } catch { }
  }
}

async function runAiEdit(
  editor: Editor,
  shapeId: string,
  src: string,
  prompt: string,
  assetW: number,
  assetH: number
) {
  try {
    const result = await generateImage({
      prompt,
      referenceImageUrl: src,
    });
    if (!result.imageUrl) throw new Error("No result URL");

    const { AssetRecordType, createShapeId } = await import("@tldraw/tldraw");

    // Get original shape bounds for adjacent placement
    const origShape = editor.getShape(shapeId as any);
    const origX = origShape?.x ?? 0;
    const origY = origShape?.y ?? 0;
    const origW = (origShape?.props as any)?.w || assetW;

    const newW = result.width || assetW;
    const newH = result.height || assetH;

    // Create new asset
    const newAssetId = AssetRecordType.createId();
    editor.createAssets([
      {
        id: newAssetId,
        type: "image",
        typeName: "asset",
        props: {
          name: "ai-edit.png",
          src: result.imageUrl,
          w: newW,
          h: newH,
          mimeType: "image/png",
          isAnimated: false,
        },
        meta: {},
      },
    ]);

    // Spawn new shape adjacent to original (20px gap to the right)
    const newShapeId = createShapeId();
    editor.createShapes([
      {
        id: newShapeId,
        type: "image",
        x: origX + origW + 20,
        y: origY,
        props: {
          assetId: newAssetId,
          w: newW,
          h: newH,
        },
      },
    ]);

    // Clear processing state on original shape (keep it untouched)
    editor.updateShapes([
      {
        id: shapeId as any,
        type: "image",
        meta: {
          ...(editor.getShape(shapeId as any)?.meta || {}),
          processing: false,
        },
      },
    ]);

    // Select the new shape
    editor.select(newShapeId);
  } catch (err: any) {
    console.error("AI Edit failed:", err);
    try {
      editor.updateShapes([
        {
          id: shapeId as any,
          type: "image",
          meta: {
            ...(editor.getShape(shapeId as any)?.meta || {}),
            processing: false,
            processingError: err?.message || "AI Edit failed",
          },
        },
      ]);
      setTimeout(() => {
        try {
          editor.updateShapes([{
            id: shapeId as any,
            type: "image",
            meta: { ...(editor.getShape(shapeId as any)?.meta || {}), processingError: undefined },
          }]);
        } catch { }
      }, 4000);
    } catch { }
  }
}

// ─── Component ───────────────────────────────────────────────────────
export default function AiToolbar({
  editor,
  position,
  onAiEdit,
}: AiToolbarProps) {
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
    return {
      shape: imageShape,
      asset,
      src,
      assetId,
      w: (asset.props as any).w || 512,
      h: (asset.props as any).h || 512,
    };
  };

  const handleRemoveBg = async () => {
    const info = getSelectedImageInfo();
    if (!info || removingBg) return;

    // Capture IDs immediately — operation continues even if deselected
    const { shape, src, w, h, assetId } = info;
    const shapeId = shape.id;

    // Set processing indicator in meta (visible on shape)
    editor.updateShapes([
      {
        id: shapeId as any,
        type: "image",
        meta: {
          ...(editor.getShape(shapeId as any)?.meta || {}),
          processing: "remove-bg",
        },
      },
    ]);

    setRemovingBg(true);

    // Fire and forget — runs detached from component lifecycle
    runRemoveBg(editor, shapeId, assetId, src, w, h).finally(() => {
      setRemovingBg(false);
    });
  };

  const handleSubmit = async () => {
    if (!prompt.trim() || processing) return;
    const info = getSelectedImageInfo();
    if (!info) return;

    const { shape, src, w, h } = info;
    const shapeId = shape.id;
    const currentPrompt = prompt.trim();

    // Set processing indicator
    editor.updateShapes([
      {
        id: shapeId as any,
        type: "image",
        meta: {
          ...(editor.getShape(shapeId as any)?.meta || {}),
          processing: editMode === "video" ? "animate" : "ai-edit",
        },
      },
    ]);

    setProcessing(true);
    setEditMode(false);
    setPrompt("");

    if (editMode === "video") {
      animateImage(src, currentPrompt)
        .then((result) => {
          if (result.videoUrl) {
            navigator.clipboard.writeText(result.videoUrl);
            console.log("[plan] Video ready:", result.videoUrl);
          }
        })
        .catch((err) => console.error("Animate failed:", err))
        .finally(() => {
          setProcessing(false);
          try {
            editor.updateShapes([
              {
                id: shapeId as any,
                type: "image",
                meta: {
                  ...(editor.getShape(shapeId as any)?.meta || {}),
                  processing: false,
                },
              },
            ]);
          } catch { }
        });
    } else {
      runAiEdit(editor, shapeId, src, currentPrompt, w, h).finally(() => {
        setProcessing(false);
      });
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
          <button
            onClick={handleRemoveBg}
            disabled={removingBg}
            className="ai-toolbar-btn"
          >
            {removingBg ? (
              <Loader2 size={14} strokeWidth={2} className="spin" />
            ) : (
              <Scissors size={14} strokeWidth={1.75} />
            )}
            {removingBg ? "Removing…" : "Remove BG"}
          </button>

          <div className="ai-toolbar-sep" />

          <button
            onClick={() => switchMode("image")}
            className="ai-toolbar-btn ai-edit-btn"
          >
            <Wand2 size={14} strokeWidth={1.75} />
            AI Edit
          </button>
        </>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "0 4px",
          }}
        >
          {/* Mode toggle: image / video */}
          <div
            style={{
              display: "flex",
              borderRadius: 6,
              overflow: "hidden",
              border: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => switchMode("image")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 26,
                border: "none",
                background:
                  editMode === "image"
                    ? "var(--accent-blue)"
                    : "transparent",
                color:
                  editMode === "image" ? "#fff" : "var(--text-muted)",
                cursor: "pointer",
                transition: "all 100ms",
              }}
              title="AI Edit (image)"
            >
              <Wand2 size={13} strokeWidth={2} />
            </button>
            <button
              onClick={() => switchMode("video")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 26,
                border: "none",
                borderLeft: "1px solid var(--border)",
                background:
                  editMode === "video"
                    ? "var(--accent-blue)"
                    : "transparent",
                color:
                  editMode === "video" ? "#fff" : "var(--text-muted)",
                cursor: "pointer",
                transition: "all 100ms",
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
              if (e.key === "Escape") {
                setEditMode(false);
                setPrompt("");
              }
            }}
            placeholder={
              editMode === "video"
                ? "Describe the motion…"
                : "Describe the edit…"
            }
            disabled={processing}
            style={{
              width: 200,
              padding: "5px 8px",
              background: "var(--surface-hover)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: 12,
              color: "var(--text-primary)",
              outline: "none",
              fontFamily: "inherit",
            }}
          />

          {/* Send / loading */}
          {processing ? (
            <Loader2
              size={14}
              strokeWidth={2}
              className="spin"
              color="var(--accent-blue)"
              style={{ flexShrink: 0 }}
            />
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim()}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 26,
                height: 26,
                borderRadius: 6,
                border: "none",
                background: prompt.trim()
                  ? "var(--accent-blue)"
                  : "var(--border)",
                color: prompt.trim() ? "#fff" : "var(--text-muted)",
                cursor: prompt.trim() ? "pointer" : "not-allowed",
                flexShrink: 0,
              }}
            >
              <Send size={12} strokeWidth={2} />
            </button>
          )}

          {/* Close */}
          <button
            onClick={() => {
              setEditMode(false);
              setPrompt("");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              borderRadius: 4,
              border: "none",
              background: "transparent",
              color: "var(--text-muted)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <X size={12} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}
