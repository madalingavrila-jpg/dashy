import compression from "compression";
import express from "express";
import fs from "node:fs";
import helmet from "helmet";
import path from "node:path";
import { config } from "./config.js";
import { apiRouter } from "./routes/api.js";
import { preloadDashboardModel } from "./services/dashboard.js";

const staticIndexPath = path.join(config.staticDir, "index.html");
const staticReady =
  fs.existsSync(config.staticDir) && fs.existsSync(staticIndexPath);

if (!staticReady) {
  console.error(
    `[dashy] Static export missing at ${config.staticDir}. ` +
      "API routes will start; UI routes return 503 until npm run build completes.",
  );
}

const app = express();
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
app.use(compression({ threshold: 1024 }));

app.use("/api", apiRouter);

function sendStaticUnavailable(res: express.Response): void {
  res.status(503).json({
    error: "Static export missing. Run npm run build before serving the UI.",
    staticDir: config.staticDir,
  });
}

if (staticReady) {
  app.use(
    express.static(config.staticDir, {
      index: ["index.html"],
      extensions: ["html"],
      maxAge: config.isProduction ? "1y" : 0,
      etag: true,
      lastModified: true,
      setHeaders(res, filePath) {
        if (/\.html$/.test(filePath)) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        }
      },
    }),
  );

  app.get("/", (_req, res) => {
    res.sendFile(staticIndexPath);
  });
}

function resolveStaticPath(urlPath: string): string | null {
  if (!staticReady) {
    return null;
  }

  const normalized = urlPath.replace(/\/$/, "") || "/";
  const candidates = [
    path.join(
      config.staticDir,
      normalized === "/" ? "index.html" : `${normalized.slice(1)}/index.html`,
    ),
    path.join(
      config.staticDir,
      normalized === "/" ? "index.html" : `${normalized.slice(1)}.html`,
    ),
  ];

  for (const candidate of candidates) {
    if (candidate.startsWith(config.staticDir) && fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    next();
    return;
  }

  if (!staticReady) {
    sendStaticUnavailable(res);
    return;
  }

  const filePath = resolveStaticPath(req.path);
  if (filePath) {
    res.sendFile(filePath, (error) => {
      if (error) {
        res.sendFile(staticIndexPath, (fallbackError) => {
          if (fallbackError) {
            next(fallbackError);
          }
        });
      }
    });
    return;
  }

  res.sendFile(staticIndexPath, (error) => {
    if (error) {
      next(error);
    }
  });
});

app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const message = error instanceof Error ? error.message : "Internal server error";
  console.error("[express]", message);
  res.status(500).json({ error: message });
});

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[uncaughtException]", error);
});

const server = app.listen(config.port, config.host, () => {
  console.log(
    `dashy listening on http://${config.host}:${config.port}` +
      (staticReady ? "" : " (static export unavailable)"),
  );
  preloadDashboardModel();
});

function shutdown(signal: string): void {
  console.log(`[dashy] ${signal} received, closing HTTP server`);
  server.close((error) => {
    if (error) {
      console.error("[dashy] shutdown error:", error.message);
      process.exit(1);
      return;
    }
    console.log("[dashy] HTTP server closed");
    process.exit(0);
  });
  setTimeout(() => {
    console.error("[dashy] forced exit after shutdown timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
