"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Layout,
  ChevronDown,
  Check,
  FolderInput,
} from "lucide-react";
import {
  type Board,
  type Workspace,
  createBoard,
  renameBoard,
  deleteBoard,
  moveBoard,
  getWorkspaces,
  createWorkspace,
  renameWorkspace,
  deleteWorkspace,
} from "@/lib/boards";

const ACTIVE_WS_KEY = "plan-active-workspace";

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

  // ─── Workspaces ──────────────────────────────────────────────────────
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWs, setActiveWs] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [wsCreating, setWsCreating] = useState(false);
  const [wsNewName, setWsNewName] = useState("");
  const [wsEditingId, setWsEditingId] = useState<string | null>(null);
  const [wsEditName, setWsEditName] = useState("");
  const wsNewInputRef = useRef<HTMLInputElement>(null);
  const wsEditInputRef = useRef<HTMLInputElement>(null);

  const refreshWorkspaces = useCallback(async () => {
    const ws = await getWorkspaces();
    setWorkspaces(ws);
    return ws;
  }, []);

  // Resolve the active workspace once at mount: prefer the open board's workspace
  // (so it's visible), then the last-used one, then the first. Not a live "follow"
  // — moving the open board out of the active workspace should let it leave the list.
  const didInit = useRef(false);
  useEffect(() => {
    (async () => {
      const ws = await refreshWorkspaces();
      if (didInit.current) return;
      didInit.current = true;
      const cur = boards.find((b) => b.id === currentBoardId);
      const stored =
        typeof window !== "undefined" ? localStorage.getItem(ACTIVE_WS_KEY) : null;
      setActiveWs(
        cur?.workspaceId ?? ws.find((w) => w.id === stored)?.id ?? ws[0]?.id ?? null
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectWorkspace = (id: string) => {
    setActiveWs(id);
    if (typeof window !== "undefined") localStorage.setItem(ACTIVE_WS_KEY, id);
    setSwitcherOpen(false);
  };

  const activeWorkspace = workspaces.find((w) => w.id === activeWs) ?? null;
  const visibleBoards = boards.filter((b) => b.workspaceId === activeWs);

  const startWsCreate = () => {
    setWsCreating(true);
    setWsNewName("");
    setTimeout(() => wsNewInputRef.current?.focus(), 50);
  };

  const commitWsCreate = async () => {
    const name = wsNewName.trim();
    setWsCreating(false);
    if (!name) return;
    const ws = await createWorkspace(name);
    await refreshWorkspaces();
    selectWorkspace(ws.id);
  };

  const startWsEdit = () => {
    if (!activeWorkspace) return;
    setWsEditingId(activeWorkspace.id);
    setWsEditName(activeWorkspace.name);
    setTimeout(() => wsEditInputRef.current?.select(), 50);
  };

  const commitWsEdit = async () => {
    if (wsEditingId && wsEditName.trim()) {
      await renameWorkspace(wsEditingId, wsEditName.trim());
      await refreshWorkspaces();
    }
    setWsEditingId(null);
  };

  const handleWsDelete = async () => {
    if (!activeWorkspace) return;
    const ok = await deleteWorkspace(activeWorkspace.id);
    setSwitcherOpen(false);
    if (!ok) return; // 409 — not empty; button is only shown when empty, so this is a safety net
    const ws = await refreshWorkspaces();
    const next = ws[0]?.id ?? null;
    setActiveWs(next);
    if (next && typeof window !== "undefined") localStorage.setItem(ACTIVE_WS_KEY, next);
  };

  // ─── Boards ──────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [menuBoardId, setMenuBoardId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [menuView, setMenuView] = useState<"main" | "move">("main");
  const [creating, setCreating] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  const handleSelectBoard = (id: string) => {
    if (id !== currentBoardId) router.push(`/board/${id}`);
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
      const remaining = visibleBoards.filter((b) => b.id !== id);
      if (remaining.length > 0) {
        router.push(`/board/${remaining[0].id}`);
      } else {
        const fresh = await createBoard("My Board", activeWs ?? undefined);
        router.push(`/board/${fresh.id}`);
      }
    }
    onBoardsChange();
  };

  const handleMoveBoard = async (boardId: string, workspaceId: string) => {
    setMenuBoardId(null);
    setMenuView("main");
    await moveBoard(boardId, workspaceId);
    onBoardsChange();
  };

  const handleCreateBoard = () => {
    setCreating(true);
    setNewBoardName("");
    setTimeout(() => newInputRef.current?.focus(), 50);
  };

  const commitCreate = async () => {
    const name = newBoardName.trim() || "Untitled Board";
    const board = await createBoard(name, activeWs ?? undefined);
    onBoardsChange();
    setCreating(false);
    router.push(`/board/${board.id}`);
  };

  const handleMenuOpen = (e: React.MouseEvent, boardId: string) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setMenuPos({ x: rect.right + 4, y: rect.top });
    setMenuView("main");
    setMenuBoardId(menuBoardId === boardId ? null : boardId);
  };

  // ─── Collapsed rail ──────────────────────────────────────────────────
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
        {visibleBoards.map((board) => (
          <button
            key={board.id}
            onClick={() => handleSelectBoard(board.id)}
            title={board.name}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "none",
              background:
                board.id === currentBoardId ? "rgba(37,99,235,0.1)" : "transparent",
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

  // ─── Expanded sidebar ────────────────────────────────────────────────
  return (
    <>
      <div
        className="sidebar"
        style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        {/* Workspace switcher */}
        <div style={{ padding: "10px 10px 6px", flexShrink: 0, position: "relative" }}>
          {wsEditingId ? (
            <input
              ref={wsEditInputRef}
              value={wsEditName}
              onChange={(e) => setWsEditName(e.target.value)}
              onBlur={commitWsEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitWsEdit();
                if (e.key === "Escape") setWsEditingId(null);
              }}
              style={{
                width: "100%",
                fontSize: 13,
                fontWeight: 600,
                background: "var(--surface-hover)",
                border: "1px solid var(--accent-blue)",
                borderRadius: 8,
                padding: "7px 8px",
                outline: "none",
                color: "var(--text-primary)",
              }}
            />
          ) : (
            <button
              onClick={() => setSwitcherOpen((v) => !v)}
              className="ws-switcher"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 8px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                cursor: "pointer",
                transition: "background 80ms ease",
              }}
              title="Switch workspace"
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: activeWorkspace?.color ?? "var(--text-muted)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  flex: 1,
                  textAlign: "left",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {activeWorkspace?.name ?? "Workspace"}
              </span>
              <ChevronDown size={14} strokeWidth={2} style={{ color: "var(--text-muted)" }} />
            </button>
          )}

          {switcherOpen && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 599 }}
                onClick={() => setSwitcherOpen(false)}
              />
              <div
                className="context-menu"
                style={{ left: 10, top: 46, width: 240, minWidth: 0 }}
              >
                {workspaces.map((w) => (
                  <button
                    key={w.id}
                    className="context-menu-item"
                    onClick={() => selectWorkspace(w.id)}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: w.color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ flex: 1, textAlign: "left" }}>{w.name}</span>
                    {w.id === activeWs && (
                      <Check size={14} strokeWidth={2} style={{ color: "var(--accent-blue)" }} />
                    )}
                  </button>
                ))}

                {wsCreating && (
                  <input
                    ref={wsNewInputRef}
                    value={wsNewName}
                    onChange={(e) => setWsNewName(e.target.value)}
                    onBlur={commitWsCreate}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitWsCreate();
                      if (e.key === "Escape") setWsCreating(false);
                    }}
                    placeholder="Workspace name"
                    style={{
                      width: "100%",
                      fontSize: 13,
                      fontWeight: 500,
                      background: "var(--surface-hover)",
                      border: "1px solid var(--accent-blue)",
                      borderRadius: 8,
                      padding: "6px 8px",
                      margin: "2px 0",
                      outline: "none",
                      color: "var(--text-primary)",
                    }}
                  />
                )}

                <div className="context-menu-separator" />
                <button className="context-menu-item" onClick={startWsCreate}>
                  <Plus size={14} strokeWidth={1.75} />
                  New workspace
                </button>
                <button
                  className="context-menu-item"
                  onClick={() => {
                    setSwitcherOpen(false);
                    startWsEdit();
                  }}
                >
                  <Pencil size={14} strokeWidth={1.75} />
                  Rename workspace
                </button>
                {activeWorkspace && visibleBoards.length === 0 && workspaces.length > 1 && (
                  <button className="context-menu-item danger" onClick={handleWsDelete}>
                    <Trash2 size={14} strokeWidth={1.75} />
                    Delete workspace
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Boards header */}
        <div
          style={{
            padding: "6px 12px 8px",
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
          {visibleBoards.map((board) => {
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
                  background: isActive ? "rgba(37,99,235,0.06)" : "transparent",
                  marginBottom: 1,
                  transition: "background 80ms ease",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLDivElement).style.background =
                      "var(--surface-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLDivElement).style.background = "transparent";
                }}
                className="group"
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: board.color,
                    flexShrink: 0,
                  }}
                />

                {isEditing ? (
                  <input
                    ref={editInputRef}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit();
                      if (e.key === "Escape") setEditingId(null);
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
                      color: isActive ? "var(--accent-blue)" : "var(--text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      minWidth: 0,
                    }}
                  >
                    {board.name}
                  </span>
                )}

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
                    title="Board options"
                  >
                    <MoreHorizontal size={13} strokeWidth={2} />
                  </button>
                )}
              </div>
            );
          })}

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
                  if (e.key === "Escape") setCreating(false);
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

          {visibleBoards.length === 0 && !creating && (
            <div
              style={{
                textAlign: "center",
                padding: "24px 12px",
                color: "var(--text-muted)",
                fontSize: 12,
              }}
            >
              No boards here yet.
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
                Create a board
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
            <span>
              {visibleBoards.length} board{visibleBoards.length !== 1 ? "s" : ""}
            </span>
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
            v{process.env.NEXT_PUBLIC_APP_VERSION || "dev"} ·{" "}
            {process.env.NEXT_PUBLIC_BUILD_DATE || "local"}
          </div>
        </div>
      </div>

      {/* Board context menu */}
      {menuBoardId && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 599 }}
            onClick={() => {
              setMenuBoardId(null);
              setMenuView("main");
            }}
          />
          <div className="context-menu" style={{ left: menuPos.x, top: menuPos.y }}>
            {menuView === "main" ? (
              <>
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
                {workspaces.length > 1 && (
                  <button className="context-menu-item" onClick={() => setMenuView("move")}>
                    <FolderInput size={14} strokeWidth={1.75} />
                    Move to…
                  </button>
                )}
                <div className="context-menu-separator" />
                <button
                  className="context-menu-item danger"
                  onClick={() => handleDeleteBoard(menuBoardId)}
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                  Delete board
                </button>
              </>
            ) : (
              workspaces
                .filter((w) => w.id !== activeWs)
                .map((w) => (
                  <button
                    key={w.id}
                    className="context-menu-item"
                    onClick={() => handleMoveBoard(menuBoardId, w.id)}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: w.color,
                        flexShrink: 0,
                      }}
                    />
                    {w.name}
                  </button>
                ))
            )}
          </div>
        </>
      )}

      <style>{`
        .group:hover .board-menu-btn { opacity: 1 !important; }
        .ws-switcher:hover { background: var(--surface-hover) !important; }
      `}</style>
    </>
  );
}
