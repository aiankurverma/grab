import {
  platformForHost,
  type PlatformId,
  type PlatformMeta,
} from "@/lib/platforms";

export type Platform = PlatformId;

export class MediaUrlError extends Error {}

function baseHost(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, "");
}

function validateMediaPath(platform: PlatformMeta, parsed: URL, host: string): void {
  const path = parsed.pathname.toLowerCase();
  const params = parsed.searchParams;
  const parts = path.split("/").filter(Boolean);
  const hasPath = parts.length > 0;

  switch (platform.id) {
    case "YOUTUBE": {
      if (host === "youtu.be" && hasPath) return;
      const cleanPath = path.replace(/\/+$/, "");
      if (cleanPath === "/watch" && params.get("v")?.trim()) return;
      if (
        cleanPath.startsWith("/shorts/") ||
        cleanPath.startsWith("/live/") ||
        cleanPath.startsWith("/embed/") ||
        cleanPath.startsWith("/clip/") ||
        cleanPath.startsWith("/v/")
      ) {
        const segments = cleanPath.split("/").filter(Boolean);
        if (segments.length >= 2 && segments[1].trim().length > 0) {
          return;
        }
      }
      break;
    }
    case "FACEBOOK": {
      if ((host === "fb.watch" || host.endsWith(".fb.watch")) && hasPath) return;
      if ((path === "/watch" || path === "/watch/") && params.get("v")?.trim()) return;
      if (path.startsWith("/watch")) {
        const watchIdx = parts.findIndex((p) => p === "watch");
        if (
          params.get("v")?.trim() ||
          (watchIdx !== -1 && parts.length > watchIdx + 1 && parts[watchIdx + 1].trim().length > 0)
        ) {
          return;
        }
      }
      const shareIdx = parts.findIndex((p) => p === "share");
      if (shareIdx !== -1) {
        const sub = parts[shareIdx + 1];
        if (sub === "v" || sub === "r" || sub === "p") {
          if (parts.length > shareIdx + 2 && parts[shareIdx + 2].trim().length > 0) return;
        } else if (parts.length > shareIdx + 1 && parts[shareIdx + 1].trim().length > 0) {
          return;
        }
      }
      const reelIdx = parts.findIndex((p) => p === "reel" || p === "reels");
      if (reelIdx !== -1 && parts.length > reelIdx + 1 && parts[reelIdx + 1].trim().length > 0) {
        return;
      }
      const videoIdx = parts.findIndex((p) => p === "videos");
      if (videoIdx !== -1 && parts.length > videoIdx + 1 && parts[videoIdx + 1].trim().length > 0) {
        return;
      }
      if (path.endsWith("/video.php") && (params.get("v")?.trim() || params.get("id")?.trim())) {
        return;
      }
      if (
        (path.endsWith("/story.php") || path.endsWith("/permalink.php")) &&
        (params.get("story_fbid")?.trim() || params.get("v")?.trim() || params.get("id")?.trim())
      ) {
        return;
      }
      if (path.includes("/plugins/video.php") && params.get("href")?.trim()) return;
      break;
    }
    case "INSTAGRAM": {
      if ((host === "ig.me" || host.endsWith(".ig.me")) && hasPath) return;
      const reelIdx = parts.findIndex((p) => p === "reel" || p === "reels");
      if (reelIdx !== -1 && parts.length > reelIdx + 1 && parts[reelIdx + 1].trim().length > 0) {
        return;
      }
      const pIdx = parts.findIndex((p) => p === "p");
      if (pIdx !== -1 && parts.length > pIdx + 1 && parts[pIdx + 1].trim().length > 0) {
        return;
      }
      const tvIdx = parts.findIndex((p) => p === "tv");
      if (tvIdx !== -1 && parts.length > tvIdx + 1 && parts[tvIdx + 1].trim().length > 0) {
        return;
      }
      const shareIdx = parts.findIndex((p) => p === "share");
      if (shareIdx !== -1 && parts.length > shareIdx + 1 && parts[shareIdx + 1].trim().length > 0) {
        return;
      }
      const storiesIdx = parts.findIndex((p) => p === "stories");
      if (storiesIdx !== -1 && parts.length > storiesIdx + 1 && parts[storiesIdx + 1].trim().length > 0) {
        return;
      }
      break;
    }
    case "TIKTOK":
      if (
        path.includes("/video/") ||
        path.includes("/photo/") ||
        path.includes("/music/") ||
        path.includes("/v/")
      ) {
        const segments = path.split("/").filter(Boolean);
        const markerIdx = segments.findIndex((s) =>
          ["video", "photo", "music", "v"].includes(s),
        );
        if (
          markerIdx !== -1 &&
          segments.length > markerIdx + 1 &&
          segments[markerIdx + 1].trim().length > 0
        ) {
          return;
        }
      }
      if (path.startsWith("/t/")) {
        const segments = path.split("/").filter(Boolean);
        if (segments.length >= 2 && segments[1].trim().length > 0) return;
      }
      if ((host.startsWith("vm.") || host.startsWith("vt.")) && hasPath) return;
      break;
    case "X":
      if (path.includes("/broadcasts/") || path.includes("/spaces/")) {
        throw new MediaUrlError(
          "Live broadcasts and Spaces on X / Twitter are not supported. Only public video posts are supported.",
        );
      }
      if (/\/status\/[a-zA-Z0-9_]+/.test(path)) return;
      break;
    case "VIMEO": {
      const cleanPath = path.replace(/\/+$/, "");
      if (
        cleanPath.startsWith("/video/") &&
        cleanPath.slice("/video/".length).replaceAll("/", "").trim().length > 0
      ) {
        return;
      }
      if (/\/\d+(?:\/|$)/.test(cleanPath)) return;
      break;
    }
    case "SOUNDCLOUD": {
      if (
        (host === "on.soundcloud.com" || host.endsWith(".on.soundcloud.com")) &&
        hasPath
      ) {
        const segments = path.split("/").filter(Boolean);
        if (segments.length >= 1) return;
      }
      const parts = path.split("/").filter(Boolean);
      if (
        parts.length >= 2 &&
        ![
          "discover",
          "search",
          "stream",
          "you",
          "charts",
          "tags",
          "pages",
          "terms",
          "settings",
          "messages",
          "mobile",
          "upload",
          "imprint",
          "for",
        ].includes(parts[0])
      ) {
        return;
      }
      break;
    }
    case "REDDIT":
      if ((host === "v.redd.it" || host.endsWith(".v.redd.it")) && hasPath) return;
      if (
        /\/comments\/[a-zA-Z0-9]+/.test(path) ||
        /\/r\/[^/]+\/s\/[a-zA-Z0-9]+/.test(path) ||
        /\/video\/[a-zA-Z0-9]+/.test(path)
      ) {
        return;
      }
      break;
    case "TWITCH":
      if ((host === "clips.twitch.tv" || host.endsWith(".clips.twitch.tv")) && hasPath) return;
      if (/\/clip\/[a-zA-Z0-9_-]+/.test(path)) return;
      if (path.startsWith("/videos/")) {
        throw new MediaUrlError(
          "Twitch full broadcast VODs are not supported. Only Twitch clip links (clips.twitch.tv or twitch.tv/.../clip/...) are supported.",
        );
      }
      throw new MediaUrlError(
        "Twitch live streams and channels are not supported. Only Twitch clip links (clips.twitch.tv or twitch.tv/.../clip/...) are supported.",
      );
    case "DAILYMOTION": {
      if ((host === "dai.ly" || host.endsWith(".dai.ly")) && hasPath) return;
      const cleanPath = path.replace(/\/+$/, "");
      if (
        (cleanPath.startsWith("/video/") &&
          cleanPath.slice("/video/".length).replaceAll("/", "").trim().length > 0) ||
        (cleanPath.startsWith("/embed/video/") &&
          cleanPath.slice("/embed/video/".length).replaceAll("/", "").trim().length > 0)
      ) {
        return;
      }
      break;
    }
    case "PINTEREST":
      if ((host === "pin.it" || host.endsWith(".pin.it")) && hasPath) return;
      if (path.includes("/pin/") && /\/pin\/[a-zA-Z0-9_-]+/.test(path)) return;
      break;
  }

  throw new MediaUrlError(
    `That ${platform.label} link is a page, not a video or track. Open the specific post, reel, or video and copy that link.`,
  );
}

export function classifyMediaUrl(raw: string): { url: string; platform: Platform } {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new MediaUrlError("Paste a valid link from a supported site.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new MediaUrlError("Only http and https links are supported.");
  }
  if (parsed.username || parsed.password) {
    throw new MediaUrlError("Links with embedded credentials are not allowed.");
  }
  const platform = platformForHost(baseHost(parsed.hostname));
  if (!platform) {
    if (isShortenerHost(parsed.hostname)) {
      throw new MediaUrlError("Shortened link detected. Expanding to destination video...");
    }
    throw new MediaUrlError(
      "This site is not supported yet. Try YouTube, Instagram, TikTok, Facebook, X, Reddit, Twitch, Pinterest, Vimeo, Dailymotion, or SoundCloud.",
    );
  }
  validateMediaPath(platform, parsed, baseHost(parsed.hostname));
  return { url: parsed.toString(), platform: platform.id };
}

export const SHORTENER_HOSTS: readonly string[] = [
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "cutt.ly",
  "is.gd",
  "rb.gy",
  "shorturl.at",
  "rebrand.ly",
  "ow.ly",
  "buff.ly",
  "t.ly",
  "v.gd",
  "s.id",
  "linktr.ee",
  "qr.ae",
  "snip.ly",
  "clck.ru",
  "rotf.lol",
];

export function isShortenerHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return SHORTENER_HOSTS.some((s) => host === s || host.endsWith(`.${s}`));
}

export function isShortenerUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw.trim());
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && isShortenerHost(parsed.hostname);
  } catch {
    return false;
  }
}
