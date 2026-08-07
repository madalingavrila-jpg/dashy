import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import {
  DASHBOARD_SECTIONS,
  ensureDashboardCache,
  getCachedDashboardBuffer,
  getPrecomputedApiPath,
  getPrecomputedSectionPath,
  precomputedSectionsReady,
  serializeDashboardSection,
  type DashboardSection,
} from "../services/dashboard.js";
import {
  mergeTargetConfig,
  readTargetConfig,
  writeTargetConfig,
  type TargetConfigPayload,
} from "../services/targetConfig.js";
import {
  mergePrefs,
  readPrefs,
  writePrefs,
  type DashyPrefsPayload,
} from "../services/prefs.js";
import {
  getFullDashboardAsset,
  getSectionAsset,
  sendApiAsset,
  buildApiAsset,
  type ApiAsset,
} from "../services/apiAssets.js";
import {
  getDashboardS3Manifest,
  getLastDashboardSync,
  publishDashboardAssets,
} from "../services/dashboardS3.js";

export const apiRouter = Router();

const API_CACHE = "public, max-age=3600, stale-while-revalidate=86400";

type BuildInfo = { gitSha: string; builtAt: string };

function readBuildInfo(): BuildInfo | null {
  try {
    const raw = fs.readFileSync(path.join(config.rootDir, "dist", "build-info.json"), "utf8");
    return JSON.parse(raw) as BuildInfo;
  } catch {
    return null;
  }
}

const BUILD_INFO = readBuildInfo();
const STATIC_READY = fs.existsSync(path.join(config.staticDir, "index.html"));
const DASHBOARD_PRECOMPUTED = fs.existsSync(getPrecomputedApiPath());
const DASHBOARD_SECTIONS_PRECOMPUTED = precomputedSectionsReady();

apiRouter.get("/health", (_req, res) => {
  let dashboardCacheReady = false;
  try {
    dashboardCacheReady = getCachedDashboardBuffer() !== null;
  } catch {
    dashboardCacheReady = false;
  }

  const sync = getLastDashboardSync();
  const manifest = getDashboardS3Manifest();

  res.status(200).json({
    ok: true,
    app: "dashy",
    time: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    gitSha: BUILD_INFO?.gitSha ?? null,
    builtAt: BUILD_INFO?.builtAt ?? null,
    staticReady: STATIC_READY,
    dashboardCacheReady,
    dashboardPrecomputed: DASHBOARD_PRECOMPUTED,
    dashboardSectionsPrecomputed: DASHBOARD_SECTIONS_PRECOMPUTED,
    dashboardUpdatedAt: sync?.localUpdatedAt ?? manifest?.updatedAt ?? null,
    dashboardS3UpdatedAt: sync?.s3UpdatedAt ?? manifest?.updatedAt ?? null,
    dashboardS3Sync: sync?.action ?? null,
    cacheTtlMs: config.dashyCacheTtlMs,
  });
});

apiRouter.get("/status", (_req, res) => {
  const sync = getLastDashboardSync();
  const manifest = getDashboardS3Manifest();
  res.json({
    ok: true,
    app: "dashy",
    dataSource: config.dashboardSheetUrl ? "sheet" : sync?.action === "loaded" ? "s3" : "json",
    dataPath: config.dashboardSheetUrl || "data/dashboard.json",
    apiPath: "out/api/dashboard.json",
    s3Bucket: config.s3Bucket,
    s3DashboardUpdatedAt: manifest?.updatedAt ?? null,
    dashboardS3Sync: sync,
    cacheTtlMs: config.dashyCacheTtlMs,
    dashboardSections: [
      "/api/dashboard/overview",
      "/api/dashboard/mtd",
      "/api/dashboard/weekly",
      "/api/dashboard/accounts",
      "/api/dashboard/accounts-performance",
      "/api/dashboard/churn-prevention",
      "/api/dashboard/mops",
      "/api/dashboard/agents",
      "/api/dashboard/my-pipeline",
      "/api/dashboard/inbound",
      "/api/dashboard/mtd-details",
    ],
    dataFlow:
      "Cursor (SF + Databricks MCP) → refresh-all → build → upload S3 (or publish API) → /api/dashboard/*",
  });
});

apiRouter.get("/target-config", async (_req, res) => {
  try {
    const payload = await readTargetConfig();
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Target config load failed";
    console.error("[api/target-config]", message);
    res.status(500).json({ error: message });
  }
});

apiRouter.put("/target-config", async (req, res) => {
  try {
    const body = req.body as Partial<TargetConfigPayload> | undefined;
    if (!body || typeof body !== "object") {
      res.status(400).json({ error: "Request body must be a JSON object" });
      return;
    }

    const { payload, persistence } = await writeTargetConfig(mergeTargetConfig(body));
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.json({ ...payload, _persistence: persistence });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Target config save failed";
    console.error("[api/target-config PUT]", message);
    res.status(500).json({ error: message });
  }
});

apiRouter.get("/prefs", async (_req, res) => {
  try {
    const payload = await readPrefs();
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prefs load failed";
    console.error("[api/prefs]", message);
    res.status(500).json({ error: message });
  }
});

apiRouter.put("/prefs", async (req, res) => {
  try {
    const body = req.body as Partial<DashyPrefsPayload> | undefined;
    if (!body || typeof body !== "object") {
      res.status(400).json({ error: "Request body must be a JSON object" });
      return;
    }
    const { payload, persistence } = await writePrefs(mergePrefs(body));
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.json({ ...payload, _persistence: persistence });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prefs save failed";
    console.error("[api/prefs PUT]", message);
    res.status(500).json({ error: message });
  }
});

// Alias — some gateways mishandle /api/prefs; same handlers.
apiRouter.get("/runtime-prefs", async (_req, res) => {
  try {
    const payload = await readPrefs();
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prefs load failed";
    console.error("[api/runtime-prefs]", message);
    res.status(500).json({ error: message });
  }
});

apiRouter.put("/runtime-prefs", async (req, res) => {
  try {
    const body = req.body as Partial<DashyPrefsPayload> | undefined;
    if (!body || typeof body !== "object") {
      res.status(400).json({ error: "Request body must be a JSON object" });
      return;
    }
    const { payload, persistence } = await writePrefs(mergePrefs(body));
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.json({ ...payload, _persistence: persistence });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prefs save failed";
    console.error("[api/runtime-prefs PUT]", message);
    res.status(500).json({ error: message });
  }
});

type PublishAssetBody = {
  raw: string;
  gzip?: string | null;
  br?: string | null;
};

type PublishBody = {
  updatedAt?: string;
  assets: Record<string, PublishAssetBody>;
};

function authorizePublish(req: { headers: { authorization?: string } }): boolean {
  const token = config.publishToken;
  if (!token) return false;
  const header = req.headers.authorization ?? "";
  return header === `Bearer ${token}`;
}

apiRouter.put("/publish/dashboard", async (req, res) => {
  if (!config.publishToken) {
    res.status(404).json({ error: "Publish API disabled (DASHY_PUBLISH_TOKEN unset)" });
    return;
  }
  if (!authorizePublish(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const body = req.body as PublishBody | undefined;
    if (!body?.assets || typeof body.assets !== "object") {
      res.status(400).json({ error: "Body must include assets map" });
      return;
    }

    const next = new Map<string, ApiAsset>();
    for (const [key, value] of Object.entries(body.assets)) {
      if (!value?.raw || typeof value.raw !== "string") {
        res.status(400).json({ error: `Asset ${key} missing base64 raw` });
        return;
      }
      const raw = Buffer.from(value.raw, "base64");
      const gzip =
        typeof value.gzip === "string" && value.gzip.length > 0
          ? Buffer.from(value.gzip, "base64")
          : null;
      const br =
        typeof value.br === "string" && value.br.length > 0
          ? Buffer.from(value.br, "base64")
          : null;
      next.set(key, buildApiAsset(raw, gzip, br));
    }

    if (!next.has("dashboard")) {
      res.status(400).json({ error: "assets.dashboard is required" });
      return;
    }

    let updatedAt = body.updatedAt;
    if (!updatedAt) {
      try {
        const parsed = JSON.parse(next.get("dashboard")!.raw.toString("utf8")) as {
          updatedAt?: string;
        };
        updatedAt = parsed.updatedAt;
      } catch {
        /* ignore */
      }
    }
    updatedAt = updatedAt || new Date().toISOString();

    const manifest = await publishDashboardAssets(next, updatedAt);
    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true, manifest });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publish failed";
    console.error("[api/publish/dashboard]", message);
    res.status(500).json({ error: message });
  }
});

apiRouter.get("/dashboard", async (req, res) => {
  const asset = getFullDashboardAsset();
  if (asset) {
    sendApiAsset(req, res, asset, API_CACHE);
    return;
  }

  try {
    let buffer = getCachedDashboardBuffer();
    if (!buffer) {
      const entry = await ensureDashboardCache();
      buffer = entry.buffer;
    }

    res.setHeader("Cache-Control", API_CACHE);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.send(buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dashboard load failed";
    console.error("[api/dashboard]", message);
    res.status(500).json({ error: message });
  }
});

const DASHBOARD_SECTIONS_LIST: DashboardSection[] = DASHBOARD_SECTIONS;

for (const section of DASHBOARD_SECTIONS_LIST) {
  apiRouter.get(`/dashboard/${section}`, async (req, res) => {
    const asset = getSectionAsset(section);
    if (asset) {
      sendApiAsset(req, res, asset, API_CACHE);
      return;
    }

    const sectionPath = getPrecomputedSectionPath(section);
    if (fs.existsSync(sectionPath)) {
      res.setHeader("Cache-Control", API_CACHE);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.sendFile(sectionPath);
      return;
    }

    try {
      const json = await serializeDashboardSection(section);
      if (json.includes('"error"') && !json.includes('"overviewMetrics"') && !json.includes('"mtdHistory"')) {
        res.status(500).json({ error: "Dashboard section load failed" });
        return;
      }
      res.setHeader("Cache-Control", API_CACHE);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.send(json);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Dashboard section load failed";
      console.error(`[api/dashboard/${section}]`, message);
      res.status(500).json({ error: message });
    }
  });
}
