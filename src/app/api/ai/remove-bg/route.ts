import { NextRequest, NextResponse } from "next/server";

const GEN_API_BASE = "https://gen.aditor.ai/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    const upstream = await fetch(`${GEN_API_BASE}/remove-bg`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.GEN_API_KEY
          ? { Authorization: `Bearer ${process.env.GEN_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({ imageUrl }),
    });

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
    console.error("remove-bg error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
