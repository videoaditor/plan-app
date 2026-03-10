import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const row = db
      .prepare("SELECT data FROM snapshots WHERE board_id = ?")
      .get(params.id) as any;
    if (!row) {
      return NextResponse.json(null);
    }
    return NextResponse.json(JSON.parse(row.data));
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await req.json();
    const db = getDb();
    const now = Date.now();

    db.prepare(`
      INSERT INTO snapshots (board_id, data, updated_at) VALUES (?, ?, ?)
      ON CONFLICT (board_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    `).run(params.id, JSON.stringify(data), now);

    db.prepare("UPDATE boards SET updated_at = ? WHERE id = ?").run(now, params.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
