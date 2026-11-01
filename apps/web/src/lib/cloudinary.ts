import { v2 as cloudinary } from "cloudinary";

// Initialize Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "yt6oi9ll",
  api_key: process.env.CLOUDINARY_API_KEY || "772144696673483",
  api_secret: process.env.CLOUDINARY_API_SECRET || "KlWyRb7i9pd_Zcwa3ZOT1lF__jM",
  secure: true,
});

export { cloudinary };

// In-memory cache to avoid duplicate uploads for the same source thumbnail
const thumbnailUploadCache = new Map<string, string>();

/**
 * Upload an image (remote URL or base64 data) to Cloudinary under the folder `grabwave/history`.
 * Non-blocking, safe error handling: returns the secure URL on success, or null on failure.
 */
export async function uploadThumbnailToCloudinary(
  imageUrl: string | null | undefined,
  options?: { publicId?: string; tags?: string[] }
): Promise<string | null> {
  if (!imageUrl || typeof imageUrl !== "string") {
    return null;
  }

  const trimmed = imageUrl.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("data:image/")) {
    return null;
  }

  // If already hosted on Cloudinary, return as is
  if (trimmed.includes("cloudinary.com")) {
    return trimmed;
  }

  // Check cache
  const cached = thumbnailUploadCache.get(trimmed);
  if (cached) {
    return cached;
  }

  try {
    const result = await cloudinary.uploader.upload(trimmed, {
      folder: "grabwave/history",
      resource_type: "image",
      overwrite: false,
      public_id: options?.publicId,
      tags: options?.tags ?? ["grabwave", "preview"],
    });

    if (result && result.secure_url) {
      // Keep cache size bounded
      if (thumbnailUploadCache.size > 500) {
        const firstKey = thumbnailUploadCache.keys().next().value;
        if (firstKey) thumbnailUploadCache.delete(firstKey);
      }
      thumbnailUploadCache.set(trimmed, result.secure_url);
      return result.secure_url;
    }

    return null;
  } catch (error) {
    console.warn("[cloudinary] Failed to upload thumbnail:", error instanceof Error ? error.message : error);
    return null;
  }
}
