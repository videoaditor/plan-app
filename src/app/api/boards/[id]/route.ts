import { NextRequest, NextResponse } from "next/server";

// Note: Board data is stored client-side in localStorage.
// These API routes are stubs for future server-side storage migration.

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json(
    { message: `Board ${params.id} is managed client-side` },
    { status: 200 }
  );
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    // Future: save tldraw snapshot to server
    return NextResponse.json(
      { id: params.id, ...body, updatedAt: Date.now() },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Future: delete board from server
  return NextResponse.json({ id: params.id, deleted: true }, { status: 200 });
}
