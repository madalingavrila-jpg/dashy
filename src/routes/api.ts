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
  getFullDashboardAsset,
  getSectionAsset,
  sendApiAsset,
} from "../services/apiAssets.js";

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

// Resolve immutable artifact state once at module load so /api/health never
// touches the filesystem (or throws) on the request path. These values are
// baked at build time and do not change during the process lifetime, so the
// health probe stays instant even under memory pressure or a data-load failure.
const BUILD_INFO = readBuildInfo();
const STATIC_READY = fs.existsSync(path.join(config.staticDir, "index.html"));
const DASHBOARD_PRECOMPUTED = fs.existsSync(getPrecomputedApiPath());
const DASHBOARD_SECTIONS_PRECOMPUTED = precomputedSectionsReady();

apiRouter.get("/health", (_req, res) => {
  // The liveness probe must succeed regardless of dashboard data state so a
  // failed/slow data load can never make Boltable mark the container unhealthy.
  let dashboardCacheReady = false;
  try {
    dashboardCacheReady = getCachedDashboardBuffer() !== null;
  } catch {
    dashboardCacheReady = false;
  }

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
    cacheTtlMs: config.dashyCacheTtlMs,
  });
});

apiRouter.get("/status", (_req, res) => {
  res.json({
    ok: true,
    app: "dashy",
    dataSource: config.dashboardSheetUrl ? "sheet" : "json",
    dataPath: config.dashboardSheetUrl || "data/dashboard.json",
    apiPath: "out/api/dashboard.json",
    cacheTtlMs: config.dashyCacheTtlMs,
    dashboardSections: [
      "/api/dashboard/overview",
      "/api/dashboard/mtd",
      "/api/dashboard/weekly",
      "/api/dashboard/accounts",
      "/api/dashboard/accounts-performance",
      "/api/dashboard/mops",
      "/api/dashboard/agents",
    ],
    dataFlow:
      "Cursor (Salesforce MCP + Bolt Sheet MCP) → data/dashboard.json (slim at source) → build precompute → /api/dashboard/*",
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

apiRouter.get("/dashboard", async (req, res) => {
  // Fast path: serve the preloaded, precompressed buffer (no disk I/O, no
  // runtime gzip). Falls back to the dynamic cache only when no precompute
  // exists (e.g. DASHBOARD_SHEET_URL mode or a partial build).
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
