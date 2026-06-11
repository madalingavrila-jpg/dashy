#!/usr/bin/env node
/** Fail the Paketo build if required production artifacts are missing. */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "out/index.html",
  "dist/src/server.js",
  "dist/src/routes/api.js",
  "dist/src/services/dashboard.js",
  "dist/lib/agent-segments.js",
  "dist/lib/format.js",
  "dist/lib/isoWeek.js",
  "dist/lib/salesforce.js",
  "data/dashboard.json",
];

const missing = required.filter((rel) => !fs.existsSync(path.join(root, rel)));

if (missing.length > 0) {
  console.error("[verify-build] Missing required build artifacts:");
  for (const file of missing) {
    console.error(`  - ${file}`);
  }
  process.exit(1);
}

try {
  JSON.parse(fs.readFileSync(path.join(root, "data/dashboard.json"), "utf8"));
} catch (error) {
  const message = error instanceof Error ? error.message : "invalid JSON";
  console.error(`[verify-build] data/dashboard.json is not valid JSON: ${message}`);
  process.exit(1);
}

console.log("[verify-build] OK — static export, server bundle, and dashboard data verified");
