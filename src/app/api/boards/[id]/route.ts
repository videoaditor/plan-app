import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const board = db.prepare("SELECT * FROM boards WHERE id = ?").get(params.id) as any;
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }
    return NextResponse.json({
      id: board.id,
      name: board.name,
      color: board.color,
      workspaceId: board.workspace_id,
      shareToken: board.share_token,
      createdAt: board.created_at,
      updatedAt: board.updated_at,
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const body = await req.json();
    const { name, color, workspaceId } = body;

    const board = db.prepare("SELECT * FROM boards WHERE id = ?").get(params.id) as any;
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const updatedName = name?.trim() || board.name;
    const updatedColor = color ?? board.color;
    const updatedWorkspace = workspaceId ?? board.workspace_id;
    const now = Date.now();

    db.prepare(
      "UPDATE boards SET name = ?, color = ?, workspace_id = ?, updated_at = ? WHERE id = ?"
    ).run(updatedName, updatedColor, updatedWorkspace, now, params.id);

    return NextResponse.json({
      id: params.id,
      name: updatedName,
      color: updatedColor,
      workspaceId: updatedWorkspace,
      shareToken: board.share_token,
      createdAt: board.created_at,
      updatedAt: now,
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
    db.prepare("DELETE FROM boards WHERE id = ?").run(params.id);
    return NextResponse.json({ id: params.id, deleted: true });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
