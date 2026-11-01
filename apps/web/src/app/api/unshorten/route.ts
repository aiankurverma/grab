import { execFile } from "node:child_process";
import { NextResponse } from "next/server";
import { classifyMediaUrl, isShortenerUrl, MediaUrlError } from "@/lib/media/url";
import { PLATFORMS } from "@/lib/platforms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESOLVE_CACHE = new Map<string, { resolved: string; expires: number }>();
const MAX_CACHE_SIZE = 500;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function isPrivateIpOrHost(hostname: string): boolean {
  const host = hostname.toLowerCase().trim().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0" ||
    host.startsWith("fe80:") ||
    host.startsWith("fc") ||
    host.startsWith("fd") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("169.254.")
  ) {
    return true;
  }
  // Check 172.16.0.0 - 172.31.255.255
  const match172 = /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
  return match172;
}

function resolveViaCurl(targetUrl: string, timeoutMs = 6000): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      execFile(
        "curl.exe",
        [
          "-s",
          "-I",
          "-L",
          "-m",
          String(Math.ceil(timeoutMs / 1000)),
          "-A",
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          "-o",
          "NUL",
          "-w",
          "%{url_effective}",
          targetUrl,
        ],
        { timeout: timeoutMs },
        (error, stdout) => {
          if (error) {
            resolve(null);
            return;
          }
          const finalUrl = stdout.trim();
          if (finalUrl && (finalUrl.startsWith("http://") || finalUrl.startsWith("https://"))) {
            resolve(finalUrl);
          } else {
            resolve(null);
          }
        },
      );
    } catch {
      resolve(null);
    }
  });
}

export async function resolveRedirects(initialUrl: string, maxHops = 6): Promise<string> {
  let currentUrl = initialUrl;

  for (let hop = 0; hop < maxHops; hop++) {
    const parsed = new URL(currentUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Invalid protocol.");
    }
    if (isPrivateIpOrHost(parsed.hostname)) {
      throw new Error("Target hostname is restricted.");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    let response: Response | null = null;
    try {
      response = await fetch(currentUrl, {
        method: "HEAD",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        },
      });
    } catch {
      // If HEAD fails, attempt GET with range: bytes=0-0
      try {
        response = await fetch(currentUrl, {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            range: "bytes=0-0",
            "user-agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          },
        });
      } catch {
        response = null;
      }
    } finally {
      clearTimeout(timer);
    }

    if (!response) {
      break;
    }

    const status = response.status;
    const location = response.headers.get("location");

    // 301, 302, 303, 307, 308 redirects
    if ((status === 301 || status === 302 || status === 303 || status === 307 || status === 308) && location) {
      const nextUrl = new URL(location, currentUrl).toString();
      currentUrl = nextUrl;
      continue;
    }

    // If Cloudflare/WAF blocked fetch (e.g. 403) or no redirect found, break to curl fallback
    break;
  }

  // If node fetch could not follow the redirect or still stopped at a shortener host, try native OS curl fallback
  if (isShortenerUrl(currentUrl) || currentUrl === initialUrl) {
    const curlResolved = await resolveViaCurl(initialUrl);
    if (curlResolved && curlResolved !== initialUrl) {
      const curlParsed = new URL(curlResolved);
      if (!isPrivateIpOrHost(curlParsed.hostname)) {
        return curlResolved;
      }
    }
  }

  return currentUrl;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
    if (!body || typeof body.url !== "string" || !body.url.trim()) {
      return NextResponse.json({ error: "Paste a shortened link first." }, { status: 400 });
    }

    const raw = body.url.trim();

    // Check memory cache
    const cached = RESOLVE_CACHE.get(raw);
    if (cached && cached.expires > Date.now()) {
      try {
        const classified = classifyMediaUrl(cached.resolved);
        const pInfo = PLATFORMS[classified.platform];
        return NextResponse.json({
          success: true,
          originalUrl: raw,
          resolvedUrl: cached.resolved,
          platform: classified.platform,
          platformLabel: pInfo?.label ?? classified.platform,
          explanation: `Shortlink expanded: ${new URL(raw).hostname} → ${pInfo?.label ?? "video"} (${new URL(cached.resolved).hostname})`,
        });
      } catch {
        RESOLVE_CACHE.delete(raw);
      }
    }

    // Resolve URL redirects
    let resolved: string;
    try {
      resolved = await resolveRedirects(raw);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Could not expand shortened link." },
        { status: 422 },
      );
    }

    // Verify if resolved URL matches a supported platform
    try {
      const classified = classifyMediaUrl(resolved);
      const pInfo = PLATFORMS[classified.platform];

      // Cache successful resolve
      if (RESOLVE_CACHE.size >= MAX_CACHE_SIZE) {
        const firstKey = RESOLVE_CACHE.keys().next().value;
        if (firstKey) RESOLVE_CACHE.delete(firstKey);
      }
      RESOLVE_CACHE.set(raw, { resolved, expires: Date.now() + CACHE_TTL_MS });

      return NextResponse.json({
        success: true,
        originalUrl: raw,
        resolvedUrl: resolved,
        platform: classified.platform,
        platformLabel: pInfo?.label ?? classified.platform,
        explanation: `Shortlink expanded: ${new URL(raw).hostname} → ${pInfo?.label ?? "video"} (${new URL(resolved).hostname})`,
      });
    } catch (error) {
      if (error instanceof MediaUrlError) {
        return NextResponse.json(
          {
            error: `Resolved link (${new URL(resolved).hostname}) is not a supported media post. Make sure it points to a public YouTube, Instagram, or supported video.`,
            resolvedUrl: resolved,
          },
          { status: 422 },
        );
      }
      return NextResponse.json({ error: "The destination link is not supported." }, { status: 422 });
    }
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred while resolving the link." },
      { status: 500 },
    );
  }
}
