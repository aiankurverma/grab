export type PlatformId =
  | "YOUTUBE"
  | "INSTAGRAM"
  | "TIKTOK"
  | "FACEBOOK"
  | "X"
  | "VIMEO"
  | "SOUNDCLOUD"
  | "REDDIT"
  | "TWITCH"
  | "DAILYMOTION"
  | "PINTEREST";

export type PlatformMeta = {
  id: PlatformId;
  label: string;
  mark: string;
  markClass: string;
  hosts: readonly string[];
  formats: readonly ("mp3" | "mp4" | "jpg" | "png")[];
  maxHeight: number;
  beta: boolean;
  note: string;
};

export const PLATFORMS: Record<PlatformId, PlatformMeta> = {
  YOUTUBE: {
    id: "YOUTUBE",
    label: "YouTube",
    mark: "YT",
    markClass: "border-red-400/25 bg-red-500/10 text-red-300",
    hosts: ["youtube.com", "youtu.be"],
    formats: ["mp3", "mp4"],
    maxHeight: 2160,
    beta: false,
    note: "Videos, Shorts, and music. Up to 4K.",
  },
  INSTAGRAM: {
    id: "INSTAGRAM",
    label: "Instagram",
    mark: "IG",
    markClass: "border-pink-400/25 bg-pink-500/10 text-pink-300",
    hosts: ["instagram.com", "instagr.am", "ig.me"],
    formats: ["mp3", "mp4"],
    maxHeight: 1080,
    beta: true,
    note: "Public Reels and posts. No private accounts.",
  },
  TIKTOK: {
    id: "TIKTOK",
    label: "TikTok",
    mark: "TT",
    markClass: "border-cyan-400/25 bg-cyan-500/10 text-cyan-300",
    hosts: ["tiktok.com"],
    formats: ["mp3", "mp4"],
    maxHeight: 1080,
    beta: true,
    note: "Public videos. No live streams or private posts.",
  },
  FACEBOOK: {
    id: "FACEBOOK",
    label: "Facebook",
    mark: "FB",
    markClass: "border-blue-400/25 bg-blue-500/10 text-blue-300",
    hosts: ["facebook.com", "fb.watch", "fb.com"],
    formats: ["mp3", "mp4"],
    maxHeight: 1080,
    beta: true,
    note: "Public videos and Reels. No login-walled content.",
  },
  X: {
    id: "X",
    label: "X / Twitter",
    mark: "X",
    markClass: "border-white/20 bg-white/5 text-white/80",
    hosts: ["x.com", "twitter.com"],
    formats: ["mp3", "mp4"],
    maxHeight: 1080,
    beta: true,
    note: "Public video posts.",
  },
  VIMEO: {
    id: "VIMEO",
    label: "Vimeo",
    mark: "V",
    markClass: "border-sky-400/25 bg-sky-500/10 text-sky-300",
    hosts: ["vimeo.com", "player.vimeo.com"],
    formats: ["mp3", "mp4"],
    maxHeight: 2160,
    beta: false,
    note: "Public videos. Up to 4K when available.",
  },
  SOUNDCLOUD: {
    id: "SOUNDCLOUD",
    label: "SoundCloud",
    mark: "SC",
    markClass: "border-orange-400/25 bg-orange-500/10 text-orange-300",
    hosts: ["soundcloud.com", "on.soundcloud.com"],
    formats: ["mp3"],
    maxHeight: 0,
    beta: true,
    note: "Audio only. Public tracks and sets.",
  },
  REDDIT: {
    id: "REDDIT",
    label: "Reddit",
    mark: "RD",
    markClass: "border-orange-400/25 bg-orange-500/10 text-orange-300",
    hosts: ["reddit.com", "v.redd.it"],
    formats: ["mp3", "mp4"],
    maxHeight: 1080,
    beta: true,
    note: "Hosted videos in public posts.",
  },
  TWITCH: {
    id: "TWITCH",
    label: "Twitch clips",
    mark: "TW",
    markClass: "border-purple-400/25 bg-purple-500/10 text-purple-300",
    hosts: ["twitch.tv", "clips.twitch.tv"],
    formats: ["mp3", "mp4"],
    maxHeight: 1080,
    beta: true,
    note: "Clips only. Live streams are not supported.",
  },
  DAILYMOTION: {
    id: "DAILYMOTION",
    label: "Dailymotion",
    mark: "DM",
    markClass: "border-blue-400/25 bg-blue-500/10 text-blue-300",
    hosts: ["dailymotion.com", "dai.ly"],
    formats: ["mp3", "mp4"],
    maxHeight: 1080,
    beta: false,
    note: "Public videos. Up to 1080p when available.",
  },
  PINTEREST: {
    id: "PINTEREST",
    label: "Pinterest",
    mark: "PT",
    markClass: "border-red-400/25 bg-red-500/10 text-red-300",
    hosts: ["pinterest.com", "pin.it"],
    formats: ["jpg", "png", "mp4", "mp3"],
    maxHeight: 1080,
    beta: true,
    note: "Photo and video pins. High-resolution originals.",
  },
};

export const PLATFORM_LIST: readonly PlatformMeta[] = Object.values(PLATFORMS);

export function platformForHost(hostname: string): PlatformMeta | null {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  for (const platform of PLATFORM_LIST) {
    for (const candidate of platform.hosts) {
      if (host === candidate || host.endsWith(`.${candidate}`)) return platform;
    }
  }
  return null;
}

export function platformMeta(id: PlatformId): PlatformMeta {
  return PLATFORMS[id];
}

export function platformCapability(platform: PlatformMeta): string {
  if (platform.id === "PINTEREST") return "Photos & Videos";
  if (platform.maxHeight === 0) return "Audio only";
  if (platform.maxHeight >= 2160) return "Up to 4K";
  return `Up to ${platform.maxHeight}p`;
}
