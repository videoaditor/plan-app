import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { genShareToken } from "@/lib/migrate.mjs";

// Rotate the board's share token — the previous /s/<token> link stops resolving.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const board = db.prepare("SELECT id FROM boards WHERE id = ?").get(params.id) as any;
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }
    const shareToken = genShareToken();
    db.prepare("UPDATE boards SET share_token = ? WHERE id = ?").run(shareToken, params.id);
    return NextResponse.json({ shareToken });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
