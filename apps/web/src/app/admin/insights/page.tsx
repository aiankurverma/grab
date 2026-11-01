import { notFound } from "next/navigation";
import { getAnalyticsInsights } from "@/lib/analytics/tracker";
import { verifyAdminSecret } from "@/lib/analytics/auth";
import { getSystemControls } from "@/lib/system-control";
import { InsightsHistoryFeed } from "@/components/admin/insights-history-feed";
import { AdminMasterSwitches } from "@/components/admin/admin-master-switches";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ key?: string }>;
};

export default async function AdminInsightsPage({ searchParams }: PageProps) {
  const { key } = await searchParams;

  // Cryptographically verify provided key using SHA-256 (returns 404 if invalid)
  if (!verifyAdminSecret(key)) {
    notFound();
  }

  const data = await getAnalyticsInsights();
  const controls = getSystemControls();

  return (
    <main className="min-h-screen bg-[#070b12] text-white px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header with 3-Lines Hamburger on the Left Side */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3.5">
            {/* Three-Lines Hamburger Control Drawer (Left side) */}
            <AdminMasterSwitches
              adminKey={key ?? ""}
              initialDisabledPlatforms={controls.disabledPlatforms}
              initialAiEnabled={controls.aiEnabled}
            />

            <div>
              <div className="flex items-center gap-2.5">
                <span className="size-3 rounded-full bg-emerald-500 animate-pulse" />
                <h1 className="text-2xl font-bold tracking-tight text-white">Private Analytics & Training Feed</h1>
              </div>
              <p className="mt-1 text-sm text-neutral-400">
                Confidential internal metrics · Cloudinary thumbnail pipeline active
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 font-mono text-xs text-neutral-300">
            Cloudinary: <span className="text-emerald-400 font-semibold">{process.env.CLOUDINARY_CLOUD_NAME || "yt6oi9ll"}</span>
          </div>
        </div>

        {/* Top KPI Cards (Normal as old one across full width) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Live Active People</span>
              <span className="flex size-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white">{data.activeUsersCount}</span>
              <span className="text-xs text-neutral-400">(past 15 minutes)</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Total Downloads</span>
            <div className="mt-3 text-4xl font-extrabold text-cyan-400">
              {data.totalDownloads}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md sm:col-span-3 lg:col-span-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">All Platforms</span>
            <div className="mt-3 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {[
                "Pinterest",
                "YouTube",
                "Instagram",
                "TikTok",
                "Facebook",
                "SoundCloud",
                "X",
                "Reddit",
                "Twitch",
                "Vimeo",
                "Dailymotion",
              ].map((platform) => {
                const count =
                  data.platformBreakdown[platform] ??
                  (platform === "X"
                    ? data.platformBreakdown["Twitter"] ?? 0
                    : 0);
                return (
                  <span
                    key={platform}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-xs font-medium ${
                      count > 0
                        ? "border-cyan-500/40 bg-cyan-950/40 text-white"
                        : "border-white/5 bg-black/20 text-neutral-500"
                    }`}
                  >
                    <span>{platform}:</span>
                    <span className={`font-bold ${count > 0 ? "text-cyan-400" : "text-neutral-600"}`}>
                      {count}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Raw JSON API Quick Link */}
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4 text-xs text-cyan-200">
          <div className="font-semibold text-white">Direct Raw JSON API Endpoint:</div>
          <code className="mt-1 block break-all font-mono text-[11px] text-cyan-300">
            {`/api/admin/insights?key=${key ?? ""}`}
          </code>
        </div>

        {/* Platform-wise History with Pagination & Training Feed */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white">Conversion History & Training Feed</h2>
            <span className="text-xs text-neutral-400">
              Paginated platform feed · Real-time Cloudinary assets
            </span>
          </div>

          <InsightsHistoryFeed
            initialHistory={data.recentHistory}
            platformBreakdown={data.platformBreakdown}
          />
        </div>
      </div>
    </main>
  );
}
