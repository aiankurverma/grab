import Link from "next/link";

import { MobileMenu } from "@/components/layout/mobile-menu";
import { BrandMark } from "@/components/ui/brand-mark";

// Set to true when auth is ready for public launch
const SHOW_AUTH_UI = false;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink/75 backdrop-blur-xl">
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <BrandMark />

        <nav className="hidden items-center gap-7 text-sm font-medium text-mist md:flex">
          <Link className="transition hover:text-white" href="/platforms">
            Platforms
          </Link>
          <Link className="transition hover:text-white" href="/formats">
            Formats
          </Link>
          <Link className="transition hover:text-white" href="/faq">
            Questions
          </Link>
          <Link className="inline-flex items-center gap-1.5 transition hover:text-white" href="/history">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 8v4l3 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9Z" />
            </svg>
            <span>History</span>
          </Link>
        </nav>

        {SHOW_AUTH_UI ? (
          <div className="hidden items-center gap-3 text-sm sm:flex">
            <Link className="px-2 text-mist transition hover:text-white" href="/login">
              Log in
            </Link>
            <Link
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-semibold text-white transition hover:border-wave/50 hover:bg-wave/10"
              href="/signup"
            >
              Get started
            </Link>
          </div>
        ) : (
          <div className="hidden sm:block" />
        )}

        <MobileMenu />
      </div>
    </header>
  );
}
