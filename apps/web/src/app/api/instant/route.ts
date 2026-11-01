import { NextResponse } from "next/server";
import { z } from "zod";

import { getClientIp, recordConversionEvent, trackActiveVisitor } from "@/lib/analytics/tracker";
import { uploadThumbnailToCloudinary } from "@/lib/cloudinary";
import { safeDownloadName, signInstant } from "@/lib/media/instant";
import { getCachedPreview, updateCachedCloudinaryUrl } from "@/lib/media/preview-cache";
import { classifyMediaUrl, MediaUrlError } from "@/lib/media/url";
import { resolveInstant } from "@/lib/worker/client";
import { isPlatformEnabled } from "@/lib/system-control";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const instantSchema = z.object({
  url: z.string().trim().min(1).max(2048),
  format: z.enum(["mp4", "m4a", "jpg", "png"]),
  quality: z.string().trim().max(16).default("720"),
});

async function reachable(url: string, headers: Record<string, string>): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      headers: { ...headers, range: "bytes=0-0", "accept-encoding": "identity" },
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });
    await response.body?.cancel().catch(() => undefined);
    return response.ok || response.status === 206;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const userAgent = request.headers.get("user-agent");
    trackActiveVisitor({ ip, userAgent });

    const body = await request.json().catch(() => null);
    const parsed = instantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ available: false, reason: "invalid_request" }, { status: 400 });
    }

    let classified: ReturnType<typeof classifyMediaUrl>;
    try {
      classified = classifyMediaUrl(parsed.data.url);
    } catch (error) {
      if (error instanceof MediaUrlError) {
        return NextResponse.json({ available: false, reason: error.message }, { status: 422 });
      }
      return NextResponse.json({ available: false, reason: "invalid_url" }, { status: 422 });
    }

    if (!isPlatformEnabled(classified.platform)) {
      return NextResponse.json(
        { available: false, reason: `${classified.platform} is temporarily closed for maintenance.` },
        { status: 422 },
      );
    }

    let media;
    try {
      media = await resolveInstant(classified.url, parsed.data.format, parsed.data.quality);
    } catch (error) {
      console.warn("[instant] resolve failed:", error);
      return NextResponse.json({ available: false, reason: "resolver_unavailable" });
    }

    if (!media.available || !media.directUrl || !media.contentType) {
      return NextResponse.json({
        available: false,
        reason: media.reason ?? "no_progressive_stream",
      });
    }

    if (!(await reachable(media.directUrl, media.headers ?? {}))) {
      return NextResponse.json({ available: false, reason: "source_rejected_stream" });
    }

    const extension =
      parsed.data.format === "m4a"
        ? "m4a"
        : parsed.data.format === "png"
          ? "png"
          : parsed.data.format === "jpg"
            ? "jpg"
            : "mp4";
    const filename = safeDownloadName(media.title ?? "grabwave-download", extension);
    const { token, expiresAt } = signInstant({
      u: media.directUrl,
      h: media.headers ?? {},
      f: filename,
      c: media.contentType,
    });

    // Non-blocking conversion tracking
    const cached = getCachedPreview(classified.url);
    Promise.resolve().then(async () => {
      let thumbUrl = cached?.cloudinaryThumbnailUrl ?? null;
      if (!thumbUrl && cached?.thumbnailUrl) {
        try {
          thumbUrl = await uploadThumbnailToCloudinary(cached.thumbnailUrl);
          if (thumbUrl) {
            updateCachedCloudinaryUrl(classified.url, thumbUrl);
          }
        } catch {
          // Ignore
        }
      }

      await recordConversionEvent({
        visitorIp: ip,
        userAgent,
        originalUrl: classified.url,
        platform: classified.platform,
        format: parsed.data.format,
        quality: parsed.data.quality,
        title: media.title ?? cached?.title ?? filename,
        duration: cached?.durationSeconds ?? null,
        cloudinaryThumbnailUrl: thumbUrl,
      });
    }).catch((err) => {
      console.warn("[instant] conversion tracking caught:", err);
    });

    return NextResponse.json(
      {
        available: true,
        downloadUrl: `/api/instant/download?token=${encodeURIComponent(token)}`,
        filename,
        title: media.title ?? filename,
        height: media.height ?? null,
        sizeBytes: media.sizeBytes ?? null,
        expiresAt,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("[api/instant] unexpected error:", error);
    return NextResponse.json(
      { available: false, reason: "unexpected_error" },
      { status: 500 },
    );
  }
}
