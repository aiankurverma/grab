import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { PlatformMark } from "@/components/ui/platform-mark";

const PROOF = [
  "11 supported platforms",
  "Private, expiring download links",
  "No app or browser extension",
];

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <SiteHeader />
      <div className="wave-grid pointer-events-none absolute inset-x-0 top-0 h-[560px]" />
      <div className="glow-orb left-[10%] top-32 size-56 bg-wave/10" />

      <section className="relative mx-auto grid w-full max-w-5xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div className="hidden lg:block">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-mist">
            <span className="size-1.5 rounded-full bg-grab" />
            Accounts are optional
          </p>
          <h2 className="mt-5 max-w-md text-balance text-4xl font-semibold leading-[1.02] tracking-tight text-white">
            One converter.
            <br />
            <span className="text-gradient">Any public link.</span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-mist">
            Convert, track, and download without installing anything. Accounts will add more daily
            conversions and synced history when they launch.
          </p>

          <ul className="mt-6 space-y-2.5">
            {PROOF.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-mist">
                <span className="grid size-5 place-items-center rounded-full border border-grab/25 bg-grab/10 text-[10px] text-grab">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-7 flex items-center gap-2">
            {(["YOUTUBE", "INSTAGRAM", "TIKTOK", "X", "VIMEO", "SOUNDCLOUD"] as const).map(
              (platform) => (
                <PlatformMark key={platform} platform={platform} size="sm" />
              ),
            )}
            <span className="ml-1 text-[11px] text-mist/70">and more</span>
          </div>
        </div>

        <div className="w-full">
          <div className="glass-card relative overflow-hidden rounded-3xl p-6 sm:p-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-wave/70 to-transparent"
            />
            <p className="inline-flex items-center gap-2 rounded-full border border-wave/25 bg-wave/10 px-3 py-1 text-[11px] font-medium text-wave">
              <span className="size-1.5 rounded-full bg-wave" />
              Accounts coming soon
            </p>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-mist">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>

          <p className="mt-5 text-center text-[11px] leading-relaxed text-mist/70">
            MediaRift stays free while in beta. Your browser history is stored locally on this
            device.
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
