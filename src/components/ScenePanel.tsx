"use client";

interface Scene {
  id: string;
  num: number;
  name: string;
}

// Narrow scene list pinned to the right edge (outside Studio mode). Click jumps
// the camera. Reordering is by renaming the frame's number — noted as a hint.
export default function ScenePanel({
  scenes,
  activeId,
  onGoTo,
}: {
  scenes: Scene[];
  activeId: string | null;
  onGoTo: (id: string) => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        right: 12,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 400,
        width: 176,
        maxHeight: "70vh",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: 6,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        boxShadow: "var(--shadow-float)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          padding: "4px 8px 6px",
        }}
      >
        Scenes
      </div>

      {scenes.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--text-secondary)", padding: "2px 8px 8px", lineHeight: 1.4 }}>
          Name a frame with a number to add a scene, like &ldquo;1 Intro&rdquo;.
        </div>
      ) : (
        scenes.map((s) => (
          <button
            key={s.id}
            onClick={() => onGoTo(s.id)}
            className={activeId === s.id ? "active" : ""}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "7px 8px",
              background: activeId === s.id ? "var(--surface-hover)" : "transparent",
              border: "1px solid transparent",
              borderRadius: 9,
              cursor: "pointer",
              textAlign: "left",
              color: "var(--text-primary)",
              transition: "background 100ms ease",
            }}
            onMouseEnter={(e) => {
              if (activeId !== s.id)
                (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-hover)";
            }}
            onMouseLeave={(e) => {
              if (activeId !== s.id)
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
            title={s.name}
          >
            <span
              style={{
                flexShrink: 0,
                width: 20,
                height: 20,
                borderRadius: 6,
                background: "var(--bg-default)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-secondary)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {s.num}
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {s.name.replace(/^\d+\s*/, "") || "Untitled"}
            </span>
          </button>
        ))
      )}
    </div>
  );
}
