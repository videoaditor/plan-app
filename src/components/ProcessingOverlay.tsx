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
          className="processing-overlay"
          style={{
            position: "fixed",
            left: ps.bounds.x,
            top: ps.bounds.y,
            width: ps.bounds.w,
            height: ps.bounds.h,
            pointerEvents: "none",
            zIndex: 450,
          }}
        />
      ))}
    </>
  );
}
