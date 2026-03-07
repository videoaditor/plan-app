import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GEN_API_BASE = "https://gen.aditor.ai/api";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    const page = searchParams.get("page") ?? "1";

    if (!q) {
      return NextResponse.json({ error: "q is required" }, { status: 400 });
    }

    const params = new URLSearchParams({ q, page });
    const upstream = await fetch(
      `${GEN_API_BASE}/image-search?${params}`,
      {
        headers: {
          ...(process.env.GEN_API_KEY
            ? { Authorization: `Bearer ${process.env.GEN_API_KEY}` }
            : {}),
        },
      }
    );

    if (!upstream.ok) {
      const errorText = await upstream.text();
      return NextResponse.json(
        { error: `Upstream error: ${errorText}` },
        { status: upstream.status }
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("image-search error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
