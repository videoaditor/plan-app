"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBoards, createBoard } from "@/lib/boards";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const boards = await getBoards();
      if (boards.length > 0) {
        router.replace(`/board/${boards[0].id}`);
      } else {
        const board = await createBoard("My First Board");
        router.replace(`/board/${board.id}`);
      }
    })();
  }, [router]);

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
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "#F5D547",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            fontWeight: 700,
            color: "#1A1A1A",
            animation: "pulse 1.5s ease infinite",
          }}
        >
          P
        </div>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            fontWeight: 500,
          }}
        >
          Loading…
        </p>
      </div>
    </div>
  );
}
