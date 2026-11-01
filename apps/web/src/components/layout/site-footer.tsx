import Link from "next/link";

import { BrandMark } from "@/components/ui/brand-mark";

const PRODUCT = [
  ["Converter", "/"],
  ["Supported platforms", "/platforms"],
  ["Format guide", "/formats"],
  ["How it works", "/how-it-works"],
  ["Questions & FAQ", "/faq"],
  ["Recent history", "/history"],
] as const;

const PLATFORMS = [
  ["YouTube", "/platforms#youtube"],
  ["Instagram", "/platforms#instagram"],
  ["TikTok", "/platforms#tiktok"],
  ["SoundCloud", "/platforms#soundcloud"],
  ["All platforms", "/platforms"],
] as const;

const LEGAL = [
  ["Terms", "/terms"],
  ["Privacy", "/privacy"],
  ["DMCA", "/dmca"],
] as const;

export function SiteFooter() {
  return (
    <footer className="relative border-t border-line bg-ink-soft/30">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <BrandMark />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-mist">
            Clean MP3 and MP4 files from the links you already have. No pop-ups, no install, and
            downloads that disappear after six hours.
          </p>
          <p className="mt-4 text-[13px] leading-relaxed text-mist/60">
            Public content only. Convert media you own or have permission to use.
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">Product</p>
          <ul className="mt-4 space-y-3 text-[15px] text-mist">
            {PRODUCT.map(([label, href]) => (
              <li key={href}>
                <Link className="transition hover:text-white" href={href}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">Platforms</p>
          <ul className="mt-4 space-y-3 text-[15px] text-mist">
            {PLATFORMS.map(([label, href]) => (
              <li key={href}>
                <Link className="transition hover:text-white" href={href}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">Legal</p>
          <ul className="mt-4 space-y-3 text-[15px] text-mist">
            {LEGAL.map(([label, href]) => (
              <li key={href}>
                <Link className="transition hover:text-white" href={href}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-line/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-[13px] text-mist/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Grab. All rights reserved.</p>
          <p>Built for the links you own or have permission to use.</p>
        </div>
      </div>
    </footer>
  );
}
