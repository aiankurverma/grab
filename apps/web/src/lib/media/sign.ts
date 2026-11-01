import { createHmac } from "node:crypto";

import { internalSecret } from "@/lib/env";

export function mediaTtlSeconds(): number {
  const parsed = Number(process.env.SIGNED_URL_TTL_SECONDS ?? 21_600);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 21_600;
}

export function signMediaKey(key: string, ttlSeconds = mediaTtlSeconds()): string {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const signature = createHmac("sha256", internalSecret())
    .update(`${key}:${expires}`)
    .digest("hex");
  return `/api/media/${key}?expires=${expires}&sig=${signature}`;
}
