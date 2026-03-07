import { NextRequest, NextResponse } from "next/server";

const GEN_API_BASE = "https://gen.aditor.ai/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, referenceImageUrl, aspectRatio, model } = body;

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    // Build references array — this is what gen.aditor.ai expects
    const references: string[] = [];
    if (referenceImageUrl) {
      references.push(referenceImageUrl);
    }

    const upstream = await fetch(`${GEN_API_BASE}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        references: references.length > 0 ? references : undefined,
        ratio: aspectRatio ?? "1:1",
        model: model ?? "nano-banana-pro",
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
    const imageUrl = data.url || data.imageUrl || (data.images && data.images[0]?.url);
    return NextResponse.json({
      imageUrl,
      width: data.width || 512,
      height: data.height || 512,
    });
  } catch (err) {
    console.error("generate error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
