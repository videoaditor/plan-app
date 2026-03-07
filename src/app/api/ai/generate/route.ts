import { NextRequest, NextResponse } from "next/server";

const GEN_API_BASE = "https://gen.aditor.ai/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, referenceImageUrl, aspectRatio, model } = body;

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const upstream = await fetch(`${GEN_API_BASE}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.GEN_API_KEY
          ? { Authorization: `Bearer ${process.env.GEN_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({
        prompt,
        referenceImageUrl,
        aspectRatio: aspectRatio ?? "1:1",
        model: model ?? "flux",
      }),
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
    console.error("generate error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
