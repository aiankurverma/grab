import { NextResponse } from "next/server";
import { getAnalyticsInsights } from "@/lib/analytics/tracker";
import { verifyAdminSecret } from "@/lib/analytics/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const url = new URL(request.url);
  const queryKey = url.searchParams.get("key");
  const headerKey = request.headers.get("x-admin-key");

  return verifyAdminSecret(headerKey || queryKey);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Valid 'x-admin-key' header or '?key=...' query parameter required." },
      { status: 401 }
    );
  }

  try {
    const dashboard = await getAnalyticsInsights();
    return NextResponse.json(dashboard, {
      status: 200,
      headers: {
        "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "content-type": "application/json",
      },
    });
  } catch (error) {
    console.error("[admin/insights] unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error retrieving admin insights." },
      { status: 500 }
    );
  }
}
