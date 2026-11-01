import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SectionHeading } from "@/components/ui/section-heading";
import { FAQClient } from "@/app/faq/faq-client";

export const metadata: Metadata = {
  title: "Questions & FAQ · Straight Answers on Formats, Platforms & Limits",
  description:
    "Find answers about Grab conversion limits, MP3 vs MP4 quality, supported platforms, privacy retention policies, and troubleshooting.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "Grab FAQ — Straight Answers to Everything",
    description:
      "Limits, audio & video bitrates, platform support, 6-hour expiry, and troubleshooting answers.",
    url: "/faq",
    type: "website",
  },
};

export default function FAQPage() {
  return (
    <main className="relative overflow-hidden">
      <SiteHeader />

      <div className="wave-grid pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-70" />
      <div className="glow-orb left-[12%] top-28 size-56 bg-wave/10" />
      <div className="glow-orb right-[8%] top-40 size-60 bg-grab/5" />

      <section className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
        <SectionHeading
          eyebrow="Help & Knowledge Base"
          title="Frequently Asked Questions."
          body="Straight answers on quality limits, platform quirks, privacy, and how Grab extracts your media."
        />

        <div className="mt-10">
          <FAQClient />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
