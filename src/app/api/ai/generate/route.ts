import { NextRequest, NextResponse } from "next/server";

const GEN_API_BASE = "https://gen.aditor.ai/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, referenceImageUrl, aspectRatio, model } = body;

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    // Build references array — gen.aditor.ai accepts:
    // - data:image/... base64 strings
    // - http/https URLs
    // - /outputs/... local paths
    const references: string[] = [];
    if (referenceImageUrl) {
      references.push(referenceImageUrl);
    }

    // When editing an existing image, prepend "edit this image: " context
    const editPrompt = referenceImageUrl
      ? `Edit this image: ${prompt}`
      : prompt;

    const upstream = await fetch(`${GEN_API_BASE}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: editPrompt,
        references: references.length > 0 ? references : undefined,
        ratio: aspectRatio ?? "1:1",
        model: model ?? "nano-banana-pro",
      }),
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      console.error("[generate proxy] upstream error:", upstream.status, errorText);
      return NextResponse.json(
        { error: `Upstream error: ${errorText}` },
        { status: upstream.status }
      );
    }

    const data = await upstream.json();
    const imageUrl = data.url || data.imageUrl || (data.images && data.images[0]?.url);
    
    if (!imageUrl) {
      console.error("[generate proxy] no URL in response:", JSON.stringify(data).slice(0, 200));
      return NextResponse.json(
        { error: "No result URL from generation" },
        { status: 500 }
      );
    }

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
