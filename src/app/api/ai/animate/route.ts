import { NextRequest, NextResponse } from "next/server";

const GEN_API_BASE = "https://gen.aditor.ai/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, prompt } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    const upstream = await fetch(`${GEN_API_BASE}/animate-alpha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        prompt: prompt || "gentle movement, subtle animation",
        duration: 5,
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
    return NextResponse.json({
      videoUrl: data.webm_url || data.video_url || data.url,
      embedHtml: data.embed_html,
      jobId: data.job_id,
    });
  } catch (err) {
    console.error("animate error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
