import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Grab accounts are coming soon. Convert public links from 11 supported platforms without signing in.",
};

const benefits = [
  "5 conversions a day instead of 2",
  "A history of your recent downloads",
  "Your format and quality choices saved",
  "Synced history across your devices",
];

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Sign-ups are not open yet. Here is what you will get when accounts launch."
    >
      <ul className="space-y-3">
        {benefits.map((benefit) => (
          <li key={benefit} className="flex items-start gap-3 text-sm text-mist">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-grab" />
            {benefit}
          </li>
        ))}
      </ul>

      <Link
        href="/"
        className="mt-6 flex w-full items-center justify-center rounded-xl bg-wave px-5 py-3 text-sm font-semibold text-ink transition hover:bg-wave-deep"
      >
        Convert without signing in
      </Link>

      <p className="mt-5 text-center text-sm text-mist">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-white underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
