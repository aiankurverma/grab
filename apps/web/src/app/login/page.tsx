import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Log in",
  description: "Grab accounts are coming soon. Convert public links from 11 supported platforms without signing in.",
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Log in"
      subtitle="Accounts are not open yet. When they launch, you will be able to sign in here to see your history and get more daily conversions."
    >
      <div className="rounded-xl border border-wave/20 bg-wave/5 p-4 text-sm leading-relaxed text-mist">
        <p className="font-medium text-wave">No account needed right now.</p>
        <p className="mt-1">
          Paste a public link from YouTube, TikTok, Instagram, X, SoundCloud, or another supported
          site. The converter works without signing in.
        </p>
      </div>

      <Link
        href="/"
        className="mt-5 flex w-full items-center justify-center rounded-xl bg-wave px-5 py-3 text-sm font-semibold text-ink transition hover:bg-wave-deep"
      >
        Convert without signing in
      </Link>

      <p className="mt-5 text-center text-sm text-mist">
        New here?{" "}
        <Link href="/signup" className="font-medium text-white underline-offset-4 hover:underline">
          See what an account will include
        </Link>
      </p>
    </AuthShell>
  );
}
