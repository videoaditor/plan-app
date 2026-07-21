"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PanelLeft, RefreshCw, Link2, Copy, Check } from "lucide-react";
import { renameBoard, rotateShareToken, type Board } from "@/lib/boards";
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

  const [shareOpen, setShareOpen] = useState(false);
  const [token, setToken] = useState<string | null>(board.shareToken);
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setName(board.name);
  }, [board.name]);

  useEffect(() => {
    setToken(board.shareToken);
  }, [board.shareToken]);

  const shareUrl =
    token && typeof window !== "undefined" ? `${window.location.origin}/s/${token}` : "";

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — no-op
    }
  };

  const rotate = async () => {
    if (rotating) return;
    setRotating(true);
    const next = await rotateShareToken(board.id);
    if (next) setToken(next);
    setRotating(false);
  };

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
        {/* Share */}
        <div style={{ position: "relative", marginRight: 4 }}>
          <button
            onClick={() => setShareOpen((v) => !v)}
            title="Share board"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              height: 30,
              padding: "0 12px",
              fontSize: 13,
              fontWeight: 600,
              color: shareOpen ? "var(--accent-blue)" : "var(--text-primary)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 100,
              cursor: "pointer",
            }}
          >
            <Link2 size={14} strokeWidth={2} />
            Share
          </button>

          {shareOpen && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 399 }}
                onClick={() => setShareOpen(false)}
              />
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  zIndex: 450,
                  width: 320,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 14,
                  boxShadow: "var(--shadow-float)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  animation: "scaleIn 150ms ease",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                  Anyone with the link can edit
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    readOnly
                    value={shareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      background: "var(--surface-hover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "8px 10px",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={copyLink}
                    title="Copy link"
                    className="btn-icon"
                    style={{ width: 34, height: 34, flexShrink: 0, color: copied ? "var(--accent-blue)" : undefined }}
                  >
                    {copied ? <Check size={15} strokeWidth={2} /> : <Copy size={15} strokeWidth={1.75} />}
                  </button>
                </div>
                <button
                  onClick={rotate}
                  disabled={rotating}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: rotating ? "default" : "pointer",
                    textAlign: "left",
                  }}
                >
                  {rotating ? "Generating…" : "Generate new link"}
                </button>
              </div>
            </>
          )}
        </div>

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
