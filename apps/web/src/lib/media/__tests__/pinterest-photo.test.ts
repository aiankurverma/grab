import { beforeAll, describe, expect, it } from "vitest";

import { classifyMediaUrl } from "@/lib/media/url";
import { PLATFORMS, platformCapability } from "@/lib/platforms";
import { safeDownloadName, signInstant, verifyInstant } from "@/lib/media/instant";
import type { MediaPreview } from "@/lib/worker/client";

describe("Pinterest Photo / Image Download Support", () => {
  beforeAll(() => {
    process.env.INTERNAL_API_SECRET = "test-secret-at-least-32-chars-long-for-hmac";
  });
  it("recognizes Pinterest URLs with full photo format support", () => {
    const pinUrl = "https://www.pinterest.com/pin/1098174690415756357/";
    const classified = classifyMediaUrl(pinUrl);
    expect(classified.platform).toBe("PINTEREST");

    const meta = PLATFORMS.PINTEREST;
    expect(meta.formats).toContain("jpg");
    expect(meta.formats).toContain("png");
    expect(meta.formats).toContain("mp4");
    expect(meta.formats).toContain("mp3");
    expect(platformCapability(meta)).toBe("Photos & Videos");
  });

  it("handles pin.it shortlinks correctly", () => {
    const shortUrl = "https://pin.it/abc123XYZ";
    const classified = classifyMediaUrl(shortUrl);
    expect(classified.platform).toBe("PINTEREST");
  });

  it("structures photo preview data correctly", () => {
    const preview: MediaPreview = {
      title: "Sports Car Wallpaper",
      durationSeconds: 0,
      uploader: "Madina",
      thumbnailUrl: "https://i.pinimg.com/originals/4b/15/fc/4b15fcc51e8500eb429cbda1e9f46f6c.jpg",
      platform: "pinterest",
      isLive: false,
      availableHeights: [1920],
      isImage: true,
      imageUrl: "https://i.pinimg.com/originals/4b/15/fc/4b15fcc51e8500eb429cbda1e9f46f6c.jpg",
      width: 1080,
      height: 1920,
    };

    expect(preview.isImage).toBe(true);
    expect(preview.imageUrl).toContain("i.pinimg.com/originals/");
    expect(preview.width).toBe(1080);
    expect(preview.height).toBe(1920);
    expect(preview.durationSeconds).toBe(0);
  });

  it("signs and verifies instant download tokens for JPG and PNG photos", () => {
    const directUrl = "https://i.pinimg.com/originals/4b/15/fc/4b15fcc51e8500eb429cbda1e9f46f6c.jpg";
    const headers = { referer: "https://www.pinterest.com/" };

    // Test JPG signing
    const jpgFilename = safeDownloadName("Sports Car Wallpaper", "jpg");
    expect(jpgFilename).toBe("Sports-Car-Wallpaper.jpg");

    const jpgToken = signInstant({
      u: directUrl,
      h: headers,
      f: jpgFilename,
      c: "image/jpeg",
    });
    const verifiedJpg = verifyInstant(jpgToken.token);
    expect(verifiedJpg).not.toBeNull();
    expect(verifiedJpg?.u).toBe(directUrl);
    expect(verifiedJpg?.f).toBe("Sports-Car-Wallpaper.jpg");
    expect(verifiedJpg?.c).toBe("image/jpeg");

    // Test PNG signing
    const pngFilename = safeDownloadName("Sports Car Wallpaper", "png");
    expect(pngFilename).toBe("Sports-Car-Wallpaper.png");

    const pngToken = signInstant({
      u: directUrl,
      h: headers,
      f: pngFilename,
      c: "image/png",
    });
    const verifiedPng = verifyInstant(pngToken.token);
    expect(verifiedPng).not.toBeNull();
    expect(verifiedPng?.u).toBe(directUrl);
    expect(verifiedPng?.f).toBe("Sports-Car-Wallpaper.png");
    expect(verifiedPng?.c).toBe("image/png");
  });
});
