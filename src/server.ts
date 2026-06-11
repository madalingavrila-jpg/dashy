import compression from "compression";
import express from "express";
import fs from "node:fs";
import helmet from "helmet";
import path from "node:path";
import { config } from "./config.js";
import { apiRouter } from "./routes/api.js";

if (!fs.existsSync(config.staticDir)) {
  throw new Error(
    `Static export missing at ${config.staticDir}. Run npm run build first.`,
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
  res.sendFile(path.join(config.staticDir, "index.html"));
});

function resolveStaticPath(urlPath: string): string | null {
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
    if (candidate.startsWith(config.staticDir)) {
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

  const filePath = resolveStaticPath(req.path);
  if (filePath) {
    res.sendFile(filePath, (error) => {
      if (error) {
        res.sendFile(path.join(config.staticDir, "index.html"));
      }
    });
    return;
  }

  next();
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

app.listen(config.port, config.host, () => {
  console.log(`dashy listening on http://${config.host}:${config.port}`);
});
