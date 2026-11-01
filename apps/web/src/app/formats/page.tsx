import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SectionHeading } from "@/components/ui/section-heading";

export const metadata: Metadata = {
  title: "Format Guide · MP3 vs MP4 vs M4A",
  description:
    "Compare MP3, MP4, and M4A formats. Detailed breakdown of audio bitrates (128k, 192k, 320k), video resolutions (up to 4K), device compatibility, and file sizes.",
  alternates: { canonical: "/formats" },
  openGraph: {
    title: "Grab Format Guide — MP3 vs MP4 vs M4A",
    description:
      "Detailed breakdown of audio bitrates, video resolutions, codecs, and device compatibility.",
    url: "/formats",
    type: "website",
  },
};

const formatComparison = [
  {
    format: "MP3",
    type: "Audio only",
    codec: "MPEG-1 Audio Layer III (CBR)",
    qualities: "128, 192, 320 kbps",
    avgSize: "~1.4 MB / min (192k)",
    compatibility: "100% universal (every car, phone, player)",
    bestFor: "Music, podcasts, audiobooks, lectures, voice notes",
    tagColor: "border-wave/30 bg-wave/10 text-wave",
  },
  {
    format: "MP4",
    type: "Video + Audio",
    codec: "H.264 (AVC) + AAC Audio",
    qualities: "360p, 480p, 720p, 1080p, 4K",
    avgSize: "~15–40 MB / min (1080p)",
    compatibility: "iOS, Android, Windows, Mac, Smart TVs",
    bestFor: "Tutorials, clips, reels, music videos, workouts",
    tagColor: "border-grab/30 bg-grab/10 text-grab",
  },
  {
    format: "M4A",
    type: "Fast Audio (AAC)",
    codec: "Advanced Audio Coding (Native)",
    qualities: "Original source bitrate",
    avgSize: "~1.1 MB / min",
    compatibility: "Apple ecosystem, Android, modern browsers",
    bestFor: "Instant download, zero re-encoding loss",
    tagColor: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  },
];

const bitrateBreakdown = [
  {
    rate: "128 kbps",
    badge: "Compact & Fast",
    size: "~4.7 MB per 5 min",
    details:
      "Smallest file size. Ideal for spoken voice, speech lectures, audiobooks, and users on constrained mobile data plans.",
    useCase: "Podcasts & Lectures",
  },
  {
    rate: "192 kbps",
    badge: "Balanced (Recommended)",
    size: "~7.2 MB per 5 min",
    details:
      "The sweet spot between high acoustic fidelity and reasonable file weight. Transparent for 98% of human listening environments.",
    useCase: "Everyday Music & Playlists",
  },
  {
    rate: "320 kbps",
    badge: "Studio Fidelity",
    size: "~12.0 MB per 5 min",
    details:
      "Maximum CBR bitrate allowed by the MP3 specification. Preserves complex high frequencies, bass percussion, and acoustic instruments.",
    useCase: "Audiophiles & DJ Sets",
  },
];

const videoResolutions = [
  {
    res: "720p HD",
    label: "1280 × 720",
    badge: "Fast & Light",
    desc: "Great clarity on phone screens while downloading twice as fast as Full HD.",
  },
  {
    res: "1080p FHD",
    label: "1920 × 1080",
    badge: "Sharp Standard",
    desc: "Crisp definition on laptops, desktop monitors, and tablets. The gold standard for YouTube & TikTok clips.",
  },
  {
    res: "2160p 4K",
    label: "3840 × 2160",
    badge: "Master Ultra HD",
    desc: "Maximum resolution with unmatched detail. Available when the source video was produced and uploaded in native 4K.",
  },
];

const formatFaqs = [
  {
    q: "Will converting a video to MP3 degrade sound quality?",
    a: "We extract audio directly from the source's highest available audio stream and re-encode to clean MP3 at your chosen bitrate. At 192 kbps or 320 kbps, quality is pristine and virtually indistinguishable from the source audio.",
  },
  {
    q: "Can Grab upscale a 720p video to 1080p or 4K?",
    a: "No. Grab never artificially invents fake resolution pixels. We inspect the video manifest and display only the authentic resolutions that the original creator uploaded to the platform.",
  },
  {
    q: "Why is M4A labeled 'Fast Audio'?",
    a: "Many public platforms store audio internally as AAC inside an MP4 container. M4A allows us to extract that exact stream directly without running it through a secondary audio transcode, enabling instant downloads.",
  },
  {
    q: "Which format is best for listening in my car via USB?",
    a: "MP3 at 192 kbps or 320 kbps. Older car infotainment head units often lack AAC or MKV decoders, but virtually every car stereo from 2002 to present supports standard MP3 files.",
  },
];

export default function FormatsPage() {
  return (
    <main className="relative overflow-hidden">
      <SiteHeader />

      <div className="wave-grid pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-70" />
      <div className="glow-orb left-[10%] top-24 size-56 bg-wave/10" />
      <div className="glow-orb right-[8%] top-40 size-60 bg-grab/5" />

      {/* Hero section */}
      <section className="relative mx-auto w-full max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pt-16">
        <SectionHeading
          eyebrow="Media Guide"
          title="MP3 or MP4? Start with the job."
          body="No codec headaches or technical jargon. Pick the container and quality tailored to where you plan to play your file."
        />

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs">
          <span className="rounded-full border border-wave/20 bg-wave/10 px-3.5 py-1.5 font-medium text-wave">
            Audio: MP3 (128, 192, 320 kbps)
          </span>
          <span className="rounded-full border border-grab/20 bg-grab/10 px-3.5 py-1.5 font-medium text-grab">
            Video: MP4 (360p up to 4K)
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 font-medium text-mist">
            Fast Stream: M4A Direct
          </span>
        </div>
      </section>

      {/* Three format cards */}
      <section className="relative mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* MP3 Card */}
          <article className="hover-lift glass-card relative flex flex-col justify-between rounded-3xl p-6 sm:p-7">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-wave/30 bg-wave/10 px-3 py-1 font-mono text-xs font-bold text-wave">
                  MP3 AUDIO
                </span>
                <span className="font-mono text-xs text-mist/60">Universal</span>
              </div>
              <h3 className="mt-5 text-2xl font-bold tracking-tight text-white">The sound only.</h3>
              <p className="mt-3 text-sm leading-relaxed text-mist">
                Strip away unnecessary video bandwidth. Perfect for saving podcasts, music tracks,
                and lecture audio for your daily commute.
              </p>
              <ul className="mt-5 space-y-2 border-t border-line/70 pt-4 text-xs text-mist">
                <li className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-wave" />
                  <span>Bitrates: 128, 192, 320 kbps</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-wave" />
                  <span>Plays on all phones, car radios & players</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-wave" />
                  <span>Lightweight file sizes save disk space</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 border-t border-line/70 pt-4">
              <Link
                href="/?format=mp3"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-wave/30 bg-wave/10 py-2.5 text-xs font-semibold text-wave transition hover:bg-wave hover:text-ink"
              >
                Convert to MP3 →
              </Link>
            </div>
          </article>

          {/* MP4 Card */}
          <article className="hover-lift glass-card relative flex flex-col justify-between rounded-3xl p-6 sm:p-7">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-grab/30 bg-grab/10 px-3 py-1 font-mono text-xs font-bold text-grab">
                  MP4 VIDEO
                </span>
                <span className="font-mono text-xs text-mist/60">HD & 4K</span>
              </div>
              <h3 className="mt-5 text-2xl font-bold tracking-tight text-white">Visuals + sound.</h3>
              <p className="mt-3 text-sm leading-relaxed text-mist">
                Preserve full motion visuals alongside synced audio. Built for reels, workout routines,
                software tutorials, and presentations.
              </p>
              <ul className="mt-5 space-y-2 border-t border-line/70 pt-4 text-xs text-mist">
                <li className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-grab" />
                  <span>Resolutions: 360p, 720p, 1080p, 4K</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-grab" />
                  <span>H.264 video with clean AAC audio</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-grab" />
                  <span>Full compatibility on iOS & Android</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 border-t border-line/70 pt-4">
              <Link
                href="/?format=mp4"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-grab/30 bg-grab/10 py-2.5 text-xs font-semibold text-grab transition hover:bg-grab hover:text-ink"
              >
                Convert to MP4 →
              </Link>
            </div>
          </article>

          {/* M4A Card */}
          <article className="hover-lift glass-card relative flex flex-col justify-between rounded-3xl p-6 sm:p-7">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 font-mono text-xs font-bold text-amber-200">
                  M4A STREAM
                </span>
                <span className="font-mono text-xs text-amber-200/80">⚡ Instant</span>
              </div>
              <h3 className="mt-5 text-2xl font-bold tracking-tight text-white">Direct extract.</h3>
              <p className="mt-3 text-sm leading-relaxed text-mist">
                Downloads the platform&apos;s raw AAC audio track without transcoding overhead.
                Zero re-encoding generation loss and instant CDN delivery.
              </p>
              <ul className="mt-5 space-y-2 border-t border-line/70 pt-4 text-xs text-mist">
                <li className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-amber-300" />
                  <span>Original audio stream directly from source</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-amber-300" />
                  <span>No transcoding waiting queue</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-amber-300" />
                  <span>Native playback across Apple & modern Android</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 border-t border-line/70 pt-4">
              <Link
                href="/?format=m4a"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 py-2.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-300 hover:text-ink"
              >
                Extract M4A Stream →
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* Side-by-side comparison matrix */}
      <section className="relative border-y border-line bg-ink-soft/30 py-16">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-wave">Comparison Matrix</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Compare formats at a glance.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-mist">
              Choose the format best suited for your target player and storage budget.
            </p>
          </div>

          <div className="mt-8 overflow-x-auto rounded-2xl border border-line bg-ink/70">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-white/[0.02] text-[11px] font-bold uppercase tracking-wider text-mist/70">
                <tr>
                  <th className="px-5 py-3.5">Format</th>
                  <th className="px-4 py-3.5">Media Type</th>
                  <th className="px-4 py-3.5">Quality Options</th>
                  <th className="px-4 py-3.5">Typical Size</th>
                  <th className="px-4 py-3.5">Compatibility</th>
                  <th className="px-5 py-3.5">Best For</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {formatComparison.map((row) => (
                  <tr key={row.format} className="transition hover:bg-white/[0.02]">
                    <td className="px-5 py-4 font-bold text-white">
                      <span className={`inline-block rounded-md border px-2.5 py-1 ${row.tagColor}`}>
                        {row.format}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-mist">{row.type}</td>
                    <td className="px-4 py-4 font-mono text-white/90">{row.qualities}</td>
                    <td className="px-4 py-4 text-mist">{row.avgSize}</td>
                    <td className="px-4 py-4 text-mist">{row.compatibility}</td>
                    <td className="px-5 py-4 text-white/90">{row.bestFor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Bitrate & Resolution Deep Dives */}
      <section className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Audio Bitrates */}
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-wave/20 text-xs font-bold text-wave">
                ♫
              </span>
              <h3 className="text-xl font-semibold tracking-tight text-white">
                Audio Bitrate Explained
              </h3>
            </div>
            <p className="mt-2 text-sm text-mist">
              Bitrate controls how many kilobits of audio data are transmitted per second.
            </p>

            <div className="mt-6 space-y-3.5">
              {bitrateBreakdown.map((item) => (
                <div key={item.rate} className="rounded-2xl border border-line bg-ink/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-bold text-white">{item.rate}</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-wave">
                      {item.badge}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-mist">{item.details}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-[11px] text-mist/60 font-mono">
                    <span>{item.useCase}</span>
                    <span>{item.size}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Video Resolutions */}
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-grab/20 text-xs font-bold text-grab">
                ▶
              </span>
              <h3 className="text-xl font-semibold tracking-tight text-white">
                Video Resolutions Explained
              </h3>
            </div>
            <p className="mt-2 text-sm text-mist">
              Video height determines display sharpness and pixel density.
            </p>

            <div className="mt-6 space-y-3.5">
              {videoResolutions.map((item) => (
                <div key={item.res} className="rounded-2xl border border-line bg-ink/60 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-base font-bold text-white">{item.res}</span>
                      <span className="text-xs text-mist/60 font-mono">({item.label})</span>
                    </div>
                    <span className="rounded-full border border-grab/20 bg-grab/10 px-2.5 py-0.5 text-[11px] font-medium text-grab">
                      {item.badge}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-mist">{item.desc}</p>
                </div>
              ))}

              <div className="rounded-2xl border border-wave/20 bg-wave/5 p-4 text-xs leading-relaxed text-mist">
                <span className="font-semibold text-wave">Authentic source policy:</span> Grab does
                not synthesize fake 4K pixels. If a video was recorded in 1080p, Grab caps it at 1080p.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Format FAQs */}
      <section className="relative border-t border-line bg-ink-soft/40 py-16">
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Format FAQs"
            title="Common format questions."
            body="Clear answers about audio codecs, video containers, and playback compatibility."
          />

          <div className="mt-8 space-y-3">
            {formatFaqs.map((faq) => (
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

      {/* Convert CTA */}
      <section className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-wave/20 bg-gradient-to-br from-wave/10 via-ink-soft/80 to-grab/5 p-8 text-center sm:p-12">
          <div className="wave-grid pointer-events-none absolute inset-0 opacity-50" />
          <div className="relative">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Ready to convert your media?
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-mist">
              Paste a link from YouTube, TikTok, Instagram, or SoundCloud and choose your format.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-wave px-7 py-3.5 text-sm font-bold text-ink shadow-lg shadow-wave/20 transition hover:bg-wave-deep"
            >
              Open Converter <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
