import { NextResponse } from "next/server";

import { resolveRedirects } from "@/app/api/unshorten/route";
import { getClientIp, trackActiveVisitor } from "@/lib/analytics/tracker";
import { uploadThumbnailToCloudinary } from "@/lib/cloudinary";
import { getCachedPreview, setCachedPreview, updateCachedCloudinaryUrl } from "@/lib/media/preview-cache";
import { classifyMediaUrl, isShortenerUrl, MediaUrlError } from "@/lib/media/url";
import { previewMedia } from "@/lib/worker/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const userAgent = request.headers.get("user-agent");
    // Non-blocking visitor tracking
    trackActiveVisitor({ ip, userAgent });

    const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
    if (!body || typeof body.url !== "string" || !body.url.trim()) {
      return NextResponse.json({ error: "Paste a link first." }, { status: 400 });
    }

    let targetUrl = body.url.trim();
    if (isShortenerUrl(targetUrl)) {
      try {
        targetUrl = await resolveRedirects(targetUrl);
      } catch {
        // Fall back to original URL
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

    const cached = getCachedPreview(classified.url);
    if (cached) {
      return NextResponse.json(cached, { headers: { "cache-control": "no-store" } });
    }

    try {
      const preview = await previewMedia(classified.url);
      setCachedPreview(classified.url, preview);

      // Non-blocking thumbnail upload to Cloudinary
      if (preview.thumbnailUrl) {
        uploadThumbnailToCloudinary(preview.thumbnailUrl)
          .then((cloudinaryUrl) => {
            if (cloudinaryUrl) {
              updateCachedCloudinaryUrl(classified.url, cloudinaryUrl);
            }
          })
          .catch((err) => {
            console.warn("[preview] Cloudinary upload caught error:", err);
          });
      }

      return NextResponse.json(preview, { headers: { "cache-control": "no-store" } });
    } catch (error) {
      console.warn("[preview] upstream failure:", error);
      return NextResponse.json(
        { error: "We could not read this link yet. You can still try converting it." },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("[preview] unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while processing preview." },
      { status: 500 },
    );
  }
}
