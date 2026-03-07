"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Wand2, Scissors, Loader2, Send, X } from "lucide-react";
import type { Editor } from "@tldraw/tldraw";
import { removeBackground, generateImage } from "@/lib/ai";

interface AiToolbarProps {
  editor: Editor;
  position: { x: number; y: number };
  onAiEdit: () => void;
}

export default function AiToolbar({ editor, position, onAiEdit }: AiToolbarProps) {
  const [removingBg, setRemovingBg] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editMode && inputRef.current) {
      inputRef.current.focus();
    }
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
      id: newAssetId,
      type: "image",
      typeName: "asset",
      props: {
        name: "processed.png",
        src: imageUrl,
        w: (info.asset.props as any).w || 512,
        h: (info.asset.props as any).h || 512,
        mimeType: "image/png",
        isAnimated: false,
      },
      meta: {},
    }]);

    editor.updateShapes([{
      id: info.shape.id,
      type: "image",
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

  const handleAiEdit = async () => {
    if (!editPrompt.trim() || editing) return;
    const info = getSelectedImageInfo();
    if (!info) return;

    setEditing(true);
    try {
      const result = await generateImage({
        prompt: editPrompt.trim(),
        referenceImageUrl: info.src,
      });
      if (result.imageUrl) await replaceImageAsset(result.imageUrl);
      setEditMode(false);
      setEditPrompt("");
    } catch (err) {
      console.error("AI Edit failed:", err);
    } finally {
      setEditing(false);
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

          <div style={{ width: 1, height: 18, background: "var(--border)", margin: "0 2px" }} />

          <button
            onClick={() => setEditMode(true)}
            className="ai-toolbar-btn ai-edit-btn"
          >
            <Wand2 size={14} strokeWidth={1.75} />
            AI Edit
          </button>
        </>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 4px" }}>
          <Wand2 size={14} strokeWidth={1.75} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAiEdit();
              if (e.key === "Escape") { setEditMode(false); setEditPrompt(""); }
            }}
            placeholder="Describe the edit…"
            disabled={editing}
            style={{
              width: 220,
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
          {editing ? (
            <Loader2 size={14} strokeWidth={2} className="spin" color="var(--accent-blue)" />
          ) : (
            <>
              <button
                onClick={handleAiEdit}
                disabled={!editPrompt.trim()}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 26, height: 26, borderRadius: 6, border: "none",
                  background: editPrompt.trim() ? "var(--accent-blue)" : "var(--border)",
                  color: editPrompt.trim() ? "#fff" : "var(--text-muted)",
                  cursor: editPrompt.trim() ? "pointer" : "not-allowed",
                  flexShrink: 0,
                }}
              >
                <Send size={12} strokeWidth={2} />
              </button>
              <button
                onClick={() => { setEditMode(false); setEditPrompt(""); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 22, height: 22, borderRadius: 4, border: "none",
                  background: "transparent", color: "var(--text-muted)",
                  cursor: "pointer", flexShrink: 0,
                }}
              >
                <X size={12} strokeWidth={2} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
