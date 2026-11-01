import { internalSecret, workerUrl } from "@/lib/env";

type EnqueuePayload = {
  jobId: string;
  url: string;
  format: "mp3" | "mp4" | "jpg" | "png";
  quality: string;
  correlationId?: string;
};

export type MediaPreview = {
  title: string;
  durationSeconds: number;
  uploader: string | null;
  thumbnailUrl: string | null;
  platform: string;
  isLive: boolean;
  availableHeights?: number[];
  availableBitrates?: number[];
  maxHeight?: number;
  audioOnly?: boolean;
  instantHeights?: number[];
  instantAudio?: boolean;
  isImage?: boolean;
  imageUrl?: string | null;
  width?: number | null;
  height?: number | null;
};

export type InstantMedia = {
  available: boolean;
  directUrl?: string;
  headers?: Record<string, string>;
  contentType?: string;
  title?: string;
  height?: number | null;
  sizeBytes?: number | null;
  reason?: string;
};

async function workerFetch(path: string, init: RequestInit, timeoutMs = 8_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${workerUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${internalSecret()}`,
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function enqueueConversion(payload: EnqueuePayload): Promise<void> {
  const response = await workerFetch("/internal/jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`worker rejected job (${response.status}): ${detail.slice(0, 200)}`);
  }
}

export async function resolveInstant(
  url: string,
  format: "mp4" | "m4a" | "jpg" | "png",
  quality: string,
): Promise<InstantMedia> {
  const response = await workerFetch(
    "/internal/instant",
    { method: "POST", body: JSON.stringify({ url, format, quality }) },
    20_000,
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`instant unavailable (${response.status}): ${detail.slice(0, 200)}`);
  }
  return (await response.json()) as InstantMedia;
}

export async function previewMedia(url: string): Promise<MediaPreview> {
  const response = await workerFetch(
    "/internal/preview",
    { method: "POST", body: JSON.stringify({ url }) },
    20_000,
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`preview unavailable (${response.status}): ${detail.slice(0, 200)}`);
  }
  return (await response.json()) as MediaPreview;
}

export async function enqueueEnrichment(payload: Record<string, string>): Promise<void> {
  const response = await workerFetch("/internal/ai/enrich", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`worker rejected enrichment (${response.status})`);
  }
}

export async function queueDepths(): Promise<Record<string, number>> {
  const response = await workerFetch("/internal/queues", { method: "GET" }, 3_000);
  if (!response.ok) {
    throw new Error(`queue depths unavailable (${response.status})`);
  }
  return (await response.json()) as Record<string, number>;
}
