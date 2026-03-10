export interface Board {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export async function getBoards(): Promise<Board[]> {
  try {
    const res = await fetch("/api/boards");
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function createBoard(name: string): Promise<Board> {
  const res = await fetch("/api/boards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.trim() || "Untitled Board" }),
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
