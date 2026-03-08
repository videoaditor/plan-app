import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const GEN_API_BASE = "https://gen.aditor.ai/api";

// Upload base64 data URI to gen.aditor.ai, get back a live URL
async function uploadToTemp(dataUri: string): Promise<string> {
  const res = await fetch(`${GEN_API_BASE}/upload-temp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: dataUri }),
  });
  if (!res.ok) {
    throw new Error(`Upload to temp failed: ${await res.text()}`);
  }
  const data = await res.json();
  return data.url;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { imageUrl, prompt } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    // Convert data:image/ URIs to public URLs for the animate API
    if (imageUrl.startsWith("data:image")) {
      try {
        imageUrl = await uploadToTemp(imageUrl);
      } catch (upErr: any) {
        return NextResponse.json({ error: `Failed to hoist image: ${upErr.message}` }, { status: 500 });
      }
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
