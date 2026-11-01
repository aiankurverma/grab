import { createHash } from "node:crypto";
import { db } from "@/lib/db";

export interface ConversionEventRecord {
  id?: string;
  timestamp: Date;
  visitorHash: string;
  userAgent: string | null;
  originalUrl: string;
  platform: string;
  format: string;
  quality: string;
  title: string | null;
  duration: number | null;
  cloudinaryThumbnailUrl: string | null;
}

export interface ConversionEventInput {
  visitorIp?: string;
  userAgent?: string | null;
  originalUrl: string;
  platform: string;
  format: string;
  quality: string;
  title?: string | null;
  duration?: number | null;
  cloudinaryThumbnailUrl?: string | null;
  timestamp?: Date;
}

export interface AnalyticsInsights {
  activeUsersCount: number;
  totalDownloads: number;
  platformBreakdown: Record<string, number>;
  recentHistory: Array<{
    id?: string;
    title: string | null;
    originalUrl: string;
    platform: string;
    format: string;
    quality: string;
    cloudinaryThumbnailUrl: string | null;
    timestamp: string;
  }>;
}

// In-memory fallback and fast-path buffers
const memoryVisitors = new Map<string, { lastSeen: number; userAgent: string | null; ipHash: string }>();
const memoryConversions: ConversionEventRecord[] = [];
const MAX_MEMORY_CONVERSIONS = 200;

/**
 * Extract client IP from standard HTTP headers
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}

/**
 * Generate a deterministic privacy-preserving hash for a visitor based on IP and User-Agent
 */
export function hashVisitor(ip: string, userAgent?: string | null): string {
  const salt = process.env.AUTH_SECRET || "grabwave-salt";
  const raw = `${ip.trim()}|${userAgent ?? ""}|${salt}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

/**
 * Record or ping an active visitor (non-blocking)
 */
export async function trackActiveVisitor(params: {
  ip?: string;
  userAgent?: string | null;
  visitorHash?: string;
}): Promise<string> {
  const ip = params.ip || "127.0.0.1";
  const hash = params.visitorHash || hashVisitor(ip, params.userAgent);
  const now = Date.now();

  // In-memory update
  memoryVisitors.set(hash, {
    lastSeen: now,
    userAgent: params.userAgent ?? null,
    ipHash: hash,
  });

  // Background DB update
  Promise.resolve().then(async () => {
    try {
      await db.activeVisitor.upsert({
        where: { id: hash },
        update: {
          lastSeen: new Date(now),
          userAgent: params.userAgent ?? null,
          ipHash: hash,
        },
        create: {
          id: hash,
          lastSeen: new Date(now),
          userAgent: params.userAgent ?? null,
          ipHash: hash,
        },
      });
    } catch (err) {
      console.warn("[tracker] DB activeVisitor upsert error:", err instanceof Error ? err.message : err);
    }
  });

  return hash;
}

/**
 * Record a media conversion or download event (non-blocking)
 */
export async function recordConversionEvent(input: ConversionEventInput): Promise<void> {
  const ip = input.visitorIp || "127.0.0.1";
  const visitorHash = hashVisitor(ip, input.userAgent);
  const eventTime = input.timestamp || new Date();

  const record: ConversionEventRecord = {
    timestamp: eventTime,
    visitorHash,
    userAgent: input.userAgent ?? null,
    originalUrl: input.originalUrl,
    platform: input.platform.toLowerCase(),
    format: input.format.toLowerCase(),
    quality: input.quality,
    title: input.title ?? null,
    duration: input.duration ?? null,
    cloudinaryThumbnailUrl: input.cloudinaryThumbnailUrl ?? null,
  };

  // Add to memory buffer
  memoryConversions.unshift(record);
  if (memoryConversions.length > MAX_MEMORY_CONVERSIONS) {
    memoryConversions.pop();
  }

  // Update active visitor
  await trackActiveVisitor({
    ip,
    userAgent: input.userAgent,
    visitorHash,
  });

  // Background DB persistence
  Promise.resolve().then(async () => {
    try {
      await db.conversionEvent.create({
        data: {
          timestamp: record.timestamp,
          visitorHash: record.visitorHash,
          userAgent: record.userAgent,
          originalUrl: record.originalUrl,
          platform: record.platform,
          format: record.format,
          quality: record.quality,
          title: record.title,
          duration: record.duration,
          cloudinaryThumbnailUrl: record.cloudinaryThumbnailUrl,
        },
      });
    } catch (err) {
      console.warn("[tracker] DB conversionEvent create error:", err instanceof Error ? err.message : err);
    }
  });
}

/**
 * Get aggregated analytics insights for the secret admin dashboard
 */
export async function getAnalyticsInsights(): Promise<AnalyticsInsights> {
  const windowMinutes = 15;
  const cutoffTime = new Date(Date.now() - windowMinutes * 60 * 1000);

  // Active users count (15 minutes window)
  let activeUsersCount = 0;
  try {
    const dbCount = await db.activeVisitor.count({
      where: { lastSeen: { gte: cutoffTime } },
    });
    // Merge with in-memory active visitors in case DB hasn't flushed or for dev
    const memoryActive = Array.from(memoryVisitors.values()).filter(
      (v) => v.lastSeen >= cutoffTime.getTime()
    ).length;
    activeUsersCount = Math.max(dbCount, memoryActive);
  } catch {
    activeUsersCount = Array.from(memoryVisitors.values()).filter(
      (v) => v.lastSeen >= cutoffTime.getTime()
    ).length;
  }

  // Total downloads & platform breakdown
  let totalDownloads = 0;
  const platformBreakdown: Record<string, number> = {};
  let recentList: Array<{
    id?: string;
    title: string | null;
    originalUrl: string;
    platform: string;
    format: string;
    quality: string;
    cloudinaryThumbnailUrl: string | null;
    timestamp: Date;
  }> = [];

  try {
    totalDownloads = await db.conversionEvent.count();

    const groupResult = await db.conversionEvent.groupBy({
      by: ["platform"],
      _count: { _all: true },
    });

    for (const item of groupResult) {
      const name = item.platform.charAt(0).toUpperCase() + item.platform.slice(1);
      platformBreakdown[name] = (platformBreakdown[name] || 0) + item._count._all;
    }

    recentList = await db.conversionEvent.findMany({
      orderBy: { timestamp: "desc" },
      take: 250,
      select: {
        id: true,
        title: true,
        originalUrl: true,
        platform: true,
        format: true,
        quality: true,
        cloudinaryThumbnailUrl: true,
        timestamp: true,
      },
    });
  } catch (err) {
    console.warn("[tracker] Error querying DB analytics, falling back to memory:", err);
  }

  // If DB was empty or returned fewer than memory, merge memory entries
  if (recentList.length === 0 && memoryConversions.length > 0) {
    totalDownloads = memoryConversions.length;
    for (const c of memoryConversions) {
      const name = c.platform.charAt(0).toUpperCase() + c.platform.slice(1);
      platformBreakdown[name] = (platformBreakdown[name] || 0) + 1;
      recentList.push(c);
    }
  }

  return {
    activeUsersCount,
    totalDownloads,
    platformBreakdown,
    recentHistory: recentList.map((item) => ({
      id: item.id,
      title: item.title,
      originalUrl: item.originalUrl,
      platform: item.platform.charAt(0).toUpperCase() + item.platform.slice(1),
      format: item.format.toUpperCase(),
      quality: item.quality,
      cloudinaryThumbnailUrl: item.cloudinaryThumbnailUrl,
      timestamp: item.timestamp.toISOString(),
    })),
  };
}
