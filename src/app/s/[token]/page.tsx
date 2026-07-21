import { notFound } from "next/navigation";
import getDb from "@/lib/db";
import BoardView from "@/components/BoardView";

// Share-link route (V2.1 T4). Resolves the token to a board server-side; unknown
// token → 404. Link = edit access, no login (per spec). Must hit the live DB.
export const dynamic = "force-dynamic";

export default function SharePage({ params }: { params: { token: string } }) {
  const db = getDb();
  const row = db
    .prepare("SELECT id FROM boards WHERE share_token = ?")
    .get(params.token) as { id: string } | undefined;
  if (!row) notFound();
  return <BoardView boardId={row.id} />;
}
