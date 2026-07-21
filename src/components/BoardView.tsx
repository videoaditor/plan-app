"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBoards, createBoard, type Board } from "@/lib/boards";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";
import Canvas from "@/components/Canvas";
import NamePrompt from "@/components/NamePrompt";

// The board workspace (chrome + canvas), shared by /board/[id] and the /s/[token]
// share-link route. Gates the canvas behind a one-time name prompt so presence
// (name + color) is set before the sync store mounts.
export default function BoardView({ boardId }: { boardId: string }) {
  const router = useRouter();

  const [board, setBoard] = useState<Board | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [needsName, setNeedsName] = useState<boolean | null>(null);

  useEffect(() => {
    setNeedsName(!localStorage.getItem("plan-user-name"));
  }, []);

  useEffect(() => {
    (async () => {
      const allBoards = await getBoards();
      setBoards(allBoards);

      const found = allBoards.find((b) => b.id === boardId);
      if (found) {
        setBoard(found);
      } else if (allBoards.length > 0) {
        router.replace(`/board/${allBoards[0].id}`);
      } else {
        const newBoard = await createBoard("My First Board");
        setBoards([newBoard]);
        setBoard(newBoard);
        router.replace(`/board/${newBoard.id}`);
      }
    })();
  }, [boardId, router]);

  const handleBoardsChange = async () => {
    const updated = await getBoards();
    setBoards(updated);
    const current = updated.find((b) => b.id === boardId);
    if (current) {
      setBoard(current);
    } else if (updated.length > 0) {
      router.push(`/board/${updated[0].id}`);
    }
  };

  // First visit → ask for a name before entering (feeds presence).
  if (needsName) {
    return <NamePrompt onDone={() => setNeedsName(false)} />;
  }

  if (!board || needsName === null) {
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
          currentBoardId={boardId}
          open={sidebarOpen}
          onBoardsChange={handleBoardsChange}
        />
        <main style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <Canvas boardId={boardId} />
        </main>
      </div>
    </div>
  );
}
