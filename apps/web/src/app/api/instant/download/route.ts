import { NextResponse } from "next/server";

import { getClientIp, trackActiveVisitor } from "@/lib/analytics/tracker";
import { verifyInstant } from "@/lib/media/instant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function disposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const userAgent = request.headers.get("user-agent");
    trackActiveVisitor({ ip, userAgent });

    const token = new URL(request.url).searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Missing download token." }, { status: 400 });
    }

    const payload = verifyInstant(token);
    if (!payload) {
      return NextResponse.json(
        { error: "This instant link expired. Start the download again." },
        { status: 403 },
      );
    }

    const range = request.headers.get("range");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 300_000);
    try {
      const upstream = await fetch(payload.u, {
        headers: {
          ...payload.h,
          "accept-encoding": "identity",
          ...(range ? { range } : {}),
        },
        redirect: "follow",
        signal: controller.signal,
        cache: "no-store",
      });

      if (!upstream.ok && upstream.status !== 206) {
        await upstream.body?.cancel().catch(() => undefined);
        return NextResponse.json(
          { error: "The source stopped serving this file. Use the converter instead." },
          { status: 502 },
        );
      }

      const headers = new Headers({
        "content-type": upstream.headers.get("content-type") ?? payload.c,
        "content-disposition": disposition(payload.f),
        "accept-ranges": "bytes",
        "cache-control": "private, no-store, max-age=0",
        "x-content-type-options": "nosniff",
        "x-accel-buffering": "no",
      });
      const length = upstream.headers.get("content-length");
      const contentRange = upstream.headers.get("content-range");
      if (length) headers.set("content-length", length);
      if (contentRange) headers.set("content-range", contentRange);

      return new Response(upstream.body, { status: upstream.status, headers });
    } catch {
      return NextResponse.json(
        { error: "The download took too long. Use the converter instead." },
        { status: 504 },
      );
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    console.error("[api/instant/download] unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during download." },
      { status: 500 },
    );
  }
}
