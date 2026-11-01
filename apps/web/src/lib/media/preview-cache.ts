import type { MediaPreview } from "@/lib/worker/client";

export type CachedPreviewEntry = MediaPreview & {
  cloudinaryThumbnailUrl?: string | null;
};

const CACHE_TTL_MS = 15 * 60 * 1000;
const CACHE_LIMIT = 500;
const previewCache = new Map<string, { value: CachedPreviewEntry; expiresAt: number }>();

export function getCachedPreview(key: string): CachedPreviewEntry | null {
  const hit = previewCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    previewCache.delete(key);
    return null;
  }
  return hit.value;
}

export function setCachedPreview(key: string, value: CachedPreviewEntry): void {
  if (previewCache.size >= CACHE_LIMIT) {
    const oldest = previewCache.keys().next().value;
    if (oldest) previewCache.delete(oldest);
  }
  previewCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function updateCachedCloudinaryUrl(key: string, cloudinaryUrl: string): void {
  const hit = previewCache.get(key);
  if (hit) {
    hit.value.cloudinaryThumbnailUrl = cloudinaryUrl;
  }
}
