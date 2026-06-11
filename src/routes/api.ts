import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import {
  ensureDashboardCache,
  getCachedDashboardBuffer,
  getPrecomputedApiPath,
} from "../services/dashboard.js";

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
