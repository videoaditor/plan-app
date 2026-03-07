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

export async function generateImage(options: GenerateOptions): Promise<GenerateResult> {
  const res = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Generate failed: ${err}`);
  }
  return res.json();
}

export async function removeBackground(imageUrl: string): Promise<RemoveBgResult> {
  const res = await fetch("/api/ai/remove-bg", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Remove BG failed: ${err}`);
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
