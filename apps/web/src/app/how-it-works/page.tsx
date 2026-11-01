import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SectionHeading } from "@/components/ui/section-heading";

export const metadata: Metadata = {
  title: "How It Works · 3 Steps to Clean Media",
  description:
    "Learn how MediaRift transforms public video and track links into clean MP3 and MP4 files. Read about our probe engine, instant extraction, and 6-hour privacy guarantee.",
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    title: "How MediaRift Works — Clean 3-Step Media Conversion",
    description:
      "No fake buttons, no shady redirects. See how MediaRift detects sources, extracts streams, and delivers temporary private files.",
    url: "/how-it-works",
    type: "website",
  },
};

const pipelineSteps = [
  {
    step: "01",
    title: "Paste & Platform Detection",
    tagline: "Link verification in milliseconds",
    summary:
      "Paste any public link. Our parser immediately checks the domain against 11 supported platforms, strips tracking tags, and validates source accessibility.",
    details: [
      "Strips affiliate & tracking query parameters",
      "Validates against 11 supported platform drivers",
      "Rejects login walls, live streams, and DRM immediately",
      "Keyboard-friendly: Press '/' or 'Ctrl+K' anytime",
    ],
  },
  {
    step: "02",
    title: "Server Probe & Format Manifest",
    tagline: "Real capabilities before you click convert",
    summary:
      "We query the platform's manifest to inspect authentic video heights (360p–4K) and audio bitrates. No guessing what quality will come out.",
    details: [
      "Inspects available audio tracks & video resolutions",
      "Checks if direct CDN stream qualifies for Instant Download",
      "Displays title, thumbnail, duration & channel author",
      "Caps quality at genuine source limit (no fake upscaling)",
    ],
  },
  {
    step: "03",
    title: "Instant Download or Transcode",
    tagline: "Live progress with automatic 6-hour cleanup",
    summary:
      "Streams that match native codecs download instantly without waiting. Complex resolutions route to our worker engine with live percentage feedback.",
    details: [
      "Instant CDN bypass for matching MP4/M4A video tracks",
      "Server-Sent Events (SSE) live progress for transcoding jobs",
      "Clean file names formatted cleanly as 'Title - Quality.ext'",
      "6-hour hard expiry: files are wiped permanently from storage",
    ],
  },
];

const safetyGuarantees = [
  {
    title: "No fake download buttons",
    desc: "One input field, one convert action, one real download. No hidden redirects, sponsored ads disguised as buttons, or pop-under networks.",
    icon: "✓",
  },
  {
    title: "Private & temporary by design",
    desc: "Your media is stored temporarily. After 6 hours, the file is automatically purged from disk and the download link becomes invalid.",
    icon: "🔒",
  },
  {
    title: "100% browser-local history",
    desc: "Your conversion history never syncs to a centralized user-tracking database. It is stored purely on your current device's localStorage.",
    icon: "⚡",
  },
  {
    title: "Zero install or browser extensions",
    desc: "Everything runs server-side in our high-speed cloud infrastructure. Works equally well on mobile phones, tablets, and desktop browsers.",
    icon: "📱",
  },
];

const technicalFaqs = [
  {
    q: "Why do download links expire after six hours?",
    a: "MediaRift is designed as a temporary transit pipeline, not a cloud locker. Automatically deleting files keeps operating overhead low, prevents stale data leakage, and ensures your converted media stays strictly private.",
  },
  {
    q: "What is the difference between Instant Download and normal Conversion?",
    a: "Instant Download triggers when the source platform hosts an intact video/audio stream matching your chosen resolution (common with TikTok, Instagram Reels, and original M4A audio). It streams directly without re-encoding delays. When merging separate video and audio streams is required (like YouTube 1080p), our converter handles it in the background.",
  },
  {
    q: "Why does MediaRift refuse private accounts or live streams?",
    a: "We only support publicly accessible media that you have permission to download. Private posts, member-only videos, paid content, and live streams require proprietary credentials or continuous stream capture, which MediaRift deliberately does not support.",
  },
  {
    q: "How many conversions do I get each day?",
    a: "During our beta period, anonymous visitors can run conversions freely up to the daily fair-use quota. You can also monitor your recent jobs directly from the conversion history panel.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="relative overflow-hidden">
      <SiteHeader />

      <div className="wave-grid pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-70" />
      <div className="glow-orb left-[8%] top-28 size-56 bg-wave/10" />
      <div className="glow-orb right-[8%] top-44 size-60 bg-grab/5" />

      {/* Header section */}
      <section className="relative mx-auto w-full max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pt-16">
        <SectionHeading
          eyebrow="Workflow & Architecture"
          title="Three steps. Built like a tool, not a trap."
          body="Downloading a public video should never require dodging malicious popups, fake download buttons, or mystery installers. Here is the exact pipeline MediaRift runs when you paste a link."
        />

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="rounded-full border border-wave/20 bg-wave/10 px-3.5 py-1.5 font-medium text-wave">
            Platform detection
          </span>
          <span className="text-mist/40">→</span>
          <span className="rounded-full border border-grab/20 bg-grab/10 px-3.5 py-1.5 font-medium text-grab">
            Live metadata probe
          </span>
          <span className="text-mist/40">→</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 font-medium text-white">
            Clean 6-hour download
          </span>
        </div>
      </section>

      {/* 3 Steps Detailed Walkthrough */}
      <section className="relative mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {pipelineSteps.map((step) => (
            <article
              key={step.step}
              className="hover-lift glass-card relative flex flex-col justify-between rounded-3xl p-6 sm:p-7"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl border border-wave/25 bg-wave/10 font-mono text-sm font-bold text-wave">
                    {step.step}
                  </span>
                  <span className="font-mono text-xs text-mist/60">Step {step.step}</span>
                </div>

                <h3 className="mt-5 text-xl font-bold tracking-tight text-white">{step.title}</h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-wave/80">
                  {step.tagline}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-mist">{step.summary}</p>

                <div className="mt-6 border-t border-line/70 pt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-mist/70">
                    Engine Highlights
                  </p>
                  <ul className="mt-3 space-y-2 text-xs text-mist">
                    {step.details.map((detail) => (
                      <li key={detail} className="flex items-start gap-2">
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-wave" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Visual Pipeline Flowchart */}
      <section className="relative border-y border-line bg-ink-soft/40 py-16">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-wave">Data Flow</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Under the hood
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-mist">
              How MediaRift turns your public link into a clean file while keeping your device safe.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-line bg-ink/70 p-5 text-center">
              <span className="mx-auto grid size-10 place-items-center rounded-xl bg-white/5 text-base">
                🔗
              </span>
              <h4 className="mt-3 text-sm font-bold text-white">1. Link Input</h4>
              <p className="mt-1.5 text-xs leading-relaxed text-mist">
                User submits public link. Client validates format & normalizes URL.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-ink/70 p-5 text-center">
              <span className="mx-auto grid size-10 place-items-center rounded-xl bg-wave/10 text-base text-wave">
                ⚡
              </span>
              <h4 className="mt-3 text-sm font-bold text-white">2. Probing</h4>
              <p className="mt-1.5 text-xs leading-relaxed text-mist">
                Backend inspects available video streams, audio codecs & thumbnail.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-ink/70 p-5 text-center">
              <span className="mx-auto grid size-10 place-items-center rounded-xl bg-grab/10 text-base text-grab">
                ⚙️
              </span>
              <h4 className="mt-3 text-sm font-bold text-white">3. Processing</h4>
              <p className="mt-1.5 text-xs leading-relaxed text-mist">
                Instant stream direct pass-through or ffmpeg conversion with live SSE status.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-ink/70 p-5 text-center">
              <span className="mx-auto grid size-10 place-items-center rounded-xl bg-red-400/10 text-base text-red-300">
                ⏳
              </span>
              <h4 className="mt-3 text-sm font-bold text-white">4. 6-Hour Purge</h4>
              <p className="mt-1.5 text-xs leading-relaxed text-mist">
                User downloads clean file. Media is automatically erased after 6 hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Safety Guarantees Grid */}
      <section className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeading
          eyebrow="Our Guarantees"
          title="Respect for your screen and time."
          body="No dark patterns. Download exactly what you asked for without surprises."
        />

        <div className="mt-9 grid gap-4 sm:grid-cols-2">
          {safetyGuarantees.map((item) => (
            <div key={item.title} className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg bg-wave/15 text-sm font-bold text-wave">
                  {item.icon}
                </span>
                <h3 className="text-base font-semibold text-white">{item.title}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-mist">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Technical FAQ */}
      <section className="relative border-t border-line bg-ink-soft/40 py-16">
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Technical Questions"
            title="How the pipeline behaves."
            body="Deep-dive answers on conversion mechanics, retention policies, and quotas."
          />

          <div className="mt-8 space-y-3">
            {technicalFaqs.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl border border-line bg-ink/60 p-5 transition hover:border-wave/30"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-white marker:hidden [&::-webkit-details-marker]:hidden">
                  <span>{faq.q}</span>
                  <span className="grid size-6 shrink-0 place-items-center rounded-md border border-line text-mist transition group-open:rotate-45 group-open:text-wave">
                    +
                  </span>
                </summary>
                <p className="mt-3.5 text-sm leading-relaxed text-mist">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-wave/20 bg-gradient-to-br from-wave/10 via-ink-soft/80 to-grab/5 p-8 text-center sm:p-12">
          <div className="wave-grid pointer-events-none absolute inset-0 opacity-50" />
          <div className="relative">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Ready to see it in action?
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-mist">
              Paste your first link and watch the probe detect your platform in real time.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-wave px-7 py-3.5 text-sm font-bold text-ink shadow-lg shadow-wave/20 transition hover:bg-wave-deep"
            >
              Convert a link now <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
