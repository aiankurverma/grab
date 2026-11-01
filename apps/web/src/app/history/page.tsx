import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SectionHeading } from "@/components/ui/section-heading";
import { HistoryClient } from "@/app/history/history-client";

export const metadata: Metadata = {
  title: "Conversion History · Stored Locally in Your Browser",
  description:
    "Review and re-download your recent media conversions. Stored 100% locally on your device with 6-hour temporary link availability.",
  alternates: { canonical: "/history" },
  openGraph: {
    title: "MediaRift Conversion History — Recent Media",
    description: "Re-download and manage your recent conversions stored in local browser memory.",
    url: "/history",
    type: "website",
  },
};

export default function HistoryPage() {
  return (
    <main className="relative overflow-hidden">
      <SiteHeader />

      <div className="wave-grid pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-70" />
      <div className="glow-orb left-[10%] top-24 size-56 bg-wave/10" />
      <div className="glow-orb right-[8%] top-36 size-60 bg-grab/5" />

      <section className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
        <SectionHeading
          eyebrow="Device History"
          title="Recent conversions."
          body="Your media jobs are stored directly in your browser. Download links remain accessible for six hours before temporary storage is cleared."
        />

        <div className="mt-8">
          <HistoryClient />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
