import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const GEN_API_BASE = "https://gen.aditor.ai/api";

// Upload base64 data URI to gen.aditor.ai, get back a local path
// Returns /uploads/temp/... path that the backend can read directly
async function uploadToTemp(dataUri: string): Promise<{ url: string; localPath: string }> {
  const res = await fetch(`${GEN_API_BASE}/upload-temp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: dataUri }),
  });
  if (!res.ok) {
    throw new Error(`Upload failed: ${await res.text()}`);
  }
  const data = await res.json();
  // Extract local path from URL: https://gen.aditor.ai/uploads/temp/xxx.jpg → /uploads/temp/xxx.jpg
  const localPath = new URL(data.url).pathname;
  return { url: data.url, localPath };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, referenceImageUrl, aspectRatio, model } = body;

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    // If reference image is a data URI, upload it first
    // Send as local path so backend reads directly (no circular HTTP)
    const references: string[] = [];
    if (referenceImageUrl) {
      if (referenceImageUrl.startsWith("data:image")) {
        try {
          const { localPath } = await uploadToTemp(referenceImageUrl);
          references.push(localPath); // /uploads/temp/xxx.jpg — read locally by backend
        } catch (err: any) {
          console.error("[generate] upload-temp failed:", err.message);
        }
      } else {
        references.push(referenceImageUrl);
      }
    }

    // When editing, make the prompt clearer for the model
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
        { error: `Generation failed: ${errorText}` },
        { status: upstream.status }
      );
    }

    const data = await upstream.json();
    const imageUrl = data.url || data.imageUrl || (data.images && data.images[0]?.url);

    if (!imageUrl) {
      console.error("[generate proxy] no URL in response:", JSON.stringify(data).slice(0, 200));
      return NextResponse.json(
        { error: "No result from generation" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageUrl,
      width: data.width || 512,
      height: data.height || 512,
    });
  } catch (err: any) {
    console.error("generate error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
