import { createHmac, timingSafeEqual } from "node:crypto";

import { internalSecret } from "@/lib/env";

const INSTANT_TTL_SECONDS = 600;

export type InstantPayload = {
  u: string;
  h: Record<string, string>;
  f: string;
  c: string;
  e: number;
};

function sign(value: string): string {
  return createHmac("sha256", internalSecret()).update(value).digest("base64url");
}

export function signInstant(
  payload: Omit<InstantPayload, "e">,
  ttlSeconds = INSTANT_TTL_SECONDS,
): { token: string; expiresAt: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = Buffer.from(JSON.stringify({ ...payload, e: expiresAt })).toString("base64url");
  return { token: `${body}.${sign(body)}`, expiresAt };
}

export function verifyInstant(token: string): InstantPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as InstantPayload;
    if (
      typeof payload.u !== "string" ||
      !/^https?:\/\//i.test(payload.u) ||
      typeof payload.f !== "string" ||
      typeof payload.c !== "string" ||
      typeof payload.e !== "number" ||
      payload.e < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function safeDownloadName(title: string, extension: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 90);
  return `${base || "mediarift-download"}.${extension}`;
}
