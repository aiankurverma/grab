import { describe, expect, it } from "vitest";
import { classifyMediaUrl, MediaUrlError } from "./url";

describe("URL Classification & Validation", () => {
  describe("Instagram", () => {
    const validUrls = [
      "https://www.instagram.com/reel/C7X3Nf2v5kL/",
      "https://www.instagram.com/reel/C7X3Nf2v5kL",
      "https://instagram.com/reel/C7X3Nf2v5kL/",
      "https://www.instagram.com/reels/C7X3Nf2v5kL/",
      "https://www.instagram.com/p/C7X3Nf2v5kL/",
      "https://www.instagram.com/p/C7X3Nf2v5kL",
      "https://instagram.com/p/C7X3Nf2v5kL/",
      "https://www.instagram.com/tv/C7X3Nf2v5kL/",
      "https://www.instagram.com/tv/C7X3Nf2v5kL",
      "https://www.instagram.com/share/C7X3Nf2v5kL/",
      "https://www.instagram.com/share/reel/C7X3Nf2v5kL/",
      "https://www.instagram.com/share/p/C7X3Nf2v5kL/",
      "https://www.instagram.com/share/r/C7X3Nf2v5kL/",
      "https://instagr.am/p/C7X3Nf2v5kL/",
      "https://instagr.am/reel/C7X3Nf2v5kL/",
      "https://www.instagr.am/p/C7X3Nf2v5kL/",
    ];

    for (const url of validUrls) {
      it(`accepts valid Instagram URL: ${url}`, () => {
        const result = classifyMediaUrl(url);
        expect(result.platform).toBe("INSTAGRAM");
      });
    }

    const invalidUrls = [
      "https://www.instagram.com/",
      "https://www.instagram.com/explore/",
      "https://www.instagram.com/username/",
      "https://www.instagram.com/reel/",
      "https://www.instagram.com/reel",
      "https://www.instagram.com/reels/",
      "https://www.instagram.com/p/",
      "https://www.instagram.com/p",
      "https://www.instagram.com/tv/",
      "https://www.instagram.com/share/",
    ];

    for (const url of invalidUrls) {
      it(`rejects non-media Instagram URL: ${url}`, () => {
        expect(() => classifyMediaUrl(url)).toThrow(MediaUrlError);
      });
    }
  });

  describe("TikTok", () => {
    const validUrls = [
      "https://www.tiktok.com/@tiktok/video/7106594312292453678",
      "https://www.tiktok.com/@user.name/video/7106594312292453678?is_from_webapp=1",
      "https://tiktok.com/@user/video/7106594312292453678",
      "https://vt.tiktok.com/ZS2xxxxxx/",
      "https://vm.tiktok.com/ZMxxxxxx/",
      "https://vt.tiktok.com/ZS2xxxxxx",
      "https://vm.tiktok.com/ZMxxxxxx",
      "https://www.tiktok.com/t/ZT8xxxxxx/",
      "https://www.tiktok.com/t/ZT8xxxxxx",
      "https://m.tiktok.com/v/7106594312292453678.html",
      "https://www.tiktok.com/@tiktok/photo/7106594312292453678",
      "https://www.tiktok.com/@user/photo/7106594312292453678?is_from_webapp=1",
    ];

    for (const url of validUrls) {
      it(`accepts valid TikTok URL: ${url}`, () => {
        const result = classifyMediaUrl(url);
        expect(result.platform).toBe("TIKTOK");
      });
    }

    const invalidUrls = [
      "https://www.tiktok.com/",
      "https://www.tiktok.com/@tiktok",
      "https://www.tiktok.com/@tiktok/",
      "https://www.tiktok.com/foryou",
      "https://vt.tiktok.com/",
      "https://vt.tiktok.com",
      "https://vm.tiktok.com/",
      "https://vm.tiktok.com",
      "https://www.tiktok.com/t/",
      "https://www.tiktok.com/t",
      "https://www.tiktok.com/@user/video/",
      "https://www.tiktok.com/@user/video",
      "https://www.tiktok.com/@user/photo/",
    ];

    for (const url of invalidUrls) {
      it(`rejects non-media TikTok URL: ${url}`, () => {
        expect(() => classifyMediaUrl(url)).toThrow(MediaUrlError);
      });
    }
  });

  describe("Facebook", () => {
    const validUrls = [
      "https://www.facebook.com/watch/?v=123456789",
      "https://www.facebook.com/watch?v=123456789",
      "https://www.facebook.com/watch/1234567890/",
      "https://www.facebook.com/watch/1234567890",
      "https://www.facebook.com/watch/live/?v=123456789",
      "https://facebook.com/watch/?v=123456789",
      "https://web.facebook.com/watch/?v=123456789",
      "https://m.facebook.com/watch/?v=123456789",
      "https://fb.watch/abcdef123/",
      "https://fb.watch/abcdef123",
      "https://www.fb.watch/abcdef123/",
      "https://www.facebook.com/share/v/123456789/",
      "https://www.facebook.com/share/v/123456789",
      "https://www.facebook.com/share/r/123456789/",
      "https://www.facebook.com/share/r/123456789",
      "https://www.facebook.com/share/p/123456789/",
      "https://www.facebook.com/share/123456789/",
      "https://www.facebook.com/reel/1234567890",
      "https://www.facebook.com/reel/1234567890/",
      "https://www.facebook.com/reels/1234567890",
      "https://www.facebook.com/reels/1234567890/",
      "https://web.facebook.com/reel/1234567890",
      "https://www.facebook.com/username/videos/1234567890/",
      "https://www.facebook.com/video.php?v=1234567890",
      "https://www.facebook.com/story.php?story_fbid=123&v=456",
      "https://fb.com/watch/?v=123456789",
      "https://fb.com/reel/1234567890",
      "https://www.fb.com/watch/?v=123456789",
    ];

    for (const url of validUrls) {
      it(`accepts valid Facebook URL: ${url}`, () => {
        const result = classifyMediaUrl(url);
        expect(result.platform).toBe("FACEBOOK");
      });
    }

    const invalidUrls = [
      "https://www.facebook.com/",
      "https://www.facebook.com/username",
      "https://www.facebook.com/groups/1234",
      "https://www.facebook.com/watch/",
      "https://www.facebook.com/watch",
      "https://fb.watch/",
      "https://fb.watch",
      "https://www.facebook.com/share/v/",
      "https://www.facebook.com/share/r/",
      "https://www.facebook.com/share/",
      "https://www.facebook.com/reel/",
      "https://www.facebook.com/reels/",
    ];

    for (const url of invalidUrls) {
      it(`rejects non-media Facebook URL: ${url}`, () => {
        expect(() => classifyMediaUrl(url)).toThrow(MediaUrlError);
      });
    }
  });
});
