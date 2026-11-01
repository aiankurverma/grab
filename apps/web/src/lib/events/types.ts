import { z } from "zod";

export const EVENT_TYPES = [
  "job.requested.v1",
  "job.probe_succeeded.v1",
  "job.download_started.v1",
  "job.progressed.v1",
  "job.converted.v1",
  "job.uploaded.v1",
  "job.ready.v1",
  "job.failed.v1",
  "job.cancelled.v1",
  "job.expired.v1",
  "job.cancel_requested.v1",
  "job.enriched.v1",
  "quota.consumed.v1",
  "quota.refunded.v1",
  "user.registered.v1",
  "plan.upgraded.v1",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const eventEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  type: z.enum(EVENT_TYPES),
  aggregateId: z.string().min(1).max(64),
  version: z.number().int().positive().default(1),
  occurredAt: z.string().datetime({ offset: true }),
  correlationId: z.string().max(64).nullable().optional(),
  causationId: z.string().max(64).nullable().optional(),
  payload: z.record(z.unknown()),
});

export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;

export function payloadString(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function payloadNumber(payload: Record<string, unknown>, key: string): number | undefined {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
