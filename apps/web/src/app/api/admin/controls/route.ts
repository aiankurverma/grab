import { NextResponse } from "next/server";
import { verifyAdminSecret } from "@/lib/analytics/auth";
import { getSystemControls, saveSystemControls } from "@/lib/system-control";

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const controls = getSystemControls();
  return NextResponse.json(controls);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as {
      disabledPlatforms?: string[];
      aiEnabled?: boolean;
    } | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const updated = saveSystemControls({
      disabledPlatforms: body.disabledPlatforms,
      aiEnabled: body.aiEnabled,
    });

    return NextResponse.json({ success: true, controls: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update controls" },
      { status: 500 },
    );
  }
}
