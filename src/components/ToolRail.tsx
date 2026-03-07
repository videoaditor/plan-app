"use client";

import { useEffect, useState, useRef } from "react";
import {
  MousePointer2,
  Type,
  StickyNote,
  Pen,
  Square,
  Circle,
  ArrowRight,
  Image,
  Eraser,
  Minus,
  Triangle,
  ChevronRight,
} from "lucide-react";
import type { Editor } from "@tldraw/tldraw";

interface ToolRailProps {
  editor: Editor | null;
}

type ToolId =
  | "select"
  | "text"
  | "note"
  | "draw"
  | "geo"
  | "arrow"
  | "image"
  | "eraser"
  | "line";

interface Tool {
  id: ToolId;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
}

const tools: Tool[] = [
  {
    id: "select",
    label: "Select",
    icon: <MousePointer2 size={18} strokeWidth={1.75} />,
    shortcut: "V",
  },
  {
    id: "text",
    label: "Text",
    icon: <Type size={18} strokeWidth={1.75} />,
    shortcut: "T",
  },
  {
    id: "note",
    label: "Sticky Note",
    icon: <StickyNote size={18} strokeWidth={1.75} />,
    shortcut: "N",
  },
  {
    id: "draw",
    label: "Draw",
    icon: <Pen size={18} strokeWidth={1.75} />,
    shortcut: "P",
  },
  {
    id: "arrow",
    label: "Arrow",
    icon: <ArrowRight size={18} strokeWidth={1.75} />,
    shortcut: "A",
  },
  {
    id: "eraser",
    label: "Eraser",
    icon: <Eraser size={18} strokeWidth={1.75} />,
    shortcut: "E",
  },
];

const shapeTools = [
  {
    id: "rectangle" as const,
    label: "Rectangle",
    icon: <Square size={16} strokeWidth={1.75} />,
    shortcut: "R",
  },
  {
    id: "ellipse" as const,
    label: "Circle",
    icon: <Circle size={16} strokeWidth={1.75} />,
    shortcut: "O",
  },
  {
    id: "line" as const,
    label: "Line",
    icon: <Minus size={16} strokeWidth={1.75} />,
  },
  {
    id: "triangle" as const,
    label: "Triangle",
    icon: <Triangle size={16} strokeWidth={1.75} />,
  },
];

export default function ToolRail({ editor }: ToolRailProps) {
  const [activeTool, setActiveTool] = useState<string>("select");
  const [showShapes, setShowShapes] = useState(false);
  const [activeGeoShape, setActiveGeoShape] = useState("rectangle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editor) return;

    const updateTool = () => {
      const toolId = editor.getCurrentToolId();
      setActiveTool(toolId);
    };

    updateTool();
    const unsub = editor.store.listen(updateTool, { scope: "session" });
    return () => unsub();
  }, [editor]);

  const selectTool = (toolId: ToolId) => {
    if (!editor) return;
    setShowShapes(false);
    editor.setCurrentTool(toolId);
  };

  const selectGeoShape = (geoType: string) => {
    if (!editor) return;
    setActiveGeoShape(geoType);
    setShowShapes(false);

    // Use dynamic import to avoid SSR issues with tldraw style imports
    import("@tldraw/tldraw").then(({ GeoShapeGeoStyle }) => {
      editor.batch(() => {
        editor.setStyleForNextShapes(GeoShapeGeoStyle, geoType as any);
        editor.setCurrentTool("geo");
      });
    });
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    // Reset input
    e.target.value = "";

    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      import("@tldraw/tldraw").then(({ AssetRecordType, createShapeId }) => {
        const assetId = AssetRecordType.createId();
        const vp = editor.getViewportPageBounds();
        const center = { x: vp.x + vp.w / 2, y: vp.y + vp.h / 2 };

        // Scale down if too large
        const maxSize = 800;
        const scale = Math.min(
          1,
          maxSize / img.naturalWidth,
          maxSize / img.naturalHeight
        );
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);

        editor.createAssets([
          {
            id: assetId,
            type: "image",
            typeName: "asset",
            props: {
              name: file.name,
              src: url,
              w,
              h,
              mimeType: file.type,
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
            props: {
              assetId,
              w,
              h,
            },
          },
        ]);

        editor.setCurrentTool("select");
      });
    };
    img.src = url;
  };

  const currentGeoIcon = shapeTools.find((s) => s.id === activeGeoShape)?.icon ?? (
    <Square size={18} strokeWidth={1.75} />
  );

  return (
    <>
      <div className="tool-rail">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => selectTool(tool.id)}
            className={`btn-icon ${activeTool === tool.id ? "active" : ""}`}
            title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ""}`}
          >
            {tool.icon}
          </button>
        ))}

        {/* Separator */}
        <div
          style={{
            width: 24,
            height: 1,
            background: "var(--border)",
            margin: "3px 0",
          }}
        />

        {/* Shapes button */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowShapes((v) => !v)}
            className={`btn-icon ${
              activeTool === "geo" ? "active" : ""
            }`}
            title="Shapes"
            style={{ position: "relative" }}
          >
            {currentGeoIcon}
            <ChevronRight
              size={9}
              strokeWidth={2.5}
              style={{
                position: "absolute",
                right: 3,
                bottom: 3,
                opacity: 0.5,
                transform: "rotate(90deg)",
              }}
            />
          </button>

          {showShapes && (
            <>
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 399,
                }}
                onClick={() => setShowShapes(false)}
              />
              <div
                style={{
                  position: "absolute",
                  left: "calc(100% + 8px)",
                  top: 0,
                  zIndex: 450,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 6,
                  boxShadow: "var(--shadow-float)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  animation: "scaleIn 150ms ease",
                }}
              >
                {shapeTools.map((shape) => (
                  <button
                    key={shape.id}
                    onClick={() => selectGeoShape(shape.id)}
                    className={`btn-icon ${
                      activeGeoShape === shape.id && activeTool === "geo"
                        ? "active"
                        : ""
                    }`}
                    title={shape.label}
                    style={{ width: 32, height: 32 }}
                  >
                    {shape.icon}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Separator */}
        <div
          style={{
            width: 24,
            height: 1,
            background: "var(--border)",
            margin: "3px 0",
          }}
        />

        {/* Image upload */}
        <button
          onClick={handleImageUpload}
          className={`btn-icon ${activeTool === "image" ? "active" : ""}`}
          title="Upload image"
        >
          <Image size={18} strokeWidth={1.75} />
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </>
  );
}
