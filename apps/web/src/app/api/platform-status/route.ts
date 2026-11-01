import { NextResponse } from "next/server";
import { getSystemControls } from "@/lib/system-control";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const controls = getSystemControls();
  return NextResponse.json({
    disabledPlatforms: controls.disabledPlatforms,
    aiEnabled: controls.aiEnabled,
  });
}
