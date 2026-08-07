import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { DASHBOARD_SECTIONS, getPrecomputedApiPath, getPrecomputedSectionPath } from "./dashboard.js";
import {
  buildApiAsset,
  getLocalDashboardUpdatedAt,
  preloadApiAssets,
  replaceApiAssets,
  type ApiAsset,
} from "./apiAssets.js";
import {
  getS3ObjectBytes,
  getS3ObjectText,
  isS3LikelyAvailable,
  putS3Object,
  S3_BUCKET,
} from "./s3.js";

export const DASHBOARD_MANIFEST_S3_KEY = "meta/dashboard-manifest.json";

export type DashboardManifest = {
  updatedAt: string;
  uploadedAt: string;
  source: "build" | "publish" | "seed";
  files: string[];
};

export type DashboardSyncResult = {
  action: "loaded" | "seeded" | "unchanged" | "skipped" | "error";
  localUpdatedAt: string | null;
  s3UpdatedAt: string | null;
  message?: string;
};

let lastManifest: DashboardManifest | null = null;
let lastSync: DashboardSyncResult | null = null;

export function getDashboardS3Manifest(): DashboardManifest | null {
  return lastManifest;
}

export function getLastDashboardSync(): DashboardSyncResult | null {
  return lastSync;
}

function assetKeys(): string[] {
  return ["dashboard", ...DASHBOARD_SECTIONS.map((s) => `dashboard/${s}`)];
}

function localPathForKey(key: string): string {
  if (key === "dashboard") return getPrecomputedApiPath();
  const section = key.replace(/^dashboard\//, "");
  return getPrecomputedSectionPath(section as (typeof DASHBOARD_SECTIONS)[number]);
}

function s3KeyForFile(relative: string): string {
  return `api/${relative}`;
}

function readLocalUpdatedAtFromDisk(): string | null {
  try {
    const raw = fs.readFileSync(getPrecomputedApiPath(), "utf8");
    const parsed = JSON.parse(raw) as { updatedAt?: string };
    return typeof parsed.updatedAt === "string" ? parsed.updatedAt : null;
  } catch {
    try {
      const raw = fs.readFileSync(path.join(config.rootDir, "data", "dashboard.json"), "utf8");
      const parsed = JSON.parse(raw) as { updatedAt?: string };
      return typeof parsed.updatedAt === "string" ? parsed.updatedAt : null;
    } catch {
      return null;
    }
  }
}

function isFresher(a: string | null, b: string | null): boolean {
  if (!a) return false;
  if (!b) return true;
  return Date.parse(a) > Date.parse(b);
}

async function readManifest(): Promise<DashboardManifest | null> {
  try {
    const text = await getS3ObjectText(DASHBOARD_MANIFEST_S3_KEY);
    if (!text) return null;
    const parsed = JSON.parse(text) as DashboardManifest;
    if (!parsed?.updatedAt || !Array.isArray(parsed.files)) return null;
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (config.isProduction || isS3LikelyAvailable()) {
      console.warn("[dashboard-s3] manifest read failed:", message);
    }
    return null;
  }
}

async function downloadAsset(key: string): Promise<ApiAsset | null> {
  const relative = key === "dashboard" ? "dashboard.json" : `${key}.json`;
  const raw = await getS3ObjectBytes(s3KeyForFile(relative));
  if (!raw) return null;
  const gzip = await getS3ObjectBytes(s3KeyForFile(`${relative}.gz`));
  const br = await getS3ObjectBytes(s3KeyForFile(`${relative}.br`));
  return buildApiAsset(raw, gzip, br);
}

async function loadAssetsFromS3(manifest: DashboardManifest): Promise<Map<string, ApiAsset>> {
  const next = new Map<string, ApiAsset>();
  for (const key of assetKeys()) {
    const asset = await downloadAsset(key);
    if (asset) {
      next.set(key, asset);
    }
  }
  if (!next.has("dashboard")) {
    throw new Error("S3 dashboard payload missing api/dashboard.json");
  }
  lastManifest = manifest;
  return next;
}

async function uploadFile(localPath: string, s3Key: string, contentType: string, encoding?: string): Promise<boolean> {
  if (!fs.existsSync(localPath)) return false;
  const body = fs.readFileSync(localPath);
  await putS3Object(s3Key, body, contentType, encoding);
  return true;
}

/** Upload local precomputed out/api artifacts + manifest to S3. */
export async function uploadLocalDashboardToS3(
  source: DashboardManifest["source"] = "seed",
): Promise<DashboardManifest> {
  const updatedAt = getLocalDashboardUpdatedAt() ?? readLocalUpdatedAtFromDisk() ?? new Date().toISOString();
  const files: string[] = [];

  for (const key of assetKeys()) {
    const localPath = localPathForKey(key);
    const relative = key === "dashboard" ? "dashboard.json" : `${key}.json`;
    if (await uploadFile(localPath, s3KeyForFile(relative), "application/json")) {
      files.push(relative);
    }
    if (await uploadFile(`${localPath}.gz`, s3KeyForFile(`${relative}.gz`), "application/json", "gzip")) {
      files.push(`${relative}.gz`);
    }
    if (await uploadFile(`${localPath}.br`, s3KeyForFile(`${relative}.br`), "application/json", "br")) {
      files.push(`${relative}.br`);
    }
  }

  // Source mirrors (optional; useful for DR / offline rebuild). Skip if missing.
  const dataDash = path.join(config.rootDir, "data", "dashboard.json");
  const dataMtd = path.join(config.rootDir, "data", "mtd-details.json");
  if (await uploadFile(dataDash, "data/dashboard.json", "application/json")) {
    files.push("data/dashboard.json");
  }
  if (await uploadFile(dataMtd, "data/mtd-details.json", "application/json")) {
    files.push("data/mtd-details.json");
  }

  const manifest: DashboardManifest = {
    updatedAt,
    uploadedAt: new Date().toISOString(),
    source,
    files,
  };
  await putS3Object(DASHBOARD_MANIFEST_S3_KEY, `${JSON.stringify(manifest, null, 2)}\n`);
  lastManifest = manifest;
  console.log(
    `[dashboard-s3] uploaded ${files.length} objects → s3://${S3_BUCKET}/ (updatedAt=${updatedAt})`,
  );
  return manifest;
}

/**
 * Apply a published asset map (from the publish API) to memory + S3.
 * Expects keys like "dashboard" and "dashboard/overview".
 */
export async function publishDashboardAssets(
  next: Map<string, ApiAsset>,
  updatedAt: string,
): Promise<DashboardManifest> {
  if (!next.has("dashboard")) {
    throw new Error("publish requires dashboard asset");
  }
  replaceApiAssets(next);

  // Persist to local out/api for process restarts within the same pod.
  for (const [key, asset] of next) {
    const localPath = localPathForKey(key);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, asset.raw);
    if (asset.gzip) fs.writeFileSync(`${localPath}.gz`, asset.gzip);
    if (asset.br) fs.writeFileSync(`${localPath}.br`, asset.br);
  }

  try {
    return await uploadLocalDashboardToS3("publish");
  } catch (error) {
    // Memory + disk already updated; S3 failure is non-fatal for this pod.
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[dashboard-s3] publish memory OK but S3 upload failed:", message);
    const manifest: DashboardManifest = {
      updatedAt,
      uploadedAt: new Date().toISOString(),
      source: "publish",
      files: [...next.keys()],
    };
    lastManifest = manifest;
    return manifest;
  }
}

/**
 * Startup / periodic sync: prefer fresher of local build vs S3.
 * - S3 newer → hot-load into memory
 * - Local newer / S3 missing → seed S3 from local precompute
 */
export async function syncDashboardAssets(): Promise<DashboardSyncResult> {
  preloadApiAssets();
  const localUpdatedAt = getLocalDashboardUpdatedAt() ?? readLocalUpdatedAtFromDisk();

  if (!isS3LikelyAvailable() && !config.isProduction) {
    lastSync = {
      action: "skipped",
      localUpdatedAt,
      s3UpdatedAt: null,
      message: "S3 not available in this environment",
    };
    return lastSync;
  }

  try {
    const manifest = await readManifest();
    const s3UpdatedAt = manifest?.updatedAt ?? null;

    if (manifest && isFresher(s3UpdatedAt, localUpdatedAt)) {
      const next = await loadAssetsFromS3(manifest);
      replaceApiAssets(next);
      lastSync = {
        action: "loaded",
        localUpdatedAt,
        s3UpdatedAt,
        message: `Loaded fresher dashboard from S3 (${s3UpdatedAt})`,
      };
      console.log(`[dashboard-s3] ${lastSync.message}`);
      return lastSync;
    }

    if (localUpdatedAt && (!manifest || isFresher(localUpdatedAt, s3UpdatedAt))) {
      await uploadLocalDashboardToS3(manifest ? "seed" : "seed");
      lastSync = {
        action: "seeded",
        localUpdatedAt,
        s3UpdatedAt,
        message: `Seeded S3 from local precompute (${localUpdatedAt})`,
      };
      console.log(`[dashboard-s3] ${lastSync.message}`);
      return lastSync;
    }

    lastManifest = manifest;
    lastSync = {
      action: "unchanged",
      localUpdatedAt,
      s3UpdatedAt,
      message: "Local and S3 dashboard timestamps match",
    };
    return lastSync;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[dashboard-s3] sync failed:", message);
    lastSync = {
      action: "error",
      localUpdatedAt,
      s3UpdatedAt: null,
      message,
    };
    return lastSync;
  }
}

/** Background poll: if S3 gets a newer manifest, hot-swap assets without redeploy. */
export function startDashboardS3Poller(intervalMs = config.dashyCacheTtlMs): void {
  if (!isS3LikelyAvailable() && !config.isProduction) return;
  const tick = async () => {
    try {
      const manifest = await readManifest();
      if (!manifest) return;
      const localUpdatedAt = getLocalDashboardUpdatedAt();
      if (!isFresher(manifest.updatedAt, localUpdatedAt)) return;
      const next = await loadAssetsFromS3(manifest);
      replaceApiAssets(next);
      lastSync = {
        action: "loaded",
        localUpdatedAt,
        s3UpdatedAt: manifest.updatedAt,
        message: `Hot-loaded dashboard from S3 (${manifest.updatedAt})`,
      };
      console.log(`[dashboard-s3] ${lastSync.message}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("[dashboard-s3] poll failed:", message);
    }
  };
  setInterval(tick, Math.max(60_000, intervalMs)).unref();
}
