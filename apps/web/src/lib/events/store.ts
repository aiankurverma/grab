import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { applyProjection } from "@/lib/events/project";
import type { EventEnvelope } from "@/lib/events/types";

export class UnknownJobError extends Error {}

export async function recordEvent(event: EventEnvelope): Promise<{ duplicate: boolean }> {
  try {
    await db.$transaction(async (tx) => {
      await tx.domainEvent.create({
        data: {
          id: event.eventId,
          type: event.type,
          aggregateId: event.aggregateId,
          jobId: event.aggregateId,
          version: event.version,
          payload: event.payload as Prisma.InputJsonValue,
          occurredAt: new Date(event.occurredAt),
          correlationId: event.correlationId ?? null,
          causationId: event.causationId ?? null,
        },
      });
      await applyProjection(tx, event);
    });
    return { duplicate: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return { duplicate: true };
      }
      if (error.code === "P2003" || error.code === "P2025") {
        throw new UnknownJobError(`unknown job ${event.aggregateId}`);
      }
    }
    throw error;
  }
}
