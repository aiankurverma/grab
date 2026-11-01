"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const LINKS = [
  ["Platforms", "/platforms"],
  ["Formats", "/formats"],
  ["Questions", "/faq"],
  ["Recent History", "/history"],
] as const;

const SHOW_AUTH_UI = false;

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function close(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        className="grid size-10 place-items-center rounded-xl border border-line bg-ink-soft text-white"
      >
        <span className="relative block h-3.5 w-4">
          <span
            className={`absolute left-0 top-0 h-px w-4 bg-current transition ${
              open ? "translate-y-[6px] rotate-45" : ""
            }`}
          />
          <span
            className={`absolute left-0 top-[6px] h-px w-4 bg-current transition ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`absolute left-0 top-3 h-px w-4 bg-current transition ${
              open ? "-translate-y-[6px] -rotate-45" : ""
            }`}
          />
        </span>
      </button>

      {open ? (
        <div
          id="mobile-menu"
          className="absolute inset-x-4 top-full z-50 mt-2 rounded-2xl border border-line bg-ink-soft/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl"
        >
          <nav className="grid gap-1">
            {LINKS.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-mist transition hover:bg-white/5 hover:text-white"
              >
                {label}
              </Link>
            ))}
          </nav>
          {SHOW_AUTH_UI ? (
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-3">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-line px-3 py-2.5 text-center text-sm font-medium text-mist"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-wave px-3 py-2.5 text-center text-sm font-semibold text-ink"
              >
                Get started
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
