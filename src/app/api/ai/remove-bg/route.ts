import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const REMOVE_BG_API_KEY = "cLY6XcDXnkZQ3oWS5DkBpB1i";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    const form = new FormData();
    form.append("size", "auto");

    if (imageUrl.startsWith("data:")) {
      // Extract base64 from data URI (strip the "data:<mime>;base64," prefix)
      const base64 = imageUrl.split(",")[1];
      if (!base64) {
        return NextResponse.json({ error: "Invalid data URI" }, { status: 400 });
      }
      form.append("image_file_b64", base64);
    } else {
      form.append("image_url", imageUrl);
    }

    const upstream = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-Api-Key": REMOVE_BG_API_KEY,
      },
      body: form,
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      console.error("[remove-bg] API error:", upstream.status, errorText);

      if (upstream.status === 402) {
        return NextResponse.json({ error: "Remove BG credits exhausted" }, { status: 402 });
      }
      if (upstream.status === 400) {
        return NextResponse.json({ error: "Invalid image for background removal" }, { status: 400 });
      }
      return NextResponse.json(
        { error: `Background removal failed: ${errorText}` },
        { status: upstream.status }
      );
    }

    // Response is binary PNG — convert to base64 data URI
    const arrayBuffer = await upstream.arrayBuffer();
    const base64Result = Buffer.from(arrayBuffer).toString("base64");
    const resultDataUri = `data:image/png;base64,${base64Result}`;

    return NextResponse.json({ imageUrl: resultDataUri });
  } catch (err: any) {
    console.error("remove-bg error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
