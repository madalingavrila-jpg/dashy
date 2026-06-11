#!/usr/bin/env node
/** Bake /api/dashboard payload at build time to avoid runtime transforms on Boltable. */
import fs from "node:fs";
import path from "node:path";
import { serializeDashboardApi } from "../dist/src/services/dashboard.js";

const root = process.cwd();
const outDir = path.join(root, "out", "api");
const outFile = path.join(outDir, "dashboard.json");

fs.mkdirSync(outDir, { recursive: true });

const json = await serializeDashboardApi();
fs.writeFileSync(outFile, json);

console.log(
  `[precompute-dashboard-api] wrote ${outFile} (${Buffer.byteLength(json, "utf8")} bytes)`,
);
