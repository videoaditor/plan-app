import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Assets live in data/uploads/<sha256>.<ext> (data/ is the durable SSoT on the VPS,
// survives deploys). Content-hash filename = automatic dedup + immutable caching.
// No base64 in the board snapshot anymore — over WebSocket that was untenable (T2).
const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const MAX_BYTES = 25 * 1024 * 1024; // client compresses images to ~1MB; cap videos

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogg",
  "video/quicktime": "mov",
};

function extFor(file: File): string {
  if (EXT_BY_MIME[file.type]) return EXT_BY_MIME[file.type];
  const fromName = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return fromName || "bin";
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "file too large" }, { status: 413 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const hash = crypto.createHash("sha256").update(buf).digest("hex");
    const name = `${hash}.${extFor(file)}`;

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const filePath = path.join(UPLOAD_DIR, name);
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, buf); // idempotent: same bytes → same file

    return NextResponse.json({ url: `/uploads/${name}` });
  } catch {
    return NextResponse.json({ error: "upload failed" }, { status: 500 });
  }
}
