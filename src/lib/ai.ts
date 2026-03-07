export interface GenerateOptions {
  prompt: string;
  referenceImageUrl?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  model?: string;
}

export interface GenerateResult {
  imageUrl: string;
  width: number;
  height: number;
}

export interface RemoveBgResult {
  imageUrl: string;
}

export interface ImageSearchResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  description?: string;
  photographer?: string;
}

// ─── Convert blob:/data: URLs to uploadable base64 ──────────────────
// tldraw stores uploaded images as blob: URLs (browser memory only)
// APIs need either http URLs or data:image/... base64
async function ensureTransferableUrl(src: string): Promise<string> {
  // Already a remote URL — fine as-is
  if (src.startsWith("http://") || src.startsWith("https://")) return src;

  // Already a data URI — fine as-is
  if (src.startsWith("data:image")) return src;

  // blob: URL — convert to base64 data URI
  if (src.startsWith("blob:")) {
    try {
      const resp = await fetch(src);
      const blob = await resp.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error("[ai] Failed to convert blob URL:", err);
      throw new Error("Could not read image data");
    }
  }

  // Unknown protocol — pass through and hope for the best
  return src;
}

export async function generateImage(options: GenerateOptions): Promise<GenerateResult> {
  // Convert reference image to transferable format
  let referenceImageUrl = options.referenceImageUrl;
  if (referenceImageUrl) {
    referenceImageUrl = await ensureTransferableUrl(referenceImageUrl);
  }

  const res = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...options,
      referenceImageUrl,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Generate failed: ${err}`);
  }
  return res.json();
}

export async function removeBackground(imageUrl: string): Promise<RemoveBgResult> {
  // Convert to transferable format
  const transferableUrl = await ensureTransferableUrl(imageUrl);

  const res = await fetch("/api/ai/remove-bg", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl: transferableUrl }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Remove BG failed: ${err}`);
  }
  return res.json();
}

export interface AnimateResult {
  videoUrl: string;
  embedHtml?: string;
  jobId?: string;
}

export async function animateImage(imageUrl: string, prompt?: string): Promise<AnimateResult> {
  const transferableUrl = await ensureTransferableUrl(imageUrl);

  const res = await fetch("/api/ai/animate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl: transferableUrl, prompt }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Animate failed: ${err}`);
  }
  return res.json();
}

export async function searchImages(query: string, page = 1): Promise<ImageSearchResult[]> {
  const params = new URLSearchParams({ q: query, page: String(page) });
  const res = await fetch(`/api/ai/image-search?${params}`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Image search failed: ${err}`);
  }
  return res.json();
}
