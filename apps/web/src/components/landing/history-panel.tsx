"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

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
  READY: "Ready",
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
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
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
  return "bg-wave";
}

export function HistoryPanel({ onSelect }: { onSelect: (jobId: string) => void }) {
  const items = useSyncExternalStore(subscribeHistory, readHistory, getEmptyHistory);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "ready">("all");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close drawer on Escape key and prevent background scroll when drawer is open
  useEffect(() => {
    if (!isDrawerOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDrawerOpen(false);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDrawerOpen]);

  // Refresh status of recent jobs on mount
  useEffect(() => {
    let cancelled = false;
    const initial = readHistory();

    async function refresh() {
      const recent = initial.slice(0, 7);
      const refreshed = await Promise.all(
        recent.map(async (item) => {
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

    if (initial.length) void refresh();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCopyDownloadLink(e: React.MouseEvent, jobId: string) {
    e.stopPropagation();
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

  const filteredItems = filter === "ready" ? items.filter((i) => i.status === "READY") : items;
  const inlineItems = filteredItems.slice(0, 5);

  const drawerPortal =
    mounted && isDrawerOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-50 flex justify-end"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recent-conversions-drawer-title"
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-ink/80 backdrop-blur-sm animate-drawer-fade"
              onClick={() => setIsDrawerOpen(false)}
              aria-hidden="true"
            />

            {/* Slide-in Drawer Container */}
            <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-line bg-[#0a0d14]/95 text-white shadow-2xl backdrop-blur-2xl animate-drawer-slide sm:max-w-lg">
              {/* Top Accent Gradient */}
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-wave/60 via-violet-500/50 to-grab/60" />

              {/* Drawer Header */}
              <div className="border-b border-line/70 p-5 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-xl border border-line bg-ink text-wave">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
                      <h2
                        id="recent-conversions-drawer-title"
                        className="text-base font-semibold text-white"
                      >
                        Recent conversions ({items.length}/7)
                      </h2>
                      <p className="text-[11px] text-mist/70">Local browser storage</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="rounded-lg border border-transparent p-2 text-mist transition hover:border-line hover:bg-white/[0.05] hover:text-white"
                    aria-label="Close recent conversions panel"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Friendly explanation */}
                <div className="mt-3.5 rounded-xl border border-line/60 bg-white/[0.02] p-3 text-xs leading-relaxed text-mist">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid size-4 shrink-0 place-items-center text-wave" aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </span>
                    <p>
                      Conversions stay safely saved in your browser for easy re-downloading within the 6-hour link window.
                    </p>
                  </div>
                </div>

                {/* Actions row with Filter and Clear */}
                <div className="mt-3 flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setFilter("all")}
                      className={`rounded-md px-2 py-0.5 font-medium transition ${
                        filter === "all"
                          ? "bg-wave/20 text-wave"
                          : "text-mist/70 hover:text-white"
                      }`}
                    >
                      All ({items.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilter("ready")}
                      className={`rounded-md px-2 py-0.5 font-medium transition ${
                        filter === "ready"
                          ? "bg-grab/20 text-grab"
                          : "text-mist/70 hover:text-white"
                      }`}
                    >
                      Ready ({items.filter((i) => i.status === "READY").length})
                    </button>
                  </div>

                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => clearHistory()}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-mist/70 transition hover:text-red-400 hover:underline"
                    >
                      <svg
                        width="13"
                        height="13"
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
                      <span>Clear all</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Full History Items List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                {filteredItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="grid size-12 place-items-center rounded-2xl border border-line bg-ink text-mist/50">
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M12 8v4l3 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9Z" />
                      </svg>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white/80">No conversions found</p>
                    <p className="mt-1 max-w-xs text-xs text-mist/60">
                      Jobs you convert will appear here automatically for quick re-downloading.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2.5">
                    {filteredItems.map((item, index) => (
                      <li key={item.id}>
                        <div className="group flex w-full items-center gap-3.5 rounded-xl border border-line/70 bg-ink-soft/70 p-3 text-left transition hover:border-wave/50 hover:bg-white/[0.04]">
                          <button
                            type="button"
                            onClick={() => {
                              onSelect(item.id);
                              setIsDrawerOpen(false);
                            }}
                            className="flex min-w-0 flex-1 items-center gap-3.5 text-left focus:outline-none"
                          >
                            <span className="relative flex h-14 w-22 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-ink text-xs font-bold uppercase tracking-wider text-mist">
                              {item.thumbnailUrl ? (
                                <Image
                                  src={item.thumbnailUrl}
                                  alt=""
                                  width={88}
                                  height={56}
                                  unoptimized
                                  referrerPolicy="no-referrer"
                                  className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                                />
                              ) : (
                                <span className="font-semibold text-slate-300">{item.format}</span>
                              )}
                              {formatDuration(item.durationSeconds) ? (
                                <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[9px] font-mono text-white/90">
                                  {formatDuration(item.durationSeconds)}
                                </span>
                              ) : (
                                <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[9px] font-medium text-white/90">
                                  #{index + 1}
                                </span>
                              )}
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-white transition group-hover:text-wave">
                                {item.title ?? "Untitled conversion"}
                              </span>
                              <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-mist">
                                <span className={`size-1.5 shrink-0 rounded-full ${statusDot(item.status)}`} />
                                <span className={statusTone(item.status)}>
                                  {STATUS_LABEL[item.status] ?? item.status}
                                </span>
                                <span className="text-mist/40">·</span>
                                <span className="rounded bg-line/60 px-1.5 py-0.5 text-[10px] font-semibold text-slate-200">
                                  {item.format}
                                </span>
                                <span className="text-slate-300">{formatQuality(item)}</span>
                                {formatWhen(item.createdAt) ? (
                                  <>
                                    <span className="text-mist/40">·</span>
                                    <span className="text-mist/70">{formatWhen(item.createdAt)}</span>
                                  </>
                                ) : null}
                              </span>
                            </span>
                          </button>

                          <div className="flex shrink-0 items-center gap-1.5">
                            {item.status === "READY" ? (
                              <button
                                type="button"
                                onClick={(e) => handleCopyDownloadLink(e, item.id)}
                                title="Copy download link"
                                className="rounded-lg border border-line/60 bg-ink px-2 py-1 text-xs font-medium text-mist transition hover:border-wave/50 hover:text-white"
                              >
                                {copiedId === item.id ? (
                                  <span className="text-grab font-bold">Copied!</span>
                                ) : (
                                  <span>Copy</span>
                                )}
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeHistoryItem(item.id);
                              }}
                              className="rounded-lg p-1.5 text-mist/40 transition hover:bg-white/10 hover:text-red-400"
                              aria-label={`Remove ${item.title ?? "conversion"} from history`}
                              title="Remove from history"
                            >
                              <svg
                                width="14"
                                height="14"
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
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="border-t border-line/70 bg-ink/70 px-5 py-3 text-xs text-mist flex items-center justify-between">
                <span className="text-mist/60 text-[11px]">Up to 7 conversions kept locally</span>
                <div className="flex items-center gap-2">
                  <Link
                    href="/history"
                    onClick={() => setIsDrawerOpen(false)}
                    className="rounded-lg border border-line bg-ink px-3 py-1.5 text-xs font-medium text-wave transition hover:border-wave/40 hover:bg-white/[0.04]"
                  >
                    Full history page →
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="rounded-lg border border-line bg-ink px-3.5 py-1.5 text-xs font-medium text-white transition hover:border-wave/40 hover:bg-white/[0.04]"
                  >
                    Close
                  </button>
                </div>
              </div>
            </aside>
          </div>,
          document.body,
        )
      : null;

  if (items.length === 0) {
    return (
      <>
        <section className="glass-card rounded-2xl p-5 border border-white/5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-line bg-ink text-mist">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 8v4l3 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-white/90">Recent conversions</p>
              <p className="mt-0.5 text-xs leading-relaxed text-mist/75">
                Your converted files will appear here for fast re-downloading. Stored 100% locally in your browser.
              </p>
            </div>
          </div>
        </section>
        {drawerPortal}
      </>
    );
  }

  return (
    <>
      <section className="glass-card rounded-2xl p-4 sm:p-5 border border-white/10 shadow-lg">
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white/90">Recent conversions</p>
            <span className="rounded-full border border-line bg-ink px-2 py-0.5 text-[10px] font-mono text-mist">
              {items.length}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-ink/80 px-2.5 py-1 text-xs font-medium text-mist transition hover:border-wave/50 hover:bg-white/[0.04] hover:text-wave"
              title="View full history in side drawer"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M15 3v18" />
                <path d="M8 9l3 3-3 3" />
              </svg>
              <span>Side drawer</span>
            </button>

            <Link
              href="/history"
              className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-line bg-ink/80 px-2.5 py-1 text-xs font-medium text-mist transition hover:border-wave/50 hover:bg-white/[0.04] hover:text-white"
              title="Open full dedicated history page"
            >
              <span>Full page →</span>
            </Link>

            <button
              type="button"
              onClick={() => clearHistory()}
              className="text-xs font-medium text-mist/70 underline-offset-4 transition hover:text-red-400 hover:underline"
            >
              Clear
            </button>
          </div>
        </div>

        <ul className="mt-3.5 space-y-2">
          {inlineItems.map((item) => (
            <li key={item.id}>
              <div className="group flex w-full items-center gap-3 rounded-xl border border-line/60 bg-ink-soft/60 px-3 py-2.5 transition hover:border-wave/40 hover:bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none"
                >
                  <span className="relative flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-ink text-[10px] font-bold uppercase tracking-wide text-mist">
                    {item.thumbnailUrl ? (
                      <Image
                        src={item.thumbnailUrl}
                        alt=""
                        width={64}
                        height={40}
                        unoptimized
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      item.format
                    )}
                    {formatDuration(item.durationSeconds) ? (
                      <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[9px] font-mono text-white/90">
                        {formatDuration(item.durationSeconds)}
                      </span>
                    ) : null}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-white transition group-hover:text-wave">
                      {item.title ?? "Untitled media"}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 truncate text-xs text-mist">
                      <span className={`size-1.5 shrink-0 rounded-full ${statusDot(item.status)}`} />
                      <span className={statusTone(item.status)}>
                        {STATUS_LABEL[item.status] ?? item.status}
                      </span>
                      <span className="text-mist/40">·</span>
                      <span className="font-mono text-white/80">{item.format} {formatQuality(item)}</span>
                      {formatWhen(item.createdAt) ? ` · ${formatWhen(item.createdAt)}` : ""}
                    </span>
                  </span>
                </button>

                <div className="flex shrink-0 items-center gap-1.5">
                  {item.status === "READY" ? (
                    <button
                      type="button"
                      onClick={(e) => handleCopyDownloadLink(e, item.id)}
                      title="Copy download link"
                      className="rounded-lg border border-line/70 bg-ink px-2 py-1 text-xs font-medium text-mist transition hover:border-wave/50 hover:text-white"
                    >
                      {copiedId === item.id ? (
                        <span className="text-grab font-bold">Copied!</span>
                      ) : (
                        <span>Copy</span>
                      )}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeHistoryItem(item.id);
                    }}
                    title="Remove item"
                    className="rounded-lg p-1.5 text-mist/40 transition hover:bg-white/10 hover:text-red-400"
                  >
                    <svg
                      width="13"
                      height="13"
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
              </div>
            </li>
          ))}
        </ul>

        {items.length > 5 && (
          <div className="mt-3.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line/80 bg-white/[0.02] py-2.5 text-xs font-semibold text-wave transition hover:border-wave/40 hover:bg-wave/10 hover:text-white"
            >
              <span>View all in side panel ({items.length})</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
            <Link
              href="/history"
              className="flex items-center justify-center rounded-xl border border-line/80 bg-ink px-3.5 py-2.5 text-xs font-semibold text-mist transition hover:border-wave/40 hover:text-white"
            >
              All history →
            </Link>
          </div>
        )}
      </section>

      {drawerPortal}
    </>
  );
}