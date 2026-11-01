import { describe, expect, it, beforeEach } from "vitest";
import {
  clearHistory,
  readHistory,
  rememberJob,
  removeHistoryItem,
} from "../history";

describe("History Storage Obfuscation", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    const mockStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    };

    (globalThis as unknown as { window: unknown }).window = {
      localStorage: mockStorage,
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {},
    };

    clearHistory();
  });

  it("obfuscates payload in localStorage so raw identifiers and URLs are not plain text", () => {
    rememberJob({
      id: "job-secret-12345",
      url: "https://www.youtube.com/watch?v=secret_video_token",
      format: "mp3",
      quality: "320",
      title: "Confidential Video Title",
    });

    const rawStored = store.get("grabwave:history:v1");
    expect(rawStored).toBeDefined();
    // Raw plain text identifiers must NOT exist in the stored string
    expect(rawStored).not.toContain("job-secret-12345");
    expect(rawStored).not.toContain("https://www.youtube.com");
    expect(rawStored).not.toContain("secret_video_token");
    expect(rawStored).not.toContain("Confidential Video Title");
    expect(rawStored!.startsWith("gw:v1:")).toBe(true);

    // Reading history properly deobfuscates
    const history = readHistory();
    expect(history.length).toBe(1);
    expect(history[0].id).toBe("job-secret-12345");
    expect(history[0].title).toBe("Confidential Video Title");
  });

  it("supports reading backwards-compatible legacy unencoded JSON", () => {
    clearHistory();
    const legacyItem = [
      {
        id: "legacy-job-99",
        url: "https://youtu.be/legacy",
        format: "MP4",
        quality: "1080",
        status: "READY",
        title: "Legacy Video",
        thumbnailUrl: null,
        durationSeconds: 120,
        createdAt: new Date().toISOString(),
      },
    ];
    store.set("grabwave:history:v1", JSON.stringify(legacyItem));

    const history = readHistory();
    expect(history.length).toBe(1);
    expect(history[0].id).toBe("legacy-job-99");
    expect(history[0].title).toBe("Legacy Video");

    // Once modified, it re-encodes into obfuscated format
    rememberJob({
      id: "job-next-100",
      format: "MP3",
      quality: "320",
    });
    const updatedRaw = store.get("grabwave:history:v1");
    expect(updatedRaw!.startsWith("gw:v1:")).toBe(true);
    expect(updatedRaw).not.toContain("legacy-job-99");
    expect(updatedRaw).not.toContain("job-next-100");
  });
});
