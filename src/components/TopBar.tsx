"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PanelLeft, RefreshCw } from "lucide-react";
import { renameBoard, type Board } from "@/lib/boards";
import ThemeToggle from "./ThemeToggle";
import CanvasSettings from "./CanvasSettings";

interface TopBarProps {
  board: Board;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onBoardChange: () => void;
}

export default function TopBar({
  board,
  sidebarOpen,
  onToggleSidebar,
  onBoardChange,
}: TopBarProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(board.name);
  const [deploying, setDeploying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(board.name);
  }, [board.name]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.select();
    }
  }, [editing]);

  const commitRename = async () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== board.name) {
      await renameBoard(board.id, trimmed);
      onBoardChange();
    } else {
      setName(board.name);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitRename();
    if (e.key === "Escape") {
      setName(board.name);
      setEditing(false);
    }
  };

  return (
    <header
      style={{
        height: 48,
        display: "flex",
        alignItems: "center",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        paddingLeft: 8,
        paddingRight: 12,
        gap: 0,
        flexShrink: 0,
        position: "relative",
        zIndex: 100,
      }}
    >
      {/* Left: sidebar toggle + logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
        <button
          onClick={onToggleSidebar}
          className="btn-icon"
          style={{ color: sidebarOpen ? "var(--accent-blue)" : undefined }}
          title="Toggle sidebar"
        >
          <PanelLeft size={18} strokeWidth={1.75} />
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginLeft: 4,
          }}
        >
          {/* Logo mark */}
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: "#F5D547",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 13,
              color: "#1A1A1A",
              letterSpacing: "-0.03em",
              flexShrink: 0,
              fontFamily: "Inter, sans-serif",
            }}
          >
            P
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            PLAN
          </span>
        </div>
      </div>

      {/* Center: board name */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
        }}
      >
        {editing ? (
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleKeyDown}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              background: "var(--surface-hover)",
              border: "1px solid var(--accent-blue)",
              borderRadius: 6,
              padding: "2px 8px",
              outline: "none",
              width: Math.max(120, name.length * 8 + 32),
              textAlign: "center",
              letterSpacing: "-0.02em",
            }}
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              background: "transparent",
              border: "1px solid transparent",
              borderRadius: 6,
              padding: "2px 8px",
              cursor: "text",
              letterSpacing: "-0.02em",
              transition: "border-color 120ms ease, background 120ms ease",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = "var(--border)";
              (e.target as HTMLButtonElement).style.background = "var(--surface-hover)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = "transparent";
              (e.target as HTMLButtonElement).style.background = "transparent";
            }}
            title="Click to rename board"
          >
            {board.name}
          </button>
        )}
      </div>

      {/* Right: actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
        <button
          onClick={async () => {
            if (deploying) return;
            setDeploying(true);
            try {
              const res = await fetch("/api/deploy", { method: "POST" });
              const data = await res.json();
              if (data.success) {
                // Poll until server is back up (deploy takes ~45s)
                const pollUntilReady = async () => {
                  for (let i = 0; i < 30; i++) {
                    await new Promise(r => setTimeout(r, 3000));
                    try {
                      const check = await fetch("/api/boards", { signal: AbortSignal.timeout(3000) });
                      if (check.ok) {
                        window.location.reload();
                        return;
                      }
                    } catch {}
                  }
                  // Give up after 90s, try reload anyway
                  window.location.reload();
                };
                pollUntilReady();
              } else {
                console.error("Deploy failed:", data.error);
                setDeploying(false);
              }
            } catch (err) {
              console.error("Deploy error:", err);
              setDeploying(false);
            }
          }}
          className="btn-icon"
          title="Pull & deploy from GitHub"
          style={{ color: deploying ? "var(--accent-blue)" : undefined }}
        >
          <RefreshCw
            size={16}
            strokeWidth={1.75}
            style={deploying ? { animation: "spin 1s linear infinite" } : undefined}
          />
        </button>
        <CanvasSettings />
        <ThemeToggle />
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--accent-blue)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 600,
            color: "#fff",
            cursor: "pointer",
            flexShrink: 0,
          }}
          title="Account"
        >
          A
        </div>
      </div>
    </header>
  );
}
