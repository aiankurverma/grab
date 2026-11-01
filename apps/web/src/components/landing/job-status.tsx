"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { PlatformMark } from "@/components/ui/platform-mark";
import { rememberJob } from "@/lib/jobs/history";
import type { JobView } from "@/lib/jobs/view";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";

export type JobPreview = {
  title: string;
  thumbnailUrl: string | null;
  uploader: string | null;
  durationSeconds: number;
};

const LABELS: Record<string, string> = {
  QUEUED: "Waiting in Queue",
  PROBING: "Reading Media Stream",
  DOWNLOADING: "Downloading Source Stream",
  CONVERTING: "Transcoding & Packaging",
  UPLOADING: "Generating Download Link",
  READY: "Ready to Download",
  FAILED: "Conversion Failed",
  CANCELLED: "Conversion Cancelled",
  EXPIRED: "Download Link Expired",
};

const DESCRIPTIONS: Record<string, string> = {
  QUEUED: "Waiting for an available conversion worker. You can safely keep this tab open or close it.",
  PROBING: "Verifying stream codecs, audio bitrates, and video resolutions from source.",
  DOWNLOADING: "Fetching high-bitrate source data from the host platform.",
  CONVERTING: "Encoding audio/video stream into your chosen format. Long high-res videos take extra seconds.",
  UPLOADING: "Packaging final file container and creating your direct secure download link.",
  READY: "Conversion completed! Your file is ready to save.",
  FAILED: "The media stream could not be converted.",
  CANCELLED: "This conversion was terminated.",
  EXPIRED: "This download link has expired (6-hour limit). Convert the link again to generate a fresh file.",
};

const STAGES = [
  { key: "QUEUED", label: "Queue" },
  { key: "PROBING", label: "Verify" },
  { key: "DOWNLOADING", label: "Download" },
  { key: "CONVERTING", label: "Convert" },
  { key: "UPLOADING", label: "Package" },
  { key: "READY", label: "Complete" },
] as const;

function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = Math.floor(seconds % 60);
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function formatSize(bytes: number | null): string | null {
  if (!bytes || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
}

function formatQuality(format: string, quality: string): string {
  const upper = format.toUpperCase();
  if (upper === "MP3") return `${quality} kbps CBR`;
  if (upper === "JPG" || upper === "PNG") return quality === "original" ? "Original Resolution" : `${quality}p Photo`;
  return quality === "2160" ? "2160p (4K UHD)" : `${quality}p HD`;
}

function formatEta(seconds: number | null): string | null {
  if (seconds === null || seconds <= 0) return null;
  if (seconds < 10) return "a few seconds";
  if (seconds < 60) return `~${Math.ceil(seconds / 10) * 10} seconds`;
  if (seconds < 120) return "about a minute";
  return `~${Math.ceil(seconds / 60)} minutes`;
}

function formatClock(value: string | undefined): string {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function estimateRemaining(job: JobView | null, now: number): number | null {
  if (!job) return null;
  if (job.terminal) return 0;

  const elapsed = Math.max(0, (now - new Date(job.createdAt).getTime()) / 1000);
  if (job.progress >= 5 && job.progress < 95 && elapsed > 2) {
    const raw = (elapsed / job.progress) * (100 - job.progress);
    return Math.max(3, Math.min(14_400, Math.round(raw)));
  }

  const duration = job.durationSeconds ?? 0;
  switch (job.status) {
    case "QUEUED":
      return 5 + job.queueAhead * 8;
    case "PROBING":
      return 8;
    case "DOWNLOADING":
      return Math.max(8, Math.round(duration * 0.25 + 5));
    case "CONVERTING":
      return Math.max(
        5,
        Math.round(duration * (job.format === "MP3" ? 0.12 : job.quality === "2160" ? 1.8 : 0.45)),
      );
    case "UPLOADING":
      return 10;
    default:
      return null;
  }
}

function applyJob(job: JobView, initialPreview?: JobPreview): JobView {
  if (job.title || !initialPreview) return job;
  return {
    ...job,
    title: initialPreview.title,
    thumbnailUrl: job.thumbnailUrl ?? initialPreview.thumbnailUrl,
    uploader: job.uploader ?? initialPreview.uploader,
    durationSeconds: job.durationSeconds ?? Math.round(initialPreview.durationSeconds),
  };
}

export function JobStatus({
  jobId,
  onReset,
  initialPreview,
  autoDownload = true,
}: {
  jobId: string;
  onReset: () => void;
  initialPreview?: JobPreview;
  autoDownload?: boolean;
}) {
  const [job, setJob] = useState<JobView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedJobId, setCopiedJobId] = useState(false);
  const [copiedSource, setCopiedSource] = useState(false);
  const [allowAutoDownload, setAllowAutoDownload] = useState(autoDownload);

  const lastRemembered = useRef("");
  const autoDownloaded = useRef(false);

  useEffect(() => {
    autoDownloaded.current = false;
  }, [jobId]);

  useEffect(() => {
    if (!allowAutoDownload || autoDownloaded.current) return;
    if (job?.status !== "READY" || !job.outputUrl) return;
    autoDownloaded.current = true;
    const anchor = document.createElement("a");
    anchor.href = job.outputUrl;
    anchor.download = "";
    anchor.rel = "noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }, [allowAutoDownload, job?.status, job?.outputUrl]);

  useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let source: EventSource | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let polling = false;
    lastRemembered.current = "";

    const accept = (data: JobView) => {
      if (cancelled || !data || typeof data.id !== "string") return;
      const next = applyJob(data, initialPreview);
      setJob(next);
      setError(null);
      const key = `${next.status}|${next.title}|${next.thumbnailUrl}`;
      if (key !== lastRemembered.current) {
        lastRemembered.current = key;
        rememberJob({
          id: next.id,
          url: next.url,
          format: next.format.toLowerCase(),
          quality: next.quality,
          status: next.status,
          title: next.title,
          thumbnailUrl: next.thumbnailUrl,
          durationSeconds: next.durationSeconds,
          createdAt: next.createdAt,
        });
      }
    };

    async function poll() {
      if (cancelled) return;
      try {
        const response = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
        if (response.status === 404) {
          if (!cancelled) setError("This conversion job could not be found.");
          return;
        }
        if (!response.ok) throw new Error(`status ${response.status}`);
        const data = (await response.json()) as JobView;
        accept(data);
        if (!data.terminal && !cancelled) pollTimer = setTimeout(poll, 1200);
      } catch {
        if (cancelled) return;
        setError("Reconnecting to progress stream…");
        pollTimer = setTimeout(poll, 2500);
      }
    }

    function startPolling() {
      if (polling || cancelled) return;
      polling = true;
      void poll();
    }

    try {
      source = new EventSource(`/api/jobs/${jobId}/stream`);
      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as JobView | { error?: string };
          if ("error" in data && data.error) return;
          accept(data as JobView);
          if ((data as JobView).terminal) {
            source?.close();
            source = null;
          }
        } catch {
          setError("A progress update could not be read.");
        }
      };
      source.onerror = () => {
        source?.close();
        source = null;
        startPolling();
      };
    } catch {
      startPolling();
    }

    return () => {
      cancelled = true;
      source?.close();
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [jobId, initialPreview]);

  async function handleCopyLink() {
    if (!job?.outputUrl) return;
    try {
      await navigator.clipboard.writeText(job.outputUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Ignore
    }
  }

  async function handleCopyJobId() {
    try {
      await navigator.clipboard.writeText(jobId);
      setCopiedJobId(true);
      setTimeout(() => setCopiedJobId(false), 2000);
    } catch {
      // Ignore
    }
  }

  async function handleCopySourceUrl() {
    if (!job?.url) return;
    try {
      await navigator.clipboard.writeText(job.url);
      setCopiedSource(true);
      setTimeout(() => setCopiedSource(false), 2000);
    } catch {
      // Ignore
    }
  }

  const status = job?.status ?? "QUEUED";
  const label = LABELS[status] ?? status;
  const description = DESCRIPTIONS[status] ?? "Processing your file.";
  const progress = job?.terminal && status === "READY" ? 100 : (job?.progress ?? 0);
  const duration = formatDuration(job?.durationSeconds ?? null);
  const size = formatSize(job?.outputSizeBytes ?? null);
  const failed = status === "FAILED" || status === "CANCELLED" || status === "EXPIRED";
  const title = job?.title ?? initialPreview?.title ?? null;
  const thumbnail = job?.thumbnailUrl ?? initialPreview?.thumbnailUrl ?? null;
  const uploader = job?.uploader ?? initialPreview?.uploader ?? null;
  const currentStage = failed ? -1 : STAGES.findIndex((stage) => stage.key === status);
  const eta = formatEta(estimateRemaining(job, now));
  const queued = status === "QUEUED";
  const longJob = (job?.durationSeconds ?? 0) > 1_800 || job?.quality === "2160";
  const platform = job && job.platform in PLATFORMS ? (job.platform as PlatformId) : null;

  return (
    <section
      aria-live="polite"
      className="glass-card relative overflow-hidden rounded-[1.75rem] border border-white/10 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-7 animate-fade-up"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-wave/80 to-transparent"
      />

      {/* Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-mist/80">Active Conversion</span>
            {platform ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ink px-2.5 py-0.5 text-[11px] text-mist font-medium">
                <PlatformMark platform={platform} size="sm" className="size-4 rounded text-[6px]" />
                {PLATFORMS[platform].label}
              </span>
            ) : null}
          </div>
          <h2 className="mt-1.5 text-lg font-bold text-white sm:text-xl flex items-center gap-2">
            {label}
            {status !== "READY" && !failed ? (
              <span className="inline-flex size-2 rounded-full bg-wave animate-ping" />
            ) : null}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-mist/90">{description}</p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold sm:shrink-0 ${
              status === "READY"
                ? "border border-grab/30 bg-grab/15 text-grab shadow-sm shadow-grab/20"
                : failed
                  ? "border border-red-500/30 bg-red-500/15 text-red-400"
                  : "border border-wave/30 bg-wave/15 text-wave"
            }`}
          >
            {status === "READY" ? "✓ Complete" : failed ? "✕ Stopped" : "● Converting"}
          </span>
        </div>
      </div>

      {/* Media Details Card */}
      <div className="mt-4 flex items-center gap-3.5 rounded-xl border border-line/70 bg-ink/70 p-3 sm:p-4">
        <div className="relative flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-ink text-[11px] uppercase tracking-wide text-mist">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt=""
              width={112}
              height={64}
              unoptimized
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="animate-pulse font-mono text-xs">Loading…</span>
          )}

          {duration ? (
            <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-mono font-medium text-white backdrop-blur-sm">
              {duration}
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-base font-semibold text-white ${title ? "truncate" : "animate-pulse text-mist"}`}>
            {title ?? "Reading video details…"}
          </p>
          <p className="mt-1 truncate text-xs text-mist">
            {[uploader, duration].filter(Boolean).join(" · ") || "Title and length stream in real time"}
          </p>
          {job ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                {job.format}
              </span>
              <span className="rounded border border-line px-2 py-0.5 text-[11px] text-mist/90">
                {formatQuality(job.format, job.quality)}
              </span>
              {size ? (
                <span className="rounded border border-line px-2 py-0.5 text-[11px] text-grab font-mono">
                  {size}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Stage Tracker */}
      <ol className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {STAGES.map((stage, index) => {
          const done = currentStage > index;
          const active = currentStage === index;
          return (
            <li
              key={stage.key}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-all ${
                active
                  ? "border-wave bg-wave/15 text-wave shadow-sm shadow-wave/10 ring-1 ring-wave/40"
                  : done
                    ? "border-grab/30 bg-grab/10 text-grab"
                    : "border-line/70 bg-ink/80 text-mist/50"
              }`}
            >
              <span
                aria-hidden="true"
                className={`grid size-4 shrink-0 place-items-center rounded-full text-[9px] font-bold ${
                  active
                    ? "bg-wave text-ink animate-pulse"
                    : done
                      ? "bg-grab text-ink"
                      : "bg-white/10 text-mist/60"
                }`}
              >
                {done ? "✓" : index + 1}
              </span>
              <span className="truncate">{stage.label}</span>
            </li>
          );
        })}
      </ol>

      {/* Elevated Progress Bar */}
      <div className="mt-5">
        <div
          className="relative h-2.5 overflow-hidden rounded-full bg-ink border border-line/50"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label={`${label}: ${progress}%`}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              failed
                ? "bg-red-400"
                : "bg-gradient-to-r from-wave-deep via-wave to-grab animate-shimmer"
            }`}
            style={{ width: `${Math.max(4, progress)}%` }}
          />
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-mist font-medium">
          <span className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-white">{progress}%</span>
            <span>completed</span>
          </span>
          <span className="font-medium text-wave">
            {queued
              ? job?.queueAhead
                ? `#${job.queueAhead + 1} in queue`
                : "Next in queue"
              : eta && !job?.terminal
                ? `${eta} remaining`
                : null}
          </span>
        </div>
      </div>

      {/* Queue Details */}
      {queued && job ? (
        <div className="mt-3.5 rounded-xl border border-line/70 bg-ink/70 p-3.5 text-xs text-mist leading-relaxed">
          <p>
            {job.queueAhead > 0
              ? `There are ${job.queueAhead} job${job.queueAhead === 1 ? "" : "s"} ahead of yours.`
              : "Your job is next in line for processing."}{" "}
            You can keep this window open or come back later — conversion continues automatically.
          </p>
        </div>
      ) : null}

      {/* Ready Action Banner */}
      {status === "READY" ? (
        <div className="mt-5 rounded-2xl border border-grab/40 bg-grab/10 p-5 shadow-lg shadow-grab/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-base font-bold text-grab">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Your converted file is ready!
              </p>
              <p className="mt-1 text-xs text-mist">
                {size ? `${size} · ` : ""}
                Valid until{" "}
                <span className="font-semibold text-white">
                  {job?.expiresAt
                    ? new Date(job.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "6 hours from now"}
                </span>
                .
              </p>
              {allowAutoDownload ? (
                <p className="mt-1 text-[11px] text-grab/90 font-medium">
                  ✓ File download triggered automatically in your browser.
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2.5">
              {job?.outputUrl ? (
                <a
                  className="inline-flex items-center gap-2 rounded-xl bg-wave px-6 py-3 text-sm font-bold text-ink shadow-md shadow-wave/20 transition hover:bg-wave-deep active:scale-95"
                  href={job.outputUrl}
                  download=""
                  rel="noreferrer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Download {job.format}
                </a>
              ) : null}

              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-ink px-4 py-3 text-sm font-medium text-mist transition hover:border-wave/50 hover:text-white"
              >
                {copiedLink ? (
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
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Failure Box */}
      {failed ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          <div className="flex items-start gap-2.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0 text-red-400 mt-0.5" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div>
              <p className="font-bold">Conversion could not complete</p>
              <p className="mt-1 text-xs text-red-300/90 leading-relaxed">
                {job?.failureMessage ?? "The media host refused extraction or the file format is restricted."}
              </p>
              <ul className="mt-2.5 list-disc pl-4 text-xs text-red-300/75 space-y-1">
                <li>Verify that the video is publicly accessible (not private or login-walled).</li>
                <li>Live broadcasts and upcoming premieres cannot be downloaded.</li>
                <li>Try selecting standard MP3 sound format or 720p HD resolution.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-xs text-red-400">{error}</p> : null}

      {/* Technical Stream Details Accordion */}
      <details className="mt-4 rounded-xl border border-line/70 bg-ink/75 px-4 py-3 text-xs text-mist group">
        <summary className="cursor-pointer select-none font-semibold text-white/80 flex items-center justify-between">
          <span>Technical stream specs &amp; diagnostics</span>
          <span className="font-mono text-[10px] text-mist/60 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2 pt-2 border-t border-line/50">
          <div className="flex items-center justify-between py-1 border-b border-line/30">
            <dt className="text-mist/70">Job ID</dt>
            <dd className="flex items-center gap-1.5 font-mono text-[11px] text-white/90">
              <span className="truncate max-w-[140px]">{jobId}</span>
              <button
                type="button"
                onClick={handleCopyJobId}
                title="Copy Job ID"
                className="rounded border border-line px-1.5 py-0.5 text-[10px] text-mist hover:text-white hover:border-wave"
              >
                {copiedJobId ? "Copied!" : "Copy"}
              </button>
            </dd>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-line/30">
            <dt className="text-mist/70">Engine Lane</dt>
            <dd className="font-mono text-[11px] text-white/90">{job?.lane ?? "transcoder"}</dd>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-line/30">
            <dt className="text-mist/70">Target Stream</dt>
            <dd className="font-mono text-[11px] text-white/90">{job?.format ?? "—"} ({job?.quality ?? "—"})</dd>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-line/30">
            <dt className="text-mist/70">Auto-Download</dt>
            <dd>
              <button
                type="button"
                onClick={() => setAllowAutoDownload((curr) => !curr)}
                className={`text-[11px] font-semibold underline underline-offset-2 ${allowAutoDownload ? "text-grab" : "text-mist"}`}
              >
                {allowAutoDownload ? "Enabled (Click to disable)" : "Disabled (Click to enable)"}
              </button>
            </dd>
          </div>
          {job?.url ? (
            <div className="flex items-center justify-between py-1 sm:col-span-2">
              <dt className="text-mist/70">Source URL</dt>
              <dd className="flex items-center gap-1.5">
                <span className="truncate max-w-xs font-mono text-[11px] text-mist">{job.url}</span>
                <button
                  type="button"
                  onClick={handleCopySourceUrl}
                  className="rounded border border-line px-1.5 py-0.5 text-[10px] text-mist hover:text-white hover:border-wave"
                >
                  {copiedSource ? "Copied!" : "Copy"}
                </button>
              </dd>
            </div>
          ) : null}
        </dl>
      </details>

      {/* Convert Another Link Button */}
      {failed || status === "READY" ? (
        <div className="mt-4 flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-wave transition hover:text-wave-deep hover:underline underline-offset-4"
          >
            <span>← Convert another video or track</span>
          </button>
        </div>
      ) : null}
    </section>
  );
}