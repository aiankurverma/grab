import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { PlatformMark } from "@/components/ui/platform-mark";
import { SectionHeading } from "@/components/ui/section-heading";
import { PLATFORM_LIST, platformCapability } from "@/lib/platforms";

export const metadata: Metadata = {
  title: "Supported Platforms · 11 Sites Compatibility Matrix",
  description:
    "The full MediaRift support matrix: YouTube, Instagram, TikTok, Facebook, X, Vimeo, SoundCloud, Reddit, Twitch clips, Dailymotion, and Pinterest.",
  alternates: { canonical: "/platforms" },
  openGraph: {
    title: "MediaRift Supported Platforms Matrix",
    description: "Formats and quality capabilities across YouTube, TikTok, Instagram, and 8 more sites.",
    url: "/platforms",
    type: "website",
  },
};

const notSupported = [
  "Private accounts and login-walled posts",
  "Live streams and premieres",
  "DRM-protected or paid content",
  "Playlists that require a signed-in session",
  "Media you do not own or have permission to use",
];

export default function PlatformsPage() {
  return (
    <main className="relative overflow-hidden">
      <SiteHeader />
      <div className="wave-grid pointer-events-none absolute inset-x-0 top-0 h-[520px]" />
      <div className="glow-orb left-[12%] top-28 size-52 bg-wave/10" />

      <section className="relative mx-auto w-full max-w-6xl px-4 pb-12 pt-12 sm:px-6 sm:pt-16">
        <SectionHeading
          eyebrow="Support matrix"
          title="What MediaRift can read."
          body="Support depends on the public source, not on a promise. Each platform lists the formats and maximum quality we target, plus its stability status."
        />
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px]">
          <span className="rounded-full border border-grab/20 bg-grab/10 px-3 py-1.5 text-grab">
            Stable · tested regularly
          </span>
          <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-amber-200">
            Beta · source changes often
          </span>
          <span className="rounded-full border border-line bg-ink px-3 py-1.5 text-mist">
            Public links only
          </span>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-line bg-ink-soft/50">
          <div className="hidden grid-cols-[1.5fr_0.8fr_0.8fr_0.7fr_auto] gap-4 border-b border-line px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-mist/60 sm:grid">
            <span>Platform</span>
            <span>Formats</span>
            <span>Max quality</span>
            <span>Status</span>
            <span className="text-right">Action</span>
          </div>

          {PLATFORM_LIST.map((platform) => (
            <div
              key={platform.id}
              id={platform.id.toLowerCase()}
              className="scroll-mt-24 border-b border-line/70 px-4 py-4 transition last:border-b-0 hover:bg-white/[0.02] sm:grid sm:grid-cols-[1.5fr_0.8fr_0.8fr_0.7fr_auto] sm:items-center sm:gap-4 sm:px-5"
            >
              <div className="flex items-center gap-3">
                <PlatformMark platform={platform.id} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{platform.label}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-mist sm:hidden">
                    {platform.formats.map((item) => item.toUpperCase()).join(" · ")} ·{" "}
                    {platformCapability(platform)}
                  </p>
                  <p className="mt-0.5 hidden max-w-xs text-[11px] leading-relaxed text-mist sm:block">
                    {platform.note}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 sm:mt-0">
                {platform.formats.map((format) => (
                  <span
                    key={format}
                    className="rounded-md border border-line bg-ink px-2 py-1 text-[10px] font-semibold uppercase text-white/80"
                  >
                    {format}
                  </span>
                ))}
              </div>

              <p className="mt-2 text-[11px] text-mist sm:mt-0">{platformCapability(platform)}</p>

              <div className="mt-2 sm:mt-0">
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    platform.beta
                      ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
                      : "border-grab/20 bg-grab/10 text-grab"
                  }`}
                >
                  {platform.beta ? "Beta" : "Stable"}
                </span>
              </div>

              <div className="mt-3 sm:mt-0 sm:text-right">
                <Link
                  href="/"
                  className="inline-flex rounded-lg border border-line bg-ink px-3 py-2 text-[11px] font-semibold text-mist transition hover:border-wave/40 hover:text-white"
                >
                  Try a {platform.label} link
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative border-y border-line bg-ink-soft/30">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-wave">
              Out of scope
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              What we do not support.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-mist">
              Staying inside these lines keeps the tool predictable and keeps us out of private
              content, DRM, and live-stream edge cases.
            </p>
          </div>
          <ul className="space-y-2.5">
            {notSupported.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-xl border border-line/70 bg-ink/50 px-4 py-3 text-sm text-mist"
              >
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-red-400/70" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Your platform is on the list?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-mist">
          Paste the public link. MediaRift will show the formats and quality that link can actually
          provide before you start.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl bg-wave px-6 py-3 text-sm font-bold text-ink transition hover:bg-wave-deep"
        >
          Convert a link
        </Link>
      </section>

      <SiteFooter />
    </main>
  );
}
