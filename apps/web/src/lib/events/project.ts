import type { Prisma } from "@prisma/client";

import { friendlyFailure } from "@/lib/jobs/errors";

import { payloadNumber, payloadString, type EventEnvelope } from "./types";

const TERMINAL = ["READY", "FAILED", "CANCELLED", "EXPIRED"] as const;

function outputTtlSeconds(): number {
  const parsed = Number(process.env.SIGNED_URL_TTL_SECONDS ?? 21_600);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 21_600;
}

function clampProgress(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export async function applyProjection(
  tx: Prisma.TransactionClient,
  event: EventEnvelope,
): Promise<void> {
  const jobId = event.aggregateId;
  const payload = event.payload;

  switch (event.type) {
    case "job.probe_succeeded.v1":
      await tx.job.updateMany({
        where: { id: jobId, status: { notIn: [...TERMINAL] } },
        data: {
          status: "PROBING",
          title: payloadString(payload, "title"),
          durationSeconds: Math.round(payloadNumber(payload, "durationSeconds") ?? 0),
          uploader: payloadString(payload, "uploader"),
          thumbnailUrl: payloadString(payload, "thumbnailUrl"),
        },
      });
      break;

    case "job.download_started.v1":
      await tx.job.updateMany({
        where: { id: jobId, status: { notIn: [...TERMINAL] } },
        data: { status: "DOWNLOADING" },
      });
      break;

    case "job.progressed.v1": {
      const progress = clampProgress(payloadNumber(payload, "percent"));
      if (progress !== undefined) {
        await tx.job.updateMany({
          where: { id: jobId, status: { notIn: [...TERMINAL] } },
          data: { progress },
        });
      }
      break;
    }

    case "job.converted.v1":
      await tx.job.updateMany({
        where: { id: jobId, status: { notIn: [...TERMINAL] } },
        data: { status: "CONVERTING", progress: 80 },
      });
      break;

    case "job.uploaded.v1":
      await tx.job.updateMany({
        where: { id: jobId, status: { notIn: [...TERMINAL] } },
        data: {
          status: "UPLOADING",
          progress: 95,
          outputKey: payloadString(payload, "key"),
          outputUrl: payloadString(payload, "url"),
          outputSizeBytes: payloadNumber(payload, "sizeBytes")
            ? BigInt(Math.round(payloadNumber(payload, "sizeBytes") as number))
            : undefined,
        },
      });
      break;

    case "job.ready.v1":
      await tx.job.update({
        where: { id: jobId },
        data: {
          status: "READY",
          progress: 100,
          outputKey: payloadString(payload, "outputKey"),
          expiresAt: new Date(Date.now() + outputTtlSeconds() * 1000),
        },
      });
      break;

    case "job.failed.v1": {
      const code = payloadString(payload, "code") ?? "unknown";
      await tx.job.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          failureCode: code,
          failureMessage: friendlyFailure(code, payloadString(payload, "message")),
        },
      });
      break;
    }

    case "job.cancelled.v1":
      await tx.job.update({ where: { id: jobId }, data: { status: "CANCELLED" } });
      break;

    case "job.expired.v1":
      await tx.job.update({ where: { id: jobId }, data: { status: "EXPIRED" } });
      break;

    case "job.enriched.v1": {
      const title = payloadString(payload, "title");
      const summary = payloadString(payload, "summary");
      const slug = payloadString(payload, "slug");
      if (!title || !summary || !slug) break;
      const tags = Array.isArray(payload.tags)
        ? payload.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 8)
        : [];
      await tx.jobEnrichment.upsert({
        where: { jobId },
        create: {
          jobId,
          title,
          summary,
          tags,
          slug,
          provider: payloadString(payload, "provider") ?? "mercury",
          model: payloadString(payload, "model") ?? "unknown",
        },
        update: {
          title,
          summary,
          tags,
          slug,
          provider: payloadString(payload, "provider") ?? "mercury",
          model: payloadString(payload, "model") ?? "unknown",
        },
      });
      break;
    }

    default:
      break;
  }
}
