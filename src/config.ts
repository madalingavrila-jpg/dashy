import { config as loadEnv } from "dotenv";
import path from "node:path";

const rootDir = process.cwd();

loadEnv({ path: path.join(rootDir, ".env") });
loadEnv({ path: path.join(rootDir, ".env.local"), override: true });

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export const config = {
  rootDir,
  staticDir: path.join(rootDir, "out"),
  port: parseInt(process.env.PORT || "8080", 10),
  host: process.env.HOST || "0.0.0.0",
  isProduction: process.env.NODE_ENV === "production",
  dashboardSheetUrl: readEnv("DASHBOARD_SHEET_URL"),
  /** Boltable File Storage (S3) — durable store for targets, prefs, live dashboard. IRSA; no AWS keys. */
  s3Bucket: readEnv("S3_BUCKET") || "boltable-dashy",
  s3Region: readEnv("S3_REGION") || "eu-central-1",
  /**
   * Optional: Bearer token for PUT /api/publish/dashboard (laptop → live without AWS CLI).
   * When unset, the publish route returns 404.
   */
  publishToken: readEnv("DASHY_PUBLISH_TOKEN"),
  /** Re-read dashboard when file mtime changes or this TTL elapses (default 5 min). */
  dashyCacheTtlMs: parseInt(process.env.DASHY_CACHE_TTL_MS || "300000", 10),
};
