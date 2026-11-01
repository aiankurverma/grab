"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

export interface HistoryItem {
  id?: string;
  title: string | null;
  originalUrl: string;
  platform: string;
  format: string;
  quality: string;
  cloudinaryThumbnailUrl: string | null;
  timestamp: string;
}

interface InsightsHistoryFeedProps {
  initialHistory: HistoryItem[];
  platformBreakdown: Record<string, number>;
}

const SUPPORTED_PLATFORMS = [
  { id: "youtube", label: "YouTube" },
  { id: "pinterest", label: "Pinterest" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "facebook", label: "Facebook" },
  { id: "soundcloud", label: "SoundCloud" },
  { id: "x", label: "X (Twitter)" },
  { id: "reddit", label: "Reddit" },
  { id: "twitch", label: "Twitch" },
  { id: "vimeo", label: "Vimeo" },
  { id: "dailymotion", label: "Dailymotion" },
] as const;

export function InsightsHistoryFeed({
  initialHistory,
  platformBreakdown,
}: InsightsHistoryFeedProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Derive all supported platforms with conversion counts
  const platforms = useMemo(() => {
    function normalize(name: string) {
      const lower = name.toLowerCase();
      if (lower.includes("twitter") || lower === "x") return "x";
      if (lower.includes("pinterest")) return "pinterest";
      if (lower.includes("youtube")) return "youtube";
      if (lower.includes("instagram")) return "instagram";
      if (lower.includes("tiktok")) return "tiktok";
      if (lower.includes("facebook")) return "facebook";
      if (lower.includes("soundcloud")) return "soundcloud";
      if (lower.includes("reddit")) return "reddit";
      if (lower.includes("twitch")) return "twitch";
      if (lower.includes("vimeo")) return "vimeo";
      if (lower.includes("dailymotion")) return "dailymotion";
      return lower;
    }

    const counts = new Map<string, number>();

    for (const item of initialHistory) {
      const key = normalize(item.platform || "");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    for (const [key, count] of Object.entries(platformBreakdown)) {
      const norm = normalize(key);
      if (!counts.has(norm) || counts.get(norm)! < count) {
        counts.set(norm, count);
      }
    }

    const list: Array<{ id: string; name: string; count: number }> = [
      { id: "ALL", name: "All Platforms", count: initialHistory.length },
    ];

    for (const p of SUPPORTED_PLATFORMS) {
      list.push({
        id: p.id,
        name: p.label,
        count: counts.get(p.id) ?? 0,
      });
    }

    // Include any custom platforms detected in history
    for (const [key, count] of counts.entries()) {
      if (!SUPPORTED_PLATFORMS.some((sp) => sp.id === key)) {
        list.push({
          id: key,
          name: key.charAt(0).toUpperCase() + key.slice(1),
          count,
        });
      }
    }

    return list;
  }, [initialHistory, platformBreakdown]);

  // Filter items by platform & search
  const filteredItems = useMemo(() => {
    return initialHistory.filter((item) => {
      const itemKey = (item.platform || "").toLowerCase();
      const target = selectedPlatform.toLowerCase();
      const matchesPlatform =
        selectedPlatform === "ALL" ||
        itemKey === target ||
        itemKey.includes(target) ||
        target.includes(itemKey) ||
        (target === "x" && (itemKey.includes("twitter") || itemKey === "x"));

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.title && item.title.toLowerCase().includes(q)) ||
        item.originalUrl.toLowerCase().includes(q) ||
        item.format.toLowerCase().includes(q) ||
        item.quality.toLowerCase().includes(q);

      return matchesPlatform && matchesSearch;
    });
  }, [initialHistory, selectedPlatform, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, safeCurrentPage, pageSize]);

  function handleSelectPlatform(plat: string) {
    setSelectedPlatform(plat);
    setCurrentPage(1);
  }

  function handleSearch(query: string) {
    setSearchQuery(query);
    setCurrentPage(1);
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setCurrentPage(1);
  }

  const startRecord = filteredItems.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(safeCurrentPage * pageSize, filteredItems.length);

  return (
    <div className="space-y-5">
      {/* Platform Tabs & Filter Bar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mr-2">
              Filter Platform:
            </span>
            {platforms.map(({ id, name, count }) => {
              const active = selectedPlatform.toLowerCase() === id.toLowerCase();
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSelectPlatform(id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "border-cyan-500 bg-cyan-500/20 text-white shadow-sm shadow-cyan-500/20"
                      : count > 0
                        ? "border-white/10 bg-white/[0.03] text-neutral-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                        : "border-white/5 bg-white/[0.01] text-neutral-500 hover:border-white/10 hover:text-neutral-300"
                  }`}
                >
                  <span>{name}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      active
                        ? "bg-cyan-500 text-black"
                        : count > 0
                          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                          : "bg-white/5 text-neutral-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[220px] max-w-xs flex-1">
            <input
              type="text"
              placeholder="Search title or link..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => handleSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs"
              >
                ✕
              </button>
            ) : null}
          </div>
        </div>

        {/* Count & Page Size Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400">
          <div>
            Showing <strong className="text-white">{startRecord}</strong> -{" "}
            <strong className="text-white">{endRecord}</strong> of{" "}
            <strong className="text-cyan-400">{filteredItems.length}</strong> conversions
            {selectedPlatform !== "ALL" && (
              <span>
                {" "}
                (Filtered by{" "}
                <strong className="text-white">
                  {platforms.find((p) => p.id.toLowerCase() === selectedPlatform.toLowerCase())?.name ??
                    selectedPlatform}
                </strong>
                )
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span>Items per page:</span>
            {[5, 10, 20, 50].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => handlePageSizeChange(size)}
                className={`rounded px-2 py-0.5 text-xs transition ${
                  pageSize === size
                    ? "bg-cyan-500 text-black font-bold"
                    : "bg-white/5 text-neutral-400 hover:text-white"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conversion Feed List */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center text-sm text-neutral-400">
          <p className="font-semibold text-white">No conversion records match this platform or query.</p>
          <p className="mt-1 text-xs text-neutral-500">
            {selectedPlatform !== "ALL"
              ? `No ${selectedPlatform} conversions recorded yet.`
              : "Try adjusting your search filters or download a video/photo."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {paginatedItems.map((item, idx) => (
            <div
              key={item.id || `${item.originalUrl}-${idx}`}
              className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-cyan-500/40 hover:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3.5">
                {item.cloudinaryThumbnailUrl ? (
                  <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black">
                    <Image
                      src={item.cloudinaryThumbnailUrl}
                      alt=""
                      fill
                      unoptimized
                      referrerPolicy="no-referrer"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="grid h-16 w-24 shrink-0 place-items-center rounded-lg border border-white/10 bg-neutral-900 text-[11px] text-neutral-500 font-mono">
                    No Preview
                  </div>
                )}
                <div className="min-w-0 space-y-1">
                  <div className="truncate text-sm font-semibold text-white max-w-[420px]">
                    {item.title || "Untitled Media"}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 font-mono">
                    <span className="rounded bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 text-[11px] font-semibold text-cyan-300">
                      {item.platform}
                    </span>
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-white">
                      {item.format} · {item.quality}
                    </span>
                    <span>•</span>
                    <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                    <span>•</span>
                    <span className="text-[11px] text-neutral-500">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <a
                    href={item.originalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-[11px] text-neutral-500 hover:text-cyan-400 max-w-[450px]"
                    title={item.originalUrl}
                  >
                    {item.originalUrl}
                  </a>
                </div>
              </div>

              {item.cloudinaryThumbnailUrl && (
                <div className="flex items-center gap-2">
                  <a
                    href={item.cloudinaryThumbnailUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition flex items-center gap-1"
                  >
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    Cloudinary Asset ↗
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination Navigation Controls */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs">
          <div className="text-neutral-400">
            Page <strong className="text-white">{safeCurrentPage}</strong> of{" "}
            <strong className="text-white">{totalPages}</strong>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-medium text-white transition hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                // Show first, last, and window around current
                return (
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - safeCurrentPage) <= 2
                );
              })
              .map((page, index, array) => {
                const prev = array[index - 1];
                const showEllipsis = prev && page - prev > 1;

                return (
                  <span key={page} className="flex items-center gap-1.5">
                    {showEllipsis && <span className="text-neutral-600 px-1">...</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[28px] rounded-lg border px-2 py-1 text-center font-medium transition ${
                        safeCurrentPage === page
                          ? "border-cyan-500 bg-cyan-500 text-black font-bold"
                          : "border-white/10 bg-white/5 text-neutral-300 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {page}
                    </button>
                  </span>
                );
              })}

            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-medium text-white transition hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
