export interface Board {
  id: string;
  name: string;
  color: string;
  workspaceId: string | null;
  shareToken: string | null;
  createdAt: number;
  updatedAt: number;
}

/** Rotate a board's share token; the old /s/<token> link stops resolving. Returns the new token. */
export async function rotateShareToken(id: string): Promise<string | null> {
  const res = await fetch(`/api/boards/${id}/share`, { method: "POST" });
  if (!res.ok) return null;
  const { shareToken } = await res.json();
  return shareToken;
}

export interface Workspace {
  id: string;
  name: string;
  color: string;
  sort: number;
  createdAt: number;
}

export async function getBoards(workspaceId?: string): Promise<Board[]> {
  try {
    const url = workspaceId
      ? `/api/boards?workspace=${encodeURIComponent(workspaceId)}`
      : "/api/boards";
    const res = await fetch(url);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function createBoard(name: string, workspaceId?: string): Promise<Board> {
  const res = await fetch("/api/boards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.trim() || "Untitled Board", workspaceId }),
  });
  if (!res.ok) throw new Error("Failed to create board");
  return res.json();
}

export async function renameBoard(id: string, name: string): Promise<void> {
  await fetch(`/api/boards/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.trim() || "Untitled Board" }),
  });
}

export async function moveBoard(id: string, workspaceId: string): Promise<void> {
  await fetch(`/api/boards/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspaceId }),
  });
}

export async function deleteBoard(id: string): Promise<void> {
  await fetch(`/api/boards/${id}`, { method: "DELETE" });
}

export async function getBoardById(id: string): Promise<Board | undefined> {
  try {
    const res = await fetch(`/api/boards/${id}`);
    if (!res.ok) return undefined;
    return res.json();
  } catch {
    return undefined;
  }
}

// ─── Workspaces ──────────────────────────────────────────────────────────

export async function getWorkspaces(): Promise<Workspace[]> {
  try {
    const res = await fetch("/api/workspaces");
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function createWorkspace(name: string): Promise<Workspace> {
  const res = await fetch("/api/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.trim() || "Untitled" }),
  });
  if (!res.ok) throw new Error("Failed to create workspace");
  return res.json();
}

export async function renameWorkspace(id: string, name: string): Promise<void> {
  await fetch(`/api/workspaces/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.trim() }),
  });
}

/** Returns true on success, false if the workspace is not empty (409). */
export async function deleteWorkspace(id: string): Promise<boolean> {
  const res = await fetch(`/api/workspaces/${id}`, { method: "DELETE" });
  return res.ok;
}
