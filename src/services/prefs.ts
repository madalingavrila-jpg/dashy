import fs from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { getS3ObjectText, isS3LikelyAvailable, putS3Object } from "./s3.js";

export type DashyPrefsPayload = {
  updatedAt?: string;
  ui: {
    bannerMessage: string | null;
    bannerDismissible: boolean;
  };
  wow: {
    favoriteIds: string[];
  };
  filters: Record<string, unknown>;
};

export type PrefsPersistence = {
  mode: "s3" | "filesystem";
  warning?: string;
};

export type WritePrefsResult = {
  payload: DashyPrefsPayload;
  persistence: PrefsPersistence;
};

const PREFS_S3_KEY = "data/dashy-prefs.json";

function prefsPath(): string {
  return path.join(config.rootDir, "data", "dashy-prefs.json");
}

export function defaultPrefs(): DashyPrefsPayload {
  return {
    ui: {
      bannerMessage: null,
      bannerDismissible: true,
    },
    wow: {
      favoriteIds: [],
    },
    filters: {},
  };
}

export function mergePrefs(parsed: Partial<DashyPrefsPayload>): DashyPrefsPayload {
  const defaults = defaultPrefs();
  return {
    updatedAt: parsed.updatedAt,
    ui: {
      bannerMessage:
        parsed.ui?.bannerMessage === undefined
          ? defaults.ui.bannerMessage
          : parsed.ui.bannerMessage,
      bannerDismissible: parsed.ui?.bannerDismissible ?? defaults.ui.bannerDismissible,
    },
    wow: {
      favoriteIds: Array.isArray(parsed.wow?.favoriteIds) ? parsed.wow.favoriteIds : [],
    },
    filters:
      parsed.filters && typeof parsed.filters === "object" && !Array.isArray(parsed.filters)
        ? parsed.filters
        : {},
  };
}

function serializePrefs(payload: DashyPrefsPayload): string {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

async function readLocalPrefs(): Promise<DashyPrefsPayload | null> {
  const filePath = prefsPath();
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = await readFile(filePath, "utf8");
    return mergePrefs(JSON.parse(raw) as Partial<DashyPrefsPayload>);
  } catch {
    return null;
  }
}

async function readS3Prefs(): Promise<DashyPrefsPayload | null> {
  try {
    const text = await getS3ObjectText(PREFS_S3_KEY);
    if (!text) return null;
    return mergePrefs(JSON.parse(text) as Partial<DashyPrefsPayload>);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (config.isProduction || isS3LikelyAvailable()) {
      console.warn("[prefs] S3 read failed:", message);
    }
    return null;
  }
}

export async function readPrefs(): Promise<DashyPrefsPayload> {
  const fromS3 = await readS3Prefs();
  if (fromS3) {
    try {
      await writeFile(prefsPath(), serializePrefs(fromS3), "utf8");
    } catch {
      /* ignore */
    }
    return fromS3;
  }

  const local = await readLocalPrefs();
  if (local) {
    try {
      await putS3Object(PREFS_S3_KEY, serializePrefs(local));
      console.log("[prefs] seeded S3 from local data/dashy-prefs.json");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (config.isProduction || isS3LikelyAvailable()) {
        console.warn("[prefs] S3 seed skipped:", message);
      }
    }
    return local;
  }

  const defaults = defaultPrefs();
  await writePrefs(defaults);
  return defaults;
}

export async function writePrefs(payload: DashyPrefsPayload): Promise<WritePrefsResult> {
  const merged = mergePrefs(payload);
  const toWrite: DashyPrefsPayload = {
    ...merged,
    updatedAt: new Date().toISOString(),
  };
  const serialized = serializePrefs(toWrite);
  await writeFile(prefsPath(), serialized, "utf8");

  try {
    await putS3Object(PREFS_S3_KEY, serialized);
    console.log(`[prefs] saved to s3://${config.s3Bucket}/${PREFS_S3_KEY}`);
    return { payload: toWrite, persistence: { mode: "s3" } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "S3 write failed";
    console.warn("[prefs] S3 write failed:", message);
    return {
      payload: toWrite,
      persistence: {
        mode: "filesystem",
        warning:
          "Saved on server filesystem only — enable Boltable File Storage (S3) so prefs survive redeploy.",
      },
    };
  }
}
