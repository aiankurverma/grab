import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { internalSecret } from "@/lib/env";
import { UnknownJobError, recordEvent } from "@/lib/events/store";
import { eventEnvelopeSchema } from "@/lib/events/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  const provided = Buffer.from(header.slice(7));
  const expected = Buffer.from(internalSecret());
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = eventEnvelopeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid event", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  if (parsed.data.aggregateId !== id) {
    return NextResponse.json({ error: "aggregate mismatch" }, { status: 422 });
  }

  try {
    const result = await recordEvent(parsed.data);
    return NextResponse.json({ ok: true, ...result }, { status: result.duplicate ? 200 : 202 });
  } catch (error) {
    if (error instanceof UnknownJobError) {
      return NextResponse.json({ error: "unknown job" }, { status: 404 });
    }
    console.error("[internal-events]", error);
    return NextResponse.json({ error: "could not record event" }, { status: 500 });
  }
}
