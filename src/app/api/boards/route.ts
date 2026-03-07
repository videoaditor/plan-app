import { NextRequest, NextResponse } from "next/server";

// Note: Board data is stored client-side in localStorage via @/lib/boards.ts
// These API routes are stubs for future server-side storage migration.
// Currently, the client handles all board CRUD.

export async function GET() {
  return NextResponse.json(
    { message: "Boards are managed client-side via localStorage" },
    { status: 200 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, color } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // Future: create board in database
    const board = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      name,
      color: color ?? "#F5D547",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return NextResponse.json(board, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
