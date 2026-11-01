export type HistoryItem = {
  id: string;
  url: string;
  format: string;
  quality: string;
  status: string;
  title: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  createdAt: string;
};

const STORAGE_KEY = "grabwave:history:v1";
const CHANGE_EVENT = "grabwave:history";
const LIMIT = 7;
const EMPTY: HistoryItem[] = [];
let lastRaw: string | null = null;
let cached: HistoryItem[] = EMPTY;

const OBFUSCATION_PREFIX = "gw:v1:";
const XOR_KEY = 0x5a;

function obfuscatePayload(data: string): string {
  try {
    const bytes = new TextEncoder().encode(data);
    const masked = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      masked[i] = bytes[i] ^ ((XOR_KEY + (i % 37)) & 0xff);
    }
    let binary = "";
    for (let i = 0; i < masked.length; i++) {
      binary += String.fromCharCode(masked[i]);
    }
    return `${OBFUSCATION_PREFIX}${btoa(binary)}`;
  } catch {
    return btoa(data);
  }
}

function deobfuscatePayload(stored: string): string {
  if (stored.startsWith(OBFUSCATION_PREFIX)) {
    try {
      const b64 = stored.slice(OBFUSCATION_PREFIX.length);
      const binary = atob(b64);
      const masked = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        masked[i] = binary.charCodeAt(i);
      }
      const bytes = new Uint8Array(masked.length);
      for (let i = 0; i < masked.length; i++) {
        bytes[i] = masked[i] ^ ((XOR_KEY + (i % 37)) & 0xff);
      }
      return new TextDecoder().decode(bytes);
    } catch {
      return "[]";
    }
  }
  // Backwards compatibility with legacy plain JSON
  if (stored.startsWith("[") || stored.startsWith("{")) {
    return stored;
  }
  try {
    return atob(stored);
  } catch {
    return "[]";
  }
}

function isHistoryItem(value: unknown): value is HistoryItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<HistoryItem>;
  return typeof item.id === "string" && item.id.length > 0;
}

export function readHistory(): HistoryItem[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === lastRaw && cached !== null) {
      return cached;
    }
    lastRaw = raw;
    if (!raw) {
      cached = EMPTY;
      return cached;
    }
    const decoded = deobfuscatePayload(raw);
    const parsed = JSON.parse(decoded) as unknown;
    cached = Array.isArray(parsed) ? parsed.filter(isHistoryItem).slice(0, LIMIT) : EMPTY;
    return cached;
  } catch {
    cached = EMPTY;
    return cached;
  }
}

export function writeHistory(items: HistoryItem[]): void {
  if (typeof window === "undefined") return;
  cached = items.slice(0, LIMIT);
  try {
    const payload = JSON.stringify(cached);
    const obfuscated = obfuscatePayload(payload);
    lastRaw = obfuscated;
    window.localStorage.setItem(STORAGE_KEY, obfuscated);
  } catch {
    // quota exceeded or storage disabled
  }
  try {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // ignore
  }
}

export function rememberJob(
  input: Pick<HistoryItem, "id" | "format" | "quality"> & Partial<HistoryItem>,
): void {
  if (typeof window === "undefined") return;
  const current = readHistory();
  const existing = current.find((item) => item.id === input.id);
  const item: HistoryItem = {
    id: input.id,
    url: input.url ?? existing?.url ?? "",
    format: input.format.toUpperCase(),
    quality: input.quality,
    status: input.status ?? existing?.status ?? "QUEUED",
    title: input.title ?? existing?.title ?? null,
    thumbnailUrl: input.thumbnailUrl ?? existing?.thumbnailUrl ?? null,
    durationSeconds: input.durationSeconds ?? existing?.durationSeconds ?? null,
    createdAt: existing?.createdAt ?? input.createdAt ?? new Date().toISOString(),
  };
  writeHistory([item, ...current.filter((entry) => entry.id !== input.id)]);
}

export function removeHistoryItem(id: string): void {
  if (typeof window === "undefined") return;
  const current = readHistory();
  writeHistory(current.filter((entry) => entry.id !== id));
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  cached = EMPTY;
  lastRaw = null;
  window.localStorage.removeItem(STORAGE_KEY);
  try {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // ignore in environments without Event constructor
  }
}

export function subscribeHistory(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onChange = () => callback();
  const onStorage = () => {
    cached = EMPTY;
    lastRaw = null;
    callback();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function getEmptyHistory(): HistoryItem[] {
  return EMPTY;
}
