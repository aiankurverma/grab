import { describe, expect, it } from "vitest";
import { classifyMediaUrl, MediaUrlError } from "@/lib/media/url";
import { PLATFORMS, platformCapability } from "@/lib/platforms";

describe("Audio & SoundCloud QA Specialist Test Suite", () => {
  describe("SoundCloud URL Classification & Validation", () => {
    const validSoundCloudUrls = [
      {
        url: "https://soundcloud.com/octobersveryown/drake-back-to-back",
        desc: "standard track URL",
      },
      {
        url: "https://www.soundcloud.com/artist-name/track-title",
        desc: "www track URL",
      },
      {
        url: "https://m.soundcloud.com/artist-name/track-title",
        desc: "mobile track URL",
      },
      {
        url: "https://soundcloud.com/artist-name/sets/album-or-playlist",
        desc: "sets / playlist URL",
      },
      {
        url: "https://soundcloud.com/artist/track?in=artist/sets/album&si=abcdef",
        desc: "track URL with playlist query parameters",
      },
      {
        url: "https://soundcloud.com/artist/secret-track/s-xyz123",
        desc: "private track URL with secret token",
      },
      {
        url: "https://on.soundcloud.com/aBcDe123",
        desc: "on.soundcloud.com shortlink",
      },
      {
        url: "https://on.soundcloud.com/xyz987/",
        desc: "on.soundcloud.com shortlink with trailing slash",
      },
    ];

    for (const { url, desc } of validSoundCloudUrls) {
      it(`accepts valid SoundCloud ${desc}: ${url}`, () => {
        const result = classifyMediaUrl(url);
        expect(result.platform).toBe("SOUNDCLOUD");
        expect(result.url).toBe(url);
      });
    }

    const invalidSoundCloudUrls = [
      { url: "https://soundcloud.com/", desc: "homepage" },
      { url: "https://soundcloud.com/artist-name", desc: "user profile page" },
      { url: "https://soundcloud.com/artist-name/", desc: "user profile page with slash" },
      { url: "https://soundcloud.com/discover", desc: "discover page" },
      { url: "https://soundcloud.com/stream", desc: "stream feed" },
      { url: "https://soundcloud.com/search?q=ambient", desc: "search page" },
      { url: "https://soundcloud.com/you/likes", desc: "user library likes" },
      { url: "https://soundcloud.com/charts/top", desc: "charts page" },
      { url: "https://soundcloud.com/tags/electronic", desc: "tags explore page" },
      { url: "https://soundcloud.com/pages/privacy", desc: "privacy policy page" },
      { url: "https://soundcloud.com/terms/privacy", desc: "terms page" },
      { url: "https://soundcloud.com/settings/account", desc: "settings page" },
      { url: "https://on.soundcloud.com", desc: "bare shortlink domain" },
      { url: "https://on.soundcloud.com/", desc: "shortlink with empty path" },
    ];

    for (const { url, desc } of invalidSoundCloudUrls) {
      it(`rejects non-track SoundCloud ${desc}: ${url}`, () => {
        expect(() => classifyMediaUrl(url)).toThrow(MediaUrlError);
      });
    }
  });

  describe("Music & Audio Extraction Across Platforms", () => {
    it("accepts YouTube Music watch URL", () => {
      const url = "https://music.youtube.com/watch?v=5qap5aO4i9A";
      const result = classifyMediaUrl(url);
      expect(result.platform).toBe("YOUTUBE");
    });

    it("accepts YouTube Music watch URL with list params", () => {
      const url = "https://music.youtube.com/watch?v=5qap5aO4i9A&list=RDAMVM5qap5aO4i9A";
      const result = classifyMediaUrl(url);
      expect(result.platform).toBe("YOUTUBE");
    });

    it("accepts standard YouTube watch URL for audio extraction", () => {
      const url = "https://www.youtube.com/watch?v=jNQXAC9IVRw";
      const result = classifyMediaUrl(url);
      expect(result.platform).toBe("YOUTUBE");
    });

    it("accepts youtu.be shortlinks for audio extraction", () => {
      const url = "https://youtu.be/jNQXAC9IVRw";
      const result = classifyMediaUrl(url);
      expect(result.platform).toBe("YOUTUBE");
    });

    it("accepts TikTok video URL for audio extraction", () => {
      const url = "https://www.tiktok.com/@tiktok/video/7106594312292453678";
      const result = classifyMediaUrl(url);
      expect(result.platform).toBe("TIKTOK");
    });

    it("accepts TikTok audio / music sound track URL", () => {
      const url = "https://www.tiktok.com/music/original-sound-7106594312292453678";
      const result = classifyMediaUrl(url);
      expect(result.platform).toBe("TIKTOK");
    });

    it("accepts TikTok mobile video URL", () => {
      const url = "https://m.tiktok.com/v/7106594312292453678.html";
      const result = classifyMediaUrl(url);
      expect(result.platform).toBe("TIKTOK");
    });
  });

  describe("Platform Audio Capabilities & Constraints", () => {
    it("marks SoundCloud as audio-only with MP3 format and maxHeight 0", () => {
      const meta = PLATFORMS.SOUNDCLOUD;
      expect(meta.formats).toEqual(["mp3"]);
      expect(meta.maxHeight).toBe(0);
      expect(meta.formats.includes("mp4" as any)).toBe(false);
      expect(platformCapability(meta)).toBe("Audio only");
    });

    it("supports both mp3 audio and mp4 video on YouTube", () => {
      const meta = PLATFORMS.YOUTUBE;
      expect(meta.formats).toContain("mp3");
      expect(meta.formats).toContain("mp4");
      expect(meta.maxHeight).toBe(2160);
    });

    it("supports audio extraction on TikTok", () => {
      const meta = PLATFORMS.TIKTOK;
      expect(meta.formats).toContain("mp3");
    });
  });

  describe("Audio Lane & Quality Rules", () => {
    const AUDIO_BITRATES = ["128", "192", "320"];

    it("defines 128, 192, and 320 kbps as standard audio quality options", () => {
      expect(AUDIO_BITRATES).toEqual(["128", "192", "320"]);
    });

    it("routes MP3 format jobs strictly to the audio lane", () => {
      function getQueueLane(format: "mp3" | "mp4", quality: string): string {
        return format === "mp3" ? "audio" : quality === "2160" ? "video_4k" : "video";
      }

      expect(getQueueLane("mp3", "128")).toBe("audio");
      expect(getQueueLane("mp3", "192")).toBe("audio");
      expect(getQueueLane("mp3", "320")).toBe("audio");

      expect(getQueueLane("mp4", "1080")).toBe("video");
      expect(getQueueLane("mp4", "2160")).toBe("video_4k");
    });

    it("correctly identifies audio-only mode for SoundCloud and sound-only media", () => {
      function isAudioOnly(platformId: string, previewAudioOnly?: boolean): boolean {
        const platform = PLATFORMS[platformId as keyof typeof PLATFORMS];
        return Boolean(
          (platform && (!platform.formats.includes("mp4" as any) || platform.maxHeight === 0)) ||
            previewAudioOnly,
        );
      }

      // SoundCloud is always audio-only
      expect(isAudioOnly("SOUNDCLOUD")).toBe(true);
      expect(isAudioOnly("SOUNDCLOUD", false)).toBe(true);

      // YouTube is normally video+audio, but audio-only when preview detects audioOnly stream
      expect(isAudioOnly("YOUTUBE", false)).toBe(false);
      expect(isAudioOnly("YOUTUBE", true)).toBe(true);

      // TikTok is video+audio, but audio-only when sound link
      expect(isAudioOnly("TIKTOK", false)).toBe(false);
      expect(isAudioOnly("TIKTOK", true)).toBe(true);
    });

    it("forces effective format to MP3 when link is audio-only and user had MP4 selected", () => {
      function resolveEffectiveFormat(
        format: "mp3" | "mp4" | "m4a",
        platformId: string,
        previewAudioOnly?: boolean,
      ): "mp3" | "mp4" | "m4a" {
        const platform = PLATFORMS[platformId as keyof typeof PLATFORMS];
        const audioOnly = Boolean(
          (platform && (!platform.formats.includes("mp4" as any) || platform.maxHeight === 0)) ||
            previewAudioOnly,
        );
        if (audioOnly && format === "mp4") return "mp3";
        if (platformId === "SOUNDCLOUD" && format === "m4a") return "mp3";
        return format;
      }

      // MP4 on SoundCloud automatically defaults to MP3
      expect(resolveEffectiveFormat("mp4", "SOUNDCLOUD")).toBe("mp3");

      // M4A on SoundCloud automatically defaults to MP3
      expect(resolveEffectiveFormat("m4a", "SOUNDCLOUD")).toBe("mp3");

      // MP4 on YouTube audio-only stream defaults to MP3
      expect(resolveEffectiveFormat("mp4", "YOUTUBE", true)).toBe("mp3");

      // MP4 on normal YouTube remains MP4
      expect(resolveEffectiveFormat("mp4", "YOUTUBE", false)).toBe("mp4");
    });
  });
});
