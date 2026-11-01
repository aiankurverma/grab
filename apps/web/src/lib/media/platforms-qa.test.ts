import { describe, expect, it } from "vitest";

import { classifyMediaUrl, MediaUrlError } from "@/lib/media/url";
import {
  PLATFORMS,
  platformCapability,
  platformForHost,
  type PlatformId,
} from "@/lib/platforms";

describe("Platform Metadata & Capability Verification", () => {
  it("verifies YouTube metadata, formats, and 4K cap", () => {
    const yt = PLATFORMS.YOUTUBE;
    expect(yt.id).toBe("YOUTUBE");
    expect(yt.formats).toEqual(["mp3", "mp4"]);
    expect(yt.maxHeight).toBe(2160);
    expect(platformCapability(yt)).toBe("Up to 4K");
    expect(yt.hosts).toContain("youtube.com");
    expect(yt.hosts).toContain("youtu.be");
  });

  it("verifies Vimeo metadata, formats, and 4K cap", () => {
    const vimeo = PLATFORMS.VIMEO;
    expect(vimeo.id).toBe("VIMEO");
    expect(vimeo.formats).toEqual(["mp3", "mp4"]);
    expect(vimeo.maxHeight).toBe(2160);
    expect(platformCapability(vimeo)).toBe("Up to 4K");
    expect(vimeo.hosts).toContain("vimeo.com");
    expect(vimeo.hosts).toContain("player.vimeo.com");
  });

  it("verifies Dailymotion metadata, formats, and 1080p cap", () => {
    const dm = PLATFORMS.DAILYMOTION;
    expect(dm.id).toBe("DAILYMOTION");
    expect(dm.formats).toEqual(["mp3", "mp4"]);
    expect(dm.maxHeight).toBe(1080);
    expect(platformCapability(dm)).toBe("Up to 1080p");
    expect(dm.hosts).toContain("dailymotion.com");
    expect(dm.hosts).toContain("dai.ly");
    expect(dm.note).toContain("1080p");
  });
});

describe("YouTube URL Classification & Validation", () => {
  const validYouTubeUrls = [
    // Standard watch
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
    // Watch with trailing slash or additional params
    "https://www.youtube.com/watch/?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123&index=1",
    // Shortlinks (youtu.be)
    "https://youtu.be/dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?t=10",
    "http://youtu.be/dQw4w9WgXcQ",
    // Shorts
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ/",
    "https://youtube.com/shorts/dQw4w9WgXcQ?feature=share",
    // Embeds
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1",
    // Live & Clips
    "https://www.youtube.com/live/dQw4w9WgXcQ",
    "https://www.youtube.com/clip/Ugkxd1234567890",
    // Legacy /v/
    "https://www.youtube.com/v/dQw4w9WgXcQ",
  ];

  for (const url of validYouTubeUrls) {
    it(`accepts valid YouTube URL: ${url}`, () => {
      const res = classifyMediaUrl(url);
      expect(res.platform).toBe("YOUTUBE");
      expect(res.url).toBe(url);
    });
  }

  const invalidYouTubeUrls = [
    "https://www.youtube.com/",
    "https://www.youtube.com/feed/trending",
    "https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw",
    "https://www.youtube.com/@MrBeast",
    "https://www.youtube.com/watch",
    "https://www.youtube.com/watch?v=",
    "https://www.youtube.com/watch?v=   ",
    "https://www.youtube.com/shorts",
    "https://www.youtube.com/shorts/",
    "https://www.youtube.com/embed",
    "https://www.youtube.com/embed/",
    "https://www.youtube.com/live",
    "https://www.youtube.com/live/",
    "https://www.youtube.com/clip",
    "https://www.youtube.com/clip/",
    "https://youtu.be",
    "https://youtu.be/",
  ];

  for (const url of invalidYouTubeUrls) {
    it(`rejects non-video YouTube page: ${url}`, () => {
      expect(() => classifyMediaUrl(url)).toThrow(MediaUrlError);
    });
  }
});

describe("Vimeo URL Classification & Validation", () => {
  const validVimeoUrls = [
    // Standard numeric ID
    "https://vimeo.com/76979871",
    "http://vimeo.com/76979871",
    "https://www.vimeo.com/76979871",
    "https://vimeo.com/76979871/",
    "https://vimeo.com/76979871?param=1",
    // Unlisted review videos with hash
    "https://vimeo.com/76979871/d3b07384d1",
    // Embed player URLs
    "https://player.vimeo.com/video/76979871",
    "https://player.vimeo.com/video/76979871?autoplay=1",
    // Channels / Groups / Manage
    "https://vimeo.com/channels/staffpicks/76979871",
    "https://vimeo.com/groups/animation/videos/76979871",
    "https://vimeo.com/manage/videos/76979871",
  ];

  for (const url of validVimeoUrls) {
    it(`accepts valid Vimeo URL: ${url}`, () => {
      const res = classifyMediaUrl(url);
      expect(res.platform).toBe("VIMEO");
      expect(res.url).toBe(url);
    });
  }

  const invalidVimeoUrls = [
    "https://vimeo.com/",
    "https://vimeo.com/watch",
    "https://vimeo.com/upgrade",
    "https://vimeo.com/features/video-marketing",
    "https://vimeo.com/channels/staffpicks",
    "https://vimeo.com/channels/staffpicks/",
    "https://vimeo.com/groups/animation",
    "https://vimeo.com/video",
    "https://vimeo.com/video/",
    "https://player.vimeo.com/video",
    "https://player.vimeo.com/video/",
  ];

  for (const url of invalidVimeoUrls) {
    it(`rejects non-video Vimeo page: ${url}`, () => {
      expect(() => classifyMediaUrl(url)).toThrow(MediaUrlError);
    });
  }
});

describe("Dailymotion URL Classification & Validation", () => {
  const validDailymotionUrls = [
    // Standard video URL
    "https://www.dailymotion.com/video/x8abcdef",
    "http://www.dailymotion.com/video/x8abcdef",
    "https://dailymotion.com/video/x8abcdef",
    "https://touch.dailymotion.com/video/x8abcdef",
    "https://www.dailymotion.com/video/x8abcdef/",
    // Video URL with title slug
    "https://www.dailymotion.com/video/x7tgad0_official-trailer_shortfilms",
    "https://www.dailymotion.com/video/x8abcdef?playlist=x123",
    // Shortlinks (dai.ly)
    "https://dai.ly/x8abcdef",
    "http://dai.ly/x8abcdef",
    "https://dai.ly/x7tgad0?param=value",
    // Embed URLs
    "https://www.dailymotion.com/embed/video/x8abcdef",
    "https://www.dailymotion.com/embed/video/x8abcdef?autoplay=1",
  ];

  for (const url of validDailymotionUrls) {
    it(`accepts valid Dailymotion URL: ${url}`, () => {
      const res = classifyMediaUrl(url);
      expect(res.platform).toBe("DAILYMOTION");
      expect(res.url).toBe(url);
    });
  }

  const invalidDailymotionUrls = [
    "https://www.dailymotion.com/",
    "https://www.dailymotion.com/us",
    "https://www.dailymotion.com/hub/music",
    "https://www.dailymotion.com/user/PartnerChannel",
    "https://www.dailymotion.com/video",
    "https://www.dailymotion.com/video/",
    "https://www.dailymotion.com/embed/video",
    "https://www.dailymotion.com/embed/video/",
    "https://dai.ly",
    "https://dai.ly/",
  ];

  for (const url of invalidDailymotionUrls) {
    it(`rejects non-video Dailymotion page: ${url}`, () => {
      expect(() => classifyMediaUrl(url)).toThrow(MediaUrlError);
    });
  }
});

describe("UI Caps & Quality Picker Calculations", () => {
  const AUDIO_BITRATES = ["128", "192", "320"];
  const VIDEO_QUALITIES = ["360", "480", "720", "1080", "2160"];

  function computeQualities(format: "mp3" | "mp4" | "m4a", maxHeight: number) {
    if (format === "m4a") return ["original"];
    if (format === "mp3") return [...AUDIO_BITRATES];
    return VIDEO_QUALITIES.filter((value) => Number(value) <= maxHeight);
  }

  function computeEffectiveQuality(
    qualities: string[],
    chosenQuality: string,
    format: "mp3" | "mp4" | "m4a",
  ) {
    return qualities.includes(chosenQuality)
      ? chosenQuality
      : format === "mp3"
        ? "192"
        : format === "m4a"
          ? "original"
          : qualities.includes("1080")
            ? "1080"
            : (qualities[qualities.length - 1] ?? "720");
  }

  it("produces up to 4K resolutions for YouTube (maxHeight: 2160)", () => {
    const ytCap = PLATFORMS.YOUTUBE.maxHeight;
    expect(ytCap).toBe(2160);

    const videoQualities = computeQualities("mp4", ytCap);
    expect(videoQualities).toEqual(["360", "480", "720", "1080", "2160"]);

    const audioQualities = computeQualities("mp3", ytCap);
    expect(audioQualities).toEqual(["128", "192", "320"]);
  });

  it("produces up to 4K resolutions for Vimeo (maxHeight: 2160)", () => {
    const vimeoCap = PLATFORMS.VIMEO.maxHeight;
    expect(vimeoCap).toBe(2160);

    const videoQualities = computeQualities("mp4", vimeoCap);
    expect(videoQualities).toEqual(["360", "480", "720", "1080", "2160"]);

    const audioQualities = computeQualities("mp3", vimeoCap);
    expect(audioQualities).toEqual(["128", "192", "320"]);
  });

  it("produces up to 1080p resolutions for Dailymotion (maxHeight: 1080)", () => {
    const dmCap = PLATFORMS.DAILYMOTION.maxHeight;
    expect(dmCap).toBe(1080);

    const videoQualities = computeQualities("mp4", dmCap);
    expect(videoQualities).toEqual(["360", "480", "720", "1080"]);
    expect(videoQualities).not.toContain("2160");

    const audioQualities = computeQualities("mp3", dmCap);
    expect(audioQualities).toEqual(["128", "192", "320"]);
  });

  it("gracefully downscales from 4K (2160) to 1080 when switching to Dailymotion", () => {
    const dmQualities = computeQualities("mp4", PLATFORMS.DAILYMOTION.maxHeight);
    const effective = computeEffectiveQuality(dmQualities, "2160", "mp4");
    expect(effective).toBe("1080");
  });

  it("gracefully falls back to 192 kbps when switching from MP4 quality to MP3", () => {
    const audioQualities = computeQualities("mp3", PLATFORMS.YOUTUBE.maxHeight);
    const effective = computeEffectiveQuality(audioQualities, "2160", "mp3");
    expect(effective).toBe("192");
  });

  it("respects source preview maxHeight constraints (e.g., 720p source)", () => {
    const sourceCap = 720;
    const platformCap = PLATFORMS.YOUTUBE.maxHeight; // 2160
    const effectiveMax = Math.min(platformCap, sourceCap);
    expect(effectiveMax).toBe(720);

    const videoQualities = computeQualities("mp4", effectiveMax);
    expect(videoQualities).toEqual(["360", "480", "720"]);

    const effective = computeEffectiveQuality(videoQualities, "1080", "mp4");
    expect(effective).toBe("720");
  });
});
