import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import {
  getCachedDashboardJson,
  loadDashboardModel,
} from "../services/dashboard.js";

export const apiRouter = Router();

const API_CACHE = "public, max-age=60, stale-while-revalidate=120";

apiRouter.get("/health", (_req, res) => {
  const staticIndex = path.join(config.staticDir, "index.html");
  const json = getCachedDashboardJson();
  res.json({
    ok: true,
    app: "dashy",
    time: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    staticReady: fs.existsSync(staticIndex),
    dashboardCacheReady: json !== null,
  });
});

apiRouter.get("/status", (_req, res) => {
  res.json({
    ok: true,
    app: "dashy",
    dataSource: config.dashboardSheetUrl ? "sheet" : "json",
    dataPath: config.dashboardSheetUrl || "data/dashboard.json",
    dataFlow:
      "Cursor (Salesforce MCP + Bolt Sheet MCP) → data/dashboard.json → /api/dashboard",
  });
});

apiRouter.get("/dashboard", async (_req, res) => {
  try {
    await loadDashboardModel();
    const json = getCachedDashboardJson();
    if (!json) {
      res.status(503).json({ error: "Dashboard cache warming up. Retry shortly." });
      return;
    }
    res.setHeader("Cache-Control", API_CACHE);
    res.type("json").send(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dashboard load failed";
    console.error("[api/dashboard]", message);
    res.status(500).json({ error: message });
  }
});
