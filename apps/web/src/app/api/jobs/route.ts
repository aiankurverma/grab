import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveRedirects } from "@/app/api/unshorten/route";
import { getClientIp, recordConversionEvent, trackActiveVisitor } from "@/lib/analytics/tracker";
import { uploadThumbnailToCloudinary } from "@/lib/cloudinary";
import { db } from "@/lib/db";
import { getCachedPreview, updateCachedCloudinaryUrl } from "@/lib/media/preview-cache";
import { classifyMediaUrl, isShortenerUrl, MediaUrlError } from "@/lib/media/url";
import { enqueueConversion, enqueueEnrichment, queueDepths } from "@/lib/worker/client";
import { aiEnrichmentEnabled } from "@/lib/env";
import { isPlatformEnabled } from "@/lib/system-control";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIO_QUALITIES = new Set(["128", "192", "320"]);
const VIDEO_QUALITIES = new Set(["360", "480", "720", "1080", "2160"]);
const QUEUE_DEPTH_LIMIT = Number(process.env.QUEUE_DEPTH_LIMIT ?? 200);

const createJobSchema = z.object({
  url: z.string().trim().min(1).max(2048),
  format: z.enum(["mp3", "mp4", "jpg", "png"]),
  quality: z.string().trim().max(16),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const userAgent = request.headers.get("user-agent");
    // Non-blocking visitor ping
    trackActiveVisitor({ ip, userAgent });

    const body = await request.json().catch(() => null);
    const parsed = createJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const { url, format, quality } = parsed.data;
    if (format === "mp3" && !AUDIO_QUALITIES.has(quality)) {
      return NextResponse.json(
        { error: `Quality ${quality} is not valid for MP3.` },
        { status: 422 },
      );
    }
    if (format === "mp4" && !VIDEO_QUALITIES.has(quality)) {
      return NextResponse.json(
        { error: `Quality ${quality} is not valid for MP4.` },
        { status: 422 },
      );
    }

    let targetUrl = url.trim();
    if (isShortenerUrl(targetUrl)) {
      try {
        targetUrl = await resolveRedirects(targetUrl);
      } catch {
        // Fall back to original url
      }
      if (isShortenerUrl(targetUrl)) {
        return NextResponse.json(
          { error: "We could not expand this shortened link. Please paste the direct video or audio link instead." },
          { status: 422 },
        );
      }
    }

    let classified: ReturnType<typeof classifyMediaUrl>;
    try {
      classified = classifyMediaUrl(targetUrl);
    } catch (error) {
      if (error instanceof MediaUrlError) {
        return NextResponse.json({ error: error.message }, { status: 422 });
      }
      return NextResponse.json({ error: "Invalid media URL." }, { status: 422 });
    }

    if (!isPlatformEnabled(classified.platform)) {
      return NextResponse.json(
        { error: `${classified.platform} conversions are temporarily closed for maintenance. Please check back shortly.` },
        { status: 422 },
      );
    }

    // Cached preview for title and thumbnail
    const cached = getCachedPreview(classified.url);

    // Non-blocking conversion analytics pipeline
    Promise.resolve().then(async () => {
      let thumbUrl = cached?.cloudinaryThumbnailUrl ?? null;
      if (!thumbUrl && cached?.thumbnailUrl) {
        try {
          thumbUrl = await uploadThumbnailToCloudinary(cached.thumbnailUrl);
          if (thumbUrl) {
            updateCachedCloudinaryUrl(classified.url, thumbUrl);
          }
        } catch {
          // Ignore thumbnail upload error in tracking
        }
      }

      await recordConversionEvent({
        visitorIp: ip,
        userAgent,
        originalUrl: classified.url,
        platform: classified.platform,
        format,
        quality,
        title: cached?.title ?? null,
        duration: cached?.durationSeconds ?? null,
        cloudinaryThumbnailUrl: thumbUrl,
      });
    }).catch((err) => {
      console.warn("[jobs] conversion event tracking caught:", err);
    });

    try {
      const depths = await queueDepths();
      const lane = format === "mp3" ? "audio" : quality === "2160" ? "video_4k" : "video";
      const depth = depths[lane] ?? 0;
      if (depth > QUEUE_DEPTH_LIMIT) {
        return NextResponse.json(
          { error: "The queue is busy. Try again in a moment." },
          { status: 503, headers: { "retry-after": "30" } },
        );
      }
    } catch (error) {
      console.warn("[jobs] queue depth check skipped:", error);
    }

    const correlationId = randomUUID().replaceAll("-", "");

    const job = await db.$transaction(async (tx) => {
      const created = await tx.job.create({
        data: {
          url: classified.url,
          platform: classified.platform,
          format: format === "mp3" ? "MP3" : "MP4",
          quality,
          status: "QUEUED",
          correlationId,
        },
      });
      await tx.domainEvent.create({
        data: {
          id: randomUUID(),
          type: "job.requested.v1",
          aggregateId: created.id,
          jobId: created.id,
          payload: {
            jobId: created.id,
            url: created.url,
            platform: created.platform,
            format,
            quality,
          },
          occurredAt: new Date(),
          correlationId,
        },
      });
      return created;
    });

    try {
      await enqueueConversion({
        jobId: job.id,
        url: job.url,
        format,
        quality,
        correlationId,
      });

      if (aiEnrichmentEnabled()) {
        enqueueEnrichment({
          jobId: job.id,
          url: job.url,
          title: cached?.title || "",
          uploader: cached?.uploader || "",
          platform: classified.platform,
          format,
        }).catch((err) => {
          console.warn("[jobs] ai enrichment dispatch skipped:", err instanceof Error ? err.message : err);
        });
      }
    } catch (error) {
      console.error("[jobs] enqueue failed:", error);
      await db.job.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          failureCode: "worker_unavailable",
          failureMessage: "The conversion service is unavailable. Try again shortly.",
        },
      });
      return NextResponse.json(
        { error: "The conversion service is unavailable. Try again shortly." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { jobId: job.id, status: job.status, pollUrl: `/api/jobs/${job.id}` },
      { status: 202 },
    );
  } catch (error) {
    console.error("[api/jobs] unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    jobs: [],
    note: "Job history requires authentication and ships with the identity context.",
  });
}
