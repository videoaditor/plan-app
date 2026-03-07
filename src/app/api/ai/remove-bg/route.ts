import { NextRequest, NextResponse } from "next/server";

// Allow large base64 payloads (images can be several MB)
export const maxDuration = 120; // seconds
export const dynamic = "force-dynamic";

const GEN_API_BASE = "https://gen.aditor.ai/api";

// Upload base64 data URI to gen.aditor.ai, get back a fetchable URL
async function uploadToTemp(dataUri: string): Promise<string> {
  const res = await fetch(`${GEN_API_BASE}/upload-temp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: dataUri }),
  });
  if (!res.ok) {
    throw new Error(`Upload failed: ${await res.text()}`);
  }
  const { url } = await res.json();
  return url;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    // If it's a data URI (from blob conversion), upload it first to get a real URL
    if (imageUrl.startsWith("data:image")) {
      try {
        imageUrl = await uploadToTemp(imageUrl);
      } catch (err: any) {
        console.error("[remove-bg] upload-temp failed:", err.message);
        return NextResponse.json(
          { error: "Failed to upload image for processing" },
          { status: 500 }
        );
      }
    }

    const upstream = await fetch(`${GEN_API_BASE}/remove-bg`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl }),
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      console.error("[remove-bg proxy] upstream error:", upstream.status, errorText);
      return NextResponse.json(
        { error: `Background removal failed: ${errorText}` },
        { status: upstream.status }
      );
    }

    const data = await upstream.json();
    const resultUrl = data.url || data.imageUrl || data.image_url;

    if (!resultUrl) {
      console.error("[remove-bg proxy] no URL in response:", data);
      return NextResponse.json(
        { error: "No result from background removal" },
        { status: 500 }
      );
    }

    return NextResponse.json({ imageUrl: resultUrl });
  } catch (err: any) {
    console.error("remove-bg error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
