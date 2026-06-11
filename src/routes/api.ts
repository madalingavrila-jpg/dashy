import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import {
  ensureDashboardCache,
  getCachedDashboardBuffer,
  getPrecomputedApiPath,
} from "../services/dashboard.js";
import {
  mergeTargetConfig,
  readTargetConfig,
  writeTargetConfig,
  type TargetConfigPayload,
} from "../services/targetConfig.js";

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

apiRouter.get("/health", (_req, res) => {
  const staticIndex = path.join(config.staticDir, "index.html");
  const precomputed = getPrecomputedApiPath();
  const buildInfo = readBuildInfo();
  res.json({
    ok: true,
    app: "dashy",
    time: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    gitSha: buildInfo?.gitSha ?? null,
    builtAt: buildInfo?.builtAt ?? null,
    staticReady: fs.existsSync(staticIndex),
    dashboardCacheReady: getCachedDashboardBuffer() !== null,
    dashboardPrecomputed: fs.existsSync(precomputed),
  });
});

apiRouter.get("/status", (_req, res) => {
  res.json({
    ok: true,
    app: "dashy",
    dataSource: config.dashboardSheetUrl ? "sheet" : "json",
    dataPath: config.dashboardSheetUrl || "data/dashboard.json",
    apiPath: "out/api/dashboard.json",
    dataFlow:
      "Cursor (Salesforce MCP + Bolt Sheet MCP) → data/dashboard.json → build precompute → /api/dashboard",
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

apiRouter.get("/dashboard", async (_req, res) => {
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
