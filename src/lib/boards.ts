export interface Board {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "plan-boards";

const BOARD_COLORS = [
  "#F5D547", // yellow
  "#2563EB", // blue
  "#EC4899", // pink
  "#14B8A6", // teal
  "#EF4444", // red
  "#A78BFA", // purple
  "#FB923C", // orange
  "#34D399", // green
];

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getBoards(): Board[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Board[];
  } catch {
    return [];
  }
}

function saveBoards(boards: Board[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
}

export function createBoard(name: string): Board {
  const boards = getBoards();
  const colorIndex = boards.length % BOARD_COLORS.length;
  const board: Board = {
    id: generateId(),
    name: name.trim() || "Untitled Board",
    color: BOARD_COLORS[colorIndex],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  saveBoards([...boards, board]);
  return board;
}

export function renameBoard(id: string, name: string): void {
  const boards = getBoards().map((b) =>
    b.id === id ? { ...b, name: name.trim() || "Untitled Board", updatedAt: Date.now() } : b
  );
  saveBoards(boards);
}

export function deleteBoard(id: string): void {
  const boards = getBoards().filter((b) => b.id !== id);
  saveBoards(boards);
  // Also remove tldraw canvas data for this board
  try {
    // tldraw stores with key pattern: tldraw_board-{id}
    const keys = Object.keys(localStorage).filter(
      (k) => k.includes(`board-${id}`) || k.includes(`tldraw-${id}`)
    );
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

export function getBoardById(id: string): Board | undefined {
  return getBoards().find((b) => b.id === id);
}

export function touchBoard(id: string): void {
  const boards = getBoards().map((b) =>
    b.id === id ? { ...b, updatedAt: Date.now() } : b
  );
  saveBoards(boards);
}
