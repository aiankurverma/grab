"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { HistoryPanel } from "@/components/landing/history-panel";
import { JobStatus } from "@/components/landing/job-status";
import { rememberJob } from "@/lib/jobs/history";
import { classifyMediaUrl, isShortenerUrl } from "@/lib/media/url";
import { PLATFORMS, platformCapability } from "@/lib/platforms";

type Format = "mp3" | "mp4" | "m4a" | "jpg" | "png";

const AUDIO_BITRATES = ["128", "192", "320"] as const;
const VIDEO_QUALITIES = ["360", "480", "720", "1080", "2160"] as const;

type Preview = {
  title: string;
  durationSeconds: number;
  uploader: string | null;
  thumbnailUrl: string | null;
  isLive: boolean;
  availableHeights?: number[];
  availableBitrates?: number[];
  maxHeight?: number;
  audioOnly?: boolean;
  instantHeights?: number[];
  instantAudio?: boolean;
  isImage?: boolean;
  imageUrl?: string | null;
  width?: number | null;
  height?: number | null;
};

type InstantDownload = {
  downloadUrl: string;
  filename: string;
  title: string;
  height: number | null;
  sizeBytes: number | null;
};

function validateUrl(value: string): string | null {
  if (!value.trim()) return "Paste a link from a supported site first.";
  if (isShortenerUrl(value)) return null;
  try {
    classifyMediaUrl(value);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "That link is not supported.";
  }
}

function formatPreviewDuration(seconds: number): string | null {
  if (!seconds || seconds <= 0) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = Math.floor(seconds % 60);
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
    : `${minutes}:${String(rest).padStart(2, "0")}`;
}

function formatBytes(bytes: number | null): string | null {
  if (!bytes || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function startDownload(url: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

const SAMPLE_LINKS = [
  { label: "YouTube Clip", url: "https://www.youtube.com/watch?v=jNQXAC9IVRw" },
  { label: "TikTok Video", url: "https://www.tiktok.com/@tiktok/video/7106594312292453678" },
  { label: "Instagram Reel", url: "https://www.instagram.com/reels/C7X3Nf2v5kL/" },
  { label: "Facebook Reel", url: "https://www.facebook.com/reel/10158434567890123" },
] as const;

export function ConvertForm() {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<Format>("mp3");
  const [quality, setQuality] = useState<string>("192");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [autoDownloadJobId, setAutoDownloadJobId] = useState<string | null>(null);
  const [instant, setInstant] = useState<InstantDownload | null>(null);
  const [pastedFeedback, setPastedFeedback] = useState(false);
  const [instantCopied, setInstantCopied] = useState(false);
  const [resolvingShortener, setResolvingShortener] = useState(false);
  const [manuallySelectedFormat, setManuallySelectedFormat] = useState(false);
  const prevUrlRef = useRef("");
  const [shortlinkMeta, setShortlinkMeta] = useState<{
    original: string;
    resolved: string;
    platformLabel: string;
  } | null>(null);
  const [previewState, setPreviewState] = useState<{
    url: string;
    loading: boolean;
    data: Preview | null;
    error: string | null;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const cleanUrl = url.trim();
  const preview = previewState?.url === cleanUrl ? previewState.data : null;
  const previewLoading = previewState?.url === cleanUrl ? previewState.loading : false;
  const previewError = previewState?.url === cleanUrl ? previewState.error : null;

  const detected = useMemo(() => {
    try {
      return PLATFORMS[classifyMediaUrl(cleanUrl).platform];
    } catch {
      return null;
    }
  }, [cleanUrl]);

  const isImagePin = Boolean(
    preview?.isImage ||
      (detected?.id === "PINTEREST" && preview && !preview.isLive && preview.durationSeconds === 0 && Boolean(preview.thumbnailUrl)),
  );

  const isAudioOnly = Boolean(
    (!isImagePin && detected && (!detected.formats.includes("mp4") || detected.maxHeight === 0)) ||
      (preview?.audioOnly && !isImagePin),
  );

  const isM4aDisabled = Boolean(
    isImagePin ||
      (detected &&
        (detected.id === "SOUNDCLOUD" ||
          detected.id === "PINTEREST" ||
          (preview ? !preview.instantAudio : false))),
  );

  const effectiveFormat: Format = isImagePin
    ? format === "png"
      ? "png"
      : "jpg"
    : isAudioOnly && format === "mp4"
      ? "mp3"
      : isM4aDisabled && format === "m4a"
        ? "mp3"
        : (format === "jpg" || format === "png") && !isImagePin && detected?.id !== "PINTEREST"
          ? "mp4"
          : detected
            ? format === "m4a" || format === "jpg" || format === "png"
              ? format
              : (detected.formats as readonly string[]).includes(format)
                ? format
                : (detected.formats.includes("mp4") ? "mp4" : "mp3")
            : format;

  const sourceCap = preview?.maxHeight && preview.maxHeight > 0 ? preview.maxHeight : null;
  const platformCap = detected ? detected.maxHeight : 2160;
  const maxHeight = isAudioOnly || isImagePin ? 0 : Math.min(platformCap, sourceCap ?? platformCap);

  const qualities: string[] = useMemo(() => {
    if (effectiveFormat === "m4a" || effectiveFormat === "jpg" || effectiveFormat === "png") return ["original"];
    if (effectiveFormat === "mp3") return [...AUDIO_BITRATES];
    return VIDEO_QUALITIES.filter((value) => Number(value) <= maxHeight);
  }, [effectiveFormat, maxHeight]);

  const effectiveQuality = qualities.includes(quality)
    ? quality
    : effectiveFormat === "mp3"
      ? "192"
      : effectiveFormat === "m4a" || effectiveFormat === "jpg" || effectiveFormat === "png"
        ? "original"
        : qualities.includes("1080")
          ? "1080"
          : (qualities[qualities.length - 1] ?? "720");

  const maxInstantHeight = Math.max(0, ...(preview?.instantHeights ?? []));
  const canInstant =
    effectiveFormat === "jpg" || effectiveFormat === "png"
      ? Boolean(preview?.isImage || preview?.thumbnailUrl)
      : effectiveFormat === "m4a"
        ? Boolean(preview?.instantAudio)
        : effectiveFormat === "mp4"
          ? maxInstantHeight >= Number(effectiveQuality)
          : false;

  const autoDetectedType = useMemo((): "photo" | "audio" | "video" | null => {
    if (!cleanUrl) return null;
    if (isImagePin || preview?.isImage) return "photo";
    if (isAudioOnly || preview?.audioOnly) return "audio";
    if (detected?.formats.includes("mp4") || (preview && (preview.maxHeight ?? 0) > 0)) return "video";
    return null;
  }, [cleanUrl, isImagePin, preview, isAudioOnly, detected]);

  const recommendedFormat: Format | null = useMemo(() => {
    if (autoDetectedType === "photo") return "jpg";
    if (autoDetectedType === "audio") return "mp3";
    if (autoDetectedType === "video") return "mp4";
    return null;
  }, [autoDetectedType]);

  // Reset manual selection when cleanUrl changes
  useEffect(() => {
    if (cleanUrl !== prevUrlRef.current) {
      prevUrlRef.current = cleanUrl;
      setManuallySelectedFormat(false);
    }
  }, [cleanUrl]);

  // Auto-switch format when a link is detected and user hasn't overridden
  useEffect(() => {
    if (!cleanUrl || manuallySelectedFormat || !recommendedFormat) return;
    if (format !== recommendedFormat) {
      setFormat(recommendedFormat);
      setQuality(
        recommendedFormat === "mp3"
          ? "192"
          : recommendedFormat === "jpg"
            ? "original"
            : "720",
      );
    }
  }, [cleanUrl, recommendedFormat, manuallySelectedFormat, format]);

  // Global keyboard shortcuts: "/" or Ctrl+K / Cmd+K to focus URL input
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement)?.tagName)
      ) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (
        (event.key === "k" || event.key === "K") &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-expand shortened links (shorturl.at, bit.ly, tinyurl, t.co, etc.)
  useEffect(() => {
    const value = url.trim();
    if (!value || !isShortenerUrl(value)) return;

    const controller = new AbortController();
    setResolvingShortener(true);

    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/unshorten", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: value }),
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => null)) as {
          success?: boolean;
          originalUrl?: string;
          resolvedUrl?: string;
          platform?: string;
          platformLabel?: string;
          error?: string;
        } | null;

        if (controller.signal.aborted) return;

        if (response.ok && data?.success && data.resolvedUrl) {
          setShortlinkMeta({
            original: value,
            resolved: data.resolvedUrl,
            platformLabel: data.platformLabel ?? "Supported media",
          });
          setUrl(data.resolvedUrl);
          setError(null);
        } else if (data?.error) {
          setError(data.error);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError("Could not expand this shortened link. Please paste the direct video link instead.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setResolvingShortener(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [url]);

  // Debounced URL preview lookup
  useEffect(() => {
    const value = url.trim();
    if (!value || validateUrl(value)) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setPreviewState({ url: value, loading: true, data: null, error: null });
      try {
        const response = await fetch("/api/preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: value }),
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => null)) as
          | (Preview & { error?: string })
          | null;
        if (controller.signal.aborted) return;
        if (!response.ok || !data || data.error) {
          setPreviewState({
            url: value,
            loading: false,
            data: null,
            error: data?.error ?? "We could not read this link yet.",
          });
          return;
        }
        setPreviewState({ url: value, loading: false, data, error: null });
      } catch (error) {
        if (controller.signal.aborted) return;
        setPreviewState({
          url: value,
          loading: false,
          data: null,
          error:
            error instanceof Error && error.name === "AbortError"
              ? null
              : "Could not load the title. You can still try converting.",
        });
      }
    }, 650);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [url]);

  function handleFormat(next: Format) {
    if (next === "mp4" && (isAudioOnly || isImagePin)) return;
    if (next === "mp3" && isImagePin) return;
    if (next === "m4a" && (isM4aDisabled || isImagePin)) return;
    setManuallySelectedFormat(true);
    setFormat(next);
    setQuality(next === "mp3" ? "192" : next === "m4a" || next === "jpg" || next === "png" ? "original" : "720");
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setError("Your clipboard is empty. Copy a link from YouTube, TikTok, or another site first.");
        return;
      }
      setManuallySelectedFormat(false);
      setUrl(text.trim());
      setError(null);
      setPastedFeedback(true);
      setTimeout(() => setPastedFeedback(false), 2000);
      inputRef.current?.focus();
    } catch {
      setError("Clipboard access was blocked by browser permissions. Use Ctrl+V (or ⌘V) to paste.");
    }
  }

  function handleClear() {
    setUrl("");
    setManuallySelectedFormat(false);
    setError(null);
    setNotice(null);
    setPreviewState(null);
    setShortlinkMeta(null);
    inputRef.current?.focus();
  }

  async function handleCopyInstantUrl() {
    if (!instant?.downloadUrl) return;
    try {
      await navigator.clipboard.writeText(instant.downloadUrl);
      setInstantCopied(true);
      setTimeout(() => setInstantCopied(false), 2000);
    } catch {
      // Ignore copy error
    }
  }

  async function tryInstant(targetUrl = cleanUrl): Promise<"done" | "fallback" | "error"> {
    try {
      const response = await fetch("/api/instant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          format: effectiveFormat,
          quality: effectiveFormat === "m4a" || effectiveFormat === "jpg" || effectiveFormat === "png" ? "original" : effectiveQuality,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | (InstantDownload & { available?: boolean; reason?: string })
        | null;

      if (response.ok && payload?.available && payload.downloadUrl) {
        const download: InstantDownload = {
          downloadUrl: payload.downloadUrl,
          filename: payload.filename,
          title: payload.title,
          height: payload.height,
          sizeBytes: payload.sizeBytes,
        };
        setInstant(download);
        setNotice(null);
        startDownload(download.downloadUrl, download.filename);
        return "done";
      }

      if (effectiveFormat === "m4a") {
        setError("Instant M4A audio is not available for this link. Choose MP3 instead.");
        return "error";
      }
      setNotice("Instant stream was not directly available for this resolution. Switching to background converter.");
      return "fallback";
    } catch {
      if (effectiveFormat === "m4a") {
        setError("Could not start the instant audio download. Choose MP3 instead.");
        return "error";
      }
      setNotice("Instant download is unavailable right now. Switching to the converter.");
      return "fallback";
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJobId(null);
    setInstant(null);
    setNotice(null);
    const message = validateUrl(url);
    setError(message);
    if (message) return;
    if (preview?.isLive) {
      setError("Live streams cannot be converted. Wait until the stream has ended and published as a normal video.");
      return;
    }

    setSubmitting(true);

    let activeUrl = cleanUrl;
    if (isShortenerUrl(activeUrl)) {
      setResolvingShortener(true);
      try {
        const unshortRes = await fetch("/api/unshorten", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: activeUrl }),
        });
        const unshortData = (await unshortRes.json().catch(() => null)) as {
          resolvedUrl?: string;
          platformLabel?: string;
          error?: string;
        } | null;
        if (unshortRes.ok && unshortData?.resolvedUrl) {
          activeUrl = unshortData.resolvedUrl;
          setUrl(activeUrl);
          setShortlinkMeta({
            original: cleanUrl,
            resolved: activeUrl,
            platformLabel: unshortData.platformLabel ?? "Supported media",
          });
        } else {
          setError(unshortData?.error ?? "Could not expand shortened link. Please paste the direct video URL.");
          setSubmitting(false);
          setResolvingShortener(false);
          return;
        }
      } catch {
        setError("Network error while resolving shortened link. Please paste the direct video URL.");
        setSubmitting(false);
        setResolvingShortener(false);
        return;
      } finally {
        setResolvingShortener(false);
      }
    }

    try {
      if (
        effectiveFormat === "mp4" ||
        effectiveFormat === "m4a" ||
        effectiveFormat === "jpg" ||
        effectiveFormat === "png"
      ) {
        const outcome = await tryInstant(activeUrl);
        if (outcome !== "fallback") return;
      }

      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: activeUrl, format: effectiveFormat, quality: effectiveQuality }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Could not start the conversion. Please verify the URL and try again.");
        return;
      }

      const payload = (await response.json().catch(() => null)) as { jobId?: string } | null;
      if (!payload?.jobId) {
        setError("The conversion started but no job ID was returned. Try again.");
        return;
      }
      rememberJob({
        id: payload.jobId,
        url: activeUrl,
        format: effectiveFormat,
        quality: effectiveQuality,
        status: "QUEUED",
        title: preview?.title ?? null,
        thumbnailUrl: preview?.thumbnailUrl ?? null,
        durationSeconds: preview?.durationSeconds ? Math.round(preview.durationSeconds) : null,
        createdAt: new Date().toISOString(),
      });
      setJobId(payload.jobId);
      setAutoDownloadJobId(payload.jobId);
    } catch {
      setError("Network error. Please check your internet connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-ink-soft/90 p-5 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-7 transition-all"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-wave/80 to-transparent"
        />

        {/* Step 1: URL input */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <label htmlFor="media-url" className="flex items-center gap-2 text-sm font-semibold text-white/90">
            <span className="grid size-5 place-items-center rounded-full bg-wave/20 text-xs font-bold text-wave">
              1
            </span>
            Paste video or track link
          </label>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-mist/75 sm:inline">11 platforms supported</span>
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-mono text-mist/70">
              Press <kbd className="font-semibold text-white">/</kbd> to focus
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="group relative min-w-0 flex-1">
            {detected ? (
              <span
                className={`pointer-events-none absolute left-3 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-lg border text-[11px] font-black shadow-sm transition-all ${detected.markClass}`}
              >
                {detected.mark}
              </span>
            ) : (
              <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-mist transition-colors group-focus-within:text-wave">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M10.5 13.5a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 1 0-5.7-5.7l-1.3 1.3M13.5 10.5a4 4 0 0 0-5.7 0l-2.3 2.3a4 4 0 1 0 5.7 5.7l1.3-1.3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            )}

            <input
              ref={inputRef}
              id="media-url"
              name="url"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck="false"
              placeholder="Paste a link from YouTube, X, Reddit, Twitch, TikTok, Pinterest..."
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                if (error) setError(null);
                if (notice) setNotice(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  handleClear();
                  (event.target as HTMLInputElement).blur();
                }
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "media-url-error" : undefined}
              className={`w-full min-w-0 rounded-xl border border-line bg-ink py-3.5 pr-20 text-base text-white placeholder:text-mist/50 transition-all focus:border-wave focus:outline-none focus:ring-2 focus:ring-wave/20 sm:text-[15px] ${
                detected ? "pl-13" : "pl-11"
              }`}
            />

            {/* Quick Actions inside Input Bar */}
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {url.length > 0 ? (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Clear URL input"
                  title="Clear input (Esc)"
                  className="grid size-7 place-items-center rounded-lg text-mist/60 transition hover:bg-white/10 hover:text-white"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M18 6L6 18M6 6l12 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ) : null}

              <button
                type="button"
                onClick={handlePaste}
                aria-label="Paste from clipboard"
                title="Paste from clipboard (Ctrl+V)"
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                  pastedFeedback
                    ? "border-grab/50 bg-grab/15 text-grab"
                    : "border-line/70 bg-ink-soft/90 text-mist hover:border-wave/50 hover:text-white"
                }`}
              >
                {pastedFeedback ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M20 6L9 17l-5-5"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Pasted!</span>
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <rect x="8" y="2" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                    <span>Paste</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || Boolean(preview?.isLive)}
            className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-wave px-6 py-3.5 text-[15px] font-bold text-ink shadow-lg shadow-wave/20 transition-all hover:bg-wave-deep hover:shadow-wave/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-ink border-t-transparent" />
                <span>Processing...</span>
              </span>
            ) : preview?.isLive ? (
              <span>Live stream unsupported</span>
            ) : canInstant ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>
                  {effectiveFormat === "jpg"
                    ? "Download Photo (JPG)"
                    : effectiveFormat === "png"
                      ? "Download Image (PNG)"
                      : "Instant download"}
                </span>
              </>
            ) : effectiveFormat === "jpg" ? (
              <span>Download JPG Photo</span>
            ) : effectiveFormat === "png" ? (
              <span>Download PNG Image</span>
            ) : effectiveFormat === "m4a" ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Get M4A audio</span>
              </>
            ) : (
              <span>Convert to {effectiveFormat.toUpperCase()}</span>
            )}
            <span
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-0.5 text-xs font-mono font-normal opacity-70"
            >
              [↵]
            </span>
          </button>
        </div>

        {/* Sample Links for Instant Onboarding */}
        {!url && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-mist/60">
            <span>Try an example link:</span>
            {SAMPLE_LINKS.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => {
                  setUrl(sample.url);
                  setError(null);
                  inputRef.current?.focus();
                }}
                className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-mist/80 transition hover:border-wave/40 hover:bg-wave/10 hover:text-white"
              >
                {sample.label}
              </button>
            ))}
          </div>
        )}

        {/* Shortener expansion status: clear for both non-tech and tech users */}
        {resolvingShortener ? (
          <div className="mt-3.5 flex items-center gap-2.5 rounded-xl border border-wave/30 bg-wave/10 px-3.5 py-2.5 text-xs text-wave animate-pulse">
            <svg className="size-4 animate-spin text-wave shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-white">Shortened link detected:</span>
              <span className="text-mist">Expanding to find destination video...</span>
            </div>
          </div>
        ) : null}

        {shortlinkMeta ? (
          <div className="mt-3.5 flex flex-col gap-2 rounded-xl border border-grab/30 bg-grab/10 p-3 text-xs animate-fade-up">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-grab/20 px-2.5 py-0.5 text-[11px] font-semibold text-grab">
                  <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Link Expanded
                </span>
                <span className="font-medium text-white/95">
                  Found {shortlinkMeta.platformLabel} video from shortened link
                </span>
              </div>
              <span className="text-[11px] font-medium text-grab">Safe to download</span>
            </div>
            {/* Tech details route path */}
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-2.5 py-1.5 font-mono text-[11px]">
              <span className="text-mist/70">Shortlink:</span>
              <span className="truncate max-w-[200px] text-mist/90" title={shortlinkMeta.original}>
                {shortlinkMeta.original.replace(/^https?:\/\//, "")}
              </span>
              <span className="text-grab font-bold">➔</span>
              <span className="text-mist/70">Destination:</span>
              <span className="truncate max-w-[280px] font-semibold text-white" title={shortlinkMeta.resolved}>
                {shortlinkMeta.resolved.replace(/^https?:\/\//, "")}
              </span>
            </div>
          </div>
        ) : null}

        {/* Detected platform badge bar */}
        {detected ? (
          <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs animate-fade-up">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold ${detected.markClass}`}
            >
              <span className="size-1.5 rounded-full bg-current animate-pulse" />
              {detected.label} detected
            </span>
            <span className="rounded-full border border-line bg-ink px-3 py-1.5 text-mist">
              {detected.formats.map((item) => item.toUpperCase()).join(" / ")} · {platformCapability(detected)}
            </span>
            {detected.beta ? (
              <span
                title="Sites like TikTok and Instagram update frequently. If a link stumbles, try source quality."
                className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-amber-200"
              >
                <span className="size-1 rounded-full bg-amber-400" />
                Beta platform
              </span>
            ) : null}
            <span className="hidden text-mist/70 sm:inline">{detected.note}</span>
          </div>
        ) : null}

        {/* Preview status card */}
        {previewLoading ? (
          <div className="mt-3.5 flex items-center gap-3 rounded-xl border border-line/70 bg-ink/60 p-3.5 animate-shimmer">
            <span className="h-16 w-28 shrink-0 animate-pulse rounded-lg bg-line/60" />
            <span className="min-w-0 flex-1 space-y-2">
              <span className="block h-4 w-3/4 animate-pulse rounded bg-line/60" />
              <span className="block h-3.5 w-1/2 animate-pulse rounded bg-line/40" />
            </span>
          </div>
        ) : preview ? (
          <div className="mt-3.5 flex items-center gap-3.5 rounded-xl border border-line/80 bg-ink/75 p-3.5 shadow-sm">
            <div className="relative flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-ink text-[11px] uppercase text-mist">
              {preview.thumbnailUrl ? (
                <Image
                  src={preview.thumbnailUrl}
                  alt=""
                  width={112}
                  height={64}
                  unoptimized
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-bold">{detected?.mark ?? "Media"}</span>
              )}

              {/* Thumbnail duration tag */}
              {preview.durationSeconds > 0 ? (
                <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-mono font-medium text-white backdrop-blur-sm">
                  {formatPreviewDuration(preview.durationSeconds)}
                </span>
              ) : null}

              {/* Quality overlay badge */}
              {isImagePin || preview.isImage ? (
                <span className="absolute left-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold text-grab backdrop-blur-sm">
                  {preview.width && preview.height ? `${preview.width}×${preview.height}` : "HD PHOTO"}
                </span>
              ) : preview.maxHeight ? (
                <span className="absolute left-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold text-wave backdrop-blur-sm">
                  {preview.maxHeight >= 2160 ? "4K UHD" : `${preview.maxHeight}p`}
                </span>
              ) : preview.audioOnly ? (
                <span className="absolute left-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold text-grab backdrop-blur-sm">
                  AUDIO
                </span>
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-white">
                {preview.title || "Untitled media"}
              </span>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-mist">
                {preview.uploader ? (
                  <span className="font-medium text-white/80">{preview.uploader}</span>
                ) : null}
                {isImagePin || preview.isImage ? (
                  <span>· {preview.width && preview.height ? `${preview.width} × ${preview.height} resolution` : "Original resolution photo"}</span>
                ) : preview.durationSeconds > 0 ? (
                  <span>· {formatPreviewDuration(preview.durationSeconds)}</span>
                ) : null}
                {!isImagePin && !preview.isImage && preview.maxHeight ? (
                  <span>· Up to {preview.maxHeight >= 2160 ? "4K" : `${preview.maxHeight}p`}</span>
                ) : !isImagePin && !preview.isImage && preview.audioOnly ? (
                  <span>· Audio only</span>
                ) : null}
              </div>
            </div>

            {preview.isLive ? (
              <span className="shrink-0 rounded-full border border-red-500/30 bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300">
                Live stream (Unsupported)
              </span>
            ) : canInstant ? (
              <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-grab/30 bg-grab/10 px-2.5 py-0.5 text-xs font-semibold text-grab">
                <span className="size-1.5 rounded-full bg-grab" />
                {isImagePin || preview.isImage ? "Original photo ready" : "Direct stream ready"}
              </span>
            ) : (
              <span className="shrink-0 rounded-full border border-wave/20 bg-wave/10 px-3 py-1 text-xs font-medium text-wave">
                Link verified
              </span>
            )}
          </div>
        ) : previewError ? (
          <p className="mt-3 text-xs leading-relaxed text-mist/75">
            ℹ️ {previewError}
          </p>
        ) : null}

        {/* Notices */}
        {notice ? (
          <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-wave/20 bg-wave/5 p-3 text-sm text-wave">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="leading-snug">{notice}</p>
          </div>
        ) : null}

        {/* Errors with helpful advice */}
        {error ? (
          <div
            id="media-url-error"
            role="alert"
            className="mt-3.5 flex items-start justify-between gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-3.5 text-sm text-red-300"
          >
            <div className="flex items-start gap-2.5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-red-400" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div>
                <p className="font-semibold text-red-200">Could not process this link</p>
                <p className="mt-0.5 text-xs text-red-300/90 leading-relaxed">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="shrink-0 text-xs text-red-300 underline underline-offset-2 hover:text-white"
            >
              Reset
            </button>
          </div>
        ) : null}

        {/* Step 2 & Step 3: Format & Quality Selector */}
        <div className="mt-6 border-t border-line/80 pt-5">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            {/* Format Picker */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white/90">
                  <span className="grid size-5 place-items-center rounded-full bg-wave/20 text-xs font-bold text-wave">
                    2
                  </span>
                  <span>Choose format</span>
                  {autoDetectedType ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Auto-detected: <span className="capitalize font-semibold text-white">{autoDetectedType}</span>
                    </span>
                  ) : null}
                </p>
                <span className="text-xs text-mist/70">
                  {isImagePin || detected?.id === "PINTEREST" ? "Photo or Video" : "Audio or Video"}
                </span>
              </div>

              {isImagePin || detected?.id === "PINTEREST" ? (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {/* JPG Photo Option */}
                  <button
                    type="button"
                    onClick={() => handleFormat("jpg")}
                    aria-pressed={effectiveFormat === "jpg"}
                    className={`group relative flex flex-col justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                      effectiveFormat === "jpg"
                        ? recommendedFormat === "jpg"
                          ? "border-emerald-500/60 bg-emerald-500/10 shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-500/40"
                          : "border-wave bg-wave/10 shadow-sm shadow-wave/10"
                        : recommendedFormat === "jpg"
                          ? "border-emerald-500/30 bg-emerald-500/[0.03] ring-1 ring-emerald-500/20 hover:border-emerald-500/60"
                          : "border-line bg-ink hover:border-wave/40 hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[13px] font-bold text-white">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={effectiveFormat === "jpg" ? (recommendedFormat === "jpg" ? "text-emerald-400" : "text-wave") : "text-mist"} aria-hidden="true">
                          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                        JPG Photo
                      </span>
                      <div className="flex items-center gap-1.5">
                        {recommendedFormat === "jpg" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                            <span className="size-1 rounded-full bg-emerald-400 animate-pulse" />
                            Auto
                          </span>
                        ) : null}
                        {effectiveFormat === "jpg" ? (
                          <span className="size-1.5 rounded-full bg-emerald-400" />
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] leading-tight text-mist/75 line-clamp-1">High-res original photo</p>
                    <span className="mt-1.5 inline-block font-mono text-[10px] text-emerald-300 font-medium">Original JPG</span>
                  </button>

                  {/* PNG Image Option */}
                  <button
                    type="button"
                    onClick={() => handleFormat("png")}
                    aria-pressed={effectiveFormat === "png"}
                    className={`group relative flex flex-col justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                      effectiveFormat === "png"
                        ? "border-grab bg-grab/10 shadow-sm shadow-grab/10"
                        : "border-line bg-ink hover:border-grab/40 hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[13px] font-bold text-white">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={effectiveFormat === "png" ? "text-grab" : "text-mist"} aria-hidden="true">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <path d="M10 13l2 2 4-4" />
                        </svg>
                        PNG Image
                      </span>
                      {effectiveFormat === "png" ? (
                        <span className="size-1.5 rounded-full bg-grab" />
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11px] leading-tight text-mist/75 line-clamp-1">Lossless picture quality</p>
                    <span className="mt-1.5 inline-block font-mono text-[10px] text-grab font-medium">Lossless PNG</span>
                  </button>

                  {/* MP4 Video Option */}
                  {(() => {
                    const disabled = isImagePin || isAudioOnly;
                    return (
                      <button
                        type="button"
                        onClick={() => handleFormat("mp4")}
                        disabled={disabled}
                        aria-pressed={effectiveFormat === "mp4"}
                        title={disabled ? (isImagePin ? "Photo pin has no video track" : "Video track unavailable") : undefined}
                        className={`group relative flex flex-col justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                          disabled
                            ? "cursor-not-allowed border-line/40 bg-ink/40 opacity-45"
                            : effectiveFormat === "mp4"
                              ? recommendedFormat === "mp4"
                                ? "border-emerald-500/60 bg-emerald-500/10 shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-500/40"
                                : "border-wave bg-wave/10 shadow-sm shadow-wave/10"
                              : recommendedFormat === "mp4"
                                ? "border-emerald-500/30 bg-emerald-500/[0.03] ring-1 ring-emerald-500/20 hover:border-emerald-500/60"
                                : "border-line bg-ink hover:border-wave/40 hover:bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-[13px] font-bold text-white">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className={effectiveFormat === "mp4" ? "text-wave" : "text-mist"} aria-hidden="true">
                              <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                              <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
                            </svg>
                            MP4 Video
                          </span>
                          <div className="flex items-center gap-1.5">
                            {recommendedFormat === "mp4" && !disabled ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                                <span className="size-1 rounded-full bg-emerald-400 animate-pulse" />
                                Auto
                              </span>
                            ) : null}
                            {effectiveFormat === "mp4" ? (
                              <span className="size-1.5 rounded-full bg-wave" />
                            ) : null}
                          </div>
                        </div>
                        <p className="mt-1 text-[11px] leading-tight text-mist/75 line-clamp-1">
                          {disabled && isImagePin ? "Photo pin (no video track)" : "Video pin format"}
                        </p>
                        <span className="mt-1.5 inline-block font-mono text-[10px] text-mist/60">
                          {disabled ? "Unavailable" : `Up to ${maxHeight}p`}
                        </span>
                      </button>
                    );
                  })()}

                  {/* MP3 Audio Option */}
                  {(() => {
                    const disabled = isImagePin;
                    return (
                      <button
                        type="button"
                        onClick={() => handleFormat("mp3")}
                        disabled={disabled}
                        aria-pressed={effectiveFormat === "mp3"}
                        title={disabled ? "Photo pin has no audio track" : undefined}
                        className={`group relative flex flex-col justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                          disabled
                            ? "cursor-not-allowed border-line/40 bg-ink/40 opacity-45"
                            : effectiveFormat === "mp3"
                              ? recommendedFormat === "mp3"
                                ? "border-emerald-500/60 bg-emerald-500/10 shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-500/40"
                                : "border-wave bg-wave/10 shadow-sm shadow-wave/10"
                              : recommendedFormat === "mp3"
                                ? "border-emerald-500/30 bg-emerald-500/[0.03] ring-1 ring-emerald-500/20 hover:border-emerald-500/60"
                                : "border-line bg-ink hover:border-wave/40 hover:bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-[13px] font-bold text-white">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className={effectiveFormat === "mp3" ? "text-wave" : "text-mist"} aria-hidden="true">
                              <path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            MP3 Audio
                          </span>
                          <div className="flex items-center gap-1.5">
                            {recommendedFormat === "mp3" && !disabled ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                                <span className="size-1 rounded-full bg-emerald-400 animate-pulse" />
                                Auto
                              </span>
                            ) : null}
                            {effectiveFormat === "mp3" ? (
                              <span className="size-1.5 rounded-full bg-wave" />
                            ) : null}
                          </div>
                        </div>
                        <p className="mt-1 text-[11px] leading-tight text-mist/75 line-clamp-1">
                          {disabled ? "Photo pin (no audio track)" : "Audio stream extraction"}
                        </p>
                        <span className="mt-1.5 inline-block font-mono text-[10px] text-mist/60">
                          {disabled ? "Unavailable" : "128 - 320 kbps"}
                        </span>
                      </button>
                    );
                  })()}
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {/* MP3 Option */}
                  <button
                    type="button"
                    onClick={() => handleFormat("mp3")}
                    aria-pressed={effectiveFormat === "mp3"}
                    className={`group relative flex flex-col justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                      effectiveFormat === "mp3"
                        ? recommendedFormat === "mp3"
                          ? "border-emerald-500/60 bg-emerald-500/10 shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-500/40"
                          : "border-wave bg-wave/10 shadow-sm shadow-wave/10"
                        : recommendedFormat === "mp3"
                          ? "border-emerald-500/30 bg-emerald-500/[0.03] ring-1 ring-emerald-500/20 hover:border-emerald-500/60"
                          : "border-line bg-ink hover:border-wave/40 hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[13px] font-bold text-white">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className={effectiveFormat === "mp3" ? "text-wave" : "text-mist"} aria-hidden="true">
                          <path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        MP3 Audio
                      </span>
                      <div className="flex items-center gap-1.5">
                        {recommendedFormat === "mp3" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                            <span className="size-1 rounded-full bg-emerald-400 animate-pulse" />
                            Auto
                          </span>
                        ) : null}
                        {effectiveFormat === "mp3" ? (
                          <span className="size-1.5 rounded-full bg-wave" />
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] leading-tight text-mist/75 line-clamp-1">Universal audio for all devices</p>
                    <span className="mt-1.5 inline-block font-mono text-[10px] text-mist/60">128 - 320 kbps</span>
                  </button>

                  {/* MP4 Option */}
                  {(() => {
                    const disabled = isAudioOnly;
                    return (
                      <button
                        type="button"
                        onClick={() => handleFormat("mp4")}
                        disabled={disabled}
                        aria-pressed={effectiveFormat === "mp4"}
                        title={
                          disabled
                            ? preview?.audioOnly
                              ? "Audio-only source detected (no video track)"
                              : `${detected?.label ?? "This platform"} is audio-only`
                            : undefined
                        }
                        className={`group relative flex flex-col justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                          disabled
                            ? "cursor-not-allowed border-line/40 bg-ink/40 opacity-45"
                            : effectiveFormat === "mp4"
                              ? recommendedFormat === "mp4"
                                ? "border-emerald-500/60 bg-emerald-500/10 shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-500/40"
                                : "border-wave bg-wave/10 shadow-sm shadow-wave/10"
                              : recommendedFormat === "mp4"
                                ? "border-emerald-500/30 bg-emerald-500/[0.03] ring-1 ring-emerald-500/20 hover:border-emerald-500/60"
                                : "border-line bg-ink hover:border-wave/40 hover:bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-[13px] font-bold text-white">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className={effectiveFormat === "mp4" ? "text-wave" : "text-mist"} aria-hidden="true">
                              <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                              <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
                            </svg>
                            MP4 Video
                          </span>
                          <div className="flex items-center gap-1.5">
                            {recommendedFormat === "mp4" && !disabled ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                                <span className="size-1 rounded-full bg-emerald-400 animate-pulse" />
                                Auto
                              </span>
                            ) : null}
                            {effectiveFormat === "mp4" ? (
                              <span className="size-1.5 rounded-full bg-wave" />
                            ) : null}
                          </div>
                        </div>
                        <p className="mt-1 text-[11px] leading-tight text-mist/75 line-clamp-1">
                          {disabled
                            ? preview?.audioOnly
                              ? "Audio-only source detected"
                              : "Audio-only platform"
                            : "High-definition video with synced audio"}
                        </p>
                        <span className="mt-1.5 inline-block font-mono text-[10px] text-mist/60">
                          {disabled ? "Unavailable" : maxHeight >= 2160 ? "Up to 4K" : `Up to ${maxHeight}p`}
                        </span>
                      </button>
                    );
                  })()}

                  {/* M4A Fast Audio Option */}
                  {(() => {
                    const disabled = isM4aDisabled;
                    return (
                      <button
                        type="button"
                        onClick={() => handleFormat("m4a")}
                        disabled={disabled}
                        aria-pressed={effectiveFormat === "m4a"}
                        title={
                          disabled
                            ? `${detected?.label ?? "This platform"} only supports MP3 extraction`
                            : undefined
                        }
                        className={`group relative flex flex-col justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                          disabled
                            ? "cursor-not-allowed border-line/40 bg-ink/40 opacity-45"
                            : effectiveFormat === "m4a"
                              ? "border-grab bg-grab/10 shadow-sm shadow-grab/10"
                              : "border-line bg-ink hover:border-grab/40 hover:bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-[13px] font-bold text-white">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={effectiveFormat === "m4a" ? "text-grab" : "text-mist"} aria-hidden="true">
                              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                            </svg>
                            M4A Fast Audio
                          </span>
                          {effectiveFormat === "m4a" ? (
                            <span className="size-1.5 rounded-full bg-grab" />
                          ) : null}
                        </div>
                        <p className="mt-1 text-[11px] leading-tight text-mist/75 line-clamp-1">
                          {disabled
                            ? `${detected?.label ?? "Platform"} only supports MP3`
                            : "Direct stream, zero re-encode"}
                        </p>
                        <span className={`mt-1.5 inline-block font-mono text-[10px] ${disabled ? "text-mist/60" : "text-grab font-medium"}`}>
                          {disabled ? "Unavailable" : "Direct stream"}
                        </span>
                      </button>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Quality Picker */}
            <div className="min-w-0 sm:w-64 lg:w-64">
              <label htmlFor="quality" className="flex items-center justify-between text-sm font-semibold text-white/90">
                <span className="flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full bg-wave/20 text-xs font-bold text-wave">
                    3
                  </span>
                  {effectiveFormat === "mp3"
                    ? "Sound quality"
                    : effectiveFormat === "m4a"
                      ? "Audio stream"
                      : effectiveFormat === "jpg" || effectiveFormat === "png"
                        ? "Photo quality"
                        : "Video resolution"}
                </span>
                <span className="text-xs text-mist/70">
                  {effectiveFormat === "mp3" ? "Bitrate" : effectiveFormat === "jpg" || effectiveFormat === "png" ? "Resolution" : "Resolution"}
                </span>
              </label>

              <select
                id="quality"
                value={effectiveQuality}
                onChange={(event) => setQuality(event.target.value)}
                className="mt-3 block w-full rounded-xl border border-line bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-sm focus:border-wave focus:outline-none focus:ring-2 focus:ring-wave/20"
              >
                {qualities.map((value) => (
                  <option key={value} value={value}>
                    {effectiveFormat === "mp3"
                      ? value === "320"
                        ? "320 kbps — Studio / Audiophile"
                        : value === "192"
                          ? "192 kbps — High Quality (Recommended)"
                          : "128 kbps — Standard / Compact file"
                      : effectiveFormat === "m4a"
                        ? "Original M4A stream (Direct extraction)"
                        : effectiveFormat === "jpg" || effectiveFormat === "png"
                          ? `Original Resolution (${preview?.width && preview?.height ? `${preview.width}×${preview.height}` : "Full Size"})`
                          : value === "2160"
                            ? "2160p — 4K Ultra HD"
                            : value === "1080"
                              ? "1080p — Full HD (Recommended)"
                              : value === "720"
                                ? "720p — HD (Fast & balanced)"
                                : `${value}p`}
                  </option>
                ))}
              </select>

              {/* Technical stream badge */}
              <div className="mt-2.5 rounded-lg border border-line/60 bg-ink/60 p-2 text-[11px] text-mist/75">
                <div className="flex items-center justify-between font-mono">
                  <span>Codec: {effectiveFormat === "jpg" ? "JPEG (Original CDN)" : effectiveFormat === "png" ? "PNG (Lossless)" : effectiveFormat === "mp3" ? "LAME MP3 (CBR)" : effectiveFormat === "m4a" ? "AAC Audio" : "H.264 / AAC"}</span>
                  <span className={canInstant ? "text-grab font-bold" : isAudioOnly ? "text-wave font-semibold" : "text-mist/60"}>
                    {canInstant ? "Direct CDN" : isAudioOnly ? "Audio Lane" : "Transcoder"}
                  </span>
                </div>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-mist/75">
                {effectiveFormat === "jpg" || effectiveFormat === "png"
                  ? "Original high-resolution Pinterest photo. Instant direct CDN download."
                  : effectiveFormat === "mp3"
                    ? isAudioOnly
                      ? "Audio-only mode: 192 kbps is the sweet spot. 320 kbps offers audiophile depth."
                      : "192 kbps is the sweet spot. 320 kbps offers lossless acoustic depth."
                    : effectiveFormat === "m4a"
                      ? "Direct original audio file without any re-encoding loss or conversion queue."
                      : canInstant
                        ? "This resolution qualifies for instant direct download."
                        : sourceCap
                          ? `Source caps at ${sourceCap}p. Higher resolutions run through our cloud transcoder.`
                          : maxHeight >= 2160
                            ? "1080p is sharp for computers & phones. 4K requires a 4K source video."
                            : "1080p is Full HD for computers & phones. 720p is fast and balanced."}
              </p>
            </div>
          </div>
        </div>
      </form>

      {/* Instant Download Card */}
      {instant ? (
        <div className="relative overflow-hidden rounded-2xl border border-grab/40 bg-grab/5 p-5 shadow-xl shadow-grab/5 animate-fade-up">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-grab via-lime-300 to-wave"
          />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-grab/20 px-2.5 py-0.5 text-xs font-bold text-grab">
                  <span className="size-1.5 rounded-full bg-grab animate-ping" />
                  Instant download ready
                </span>
                <span className="text-xs text-mist/70">No transcoding delay</span>
              </div>
              <p className="mt-1.5 truncate text-base font-semibold text-white">{instant.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-mist font-mono">
                <span className="truncate max-w-xs">{instant.filename}</span>
                {instant.height ? (
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-white">{instant.height}p</span>
                ) : null}
                {formatBytes(instant.sizeBytes) ? (
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-white">{formatBytes(instant.sizeBytes)}</span>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-mist/80">
                Your file has started downloading. If your browser blocked it, click &quot;Download again&quot;.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => startDownload(instant.downloadUrl, instant.filename)}
                className="inline-flex items-center gap-2 rounded-xl bg-grab px-5 py-3 text-sm font-bold text-ink shadow-md shadow-grab/20 transition hover:bg-lime-300 active:scale-95"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Download again
              </button>

              <button
                type="button"
                onClick={handleCopyInstantUrl}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-ink px-4 py-3 text-sm font-medium text-mist transition hover:border-wave/50 hover:text-white"
              >
                {instantCopied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-grab" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-grab">Copied!</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                    <span>Copy link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setInstant(null)}
                aria-label="Dismiss instant download"
                className="rounded-xl border border-line p-3 text-mist transition hover:border-white/20 hover:text-white"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Active Conversion Status Card */}
      {jobId ? (
        <div id="conversion-status" className="scroll-mt-24">
          <JobStatus
            jobId={jobId}
            onReset={() => {
              setJobId(null);
              setAutoDownloadJobId(null);
            }}
            initialPreview={preview ?? undefined}
            autoDownload={autoDownloadJobId === jobId}
          />
        </div>
      ) : null}

      {/* Local Conversion History Panel */}
      <HistoryPanel
        onSelect={(id) => {
          setJobId(id);
          setAutoDownloadJobId(null);
          setInstant(null);
          window.requestAnimationFrame(() => {
            document
              .getElementById("conversion-status")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        }}
      />
    </div>
  );
}