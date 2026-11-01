import crypto from "node:crypto";

/**
 * SHA-256 hash of the master secret key.
 * Only the hash is stored on the server to prevent plain-text secret exposure.
 */
export const ADMIN_SECRET_SHA256 =
  process.env.ADMIN_SECRET_SHA256 ||
  "104f5165807ebdd54a3b1146eddc5224c55094948e90197b4b942736449b5f06";

/**
 * Verifies the provided key using SHA-256 and constant-time comparison (timing attack safe).
 */
export function verifyAdminSecret(providedKey: string | null | undefined): boolean {
  if (!providedKey || typeof providedKey !== "string") return false;
  const trimmed = providedKey.trim();
  if (!trimmed) return false;

  const candidateHash = crypto.createHash("sha256").update(trimmed).digest("hex");
  const targetHash = ADMIN_SECRET_SHA256.trim().toLowerCase();

  if (candidateHash.length !== targetHash.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(candidateHash, "hex"),
      Buffer.from(targetHash, "hex"),
    );
  } catch {
    return false;
  }
}
