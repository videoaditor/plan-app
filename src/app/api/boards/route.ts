import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

const BOARD_COLORS = [
  "#F5D547", "#2563EB", "#EC4899", "#14B8A6",
  "#EF4444", "#A78BFA", "#FB923C", "#34D399",
];

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM boards ORDER BY created_at ASC").all() as any[];
    return NextResponse.json(
      rows.map((b) => ({
        id: b.id,
        name: b.name,
        color: b.color,
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
    const { name, color } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const db = getDb();
    const countRow = db.prepare("SELECT COUNT(*) as count FROM boards").get() as any;
    const boardColor = color ?? BOARD_COLORS[countRow.count % BOARD_COLORS.length];

    const id = generateId();
    const now = Date.now();

    db.prepare(
      "INSERT INTO boards (id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    ).run(id, name, boardColor, now, now);

    return NextResponse.json(
      { id, name, color: boardColor, createdAt: now, updatedAt: now },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
