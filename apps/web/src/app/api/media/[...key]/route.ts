import { createHmac, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";

import { internalSecret } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".m4a": "audio/mp4",
  ".webm": "video/webm",
};

function verify(key: string, expires: number, signature: string): boolean {
  const expected = createHmac("sha256", internalSecret())
    .update(`${key}:${expires}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

function parseRange(value: string | null, size: number): { start: number; end: number } | null {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) return null;

  if (!rawStart) {
    const suffix = Number(rawEnd);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }

  const start = Number(rawStart);
  const end = rawEnd ? Number(rawEnd) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
    return null;
  }
  return { start, end: Math.min(end, size - 1) };
}

async function serve(
  request: Request,
  context: { params: Promise<{ key: string[] }> },
  headOnly: boolean,
) {
  const { key: segments } = await context.params;
  const key = segments.join("/");
  if (!key || key.includes("..") || key.startsWith("/")) {
    return NextResponse.json({ error: "invalid key" }, { status: 400 });
  }

  const url = new URL(request.url);
  const expires = Number(url.searchParams.get("expires") ?? 0);
  const signature = url.searchParams.get("sig") ?? "";
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) {
    return NextResponse.json({ error: "link expired" }, { status: 403 });
  }
  if (!verify(key, expires, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 403 });
  }

  const root = path.resolve(
    /* turbopackIgnore: true */ process.env.MEDIA_ROOT ?? path.join(process.cwd(), ".media"),
  );
  const filePath = path.resolve(root, key);
  if (!filePath.startsWith(`${root}${path.sep}`)) {
    return NextResponse.json({ error: "invalid key" }, { status: 400 });
  }

  try {
    const info = await stat(/* turbopackIgnore: true */ filePath);
    if (!info.isFile()) throw new Error("not a file");
    const extension = path.extname(filePath).toLowerCase();
    const filename = `mediarift-${path.basename(key)}`;
    const range = parseRange(request.headers.get("range"), info.size);

    if (request.headers.get("range") && !range) {
      return new Response(null, {
        status: 416,
        headers: {
          "content-range": `bytes */${info.size}`,
          "accept-ranges": "bytes",
        },
      });
    }

    const start = range?.start ?? 0;
    const end = range?.end ?? info.size - 1;
    const headers = new Headers({
      "content-type": MIME[extension] ?? "application/octet-stream",
      "content-length": String(end - start + 1),
      "content-disposition": `attachment; filename="${filename}"`,
      "accept-ranges": "bytes",
      "cache-control": "private, max-age=0, must-revalidate",
      "x-content-type-options": "nosniff",
    });
    if (range) headers.set("content-range", `bytes ${start}-${end}/${info.size}`);

    if (headOnly) {
      return new Response(null, { status: range ? 206 : 200, headers });
    }

    const stream = Readable.toWeb(
      createReadStream(/* turbopackIgnore: true */ filePath, { start, end }),
    ) as unknown as ReadableStream;
    return new Response(stream, { status: range ? 206 : 200, headers });
  } catch {
    return NextResponse.json({ error: "file not found" }, { status: 404 });
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string[] }> },
) {
  try {
    return await serve(request, context, false);
  } catch (error) {
    console.error("[api/media] GET error:", error);
    return NextResponse.json({ error: "Could not serve media." }, { status: 500 });
  }
}

export async function HEAD(
  request: Request,
  context: { params: Promise<{ key: string[] }> },
) {
  try {
    return await serve(request, context, true);
  } catch (error) {
    console.error("[api/media] HEAD error:", error);
    return new Response(null, { status: 500 });
  }
}
