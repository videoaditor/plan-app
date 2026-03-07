"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tldraw/tldraw";

interface ProcessingShape {
  id: string;
  bounds: { x: number; y: number; w: number; h: number };
}

interface ProcessingOverlayProps {
  editor: Editor;
}

export default function ProcessingOverlay({ editor }: ProcessingOverlayProps) {
  const [processingShapes, setProcessingShapes] = useState<ProcessingShape[]>([]);

  useEffect(() => {
    const update = () => {
      const shapes = editor.getCurrentPageShapes();
      const processing: ProcessingShape[] = [];

      for (const shape of shapes) {
        const meta = shape.meta as any;
        if (meta?.processing) {
          const pageBounds = editor.getShapePageBounds(shape.id);
          if (pageBounds) {
            const screenTopLeft = editor.pageToScreen({ x: pageBounds.minX, y: pageBounds.minY });
            const screenBottomRight = editor.pageToScreen({ x: pageBounds.maxX, y: pageBounds.maxY });
            processing.push({
              id: shape.id,
              bounds: {
                x: screenTopLeft.x,
                y: screenTopLeft.y,
                w: screenBottomRight.x - screenTopLeft.x,
                h: screenBottomRight.y - screenTopLeft.y,
              },
            });
          }
        }
      }

      setProcessingShapes(processing);
    };

    update();
    const unsub1 = editor.store.listen(update, { scope: "document" });
    const unsub2 = editor.store.listen(update, { scope: "session" });
    return () => { unsub1(); unsub2(); };
  }, [editor]);

  if (processingShapes.length === 0) return null;

  return (
    <>
      {processingShapes.map((ps) => (
        <div
          key={ps.id}
          style={{
            position: "fixed",
            left: ps.bounds.x,
            top: ps.bounds.y,
            width: ps.bounds.w,
            height: ps.bounds.h,
            pointerEvents: "none",
            zIndex: 450,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 16,
            backdropFilter: "blur(12px) brightness(0.8)",
            boxShadow: "inset 0 0 100px rgba(0,0,0,0.5)",
            borderRadius: 8,
            overflow: "hidden",
            color: "white",
            animation: "entranceScale 0.3s ease-out forwards",
          }}
        >
          {/* Concentric Lens Ring */}
          <div className="processing-lens-ring">
            <div className="ring inner" />
            <div className="ring middle" />
            <div className="ring outer" />
            <div className="center-dot" />
          </div>

          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              opacity: 0.8,
              background: "rgba(0,0,0,0.4)",
              padding: "4px 12px",
              borderRadius: 99,
              border: "1px solid rgba(255,255,255,0.1)"
            }}
          >
            Processing...
          </div>
        </div>
      ))}
    </>
  );
}
