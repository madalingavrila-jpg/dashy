import fs from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { getS3ObjectText, isS3LikelyAvailable, putS3Object } from "./s3.js";
import {
  COMPLEX_ACTIVATED_MTD_TARGET,
  COMPLEX_MTD_TARGET,
  DENSITY_ACTIVATED_MTD_TARGET,
  DENSITY_MTD_TARGET,
} from "../../lib/agent-segments.js";
import {
  COMPLEX_WEEKLY_TARGETS,
  DENSITY_WEEKLY_TARGETS,
  type WeeklyStatusCounts,
} from "../../lib/weekly-stages.js";

export type SegmentTargets = {
  won: number;
  activated: number;
};

export type PerRepMtdOverride = {
  won?: number;
  activated?: number;
  monthKey?: string;
};

export type PerRepWeeklyOverride = Partial<WeeklyStatusCounts> & {
  week?: string;
};

export type TargetConfigPayload = {
  updatedAt?: string;
  segment: {
    complex: SegmentTargets;
    density: SegmentTargets;
  };
  weekly: {
    complex: WeeklyStatusCounts;
    density: WeeklyStatusCounts;
  };
  perRep: Record<string, PerRepMtdOverride>;
  weeklyPerRep: Record<string, PerRepWeeklyOverride>;
  pausedAgentIds: string[];
};

export type TargetConfigPersistence = {
  mode: "s3" | "filesystem";
  committed?: boolean;
  warning?: string;
};

export type WriteTargetConfigResult = {
  payload: TargetConfigPayload;
  persistence: TargetConfigPersistence;
};

const TARGET_CONFIG_S3_KEY = "data/target-config.json";

function targetConfigPath(): string {
  return path.join(config.rootDir, "data", "target-config.json");
}

export function defaultTargetConfig(): TargetConfigPayload {
  return {
    segment: {
      complex: { won: COMPLEX_MTD_TARGET, activated: COMPLEX_ACTIVATED_MTD_TARGET },
      density: { won: DENSITY_MTD_TARGET, activated: DENSITY_ACTIVATED_MTD_TARGET },
    },
    weekly: {
      complex: { ...COMPLEX_WEEKLY_TARGETS },
      density: { ...DENSITY_WEEKLY_TARGETS },
    },
    perRep: {},
    weeklyPerRep: {},
    pausedAgentIds: [],
  };
}

export function mergeTargetConfig(parsed: Partial<TargetConfigPayload>): TargetConfigPayload {
  const defaults = defaultTargetConfig();
  return {
    updatedAt: parsed.updatedAt,
    segment: {
      complex: { ...defaults.segment.complex, ...parsed.segment?.complex },
      density: { ...defaults.segment.density, ...parsed.segment?.density },
    },
    weekly: {
      complex: { ...defaults.weekly.complex, ...parsed.weekly?.complex },
      density: { ...defaults.weekly.density, ...parsed.weekly?.density },
    },
    perRep: parsed.perRep ?? {},
    weeklyPerRep: parsed.weeklyPerRep ?? {},
    pausedAgentIds: Array.isArray(parsed.pausedAgentIds) ? parsed.pausedAgentIds : [],
  };
}

async function readLocalTargetConfig(): Promise<TargetConfigPayload | null> {
  const filePath = targetConfigPath();
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = await readFile(filePath, "utf8");
    return mergeTargetConfig(JSON.parse(raw) as Partial<TargetConfigPayload>);
  } catch {
    return null;
  }
}

async function readS3TargetConfig(): Promise<TargetConfigPayload | null> {
  try {
    const text = await getS3ObjectText(TARGET_CONFIG_S3_KEY);
    if (!text) return null;
    return mergeTargetConfig(JSON.parse(text) as Partial<TargetConfigPayload>);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (config.isProduction || isS3LikelyAvailable()) {
      console.warn("[target-config] S3 read failed:", message);
    }
    return null;
  }
}

export async function readTargetConfig(): Promise<TargetConfigPayload> {
  const fromS3 = await readS3TargetConfig();
  if (fromS3) {
    try {
      await writeFile(targetConfigPath(), serializeTargetConfig(fromS3), "utf8");
    } catch {
      /* ignore mirror failures */
    }
    return fromS3;
  }

  const local = await readLocalTargetConfig();
  if (local) {
    try {
      await putS3Object(TARGET_CONFIG_S3_KEY, serializeTargetConfig(local));
      console.log("[target-config] seeded S3 from local data/target-config.json");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (config.isProduction || isS3LikelyAvailable()) {
        console.warn("[target-config] S3 seed skipped:", message);
      }
    }
    return local;
  }

  const defaults = defaultTargetConfig();
  await writeTargetConfig(defaults);
  return defaults;
}

function serializeTargetConfig(payload: TargetConfigPayload): string {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export async function writeTargetConfig(payload: TargetConfigPayload): Promise<WriteTargetConfigResult> {
  const merged = mergeTargetConfig(payload);
  const toWrite: TargetConfigPayload = {
    ...merged,
    updatedAt: new Date().toISOString(),
  };

  const serialized = serializeTargetConfig(toWrite);
  await writeFile(targetConfigPath(), serialized, "utf8");

  try {
    await putS3Object(TARGET_CONFIG_S3_KEY, serialized);
    console.log(`[target-config] saved to s3://${config.s3Bucket}/${TARGET_CONFIG_S3_KEY}`);
    return {
      payload: toWrite,
      persistence: {
        mode: "s3",
        committed: true,
      },
    };
  } catch (s3Error) {
    const s3Message = s3Error instanceof Error ? s3Error.message : "S3 write failed";
    console.warn("[target-config] S3 write failed:", s3Message);
    return {
      payload: toWrite,
      persistence: {
        mode: "filesystem",
        warning:
          "Saved on server filesystem only — enable Boltable File Storage (S3) so overrides survive redeploy.",
      },
    };
  }
}
