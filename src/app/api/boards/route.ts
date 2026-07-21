import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

const BOARD_COLORS = [
  "#F5D547", "#2563EB", "#EC4899", "#14B8A6",
  "#EF4444", "#A78BFA", "#FB923C", "#34D399",
];

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const workspace = req.nextUrl.searchParams.get("workspace");
    const rows = (
      workspace
        ? db
            .prepare("SELECT * FROM boards WHERE workspace_id = ? ORDER BY created_at ASC")
            .all(workspace)
        : db.prepare("SELECT * FROM boards ORDER BY created_at ASC").all()
    ) as any[];
    return NextResponse.json(
      rows.map((b) => ({
        id: b.id,
        name: b.name,
        color: b.color,
        workspaceId: b.workspace_id,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      }))
    );
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, color, workspaceId } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const db = getDb();
    const countRow = db.prepare("SELECT COUNT(*) as count FROM boards").get() as any;
    const boardColor = color ?? BOARD_COLORS[countRow.count % BOARD_COLORS.length];

    // Fall back to the first workspace when the client doesn't pin one.
    const ws =
      workspaceId ??
      (db
        .prepare("SELECT id FROM workspaces ORDER BY sort ASC, created_at ASC LIMIT 1")
        .get() as any)?.id ??
      null;

    const id = generateId();
    const now = Date.now();

    db.prepare(
      "INSERT INTO boards (id, name, color, workspace_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, name, boardColor, ws, now, now);

    return NextResponse.json(
      { id, name, color: boardColor, workspaceId: ws, createdAt: now, updatedAt: now },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
