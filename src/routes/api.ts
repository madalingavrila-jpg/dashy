import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { loadDashboardModel } from "../services/dashboard.js";

export const apiRouter = Router();

const API_CACHE = "public, max-age=60, stale-while-revalidate=120";

apiRouter.get("/health", (_req, res) => {
  const staticIndex = path.join(config.staticDir, "index.html");
  res.json({
    ok: true,
    app: "dashy",
    time: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    staticReady: fs.existsSync(staticIndex),
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
    const model = await loadDashboardModel();
    res.setHeader("Cache-Control", API_CACHE);
    res.json(model);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dashboard load failed";
    console.error("[api/dashboard]", message);
    res.status(500).json({ error: message });
  }
});
