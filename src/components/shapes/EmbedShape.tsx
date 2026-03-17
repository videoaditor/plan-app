"use client";

import {
  ShapeUtil,
  HTMLContainer,
  type TLBaseShape,
  type TLResizeInfo,
  resizeBox,
  BaseBoxShapeUtil,
} from "@tldraw/tldraw";

// ─── URL helpers ─────────────────────────────────────────────────────

export type EmbedType = "youtube" | "vimeo" | "video" | "image";

interface ParsedEmbed {
  type: EmbedType;
  embedUrl: string;
  thumbnailUrl?: string;
}

function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|avif)(\?.*)?$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov)(\?.*)?$/i;

export function parseEmbedUrl(url: string): ParsedEmbed | null {
  try {
    const u = new URL(url);

    // YouTube
    const ytId = getYouTubeId(url);
    if (ytId) {
      return {
        type: "youtube",
        embedUrl: `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`,
        thumbnailUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      };
    }

    // Vimeo
    const vimeoId = getVimeoId(url);
    if (vimeoId) {
      return {
        type: "vimeo",
        embedUrl: `https://player.vimeo.com/video/${vimeoId}?byline=0&portrait=0`,
      };
    }

    // Direct video file
    if (VIDEO_EXTENSIONS.test(u.pathname)) {
      return { type: "video", embedUrl: url };
    }

    // Direct image
    if (IMAGE_EXTENSIONS.test(u.pathname)) {
      return { type: "image", embedUrl: url };
    }

    return null;
  } catch {
    return null;
  }
}

// ─── Shape definition ────────────────────────────────────────────────

export type EmbedShapeProps = {
  url: string;
  embedType: EmbedType;
  embedUrl: string;
  w: number;
  h: number;
};

export type EmbedShape = TLBaseShape<"media-embed", EmbedShapeProps>;

// ─── Shape util ──────────────────────────────────────────────────────

export class EmbedShapeUtil extends BaseBoxShapeUtil<EmbedShape> {
  static override type = "media-embed" as const;

  getDefaultProps(): EmbedShapeProps {
    return {
      url: "",
      embedType: "youtube",
      embedUrl: "",
      w: 480,
      h: 270,
    };
  }

  override canResize = () => true;
  override canEdit = () => true;
  override isAspectRatioLocked = () => false;

  override onResize = (shape: EmbedShape, info: TLResizeInfo<EmbedShape>) => {
    return resizeBox(shape, info);
  };

  component(shape: EmbedShape) {
    const { embedType, embedUrl, url, w, h } = shape.props;
    const isEditing = this.editor.getEditingShapeId() === shape.id;

    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: w,
          height: h,
          overflow: "hidden",
          borderRadius: 12,
          background: "#000",
          boxShadow: "0 4px 24px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.08)",
        }}
      >
        {embedType === "youtube" || embedType === "vimeo" ? (
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <iframe
              src={embedUrl}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                borderRadius: 12,
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              title="Embedded video"
            />
            {/* Click-through overlay when not editing — lets tldraw handle drag/select */}
            {!isEditing && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  cursor: "pointer",
                  borderRadius: 12,
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  this.editor.setEditingShape(shape.id);
                }}
              />
            )}
          </div>
        ) : embedType === "video" ? (
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <video
              src={embedUrl}
              controls={isEditing}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                borderRadius: 12,
                background: "#000",
              }}
              playsInline
              preload="metadata"
              className="media-embed-video"
            />
            {!isEditing && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  borderRadius: 12,
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  this.editor.setEditingShape(shape.id);
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "rgba(0,0,0,0.6)",
                    backdropFilter: "blur(8px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        ) : embedType === "image" ? (
          <img
            src={embedUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              borderRadius: 12,
            }}
            alt=""
            draggable={false}
          />
        ) : null}

        {/* URL label bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 28,
            background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
            display: "flex",
            alignItems: "flex-end",
            padding: "0 10px 5px",
            borderRadius: "0 0 12px 12px",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 10,
              fontFamily: "system-ui, sans-serif",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%",
            }}
          >
            {url}
          </span>
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: EmbedShape) {
    return (
      <rect
        width={shape.props.w}
        height={shape.props.h}
        rx={12}
        ry={12}
      />
    );
  }
}
