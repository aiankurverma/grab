import { db } from "@/lib/db";
import { friendlyFailure } from "@/lib/jobs/errors";
import { signMediaKey } from "@/lib/media/sign";

const TERMINAL = ["READY", "FAILED", "CANCELLED", "EXPIRED"] as const;

export type JobView = {
  id: string;
  url: string;
  platform: string;
  format: string;
  quality: string;
  status: string;
  progress: number;
  title: string | null;
  durationSeconds: number | null;
  uploader: string | null;
  thumbnailUrl: string | null;
  outputUrl: string | null;
  outputSizeBytes: number | null;
  failureCode: string | null;
  failureMessage: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  queueAhead: number;
  lane: string;
  terminal: boolean;
  enrichment: { title: string; summary: string; tags: string[]; slug: string } | null;
};

export async function getJobView(id: string): Promise<JobView | null> {
  const job = await db.job.findUnique({
    where: { id },
    select: {
      id: true,
      url: true,
      platform: true,
      format: true,
      quality: true,
      status: true,
      progress: true,
      title: true,
      durationSeconds: true,
      uploader: true,
      thumbnailUrl: true,
      outputKey: true,
      outputUrl: true,
      outputSizeBytes: true,
      failureCode: true,
      failureMessage: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
      enrichment: {
        select: { title: true, summary: true, tags: true, slug: true },
      },
    },
  });

  if (!job) return null;

  const lane =
    job.format === "MP3" ? "audio" : job.quality === "2160" ? "video_4k" : "video";
  const queueAhead =
    job.status === "QUEUED"
      ? await db.job.count({
          where: {
            id: { not: job.id },
            status: "QUEUED",
            format: job.format,
            quality: job.quality,
            createdAt: { lt: job.createdAt },
          },
        })
      : 0;

  // Always use signed HMAC token with TTL instead of leaking raw storage bucket or backend URLs
  const signedOutput = job.outputKey ? signMediaKey(job.outputKey) : null;

  return {
    id: job.id,
    url: job.url,
    platform: job.platform,
    format: job.format,
    quality: job.quality,
    status: job.status,
    progress: job.progress,
    title: job.title,
    durationSeconds: job.durationSeconds,
    uploader: job.uploader,
    thumbnailUrl: job.thumbnailUrl,
    outputUrl: signedOutput,
    outputSizeBytes: job.outputSizeBytes ? Number(job.outputSizeBytes) : null,
    failureCode: job.failureCode,
    failureMessage: friendlyFailure(job.failureCode, job.failureMessage),
    expiresAt: job.expiresAt ? job.expiresAt.toISOString() : null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    queueAhead,
    lane,
    terminal: TERMINAL.includes(job.status as (typeof TERMINAL)[number]),
    enrichment: job.enrichment,
  };
}
