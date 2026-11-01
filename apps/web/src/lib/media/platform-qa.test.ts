import { describe, expect, it } from "vitest";

import { classifyMediaUrl, MediaUrlError } from "@/lib/media/url";
import { PLATFORMS, platformCapability, platformForHost } from "@/lib/platforms";

describe("Platform QA: X (Twitter), Reddit, Twitch, Pinterest", () => {
  describe("X / Twitter", () => {
    it("classifies valid X and Twitter post URLs with status IDs", () => {
      const validUrls = [
        "https://x.com/jack/status/20",
        "https://twitter.com/jack/status/20",
        "https://mobile.twitter.com/nasa/status/1789012345678901234",
        "https://mobile.x.com/openai/status/9876543210987654321",
        "https://x.com/status/123456789",
        "https://twitter.com/status/987654321",
        "https://x.com/i/status/1234567890123456789",
        "https://twitter.com/i/web/status/1234567890123456789",
        "https://x.com/user/status/1234567890?s=20&t=abcdef",
        "https://x.com/user/status/1234567890/video/1",
      ];

      for (const url of validUrls) {
        const result = classifyMediaUrl(url);
        expect(result.platform).toBe("X");
      }
    });

    it("rejects non-post or non-video X URLs (profiles, home, settings)", () => {
      const invalidUrls = [
        "https://x.com",
        "https://x.com/",
        "https://twitter.com/home",
        "https://x.com/elonmusk",
        "https://x.com/user/status/",
        "https://twitter.com/status",
        "https://x.com/explore",
      ];

      for (const url of invalidUrls) {
        expect(() => classifyMediaUrl(url)).toThrow(MediaUrlError);
      }
    });

    it("rejects live broadcasts and spaces with dedicated error", () => {
      expect(() =>
        classifyMediaUrl("https://x.com/i/broadcasts/1234567890"),
      ).toThrowError(/Live broadcasts and Spaces on X/);
      expect(() =>
        classifyMediaUrl("https://twitter.com/i/spaces/1234567890"),
      ).toThrowError(/Live broadcasts and Spaces on X/);
    });

    it("verifies X platform metadata, 1080p cap, and badge styling", () => {
      const meta = PLATFORMS.X;
      expect(meta.id).toBe("X");
      expect(meta.label).toBe("X / Twitter");
      expect(meta.mark).toBe("X");
      expect(meta.maxHeight).toBe(1080);
      expect(meta.formats).toEqual(["mp3", "mp4"]);
      expect(meta.beta).toBe(true);
      expect(platformCapability(meta)).toBe("Up to 1080p");
      expect(platformForHost("x.com")?.id).toBe("X");
      expect(platformForHost("twitter.com")?.id).toBe("X");
      expect(platformForHost("mobile.twitter.com")?.id).toBe("X");
    });
  });

  describe("Reddit", () => {
    it("classifies valid Reddit comment and hosted video URLs", () => {
      const validUrls = [
        "https://www.reddit.com/r/funny/comments/18xyz/dog_playing_piano/",
        "https://reddit.com/r/videos/comments/abcdef123/cool_video",
        "https://reddit.com/comments/18xyz/",
        "https://v.redd.it/abcdef123456",
        "https://www.v.redd.it/xyz987",
        "https://www.reddit.com/r/funny/s/xyzShareToken",
        "https://reddit.com/video/123456789",
      ];

      for (const url of validUrls) {
        const result = classifyMediaUrl(url);
        expect(result.platform).toBe("REDDIT");
      }
    });

    it("rejects subreddit pages, home feeds, or empty comment links", () => {
      const invalidUrls = [
        "https://reddit.com",
        "https://reddit.com/",
        "https://www.reddit.com/r/funny",
        "https://reddit.com/r/videos/",
        "https://reddit.com/r/funny/comments/",
        "https://v.redd.it/",
      ];

      for (const url of invalidUrls) {
        expect(() => classifyMediaUrl(url)).toThrow(MediaUrlError);
      }
    });

    it("verifies Reddit platform metadata, 1080p cap, and formats", () => {
      const meta = PLATFORMS.REDDIT;
      expect(meta.id).toBe("REDDIT");
      expect(meta.label).toBe("Reddit");
      expect(meta.mark).toBe("RD");
      expect(meta.maxHeight).toBe(1080);
      expect(meta.formats).toEqual(["mp3", "mp4"]);
      expect(meta.beta).toBe(true);
      expect(platformCapability(meta)).toBe("Up to 1080p");
      expect(platformForHost("reddit.com")?.id).toBe("REDDIT");
      expect(platformForHost("www.reddit.com")?.id).toBe("REDDIT");
      expect(platformForHost("v.redd.it")?.id).toBe("REDDIT");
    });
  });

  describe("Twitch", () => {
    it("classifies valid Twitch clip URLs", () => {
      const validUrls = [
        "https://clips.twitch.tv/FrailTameGrasshopperDoubleRainbow-Abc123",
        "https://www.clips.twitch.tv/GloriousPunchSlug-Def456",
        "https://www.twitch.tv/ninja/clip/FrailTameGrasshopperDoubleRainbow-Abc123",
        "https://twitch.tv/shroud/clip/AwesomeShotSlug-123",
        "https://www.twitch.tv/clip/DirectClipSlug-789",
      ];

      for (const url of validUrls) {
        const result = classifyMediaUrl(url);
        expect(result.platform).toBe("TWITCH");
      }
    });

    it("rejects Twitch live streams and channels with helpful clip-only message", () => {
      const liveStreamUrls = [
        "https://twitch.tv",
        "https://www.twitch.tv/ninja",
        "https://twitch.tv/shroud",
        "https://www.twitch.tv/directory",
      ];

      for (const url of liveStreamUrls) {
        expect(() => classifyMediaUrl(url)).toThrowError(
          /Twitch live streams and channels are not supported/,
        );
      }
    });

    it("rejects Twitch full broadcast VODs with specific explanation", () => {
      expect(() =>
        classifyMediaUrl("https://www.twitch.tv/videos/1234567890"),
      ).toThrowError(/Twitch full broadcast VODs are not supported/);
    });

    it("verifies Twitch metadata, 1080p cap, badge styling, and formats", () => {
      const meta = PLATFORMS.TWITCH;
      expect(meta.id).toBe("TWITCH");
      expect(meta.label).toBe("Twitch clips");
      expect(meta.mark).toBe("TW");
      expect(meta.maxHeight).toBe(1080);
      expect(meta.formats).toEqual(["mp3", "mp4"]);
      expect(meta.beta).toBe(true);
      expect(platformCapability(meta)).toBe("Up to 1080p");
      expect(platformForHost("twitch.tv")?.id).toBe("TWITCH");
      expect(platformForHost("clips.twitch.tv")?.id).toBe("TWITCH");
    });
  });

  describe("Pinterest", () => {
    it("classifies valid Pinterest pin URLs and pin.it shortlinks", () => {
      const validUrls = [
        "https://www.pinterest.com/pin/993618230263627447/",
        "https://pinterest.com/pin/993618230263627447",
        "https://www.pinterest.com/pin/993618230263627447/sent/?invite_code=abc",
        "https://pin.it/3XyZaBc",
        "https://www.pin.it/7WvUtSr",
      ];

      for (const url of validUrls) {
        const result = classifyMediaUrl(url);
        expect(result.platform).toBe("PINTEREST");
      }
    });

    it("rejects Pinterest profile, search, and empty pin URLs", () => {
      const invalidUrls = [
        "https://pinterest.com",
        "https://pinterest.com/",
        "https://www.pinterest.com/search/pins/?q=diy",
        "https://www.pinterest.com/username/",
        "https://www.pinterest.com/pin/",
        "https://pin.it/",
      ];

      for (const url of invalidUrls) {
        expect(() => classifyMediaUrl(url)).toThrow(MediaUrlError);
      }
    });

    it("verifies Pinterest metadata, 1080p cap, and formats", () => {
      const meta = PLATFORMS.PINTEREST;
      expect(meta.id).toBe("PINTEREST");
      expect(meta.label).toBe("Pinterest");
      expect(meta.mark).toBe("PT");
      expect(meta.maxHeight).toBe(1080);
      expect(meta.formats).toEqual(["jpg", "png", "mp4", "mp3"]);
      expect(meta.beta).toBe(true);
      expect(platformCapability(meta)).toBe("Photos & Videos");
      expect(platformForHost("pinterest.com")?.id).toBe("PINTEREST");
      expect(platformForHost("pin.it")?.id).toBe("PINTEREST");
    });
  });

  describe("Error messages & unsupported platforms", () => {
    it("lists all supported platforms when an unknown domain is provided", () => {
      expect(() => classifyMediaUrl("https://unknownsite.example.com/video/123")).toThrowError(
        /YouTube, Instagram, TikTok, Facebook, X, Reddit, Twitch, Pinterest, Vimeo, Dailymotion, or SoundCloud/,
      );
    });
  });
});
