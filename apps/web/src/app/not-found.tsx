import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function NotFound() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <SiteHeader />
      <div className="wave-grid pointer-events-none absolute inset-x-0 top-0 h-[520px]" />
      <section className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32">
        <p className="rounded-full border border-wave/20 bg-wave/10 px-3 py-1 font-mono text-xs text-wave">
          404
        </p>
        <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-white sm:text-6xl">
          This link went quiet.
        </h1>
        <p className="mt-4 max-w-md text-pretty text-sm leading-relaxed text-mist sm:text-base">
          The page does not exist, but the converter is still one paste away.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="rounded-xl bg-wave px-5 py-3 text-sm font-bold text-ink transition hover:bg-wave-deep"
          >
            Back to the converter
          </Link>
          <Link
            href="/platforms"
            className="rounded-xl border border-line bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-wave/40"
          >
            See supported platforms
          </Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
