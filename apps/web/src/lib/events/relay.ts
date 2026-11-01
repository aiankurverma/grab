import type { DomainEvent } from "@prisma/client";

import { db } from "@/lib/db";
import { aiEnabled } from "@/lib/env";
import { enqueueEnrichment } from "@/lib/worker/client";

const globalRelay = globalThis as unknown as { grabwaveRelay?: NodeJS.Timeout };

export async function relayOnce(limit = 50): Promise<number> {
  const events = await db.domainEvent.findMany({
    where: { consumedAt: null },
    orderBy: { recordedAt: "asc" },
    take: limit,
  });

  let processed = 0;
  for (const event of events) {
    try {
      await handleEvent(event);
      await db.domainEvent.update({
        where: { id: event.id },
        data: { consumedAt: new Date(), attempts: { increment: 1 }, lastError: null },
      });
      processed += 1;
    } catch (error) {
      await db.domainEvent.update({
        where: { id: event.id },
        data: {
          attempts: { increment: 1 },
          lastError: String(error instanceof Error ? error.message : error).slice(0, 500),
        },
      });
    }
  }
  return processed;
}

async function handleEvent(event: DomainEvent): Promise<void> {
  switch (event.type) {
    case "job.ready.v1": {
      if (!aiEnabled()) return;
      const job = await db.job.findUnique({
        where: { id: event.aggregateId },
        select: {
          id: true,
          title: true,
          uploader: true,
          platform: true,
          format: true,
          enrichment: { select: { jobId: true } },
        },
      });
      if (!job || job.enrichment) return;
      await enqueueEnrichment({
        jobId: job.id,
        title: job.title ?? "Untitled",
        uploader: job.uploader ?? "",
        platform: job.platform,
        format: job.format,
      });
      return;
    }
    default:
      return;
  }
}

export function startEventRelay(): void {
  if (globalRelay.grabwaveRelay) return;
  const intervalMs = Number(process.env.EVENT_POLL_INTERVAL_MS ?? 750);
  const safeInterval = Number.isFinite(intervalMs) && intervalMs >= 250 ? intervalMs : 750;

  const tick = () => {
    void relayOnce().catch((error) => {
      console.error("[event-relay]", error);
    });
  };

  globalRelay.grabwaveRelay = setInterval(tick, safeInterval);
  globalRelay.grabwaveRelay.unref?.();
  tick();
  console.log(`[event-relay] polling every ${safeInterval}ms`);
}
