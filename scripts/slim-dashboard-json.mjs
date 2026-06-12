#!/usr/bin/env node
/** Slim data/dashboard.json in place (MTD/weekly drill-down + account caps). */
import fs from "node:fs";
import path from "node:path";
import { slimDashboardRawData } from "../lib/slim-dashboard-source.mjs";

const root = process.cwd();
const filePath = path.join(root, "data", "dashboard.json");

if (!fs.existsSync(filePath)) {
  console.error("[slim-dashboard-json] data/dashboard.json not found");
  process.exit(1);
}

const before = fs.statSync(filePath).size;
const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
const slimmed = slimDashboardRawData(raw);
const json = `${JSON.stringify(slimmed, null, 2)}\n`;
fs.writeFileSync(filePath, json);
const after = Buffer.byteLength(json, "utf8");

console.log(
  `[slim-dashboard-json] ${filePath}: ${before} → ${after} bytes (${Math.round((1 - after / before) * 100)}% smaller)`,
);
