import { isAiFeatureEnabled } from "@/lib/system-control";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function workerUrl(): string {
  return (process.env.WORKER_URL ?? "http://localhost:8000").replace(/\/$/, "");
}

export function internalSecret(): string {
  return requireEnv("INTERNAL_API_SECRET");
}

export function aiEnabled(): boolean {
  if (process.env.AI_ENRICHMENT_ENABLED === "false") return false;
  return isAiFeatureEnabled();
}

export const aiEnrichmentEnabled = aiEnabled;
