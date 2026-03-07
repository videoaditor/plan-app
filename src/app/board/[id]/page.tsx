"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getBoardById, getBoards, createBoard, type Board } from "@/lib/boards";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";
import Canvas from "@/components/Canvas";

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [board, setBoard] = useState<Board | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const allBoards = getBoards();
    setBoards(allBoards);

    const found = allBoards.find((b) => b.id === id);
    if (found) {
      setBoard(found);
    } else if (allBoards.length > 0) {
      router.replace(`/board/${allBoards[0].id}`);
    } else {
      // Create first board
      const newBoard = createBoard("My First Board");
      setBoards([newBoard]);
      setBoard(newBoard);
      router.replace(`/board/${newBoard.id}`);
    }
  }, [id, router]);

  const handleBoardsChange = () => {
    const updated = getBoards();
    setBoards(updated);
    const current = updated.find((b) => b.id === id);
    if (current) {
      setBoard(current);
    } else if (updated.length > 0) {
      router.push(`/board/${updated[0].id}`);
    }
  };

  if (!board) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "var(--canvas-bg)",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: "2px solid var(--border)",
            borderTopColor: "var(--accent-blue)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        background: "var(--canvas-bg)",
      }}
    >
      <TopBar
        board={board}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onBoardChange={handleBoardsChange}
      />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar
          boards={boards}
          currentBoardId={id}
          open={sidebarOpen}
          onBoardsChange={handleBoardsChange}
        />
        <main style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <Canvas boardId={id} />
        </main>
      </div>
    </div>
  );
}
