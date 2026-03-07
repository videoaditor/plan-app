"use client";

import { useState, useRef } from "react";
import { X, Wand2, Loader2, ChevronDown } from "lucide-react";
import type { Editor } from "@tldraw/tldraw";
import { generateImage } from "@/lib/ai";

interface GeneratePanelProps {
  editor: Editor | null;
  onClose: () => void;
  referenceImageSrc?: string;
  mode?: "generate" | "edit";
  referenceShapeId?: string;
}

const ASPECT_RATIOS = [
  { label: "1:1", value: "1:1", w: 1, h: 1 },
  { label: "16:9", value: "16:9", w: 16, h: 9 },
  { label: "9:16", value: "9:16", w: 9, h: 16 },
  { label: "4:3", value: "4:3", w: 4, h: 3 },
  { label: "3:4", value: "3:4", w: 3, h: 4 },
];

const EXAMPLE_PROMPTS = [
  "A sleek product shot on white background",
  "Abstract colorful gradient shapes",
  "Minimalist tech illustration",
  "Cinematic wide shot, golden hour",
];

async function placeImage(
  editor: Editor,
  imageUrl: string,
  position: { x: number; y: number },
  size: { w: number; h: number }
) {
  const { AssetRecordType, createShapeId } = await import("@tldraw/tldraw");
  const assetId = AssetRecordType.createId();

  editor.createAssets([
    {
      id: assetId,
      type: "image",
      typeName: "asset",
      props: {
        name: "generated.png",
        src: imageUrl,
        w: size.w,
        h: size.h,
        mimeType: "image/png",
        isAnimated: false,
      },
      meta: {},
    },
  ]);

  editor.createShapes([
    {
      id: createShapeId(),
      type: "image",
      x: position.x,
      y: position.y,
      props: {
        assetId,
        w: size.w,
        h: size.h,
      },
    },
  ]);
}

export default function GeneratePanel({
  editor,
  onClose,
  referenceImageSrc,
  mode = "generate",
  referenceShapeId,
}: GeneratePanelProps) {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16" | "4:3" | "3:4">("1:1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEdit = mode === "edit" && !!referenceImageSrc;

  const handleGenerate = async () => {
    if (!prompt.trim() || !editor || loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await generateImage({
        prompt: prompt.trim(),
        aspectRatio,
        referenceImageUrl: isEdit ? referenceImageSrc : undefined,
      });

      const vp = editor.getViewportPageBounds();
      const center = { x: vp.x + vp.w / 2, y: vp.y + vp.h / 2 };

      // Calculate dimensions based on aspect ratio
      const ar = ASPECT_RATIOS.find((a) => a.value === aspectRatio) ?? ASPECT_RATIOS[0];
      const maxSize = 512;
      let w: number, h: number;
      if (ar.w >= ar.h) {
        w = maxSize;
        h = Math.round((maxSize * ar.h) / ar.w);
      } else {
        h = maxSize;
        w = Math.round((maxSize * ar.w) / ar.h);
      }

      // If editing, replace reference image; otherwise place new
      if (isEdit && referenceShapeId && editor) {
        const { AssetRecordType } = await import("@tldraw/tldraw");
        const newAssetId = AssetRecordType.createId();

        editor.createAssets([
          {
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
          },
        ]);

        editor.updateShapes([
          {
            id: referenceShapeId as any,
            type: "image",
            props: { assetId: newAssetId },
          },
        ]);
      } else {
        await placeImage(
          editor,
          result.imageUrl,
          {
            x: center.x - (result.width || w) / 2,
            y: center.y - (result.height || h) / 2,
          },
          { w: result.width || w, h: result.height || h }
        );
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div
        className="panel-card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 520 }}
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
                background: "rgba(37,99,235,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Wand2 size={15} strokeWidth={1.75} color="var(--accent-blue)" />
            </div>
            <div>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {isEdit ? "AI Edit Image" : "Generate Image"}
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {isEdit ? "Edit selected image with a prompt" : "Create AI-generated image"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{ width: 28, height: 28, borderRadius: 8 }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
          {/* Reference image preview */}
          {isEdit && referenceImageSrc && (
            <div style={{ marginBottom: 16 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Reference Image
              </p>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 10,
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                }}
              >
                <img
                  src={referenceImageSrc}
                  alt="Reference"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            </div>
          )}

          {/* Prompt input */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-muted)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Prompt
            </label>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
              }}
              placeholder={
                isEdit
                  ? "Describe how to edit the image…"
                  : "Describe the image you want to create…"
              }
              autoFocus
              style={{
                width: "100%",
                minHeight: 96,
                padding: "10px 12px",
                background: "var(--surface-hover)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                fontSize: 14,
                color: "var(--text-primary)",
                outline: "none",
                resize: "vertical",
                fontFamily: "Inter, sans-serif",
                lineHeight: 1.5,
                transition: "border-color 120ms ease",
              }}
              onFocus={(e) => {
                (e.target as HTMLTextAreaElement).style.borderColor = "var(--accent-blue)";
              }}
              onBlur={(e) => {
                (e.target as HTMLTextAreaElement).style.borderColor = "var(--border)";
              }}
            />
          </div>

          {/* Aspect ratio */}
          {!isEdit && (
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Aspect Ratio
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                {ASPECT_RATIOS.map((ar) => (
                  <button
                    key={ar.value}
                    onClick={() => setAspectRatio(ar.value as any)}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 8,
                      border: `1px solid ${
                        aspectRatio === ar.value ? "var(--accent-blue)" : "var(--border)"
                      }`,
                      background:
                        aspectRatio === ar.value
                          ? "rgba(37,99,235,0.06)"
                          : "transparent",
                      color:
                        aspectRatio === ar.value
                          ? "var(--accent-blue)"
                          : "var(--text-secondary)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 120ms ease",
                    }}
                  >
                    {ar.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Example prompts */}
          {!prompt && (
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Try these
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {EXAMPLE_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setPrompt(p);
                      textareaRef.current?.focus();
                    }}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 20,
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--text-secondary)",
                      fontSize: 12,
                      cursor: "pointer",
                      transition: "all 80ms ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "var(--text-muted)";
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "var(--text-primary)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "var(--border)";
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "var(--text-secondary)";
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 8,
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.2)",
                fontSize: 12,
                color: "var(--accent-red)",
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || loading}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              background:
                !prompt.trim() || loading
                  ? "var(--border)"
                  : "var(--accent-blue)",
              color: !prompt.trim() || loading ? "var(--text-muted)" : "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: !prompt.trim() || loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "background 120ms ease",
            }}
          >
            {loading ? (
              <>
                <Loader2 size={14} strokeWidth={2} style={{ animation: "spin 0.8s linear infinite" }} />
                Generating…
              </>
            ) : (
              <>
                <Wand2 size={14} strokeWidth={2} />
                {isEdit ? "Apply Edit" : "Generate"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
