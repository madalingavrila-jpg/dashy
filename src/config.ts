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
};
