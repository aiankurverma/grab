import { NextResponse } from "next/server";

import { getJobView } from "@/lib/jobs/view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!id || typeof id !== "string" || id.length > 64) {
      return NextResponse.json({ error: "Invalid job identifier." }, { status: 400 });
    }
    const job = await getJobView(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }
    return NextResponse.json(job, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[api/jobs/[id]] error:", error);
    return NextResponse.json(
      { error: "Could not retrieve job status. Please try again." },
      { status: 500 },
    );
  }
}
