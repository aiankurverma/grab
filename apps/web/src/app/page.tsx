import Link from "next/link";
import type { CSSProperties } from "react";

import { ConvertForm } from "@/components/landing/convert-form";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { GridSpotlight } from "@/components/ui/grid-spotlight";
import { TerrainWave } from "@/components/ui/terrain-wave";
import { PlatformMark } from "@/components/ui/platform-mark";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  PLATFORM_LIST,
  platformCapability,
  type PlatformMeta,
} from "@/lib/platforms";

const features = [
  {
    number: "01",
    title: "No fake buttons",
    body: "One paste field, one convert button, one real download. No pop-ups, redirects, or invented download links.",
  },
  {
    number: "02",
    title: "Private by default",
    body: "Files are temporary. Your download link expires after six hours and the media is removed from storage.",
  },
  {
    number: "03",
    title: "Public links only",
    body: "We support public posts and videos. Private accounts, DRM, live streams, and login-walled content stay off-limits.",
  },
  {
    number: "04",
    title: "Honest about limits",
    body: "Each platform tells you its formats and maximum quality before you convert. No surprise file sizes.",
  },
];

const steps = [
  {
    title: "Copy a link",
    body: "Copy the public link from YouTube, TikTok, Instagram, X, SoundCloud, or any supported site.",
  },
  {
    title: "Paste and choose",
    body: "We detect the platform and show the formats and quality that source can actually provide.",
  },
  {
    title: "Download clean",
    body: "Track progress live, then save your private file before the six-hour link expires.",
  },
];

const useCases = [
  ["Music", "Keep a track for offline listening without carrying the whole app."],
  ["Study", "Save lectures, explainers, and tutorials for the commute or a dead-zone flight."],
  ["Reference", "Collect a clip, reel, or talk for a project while the source is still available."],
  ["Archive", "Download media you own or have explicit permission to keep."],
];

const faqs = [
  [
    "Which sites are supported?",
    "YouTube, Instagram, TikTok, Facebook, X / Twitter, Vimeo, SoundCloud, Reddit, Twitch clips, Dailymotion, and Pinterest video pins. Public content only.",
  ],
  [
    "What is the difference between MP3 and MP4?",
    "MP3 is audio only, ideal for music, podcasts, and lectures. MP4 keeps video and sound for tutorials, reels, workouts, and talks.",
  ],
  [
    "Can I download in 4K?",
    "Only when the source offers 4K and the platform supports it. MediaRift caps each platform at a realistic maximum and shows the source cap before conversion.",
  ],
  [
    "Why are some platforms marked beta?",
    "Those sites change often. Extraction can occasionally fail or return a lower quality than expected. If a link fails, try again or use the original source quality.",
  ],
  [
    "Is it free?",
    "Yes. Anonymous visitors get 2 conversions a day while we are in beta. Accounts with more daily conversions are planned.",
  ],
  [
    "How long do downloads last?",
    "Download links expire after six hours and files are deleted from storage. Save the file you need right away.",
  ],
  [
    "Can I convert private content?",
    "No. Private accounts, login-walled posts, paid content, live streams, and DRM-protected media are not supported.",
  ],
  [
    "Do you keep my links?",
    "We keep the job record needed to show progress and status. Media is temporary. Browser history is stored locally on your device.",
  ],
];

function formatList(platform: PlatformMeta): string {
  return platform.formats.map((item) => item.toUpperCase()).join(" · ");
}

function HeroRail() {
  const items = [...PLATFORM_LIST, ...PLATFORM_LIST];
  return (
    <div className="platform-rail mx-auto mt-8 w-full max-w-3xl">
      <div className="platform-track gap-2 pr-2">
        {items.map((platform, index) => (
          <Link
            key={`${platform.id}-${index}`}
            href={`/platforms#${platform.id.toLowerCase()}`}
            aria-hidden={index >= PLATFORM_LIST.length}
            tabIndex={index >= PLATFORM_LIST.length ? -1 : undefined}
            className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2 text-xs font-medium text-white/75 transition hover:border-wave/40 hover:text-white"
          >
            <PlatformMark platform={platform.id} size="sm" className="size-6 rounded-md text-[8px]" />
            {platform.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main id="top" className="relative overflow-hidden">
      <SiteHeader />

      <GridSpotlight className="absolute inset-x-0 top-0 h-[860px]" />
      <TerrainWave className="pointer-events-none absolute inset-x-0 top-[300px] sm:top-[340px] h-[520px] opacity-55" />
      <div className="glow-orb left-[8%] top-24 size-56 bg-wave/10" />
      <div className="glow-orb right-[6%] top-44 size-64 bg-grab/5" />

      <section className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-mist backdrop-blur">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-grab/60" />
              <span className="relative inline-flex size-2 rounded-full bg-grab" />
            </span>
            11 platforms · Public links · Free in beta
          </p>
          <h1
            className="animate-fade-up mt-6 text-balance text-[2.7rem] font-semibold leading-[0.98] tracking-[-0.045em] text-white sm:text-6xl lg:text-[4.4rem]"
            style={{ "--delay": "70ms" } as CSSProperties}
          >
            One link in.
            <br />
            <span className="text-gradient">A clean file out.</span>
          </h1>
          <p
            className="animate-fade-up mx-auto mt-5 max-w-xl text-pretty text-[15px] leading-relaxed text-mist sm:text-lg"
            style={{ "--delay": "140ms" } as CSSProperties}
          >
            Turn public videos and tracks into MP3 or MP4. Platform-aware quality, live progress,
            no apps, and no fake download buttons.
          </p>
        </div>

        <div
          className="animate-fade-up mx-auto mt-8 max-w-3xl"
          style={{ "--delay": "210ms" } as CSSProperties}
        >
          <ConvertForm />
        </div>

        <HeroRail />

        <div className="mx-auto mt-7 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-[13px] text-mist/75">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1 rounded-full bg-grab" />
            No account to try
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1 rounded-full bg-grab" />
            Links expire in 6 hours
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1 rounded-full bg-grab" />
            No install
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1 rounded-full bg-grab" />
            Works on mobile
          </span>
        </div>
      </section>

      <section id="platforms" className="relative mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6">
        <SectionHeading
          eyebrow="Supported platforms"
          title="The links you already use."
          body="Platform-aware support means you see the real formats and quality before you convert. Beta labels mark sites that change more often."
          action={
            <Link
              href="/platforms"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-wave/40 hover:bg-wave/10"
            >
              Full support matrix <span aria-hidden="true">→</span>
            </Link>
          }
        />

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORM_LIST.map((platform) => (
            <Link
              key={platform.id}
              id={platform.id.toLowerCase()}
              href={`/platforms#${platform.id.toLowerCase()}`}
              className="hover-lift glass-card group scroll-mt-24 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <PlatformMark platform={platform.id} />
                  <div>
                    <p className="text-base font-semibold text-white">{platform.label}</p>
                    <p className="mt-1 text-xs text-mist/70">{formatList(platform)}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    platform.beta
                      ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
                      : "border-grab/20 bg-grab/10 text-grab"
                  }`}
                >
                  {platform.beta ? "Beta" : "Stable"}
                </span>
              </div>
              <p className="mt-3.5 min-h-10 text-sm leading-relaxed text-mist">{platform.note}</p>
              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3.5 text-xs text-mist/70">
                <span>{platformCapability(platform)}</span>
                <span className="transition group-hover:text-wave">View details →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section id="formats" className="relative scroll-mt-24 border-y border-line bg-ink-soft/30">
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <SectionHeading
            eyebrow="Pick what you need"
            title="MP3 or MP4? Start with the job."
            body="You do not need to know anything about codecs. Choose based on what you want to do with the file."
            action={
              <Link
                href="/formats"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:border-wave/40 hover:bg-wave/10"
              >
                Deep format guide <span aria-hidden="true">→</span>
              </Link>
            }
          />

          <div className="mt-9 grid gap-4 lg:grid-cols-2">
            <article className="hover-lift glass-card relative overflow-hidden rounded-3xl p-6 sm:p-7">
              <div className="absolute right-6 top-6 flex h-12 items-end gap-1 opacity-60">
                {[0, 1, 2, 3, 4].map((bar) => (
                  <span
                    key={bar}
                    className="wave-bar w-1.5 rounded-full bg-wave"
                    style={{
                      height: `${18 + bar * 6}px`,
                      animationDelay: `${bar * 110}ms`,
                    }}
                  />
                ))}
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-wave">MP3</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">Just the sound.</h3>
              <p className="mt-3.5 max-w-md text-[15px] leading-relaxed text-mist">
                Smaller files that play in every music app, phone, and car. Best for music,
                podcasts, lectures, and anything you only need to hear.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {["Music", "Podcasts", "Lectures", "Audio"].map((item) => (
                  <span
                    key={item}
                    className="rounded-md border border-line bg-ink px-2.5 py-1.5 text-xs text-mist"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <p className="mt-5 border-t border-line pt-4 text-[13px] leading-relaxed text-mist/80">
                Choose 128, 192, or 320 kbps. 192 kbps is a safe everyday default.
              </p>
            </article>

            <article className="hover-lift glass-card relative overflow-hidden rounded-3xl p-6 sm:p-7">
              <div className="absolute right-6 top-6 grid size-12 place-items-center rounded-xl border border-grab/20 bg-grab/10 text-grab">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.7" />
                  <path d="m10 9 5 3-5 3V9Z" fill="currentColor" />
                </svg>
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-grab">MP4</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                The picture, too.
              </h3>
              <p className="mt-3.5 max-w-md text-[15px] leading-relaxed text-mist">
                Keep the visuals for tutorials, workouts, reels, talks, or offline watching. Choose
                a quality the source actually offers.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {["Tutorials", "Reels", "Workouts", "Talks"].map((item) => (
                  <span
                    key={item}
                    className="rounded-md border border-line bg-ink px-2.5 py-1.5 text-xs text-mist"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <p className="mt-5 border-t border-line pt-4 text-[13px] leading-relaxed text-mist/80">
                From 240p up to 4K where available. 720p is balanced; 1080p is sharp.
              </p>
            </article>
          </div>

          <p className="mx-auto mt-5 max-w-2xl rounded-2xl border border-wave/20 bg-wave/5 px-4 py-3 text-center text-sm leading-relaxed text-mist">
            <span className="font-semibold text-wave">Quick rule:</span> only want to listen? Pick
            MP3. Want to watch or keep the visuals? Pick MP4.
          </p>
        </div>
      </section>

      <section id="how" className="relative mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6">
        <SectionHeading
          eyebrow="How it works"
          title="Three steps. No tutorial needed."
          body="The converter reads the link first, so you always know what the source can provide before a job starts."
          action={
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:border-wave/40 hover:bg-wave/10"
            >
              See detailed guide <span aria-hidden="true">→</span>
            </Link>
          }
        />
        <div className="relative mt-9 grid gap-4 sm:grid-cols-3">
          <div
            aria-hidden="true"
            className="absolute left-[16%] right-[16%] top-8 hidden h-px bg-gradient-to-r from-transparent via-wave/30 to-transparent sm:block"
          />
          {steps.map((step, index) => (
            <div key={step.title} className="relative glass-card rounded-2xl p-6 text-center">
              <span className="mx-auto grid size-10 place-items-center rounded-xl border border-wave/25 bg-wave/10 font-mono text-sm font-bold text-wave">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 text-base font-semibold text-white">{step.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-mist">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <div className="glass-card overflow-hidden rounded-3xl">
          <div className="grid lg:grid-cols-[1.15fr_1fr]">
            <div className="border-b border-line p-6 sm:p-8 lg:border-b-0 lg:border-r">
              <SectionHeading
                eyebrow="Why MediaRift"
                title="Built like a tool, not a trap."
                body="Downloading a public link should not require guessing which button is real."
                align="left"
              />
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {features.map((feature) => (
                  <div key={feature.number} className="rounded-xl border border-line/70 bg-ink/50 p-4">
                    <p className="font-mono text-[11px] text-wave">{feature.number}</p>
                    <h3 className="mt-2 text-base font-semibold text-white">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-mist">{feature.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex flex-col justify-center p-6 sm:p-8">
              <div className="glow-orb right-0 top-1/3 size-40 bg-grab/10" />
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-grab">Made for</p>
              <div className="mt-5 space-y-3">
                {useCases.map(([title, body]) => (
                  <div key={title} className="flex gap-3 rounded-xl border border-line/60 bg-ink/40 p-3.5">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-grab" />
                    <div>
                       <p className="text-[15px] font-medium text-white">{title}</p>
                       <p className="mt-1 text-xs leading-relaxed text-mist">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-5 rounded-xl border border-amber-400/15 bg-amber-400/5 px-4 py-3.5 text-xs leading-relaxed text-amber-100/85">
                MediaRift does not grant rights to content you do not own. Respect creators and the
                terms of the source platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="relative mx-auto w-full max-w-4xl scroll-mt-24 px-4 pb-16 sm:px-6">
        <SectionHeading
          eyebrow="Questions"
          title="Straight answers."
          body="Limits, formats, privacy, and what happens when a platform changes."
          action={
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:border-wave/40 hover:bg-wave/10"
            >
              All FAQ questions <span aria-hidden="true">→</span>
            </Link>
          }
        />
        <div className="mt-8 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-ink-soft/40">
          {faqs.map(([question, answer]) => (
            <details key={question} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-medium text-white marker:hidden [&::-webkit-details-marker]:hidden">
                {question}
                <span
                  aria-hidden="true"
                  className="grid size-6 shrink-0 place-items-center rounded-md border border-line text-mist transition group-open:rotate-45 group-open:border-wave/40 group-open:text-wave"
                >
                  +
                </span>
              </summary>
              <p className="px-5 pb-4 text-[15px] leading-relaxed text-mist">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-wave/20 bg-gradient-to-br from-wave/10 via-ink-soft/70 to-grab/5 p-7 text-center sm:p-12">
          <div className="wave-grid pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-wave">
              Ready when you are
            </p>
            <h2 className="mx-auto mt-3 max-w-2xl text-balance text-2xl font-semibold tracking-tight text-white sm:text-4xl">
              Have a link? It takes one paste.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-mist">
              No account needed to try. No install, no redirect maze, no mystery buttons.
            </p>
            <Link
              href="#top"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-wave px-7 py-3.5 text-[15px] font-bold text-ink shadow-lg shadow-wave/20 transition hover:bg-wave-deep"
            >
              Convert a link <span aria-hidden="true">↑</span>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />

      <Link
        href="#top"
        className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-full border border-wave/30 bg-ink-soft/90 px-4 py-3 text-sm font-semibold text-wave shadow-xl shadow-black/40 backdrop-blur-lg sm:hidden safe-bottom"
      >
        Convert a link ↑
      </Link>
    </main>
  );
}
