"use client";

import { useEffect, useState } from "react";

const ALL_PLATFORMS = [
  { id: "PINTEREST", label: "Pinterest", color: "text-red-400" },
  { id: "YOUTUBE", label: "YouTube", color: "text-red-400" },
  { id: "INSTAGRAM", label: "Instagram", color: "text-pink-400" },
  { id: "TIKTOK", label: "TikTok", color: "text-cyan-400" },
  { id: "FACEBOOK", label: "Facebook", color: "text-blue-400" },
  { id: "SOUNDCLOUD", label: "SoundCloud", color: "text-orange-400" },
  { id: "X", label: "X / Twitter", color: "text-neutral-300" },
  { id: "REDDIT", label: "Reddit", color: "text-orange-500" },
  { id: "TWITCH", label: "Twitch", color: "text-purple-400" },
  { id: "VIMEO", label: "Vimeo", color: "text-sky-400" },
  { id: "DAILYMOTION", label: "Dailymotion", color: "text-blue-400" },
] as const;

interface AdminMasterSwitchesProps {
  adminKey: string;
  initialDisabledPlatforms: string[];
  initialAiEnabled: boolean;
}

export function AdminMasterSwitches({
  adminKey,
  initialDisabledPlatforms,
  initialAiEnabled,
}: AdminMasterSwitchesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [disabledPlatforms, setDisabledPlatforms] = useState<string[]>(initialDisabledPlatforms);
  const [aiEnabled, setAiEnabled] = useState<boolean>(initialAiEnabled);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Load and sync latest state on mount
  useEffect(() => {
    async function fetchLatest() {
      try {
        const res = await fetch(`/api/admin/controls?key=${encodeURIComponent(adminKey)}`);
        if (res.ok) {
          const data = (await res.json()) as { disabledPlatforms?: string[]; aiEnabled?: boolean };
          if (Array.isArray(data.disabledPlatforms)) {
            setDisabledPlatforms(data.disabledPlatforms);
          }
          if (typeof data.aiEnabled === "boolean") {
            setAiEnabled(data.aiEnabled);
          }
        }
      } catch {
        // ignore
      }
    }
    fetchLatest();
  }, [adminKey]);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  async function updateControls(nextDisabled: string[], nextAi: boolean, changeDesc: string) {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/controls?key=${encodeURIComponent(adminKey)}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({
          disabledPlatforms: nextDisabled,
          aiEnabled: nextAi,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save controls");
      }

      const result = (await response.json().catch(() => null)) as {
        controls?: { disabledPlatforms?: string[]; aiEnabled?: boolean };
      } | null;

      if (result?.controls) {
        setDisabledPlatforms(result.controls.disabledPlatforms || []);
        setAiEnabled(
          typeof result.controls.aiEnabled === "boolean" ? result.controls.aiEnabled : true,
        );
      } else {
        setDisabledPlatforms(nextDisabled);
        setAiEnabled(nextAi);
      }
      showToast(changeDesc);
    } catch {
      showToast("❌ Error saving change. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function togglePlatform(platformId: string) {
    const isCurrentlyDisabled = disabledPlatforms.includes(platformId);
    const next = isCurrentlyDisabled
      ? disabledPlatforms.filter((p) => p !== platformId)
      : [...disabledPlatforms, platformId];

    const label = ALL_PLATFORMS.find((p) => p.id === platformId)?.label || platformId;
    const desc = isCurrentlyDisabled
      ? `✅ Reopened ${label}`
      : `⏸️ Closed ${label}`;

    updateControls(next, aiEnabled, desc);
  }

  function toggleAi() {
    const nextAi = !aiEnabled;
    const desc = nextAi
      ? "⚡ Mercury-3 AI Resumed"
      : "🛑 Mercury-3 AI Paused";

    updateControls(disabledPlatforms, nextAi, desc);
  }

  return (
    <>
      {/* 3-Lines Standard Hamburger Button on Left */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group relative flex items-center justify-center size-10 rounded-xl border border-white/10 bg-white/[0.04] text-white transition hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-300 focus:outline-none"
        title="Open System Controls Menu (3 Lines)"
        aria-label="Open System Controls Menu"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          className="transition-transform group-hover:scale-110"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>

        {/* Small live indicator dot */}
        <span
          className={`absolute -top-1 -right-1 size-2.5 rounded-full border-2 border-[#070b12] ${
            disabledPlatforms.length > 0 ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
          }`}
        />
      </button>

      {/* Slide-over Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Left-Side Slide-Over Sidebar Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-full max-w-sm sm:max-w-md bg-[#0b0f19] border-r border-white/10 p-6 shadow-2xl transition-transform duration-300 ease-out flex flex-col justify-between ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-6 overflow-y-auto pr-1">
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="size-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">System Control Panel</h2>
                <p className="text-[11px] text-neutral-400">Live platform & AI master switches</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>

          {/* Toast Message */}
          {toastMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/80 p-2.5 text-xs font-semibold text-cyan-200 animate-fade-up">
              <span className="size-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="truncate">{toastMessage}</span>
            </div>
          )}

          {/* AI Master Engine Card */}
          <div className="rounded-xl border border-white/10 bg-black/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Mercury-3 AI Engine</span>
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                  aiEnabled ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${aiEnabled ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}
                />
                {aiEnabled ? "Active & Live" : "Paused"}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-snug">
              Enriches conversion pages with clean neutral metadata and summaries via Inception Labs.
            </p>
            <button
              type="button"
              disabled={saving}
              onClick={toggleAi}
              className={`w-full rounded-lg py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                aiEnabled
                  ? "bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25"
                  : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25"
              }`}
            >
              {aiEnabled ? "Pause AI Enrichment" : "Resume AI Enrichment"}
            </button>
          </div>

          {/* Platform Kill-switches List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">Platform Availability</span>
              <span className="font-mono text-[11px] text-neutral-400">
                {11 - disabledPlatforms.length}/11 Open
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Instantly open or close platforms undergoing 3rd-party outages:
            </p>

            <div className="space-y-2">
              {ALL_PLATFORMS.map(({ id, label, color }) => {
                const isClosed = disabledPlatforms.includes(id);
                return (
                  <div
                    key={id}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs transition ${
                      isClosed
                        ? "border-amber-500/30 bg-amber-950/20"
                        : "border-white/5 bg-black/30 hover:border-white/15"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`size-1.5 rounded-full shrink-0 ${
                          isClosed ? "bg-amber-400" : "bg-emerald-400"
                        }`}
                      />
                      <span className={`font-semibold ${color}`}>{label}</span>
                    </div>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => togglePlatform(id)}
                      className={`shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${
                        isClosed
                          ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                          : "border-white/10 bg-white/5 text-neutral-400 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-300"
                      }`}
                    >
                      {isClosed ? "Open" : "Close"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-500">
          <span>Grabwave Admin Panel</span>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-neutral-400 hover:text-white"
          >
            Close [Esc]
          </button>
        </div>
      </div>
    </>
  );
}
