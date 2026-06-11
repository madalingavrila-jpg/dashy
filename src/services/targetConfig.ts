import fs from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { commitFileToGitHub, isGitHubPersistEnabled } from "./githubPersist.js";
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
  mode: "github" | "filesystem";
  committed?: boolean;
  commitSha?: string;
  warning?: string;
};

export type WriteTargetConfigResult = {
  payload: TargetConfigPayload;
  persistence: TargetConfigPersistence;
};

const TARGET_CONFIG_REPO_PATH = "data/target-config.json";

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

export async function readTargetConfig(): Promise<TargetConfigPayload> {
  const filePath = targetConfigPath();
  if (!fs.existsSync(filePath)) {
    const defaults = defaultTargetConfig();
    await writeTargetConfig(defaults);
    return defaults;
  }

  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<TargetConfigPayload>;
    return mergeTargetConfig(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Target config read failed";
    throw new Error(message);
  }
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
  const filePath = targetConfigPath();
  await writeFile(filePath, serialized, "utf8");

  if (!isGitHubPersistEnabled()) {
    return {
      payload: toWrite,
      persistence: {
        mode: "filesystem",
        warning:
          "Saved on server filesystem only — overrides are lost on Boltable redeploy unless GITHUB_TOKEN and GITHUB_REPO are set.",
      },
    };
  }

  try {
    const commit = await commitFileToGitHub(
      TARGET_CONFIG_REPO_PATH,
      serialized,
      `chore(targets): update target-config.json [dashy]`,
    );
    console.log(
      `[target-config] committed to ${config.githubRepo}@${config.githubBranch} (${commit.commitSha.slice(0, 7)})`,
    );
    return {
      payload: toWrite,
      persistence: {
        mode: "github",
        committed: true,
        commitSha: commit.commitSha,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub commit failed";
    console.error("[target-config] GitHub commit failed:", message);
    return {
      payload: toWrite,
      persistence: {
        mode: "github",
        committed: false,
        warning: `${message} — file saved locally but may be lost on redeploy.`,
      },
    };
  }
}
