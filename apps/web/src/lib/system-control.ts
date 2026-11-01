import fs from "node:fs";
import path from "node:path";

export interface SystemControls {
  disabledPlatforms: string[]; // e.g. ["TIKTOK", "INSTAGRAM"]
  aiEnabled: boolean;
  updatedAt: string;
}

const DEFAULT_CONTROLS: SystemControls = {
  disabledPlatforms: [],
  aiEnabled: true,
  updatedAt: new Date().toISOString(),
};

function getCandidatePaths(): string[] {
  const cwd = process.cwd();
  return [
    path.join(cwd, "system-controls.json"),
    path.join(cwd, "apps", "web", "system-controls.json"),
    path.join(cwd, ".system-controls.json"),
  ];
}

export function getSystemControls(): SystemControls {
  for (const p of getCandidatePaths()) {
    try {
      if (fs.existsSync(/* turbopackIgnore: true */ p)) {
        const raw = fs.readFileSync(/* turbopackIgnore: true */ p, "utf-8");
        const parsed = JSON.parse(raw) as Partial<SystemControls>;
        if (parsed && Array.isArray(parsed.disabledPlatforms)) {
          return {
            disabledPlatforms: parsed.disabledPlatforms,
            aiEnabled: typeof parsed.aiEnabled === "boolean" ? parsed.aiEnabled : true,
            updatedAt: parsed.updatedAt || new Date().toISOString(),
          };
        }
      }
    } catch {
      // try next
    }
  }

  return { ...DEFAULT_CONTROLS };
}

export function saveSystemControls(next: Partial<SystemControls>): SystemControls {
  const current = getSystemControls();
  const updated: SystemControls = {
    disabledPlatforms:
      next.disabledPlatforms !== undefined ? next.disabledPlatforms : current.disabledPlatforms,
    aiEnabled: next.aiEnabled !== undefined ? next.aiEnabled : current.aiEnabled,
    updatedAt: new Date().toISOString(),
  };

  for (const p of getCandidatePaths()) {
    try {
      const dir = path.dirname(p);
      if (fs.existsSync(/* turbopackIgnore: true */ dir)) {
        fs.writeFileSync(/* turbopackIgnore: true */ p, JSON.stringify(updated, null, 2), "utf-8");
      }
    } catch {
      // ignore
    }
  }

  return updated;
}

export function isPlatformEnabled(platform: string): boolean {
  const controls = getSystemControls();
  const normalized = platform.trim().toUpperCase();
  return !controls.disabledPlatforms.map((p) => p.toUpperCase()).includes(normalized);
}

export function isAiFeatureEnabled(): boolean {
  const controls = getSystemControls();
  return controls.aiEnabled;
}
