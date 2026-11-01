const DEFAULTS: Record<string, string> = {
  url_not_allowed: "That link is not allowed. Use a public media link.",
  ssrf_blocked: "That link is not allowed. Use a public media link.",
  unsupported_source: "This source is not supported for that link.",
  private_or_removed: "This media is private, removed, or unavailable.",
  too_long: "This media is longer than the maximum allowed.",
  too_large: "This file is larger than the size limit.",
  download_failed: "The source did not allow the download. Try again or use a different link.",
  convert_failed: "The file could not be converted. Try a different format or quality.",
  upload_failed: "The file could not be saved. Try again in a moment.",
  timeout: "The conversion timed out. Try a lower quality or a shorter video.",
  cancelled: "The conversion was cancelled.",
  worker_unavailable: "The conversion service is unavailable. Try again shortly.",
  unknown: "Something went wrong while converting this link. Try again.",
};

const PATTERNS: Array<[RegExp, string]> = [
  [
    /cannot parse data|unsupported url|no suitable extractor|no video formats|no formats found|not a valid url|unable to extract/i,
    "This link is not a playable public video or track. Open the specific post and copy its link.",
  ],
  [
    /age-restricted|age restricted|confirm your age|inappropriate for some users/i,
    "This media is age-restricted and cannot be converted.",
  ],
  [
    /live stream|is live|live event|premieres in/i,
    "Live streams are not supported. Wait until the stream ends.",
  ],
  [
    /http error 429|too many requests|rate limit|rate-limit/i,
    "The source is rate-limiting requests. Try again in a few minutes.",
  ],
  [
    /http error 403|forbidden|access denied/i,
    "The source blocked the download. Try again later or use a different link.",
  ],
  [
    /private|login|log in|sign in|authentication|cookies|removed|deleted|does not exist|\b404\b/i,
    "This media is private, removed, or unavailable.",
  ],
  [
    /too long|longer than|maximum duration|exceeds the maximum/i,
    "This media is longer than the maximum allowed.",
  ],
  [
    /too large|file size|larger than the limit|exceeds the size/i,
    "This file is larger than the size limit.",
  ],
  [
    /timed out|timeout|time out/i,
    "The conversion timed out. Try a lower quality or a shorter video.",
  ],
  [
    /ffmpeg|postprocessing|conversion failed|encoder|invalid data found/i,
    "The file could not be converted. Try a different format or quality.",
  ],
  [
    /network|connection|temporary failure|name or service|getaddrinfo|unable to download/i,
    "Could not reach the source. Check the link and try again.",
  ],
];

function looksTechnical(message: string): boolean {
  return /\[[a-z]+\]|traceback|yt-dlp|ffmpeg|http error|\b(?:4\d{2}|5\d{2})\b|cannot parse|unsupported url|error:/i.test(
    message,
  );
}

export function friendlyFailure(
  code: string | null | undefined,
  message: string | null | undefined,
): string | null {
  if (!code && !message) return null;
  const raw = (message ?? "").trim();
  const fallback = DEFAULTS[code ?? ""] ?? DEFAULTS.unknown;

  if (raw && !looksTechnical(raw)) return raw;

  for (const [pattern, friendly] of PATTERNS) {
    if (pattern.test(raw)) return friendly;
  }
  return fallback;
}
