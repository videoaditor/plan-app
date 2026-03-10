"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Layout,
} from "lucide-react";
import {
  type Board,
  createBoard,
  renameBoard,
  deleteBoard,
} from "@/lib/boards";

interface SidebarProps {
  boards: Board[];
  currentBoardId: string;
  open: boolean;
  onBoardsChange: () => void;
}

export default function Sidebar({
  boards,
  currentBoardId,
  open,
  onBoardsChange,
}: SidebarProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [menuBoardId, setMenuBoardId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [creating, setCreating] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  const handleSelectBoard = (id: string) => {
    if (id !== currentBoardId) {
      router.push(`/board/${id}`);
    }
  };

  const startEdit = (board: Board) => {
    setEditingId(board.id);
    setEditName(board.name);
    setMenuBoardId(null);
    setTimeout(() => editInputRef.current?.select(), 50);
  };

  const commitEdit = async () => {
    if (editingId && editName.trim()) {
      await renameBoard(editingId, editName.trim());
      onBoardsChange();
    }
    setEditingId(null);
  };

  const handleDeleteBoard = async (id: string) => {
    setMenuBoardId(null);
    await deleteBoard(id);
    if (id === currentBoardId) {
      const remaining = boards.filter((b) => b.id !== id);
      if (remaining.length > 0) {
        router.push(`/board/${remaining[0].id}`);
      } else {
        // Create a new board if none left
        const fresh = await createBoard("My Board");
        router.push(`/board/${fresh.id}`);
      }
    }
    onBoardsChange();
  };

  const handleCreateBoard = () => {
    setCreating(true);
    setNewBoardName("");
    setTimeout(() => newInputRef.current?.focus(), 50);
  };

  const commitCreate = async () => {
    const name = newBoardName.trim() || "Untitled Board";
    const board = await createBoard(name);
    onBoardsChange();
    setCreating(false);
    router.push(`/board/${board.id}`);
  };

  const handleMenuOpen = (e: React.MouseEvent, boardId: string) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setMenuPos({ x: rect.right + 4, y: rect.top });
    setMenuBoardId(menuBoardId === boardId ? null : boardId);
  };

  if (!open) {
    return (
      <div
        style={{
          width: 48,
          minWidth: 48,
          height: "100%",
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 12,
          gap: 4,
          overflow: "hidden",
          transition: "width 200ms ease",
        }}
      >
        {boards.map((board) => (
          <button
            key={board.id}
            onClick={() => handleSelectBoard(board.id)}
            title={board.name}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "none",
              background: board.id === currentBoardId ? "rgba(37,99,235,0.1)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              transition: "background 120ms ease",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: board.color,
                flexShrink: 0,
              }}
            />
          </button>
        ))}
        <button
          onClick={handleCreateBoard}
          title="New board"
          className="btn-icon"
          style={{ marginTop: 4 }}
        >
          <Plus size={16} strokeWidth={2} />
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        className="sidebar"
        style={{
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "12px 12px 8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-muted)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Boards
          </span>
          <button
            onClick={handleCreateBoard}
            className="btn-icon"
            style={{ width: 26, height: 26 }}
            title="New board"
          >
            <Plus size={15} strokeWidth={2} />
          </button>
        </div>

        {/* Board list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "2px 6px" }}>
          {boards.map((board) => {
            const isActive = board.id === currentBoardId;
            const isEditing = editingId === board.id;

            return (
              <div
                key={board.id}
                onClick={() => !isEditing && handleSelectBoard(board.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: 8,
                  cursor: isEditing ? "default" : "pointer",
                  background: isActive
                    ? "rgba(37,99,235,0.06)"
                    : "transparent",
                  marginBottom: 1,
                  transition: "background 80ms ease",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLDivElement).style.background =
                      "var(--surface-hover)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLDivElement).style.background =
                      "transparent";
                  }
                }}
                className="group"
              >
                {/* Color dot */}
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: board.color,
                    flexShrink: 0,
                  }}
                />

                {/* Name */}
                {isEditing ? (
                  <input
                    ref={editInputRef}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit();
                      if (e.key === "Escape") {
                        setEditingId(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      flex: 1,
                      fontSize: 13,
                      fontWeight: 500,
                      background: "var(--surface-hover)",
                      border: "1px solid var(--accent-blue)",
                      borderRadius: 4,
                      padding: "0 4px",
                      outline: "none",
                      color: "var(--text-primary)",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 500,
                      color: isActive
                        ? "var(--accent-blue)"
                        : "var(--text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      minWidth: 0,
                    }}
                  >
                    {board.name}
                  </span>
                )}

                {/* More button */}
                {!isEditing && (
                  <button
                    onClick={(e) => handleMenuOpen(e, board.id)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 5,
                      border: "none",
                      background: "transparent",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0,
                      flexShrink: 0,
                      transition: "opacity 80ms ease, background 80ms ease",
                    }}
                    className="board-menu-btn"
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "var(--border)";
                    }}
                    onMouseLeave={(e) => {
                      if (menuBoardId !== board.id) {
                        (e.currentTarget as HTMLButtonElement).style.opacity = "0";
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "transparent";
                      }
                    }}
                    title="Board options"
                  >
                    <MoreHorizontal size={13} strokeWidth={2} />
                  </button>
                )}
              </div>
            );
          })}

          {/* New board input */}
          {creating && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                borderRadius: 8,
                background: "var(--surface-hover)",
                marginBottom: 1,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--text-muted)",
                  flexShrink: 0,
                }}
              />
              <input
                ref={newInputRef}
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                onBlur={commitCreate}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitCreate();
                  if (e.key === "Escape") {
                    setCreating(false);
                  }
                }}
                placeholder="Board name…"
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: 500,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          )}

          {boards.length === 0 && !creating && (
            <div
              style={{
                textAlign: "center",
                padding: "24px 12px",
                color: "var(--text-muted)",
                fontSize: 12,
              }}
            >
              No boards yet.
              <br />
              <button
                onClick={handleCreateBoard}
                style={{
                  marginTop: 8,
                  color: "var(--accent-blue)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Create your first board
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "8px 12px 12px",
            borderTop: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            <Layout size={12} strokeWidth={1.75} />
            <span>{boards.length} board{boards.length !== 1 ? "s" : ""}</span>
          </div>
          <div
            style={{
              fontSize: 9,
              color: "var(--text-muted)",
              opacity: 0.5,
              marginTop: 6,
              fontFamily: "var(--font-mono, monospace)",
              letterSpacing: "0.04em",
              userSelect: "all",
            }}
            title="Build version"
          >
            v{process.env.NEXT_PUBLIC_APP_VERSION || "dev"} · {process.env.NEXT_PUBLIC_BUILD_DATE || "local"}
          </div>
        </div>
      </div>

      {/* Board context menu */}
      {menuBoardId && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 599,
            }}
            onClick={() => setMenuBoardId(null)}
          />
          <div
            className="context-menu"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            <button
              className="context-menu-item"
              onClick={() => {
                const b = boards.find((b) => b.id === menuBoardId);
                if (b) startEdit(b);
              }}
            >
              <Pencil size={14} strokeWidth={1.75} />
              Rename
            </button>
            <div className="context-menu-separator" />
            <button
              className="context-menu-item danger"
              onClick={() => handleDeleteBoard(menuBoardId)}
            >
              <Trash2 size={14} strokeWidth={1.75} />
              Delete board
            </button>
          </div>
        </>
      )}

      <style>{`
        .group:hover .board-menu-btn {
          opacity: 1 !important;
        }
      `}</style>
    </>
  );
}
