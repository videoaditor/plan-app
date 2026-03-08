import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const GEN_API_BASE = "https://gen.aditor.ai/api";
const GEMINI_MODEL = "gemini-2.5-flash-image";

function getGeminiUrl() {
  const key = process.env.GOOGLE_API_KEY || "AIzaSyDEJ2JMkVzDaMJJaOvFpZLHjpiB0-HYl-0";
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
}

// Convert a reference image (URL or data URI) to base64 + mime type
async function toBase64Image(ref: string): Promise<{ base64: string; mimeType: string }> {
  if (ref.startsWith("data:")) {
    const match = ref.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error("Invalid data URI");
    return { mimeType: match[1], base64: match[2] };
  }
  // Fetch from URL
  const res = await fetch(ref);
  if (!res.ok) throw new Error(`Failed to fetch reference image: ${res.status}`);
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const mimeType = contentType.split(";")[0];
  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return { base64, mimeType };
}

// Edit an image using Gemini 2.0 Flash Image Generation
async function editWithGemini(
  prompt: string,
  referenceImageUrl: string
): Promise<{ imageUrl: string; width: number; height: number }> {
  const { base64, mimeType } = await toBase64Image(referenceImageUrl);

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `You are an image editing assistant. Apply the user's requested changes to the provided image. Maintain the original composition and aspect ratio as much as possible.\n\nEdit instruction: ${prompt}`,
          },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  };

  const res = await fetch(getGeminiUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[generate/gemini] error:", res.status, errorText);
    throw new Error(`Gemini edit failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const parts: any[] = data?.candidates?.[0]?.content?.parts || [];
  // REST API returns snake_case (inline_data), SDK returns camelCase (inlineData)
  const imagePart = parts.find((p) => p.inlineData || p.inline_data);

  if (!imagePart) {
    console.error("[generate/gemini] no image in response:", JSON.stringify(data).slice(0, 500));
    throw new Error("No image returned by Gemini");
  }

  const inlineData = imagePart.inlineData || imagePart.inline_data;
  const outMime = inlineData.mimeType || inlineData.mime_type || "image/png";
  const outBase64 = inlineData.data;
  return {
    imageUrl: `data:${outMime};base64,${outBase64}`,
    width: 1024,
    height: 1024,
  };
}

// Upload base64 data URI to gen.aditor.ai, get back a local path
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

    // Edit mode — use Gemini directly
    if (referenceImageUrl) {
      try {
        const result = await editWithGemini(prompt, referenceImageUrl);
        return NextResponse.json(result);
      } catch (err: any) {
        console.error("[generate/gemini] failed:", err.message);
        return NextResponse.json(
          { error: err.message || "Gemini edit failed" },
          { status: 500 }
        );
      }
    }

    // Generation mode — proxy to gen.aditor.ai (unchanged)
    const upstream = await fetch(`${GEN_API_BASE}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
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
