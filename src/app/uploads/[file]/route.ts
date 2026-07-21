import { NextRequest } from "next/server";
import path from "path";
import fs from "fs";

// Serves data/uploads/<sha256>.<ext> at /uploads/<sha256>.<ext>. Next only auto-serves
// public/, and uploads must live in the durable data/ dir — so this streams them.
const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

const CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif",
  mp4: "video/mp4",
  webm: "video/webm",
  ogg: "video/ogg",
  mov: "video/quicktime",
};

export async function GET(_req: NextRequest, { params }: { params: { file: string } }) {
  const name = params.file;
  // Only content-hash filenames — no slashes, no traversal.
  if (!/^[a-f0-9]{64}\.[a-z0-9]+$/.test(name)) {
    return new Response("Not found", { status: 404 });
  }
  const filePath = path.join(UPLOAD_DIR, name);
  if (!fs.existsSync(filePath)) {
    return new Response("Not found", { status: 404 });
  }
  const buf = fs.readFileSync(filePath);
  const ext = name.split(".").pop()!;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": CONTENT_TYPE[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
