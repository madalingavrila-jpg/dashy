#!/usr/bin/env node
/** Bake /api/dashboard payloads at build time to avoid runtime transforms on Boltable. */
import fs from "node:fs";
import path from "node:path";
import {
  serializeDashboardApi,
  sliceDashboardSection,
} from "../dist/src/services/dashboard.js";

const root = process.cwd();
const outDir = path.join(root, "out", "api");
const outFile = path.join(outDir, "dashboard.json");
const sectionDir = path.join(outDir, "dashboard");

const SECTIONS = ["overview", "mtd", "weekly", "accounts", "mops", "agents"];

fs.mkdirSync(sectionDir, { recursive: true });

const json = await serializeDashboardApi();
fs.writeFileSync(outFile, json);

const model = JSON.parse(json);
let sectionBytes = 0;
for (const section of SECTIONS) {
  const sectionJson = JSON.stringify(sliceDashboardSection(model, section));
  const sectionFile = path.join(sectionDir, `${section}.json`);
  fs.writeFileSync(sectionFile, sectionJson);
  sectionBytes += Buffer.byteLength(sectionJson, "utf8");
}

console.log(
  `[precompute-dashboard-api] wrote ${outFile} (${Buffer.byteLength(json, "utf8")} bytes) ` +
    `and ${SECTIONS.length} section files (${sectionBytes} bytes total)`,
);
