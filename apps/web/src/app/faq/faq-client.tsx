"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type FAQItem = {
  id: string;
  category: "general" | "formats" | "platforms" | "privacy" | "troubleshooting";
  question: string;
  answer: string;
  tags: string[];
};

export const FAQ_CATEGORIES = [
  { id: "all", label: "All Questions" },
  { id: "general", label: "General & Limits" },
  { id: "formats", label: "MP3 vs MP4" },
  { id: "platforms", label: "Platforms & Beta" },
  { id: "privacy", label: "Privacy & Storage" },
  { id: "troubleshooting", label: "Troubleshooting" },
] as const;

export const FAQ_DATA: FAQItem[] = [
  {
    id: "sites-supported",
    category: "platforms",
    question: "Which platforms and sites does MediaRift support?",
    answer:
      "MediaRift currently supports 11 platforms: YouTube (Videos & Shorts), Instagram (Reels & public posts), TikTok, Facebook (public videos & Reels), X / Twitter, Vimeo, SoundCloud, Reddit, Twitch clips, Dailymotion, and Pinterest video pins. We only process public links that you own or have explicit permission to access.",
    tags: ["youtube", "tiktok", "instagram", "soundcloud", "vimeo", "reddit", "platforms"],
  },
  {
    id: "is-it-free",
    category: "general",
    question: "Is MediaRift free to use?",
    answer:
      "Yes. MediaRift is 100% free to try. Anonymous visitors get a daily quota while we are in beta. We do not require credit cards, trial subscriptions, or sign-ups to convert public media.",
    tags: ["pricing", "cost", "free", "quota", "account", "trial"],
  },
  {
    id: "fake-buttons",
    category: "general",
    question: "Why does MediaRift have no popups or fake download buttons?",
    answer:
      "Most media downloaders monetize via deceptive ad networks, installing unwanted browser extensions or redirecting users through adware loops. MediaRift was engineered as a professional, developer-grade utility: one paste field, one honest convert button, and one direct download.",
    tags: ["ads", "popups", "clean", "safety", "virus", "redirects"],
  },
  {
    id: "mp3-vs-mp4",
    category: "formats",
    question: "What is the difference between MP3 and MP4?",
    answer:
      "MP3 is an audio-only format that discards video to save storage space and bandwidth. It plays universally on all phones, car head units, smart speakers, and offline MP3 players. MP4 contains both high-definition video and synchronized audio, ideal for tutorials, workout reels, and talks.",
    tags: ["mp3", "mp4", "audio", "video", "sound", "difference"],
  },
  {
    id: "audio-bitrates",
    category: "formats",
    question: "Which audio bitrate should I choose (128, 192, or 320 kbps)?",
    answer:
      "192 kbps is our recommended default because it strikes the perfect balance between high acoustic clarity and compact file weight (~7MB per 5-minute song). 128 kbps is best for voice lectures and podcasts. 320 kbps is the audiophile maximum for deep bass, studio instrumentation, and DJ mixes.",
    tags: ["bitrate", "128", "192", "320", "kbps", "quality", "music"],
  },
  {
    id: "can-i-download-4k",
    category: "formats",
    question: "Can I download videos in 4K resolution?",
    answer:
      "Yes, provided the original video was filmed and published in 4K (2160p) and the host platform exposes the 4K stream (such as YouTube and Vimeo). MediaRift never synthesizes fake 4K pixels—we inspect the source manifest and offer authentic heights up to 2160p.",
    tags: ["4k", "resolution", "1080p", "uhd", "video quality", "upscale"],
  },
  {
    id: "what-is-m4a",
    category: "formats",
    question: "What is the M4A Fast Audio option?",
    answer:
      "M4A downloads the raw AAC audio stream directly from the platform CDN without converting it through ffmpeg. This bypasses the processing queue for instant downloads with zero acoustic generational loss.",
    tags: ["m4a", "aac", "fast audio", "instant stream", "direct"],
  },
  {
    id: "beta-status",
    category: "platforms",
    question: "Why are platforms like TikTok and Instagram marked Beta?",
    answer:
      "Social media sites frequently alter their internal HTML layouts, stream authentication tokens, and bot defenses. Our automated monitors test and patch scrapers continually. If an extraction stumbles on a beta site, retry the link or choose original quality.",
    tags: ["beta", "error", "tiktok", "instagram", "status", "stability"],
  },
  {
    id: "private-accounts",
    category: "platforms",
    question: "Can I download from private accounts or login-walled posts?",
    answer:
      "No. MediaRift strictly operates on publicly available media. We do not accept user credentials, bypass Instagram 'Close Friends' gates, or extract member-only Patreon/YouTube content.",
    tags: ["private", "login", "password", "drm", "paywall", "subscribers"],
  },
  {
    id: "retention-policy",
    category: "privacy",
    question: "How long do download links and files last?",
    answer:
      "All generated media files are kept in temporary storage for exactly six hours. After six hours, the media file is permanently deleted from disk and the download link expires. Be sure to save your converted file to your local device immediately.",
    tags: ["retention", "expiry", "6 hours", "storage", "delete", "temp"],
  },
  {
    id: "history-privacy",
    category: "privacy",
    question: "Where is my conversion history stored?",
    answer:
      "Your conversion history is stored 100% locally on your own device using browser localStorage. We do not track your downloads into a centralized user profile or share your links with third parties.",
    tags: ["history", "localstorage", "privacy", "tracking", "cookies"],
  },
  {
    id: "error-invalid-url",
    category: "troubleshooting",
    question: "Why am I seeing 'That link is not supported'?",
    answer:
      "Ensure you copied the entire URL including https://. Also make sure the domain is on our supported platform list. Links to search pages, channel homepages, or playlists are not supported—paste the direct video or track post URL.",
    tags: ["error", "invalid url", "fail", "not supported", "troubleshoot"],
  },
  {
    id: "download-blocked",
    category: "troubleshooting",
    question: "My browser blocked the automatic download. What should I do?",
    answer:
      "Some mobile browsers or aggressive pop-up blockers restrict automated file downloads. In your conversion card or in the History panel, click the 'Download again' or 'Copy download link' button to trigger the save directly.",
    tags: ["download blocked", "browser", "safari", "chrome", "mobile save"],
  },
  {
    id: "audio-video-sync",
    category: "troubleshooting",
    question: "Are audio and video properly synced in 1080p MP4 files?",
    answer:
      "Yes. Unlike naive downloaders that grab separate video-only streams (resulting in silent 1080p video), MediaRift seamlessly multiplexes the best available video track and audio track into a single universally compatible H.264/AAC MP4 container.",
    tags: ["sync", "audio video sync", "no sound", "silent video", "1080p"],
  },
];

export function FAQClient() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [query, setQuery] = useState("");

  const filteredFaqs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQ_DATA.filter((item) => {
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.tags.some((t) => t.includes(q))
      );
    });
  }, [selectedCategory, query]);

  return (
    <div>
      {/* Search and Category Filters */}
      <div className="mx-auto max-w-2xl">
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mist/60">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
              <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions (e.g. 4K, 320 kbps, TikTok, 6 hours, privacy)..."
            className="w-full rounded-2xl border border-line bg-ink py-3.5 pl-12 pr-10 text-sm text-white placeholder:text-mist/50 focus:border-wave focus:outline-none focus:ring-2 focus:ring-wave/20"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-mist/70 hover:text-white"
            >
              Clear
            </button>
          ) : null}
        </div>

        {/* Category Pills */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          {FAQ_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border border-wave/40 bg-wave/15 text-wave shadow-sm shadow-wave/10"
                    : "border border-line/70 bg-ink-soft/80 text-mist hover:border-wave/30 hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Questions list */}
      <div className="mx-auto mt-10 max-w-4xl space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="rounded-2xl border border-line bg-ink-soft/40 py-16 text-center">
            <p className="text-base font-semibold text-white">No questions matched your search.</p>
            <p className="mt-1 text-xs text-mist">
              Try searching for &quot;bitrate&quot;, &quot;MP3&quot;, &quot;TikTok&quot;, or click &quot;All Questions&quot;.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedCategory("all");
              }}
              className="mt-4 rounded-xl border border-wave/30 bg-wave/10 px-4 py-2 text-xs font-semibold text-wave transition hover:bg-wave hover:text-ink"
            >
              Reset filters
            </button>
          </div>
        ) : (
          filteredFaqs.map((faq) => (
            <details
              key={faq.id}
              className="group rounded-2xl border border-line bg-ink-soft/50 p-5 transition hover:border-wave/40"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-white marker:hidden [&::-webkit-details-marker]:hidden">
                <span>{faq.question}</span>
                <span className="grid size-6 shrink-0 place-items-center rounded-md border border-line text-mist transition group-open:rotate-45 group-open:border-wave/50 group-open:text-wave">
                  +
                </span>
              </summary>
              <div className="mt-3.5 border-t border-line/60 pt-3 text-sm leading-relaxed text-mist">
                <p>{faq.answer}</p>
                <div className="mt-3 flex flex-wrap gap-1.5 pt-1">
                  {faq.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-white/5 px-2 py-0.5 font-mono text-[10px] text-mist/60"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </details>
          ))
        )}
      </div>

      {/* Still have questions card */}
      <div className="mx-auto mt-12 max-w-4xl rounded-2xl border border-line/80 bg-ink-soft/60 p-6 text-center sm:p-8">
        <h3 className="text-lg font-semibold text-white">Still have a question?</h3>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-mist">
          If you encountered a broken link on a supported platform or have a copyright inquiry, check our legal policies or convert your link directly.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs">
          <Link
            href="/platforms"
            className="rounded-xl border border-line bg-ink px-4 py-2.5 font-medium text-white transition hover:border-wave/40 hover:text-wave"
          >
            Check Platform Status
          </Link>
          <Link
            href="/dmca"
            className="rounded-xl border border-line bg-ink px-4 py-2.5 font-medium text-mist transition hover:border-white/30 hover:text-white"
          >
            DMCA & Copyright
          </Link>
          <Link
            href="/"
            className="rounded-xl bg-wave px-5 py-2.5 font-bold text-ink transition hover:bg-wave-deep"
          >
            Open Converter →
          </Link>
        </div>
      </div>
    </div>
  );
}
