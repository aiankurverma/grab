import type { Metadata, Viewport } from "next";
import { RoutePrefetcher } from "@/components/layout/route-prefetcher";
import "./globals.css";

const appUrl = process.env.APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "MediaRift — Public media to MP3 or MP4",
    template: "%s · MediaRift",
  },
  description:
    "Paste a public link from YouTube, Instagram, TikTok, Facebook, X, Vimeo, SoundCloud, Reddit, Twitch, Dailymotion, or Pinterest and get a clean MP3 or MP4. No ads, no install.",
  applicationName: "MediaRift",
  category: "technology",
  keywords: [
    "media converter",
    "YouTube to MP3",
    "YouTube to MP4",
    "TikTok downloader",
    "Instagram Reels downloader",
    "SoundCloud to MP3",
    "online video converter",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "MediaRift — One link in. A clean file out.",
    description:
      "Convert public video and audio links to MP3 or MP4 with platform-aware quality and no fake download buttons.",
    type: "website",
    url: "/",
    siteName: "MediaRift",
  },
  twitter: {
    card: "summary",
    title: "MediaRift — One link in. A clean file out.",
    description: "Public media to MP3 or MP4. Platform-aware quality, no install, no pop-ups.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#07090e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RoutePrefetcher />
        {children}
      </body>
    </html>
  );
}
