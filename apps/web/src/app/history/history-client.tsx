"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import {
  clearHistory,
  getEmptyHistory,
  readHistory,
  removeHistoryItem,
  subscribeHistory,
  writeHistory,
  type HistoryItem,
} from "@/lib/jobs/history";

const STATUS_LABEL: Record<string, string> = {
  QUEUED: "Waiting",
  PROBING: "Reading",
  DOWNLOADING: "Downloading",
  CONVERTING: "Converting",
  UPLOADING: "Preparing",
  READY: "Ready for download",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

function formatQuality(item: HistoryItem): string {
  return item.format === "MP3" ? `${item.quality} kbps` : `${item.quality}p`;
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = Math.floor(seconds % 60);
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
    : `${minutes}:${String(rest).padStart(2, "0")}`;
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusTone(status: string): string {
  if (status === "READY") return "text-grab";
  if (status === "FAILED" || status === "CANCELLED") return "text-red-400";
  if (status === "EXPIRED") return "text-mist/60";
  return "text-wave";
}

function statusDot(status: string): string {
  if (status === "READY") return "bg-grab";
  if (status === "FAILED" || status === "CANCELLED") return "bg-red-400";
  if (status === "EXPIRED") return "bg-mist/40";
  return "bg-wave animate-pulse";
}

export function HistoryClient() {
  const items = useSyncExternalStore(subscribeHistory, readHistory, getEmptyHistory);
  const [filter, setFilter] = useState<"all" | "ready" | "processing">("all");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Refresh recent jobs on mount
  useEffect(() => {
    let cancelled = false;
    const initial = readHistory();

    async function refresh() {
      const refreshed = await Promise.all(
        initial.map(async (item) => {
          try {
            const response = await fetch(`/api/jobs/${item.id}`, { cache: "no-store" });
            if (!response.ok) return null;
            const job = (await response.json()) as {
              status?: string;
              title?: string | null;
              thumbnailUrl?: string | null;
              durationSeconds?: number | null;
            };
            return {
              ...item,
              status: job.status ?? item.status,
              title: job.title ?? item.title,
              thumbnailUrl: job.thumbnailUrl ?? item.thumbnailUrl,
              durationSeconds: job.durationSeconds ?? item.durationSeconds,
            };
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      const byId = new Map(
        refreshed.filter((item): item is HistoryItem => item !== null).map((item) => [item.id, item]),
      );
      if (byId.size === 0) return;
      const current = readHistory();
      writeHistory(current.map((item) => byId.get(item.id) ?? item));
    }

    if (initial.length > 0) void refresh();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCopyDownloadLink(jobId: string) {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (res.ok) {
        const data = (await res.json()) as { outputUrl?: string };
        if (data.outputUrl) {
          await navigator.clipboard.writeText(data.outputUrl);
          setCopiedId(jobId);
          setTimeout(() => setCopiedId(null), 2000);
        }
      }
    } catch {
      // Ignore
    }
  }

  async function handleTriggerDownload(item: HistoryItem) {
    setDownloadingId(item.id);
    try {
      const res = await fetch(`/api/jobs/${item.id}`);
      if (res.ok) {
        const data = (await res.json()) as { outputUrl?: string };
        if (data.outputUrl) {
          const anchor = document.createElement("a");
          anchor.href = data.outputUrl;
          anchor.download = `${item.title ?? "media"}.${item.format.toLowerCase()}`;
          anchor.rel = "noreferrer";
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
        }
      }
    } finally {
      setTimeout(() => setDownloadingId(null), 1000);
    }
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filter === "ready" && item.status !== "READY") return false;
      if (
        filter === "processing" &&
        ["READY", "FAILED", "CANCELLED", "EXPIRED"].includes(item.status)
      ) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesTitle = (item.title ?? "").toLowerCase().includes(q);
        const matchesUrl = item.url.toLowerCase().includes(q);
        const matchesFormat = item.format.toLowerCase().includes(q);
        if (!matchesTitle && !matchesUrl && !matchesFormat) return false;
      }
      return true;
    });
  }, [items, filter, search]);

  return (
    <div className="space-y-6">
      {/* Information Header Banner */}
      <div className="rounded-2xl border border-line/80 bg-ink-soft/60 p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-wave/30 bg-wave/10 text-wave">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 8v4l3 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>
              <h2 className="text-base font-semibold text-white">
                Device Storage History ({items.length}/7 maximum)
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-mist">
                Stored 100% in your local browser storage. Download links remain valid for 6 hours
                from the time of creation before expiring.
              </p>
            </div>
          </div>

          {items.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Clear all recent conversions from your local storage?")) {
                    clearHistory();
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-ink px-3.5 py-2 text-xs font-semibold text-mist/80 transition hover:border-red-500/40 hover:text-red-400"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>Clear all history</span>
              </button>

              <Link
                href="/"
                className="rounded-xl bg-wave px-4 py-2 text-xs font-bold text-ink transition hover:bg-wave-deep"
              >
                Convert new link →
              </Link>
            </div>
          )}
        </div>

        {/* Filter bar and search input */}
        {items.length > 0 && (
          <div className="mt-5 flex flex-col gap-3 border-t border-line/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  filter === "all"
                    ? "bg-wave/20 text-wave font-semibold"
                    : "text-mist/70 hover:text-white"
                }`}
              >
                All ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("ready")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  filter === "ready"
                    ? "bg-grab/20 text-grab font-semibold"
                    : "text-mist/70 hover:text-white"
                }`}
              >
                Ready ({items.filter((i) => i.status === "READY").length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("processing")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  filter === "processing"
                    ? "bg-wave/20 text-wave font-semibold"
                    : "text-mist/70 hover:text-white"
                }`}
              >
                Processing (
                {
                  items.filter(
                    (i) => !["READY", "FAILED", "CANCELLED", "EXPIRED"].includes(i.status),
                  ).length
                }
                )
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search history by title..."
                className="w-full rounded-xl border border-line bg-ink px-3 py-1.5 text-xs text-white placeholder:text-mist/50 focus:border-wave focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-mist/60 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* History Items Grid / List */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-line bg-ink-soft/40 py-20 text-center">
          <div className="grid size-16 place-items-center rounded-2xl border border-line bg-ink text-mist/60">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 8v4l3 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9Z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">No conversions in history</h3>
          <p className="mt-1.5 max-w-sm text-sm text-mist">
            Whenever you convert a YouTube, TikTok, Instagram, or SoundCloud link, it will appear
            here for quick re-downloading within the 6-hour window.
          </p>
          <Link
            href="/"
            className="mt-6 rounded-xl bg-wave px-6 py-3 text-sm font-bold text-ink transition hover:bg-wave-deep"
          >
            Start your first conversion →
          </Link>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-line bg-ink-soft/30 py-12 text-center">
          <p className="text-sm font-semibold text-white">No conversions matching current filter</p>
          <button
            type="button"
            onClick={() => {
              setFilter("all");
              setSearch("");
            }}
            className="mt-3 text-xs text-wave hover:underline"
          >
            Reset filter
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item, index) => (
            <article
              key={item.id}
              className="group glass-card flex flex-col justify-between gap-4 rounded-2xl border border-line/70 p-4 transition hover:border-wave/40 sm:flex-row sm:items-center sm:p-5"
            >
              {/* Left thumbnail & title info */}
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <span className="relative flex h-16 w-26 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-ink text-xs font-bold uppercase tracking-wider text-mist">
                  {item.thumbnailUrl ? (
                    <Image
                      src={item.thumbnailUrl}
                      alt=""
                      width={104}
                      height={64}
                      unoptimized
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                    />
                  ) : (
                    <span>{item.format}</span>
                  )}
                  {formatDuration(item.durationSeconds) ? (
                    <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-mono text-white/90">
                      {formatDuration(item.durationSeconds)}
                    </span>
                  ) : (
                    <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[9px] font-medium text-white/90">
                      #{index + 1}
                    </span>
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold text-white transition group-hover:text-wave">
                    {item.title ?? "Untitled conversion"}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-mist">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <span className={`size-2 shrink-0 rounded-full ${statusDot(item.status)}`} />
                      <span className={statusTone(item.status)}>
                        {STATUS_LABEL[item.status] ?? item.status}
                      </span>
                    </span>

                    <span className="text-mist/40">·</span>
                    <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">
                      {item.format}
                    </span>
                    <span className="font-mono text-white/80">{formatQuality(item)}</span>

                    {formatWhen(item.createdAt) ? (
                      <>
                        <span className="text-mist/40">·</span>
                        <span className="text-mist/70">{formatWhen(item.createdAt)}</span>
                      </>
                    ) : null}
                  </div>

                  <p className="mt-1 truncate text-[11px] text-mist/50 font-mono">
                    {item.url}
                  </p>
                </div>
              </div>

              {/* Right actions */}
              <div className="flex shrink-0 items-center gap-2 pt-2 sm:pt-0">
                {item.status === "READY" ? (
                  <>
                    <button
                      type="button"
                      disabled={downloadingId === item.id}
                      onClick={() => handleTriggerDownload(item)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-grab px-4 py-2 text-xs font-bold text-ink shadow-sm transition hover:bg-lime-300"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>{downloadingId === item.id ? "Saving..." : "Download"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyDownloadLink(item.id)}
                      title="Copy download URL"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-ink px-3 py-2 text-xs font-medium text-mist transition hover:border-wave/50 hover:text-white"
                    >
                      {copiedId === item.id ? (
                        <span className="text-grab font-bold">Copied!</span>
                      ) : (
                        <span>Copy link</span>
                      )}
                    </button>
                  </>
                ) : (
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-ink px-3 py-2 text-xs font-medium text-wave transition hover:border-wave/40"
                  >
                    View Status →
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => removeHistoryItem(item.id)}
                  title="Remove from history"
                  className="rounded-xl border border-transparent p-2 text-mist/40 transition hover:border-line hover:bg-white/5 hover:text-red-400"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
