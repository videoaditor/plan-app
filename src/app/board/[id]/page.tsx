"use client";

import { useParams } from "next/navigation";
import BoardView from "@/components/BoardView";

export default function BoardPage() {
  const params = useParams();
  return <BoardView boardId={params.id as string} />;
}
