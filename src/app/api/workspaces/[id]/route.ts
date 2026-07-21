import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const body = await req.json();

    const ws = db.prepare("SELECT * FROM workspaces WHERE id = ?").get(params.id) as any;
    if (!ws) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const name = body.name?.trim() || ws.name;
    const color = body.color ?? ws.color;
    db.prepare("UPDATE workspaces SET name = ?, color = ? WHERE id = ?").run(
      name,
      color,
      params.id
    );

    return NextResponse.json({
      id: params.id,
      name,
      color,
      sort: ws.sort,
      createdAt: ws.created_at,
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const ws = db.prepare("SELECT id FROM workspaces WHERE id = ?").get(params.id) as any;
    if (!ws) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const boardCount = db
      .prepare("SELECT COUNT(*) as count FROM boards WHERE workspace_id = ?")
      .get(params.id) as any;
    if (boardCount.count > 0) {
      return NextResponse.json(
        { error: "Workspace is not empty" },
        { status: 409 }
      );
    }

    db.prepare("DELETE FROM workspaces WHERE id = ?").run(params.id);
    return NextResponse.json({ id: params.id, deleted: true });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
