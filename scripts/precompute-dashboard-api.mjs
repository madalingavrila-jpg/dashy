#!/usr/bin/env node
/** Bake /api/dashboard payloads at build time to avoid runtime transforms on Boltable. */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {
  loadFullDashboardModel,
  serializeDashboardApi,
  sliceDashboardSection,
} from "../dist/src/services/dashboard.js";

const root = process.cwd();
const outDir = path.join(root, "out", "api");
const outFile = path.join(outDir, "dashboard.json");
const sectionDir = path.join(outDir, "dashboard");

const SECTIONS = [
  "overview",
  "mtd",
  "weekly",
  "accounts",
  "accounts-performance",
  "mops",
  "agents",
];

// Sections that keep their heavy drill-down data must be sliced from the full
// (non-slim) model — the slimmed payload drops these arrays to stay under cap.
const FULL_MODEL_SECTIONS = new Set(["accounts-performance"]);

fs.mkdirSync(sectionDir, { recursive: true });

// Precompress JSON once at build time so the runtime never spends CPU/heap on
// per-request gzip — the main OOM driver under concurrency on Boltable. The
// server preloads these tiny buffers and serves them with Content-Encoding.
function writeWithCompression(filePath, json) {
  const raw = Buffer.from(json, "utf8");
  fs.writeFileSync(filePath, raw);
  const gz = zlib.gzipSync(raw, { level: zlib.constants.Z_BEST_COMPRESSION });
  fs.writeFileSync(`${filePath}.gz`, gz);
  const br = zlib.brotliCompressSync(raw, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: raw.length,
    },
  });
  fs.writeFileSync(`${filePath}.br`, br);
  return { raw: raw.length, gz: gz.length, br: br.length };
}

const json = await serializeDashboardApi();
const fullSizes = writeWithCompression(outFile, json);

const model = JSON.parse(json);
const fullModel = await loadFullDashboardModel();
let sectionBytes = 0;
for (const section of SECTIONS) {
  const source = FULL_MODEL_SECTIONS.has(section) ? fullModel : model;
  const sectionJson = JSON.stringify(sliceDashboardSection(source, section));
  const sectionFile = path.join(sectionDir, `${section}.json`);
  const sizes = writeWithCompression(sectionFile, sectionJson);
  sectionBytes += sizes.raw;
}

console.log(
  `[precompute-dashboard-api] wrote ${outFile} ` +
    `(raw ${fullSizes.raw}, gzip ${fullSizes.gz}, br ${fullSizes.br} bytes) ` +
    `and ${SECTIONS.length} section files (${sectionBytes} raw bytes, +gzip/br each)`,
);
