import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

const WORKSPACE_COLORS = [
  "#F5D547", "#2563EB", "#EC4899", "#14B8A6",
  "#EF4444", "#A78BFA", "#FB923C", "#34D399",
];

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function GET() {
  try {
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM workspaces ORDER BY sort ASC, created_at ASC")
      .all() as any[];
    return NextResponse.json(
      rows.map((w) => ({
        id: w.id,
        name: w.name,
        color: w.color,
        sort: w.sort,
        createdAt: w.created_at,
      }))
    );
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const db = getDb();
    const agg = db
      .prepare("SELECT COUNT(*) as count, COALESCE(MAX(sort), -1) as maxSort FROM workspaces")
      .get() as any;
    const color = body.color ?? WORKSPACE_COLORS[agg.count % WORKSPACE_COLORS.length];

    const id = generateId();
    const now = Date.now();
    db.prepare(
      "INSERT INTO workspaces (id, name, color, sort, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(id, name, color, agg.maxSort + 1, now);

    return NextResponse.json(
      { id, name, color, sort: agg.maxSort + 1, createdAt: now },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
