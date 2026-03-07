import { NextRequest, NextResponse } from "next/server";

const GEN_API_BASE = "https://gen.aditor.ai/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    // Forward to upstream — it accepts both URLs and data: URIs
    // fal.ai birefnet handles data:image/... base64 natively
    const upstream = await fetch(`${GEN_API_BASE}/remove-bg`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.GEN_API_KEY
          ? { Authorization: `Bearer ${process.env.GEN_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({ image_url: imageUrl }),
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      console.error("[remove-bg proxy] upstream error:", upstream.status, errorText);
      return NextResponse.json(
        { error: `Upstream error: ${errorText}` },
        { status: upstream.status }
      );
    }

    const data = await upstream.json();
    const resultUrl = data.url || data.imageUrl || data.image_url;
    
    if (!resultUrl) {
      console.error("[remove-bg proxy] no URL in response:", data);
      return NextResponse.json(
        { error: "No result URL from background removal" },
        { status: 500 }
      );
    }

    return NextResponse.json({ imageUrl: resultUrl });
  } catch (err) {
    console.error("remove-bg error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
