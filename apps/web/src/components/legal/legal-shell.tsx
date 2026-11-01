import Link from "next/link";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export function LegalShell({
  eyebrow,
  title,
  summary,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="relative overflow-hidden">
      <SiteHeader />
      <div className="wave-grid pointer-events-none absolute inset-x-0 top-0 h-[420px]" />

      <section className="relative mx-auto w-full max-w-3xl px-4 pb-10 pt-12 sm:px-6 sm:pt-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-mist transition hover:text-white"
        >
          <span aria-hidden="true">←</span> Back to converter
        </Link>
        <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.24em] text-wave">{eyebrow}</p>
        <h1 className="mt-2.5 text-balance text-3xl font-semibold tracking-tight text-white sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-pretty text-sm leading-relaxed text-mist sm:text-base">{summary}</p>
        <p className="mt-3 text-[11px] text-mist/60">Last updated: {updated}</p>
      </section>

      <section className="relative mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6">
        <div className="glass-card space-y-8 rounded-2xl p-5 sm:p-8">{children}</div>
      </section>

      <SiteFooter />
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-semibold text-white sm:text-lg">{title}</h2>
      <div className="mt-2 space-y-2.5 text-sm leading-relaxed text-mist">{children}</div>
    </section>
  );
}
