"use client";

import dynamic from "next/dynamic";

const TldrawCanvas = dynamic(() => import("./TldrawCanvas"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "var(--canvas-bg)",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          border: "2px solid var(--border)",
          borderTopColor: "var(--accent-blue)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
    </div>
  ),
});

interface CanvasProps {
  boardId: string;
}

export default function Canvas({ boardId }: CanvasProps) {
  return <TldrawCanvas boardId={boardId} />;
}
