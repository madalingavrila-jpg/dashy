#!/usr/bin/env node
/**
 * Fetch Google Sheet ranges in 50-row chunks via bolt-pint MCP (stdin protocol).
 * Writes combined rows to scripts/.cache/sheet-{complex|density}-weekly.json
 *
 * Usage: node scripts/fetch-sheet-chunks.mjs complex
 *        node scripts/fetch-sheet-chunks.mjs density
 *
 * Expects MCP read_sheet_values responses on stdin, one chunk per blank-line block.
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SPREADSHEET_ID = "1IW8IxEs-YCsYMlCeTfkIz-b51eStjR5uUIEpkV1akRE";

const CHUNK_CONFIG = {
  complex: {
    tab: "Complex Weekly Tracker - All",
    startRow: 4,
    endRow: 550,
    chunkSize: 50,
    out: "sheet-complex-weekly.json",
  },
  density: {
    tab: "Density Weekly Tracker - All",
    startRow: 4,
    endRow: 550,
    chunkSize: 50,
    out: "sheet-density-weekly.json",
  },
};

function parseMcpSheetOutput(text) {
  const rows = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^Row\s+\d+:\s+(\[.+\])\s*$/);
    if (!m) continue;
    try {
      rows.push(JSON.parse(m[1].replace(/'/g, '"')));
    } catch {
      rows.push(Function(`"use strict"; return (${m[1]})`)());
    }
  }
  return rows;
}

function buildRanges(cfg) {
  const ranges = [];
  for (let r = cfg.startRow; r <= cfg.endRow; r += cfg.chunkSize) {
    const end = Math.min(r + cfg.chunkSize - 1, cfg.endRow);
    ranges.push(`${cfg.tab}!A${r}:Z${end}`);
  }
  return ranges;
}

const segment = process.argv[2] || "complex";
const cfg = CHUNK_CONFIG[segment];
if (!cfg) {
  console.error("segment must be complex or density");
  process.exit(1);
}

// If stdin has data, parse chunks from stdin blocks
const stdin = readFileSync(0, "utf8").trim();
if (stdin) {
  const blocks = stdin.split(/\n\s*\n/).filter(Boolean);
  const allRows = blocks.flatMap((b) => parseMcpSheetOutput(b));
  const cacheDir = join(root, "scripts/.cache");
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(join(cacheDir, cfg.out), `${JSON.stringify(allRows, null, 2)}\n`);
  console.log(JSON.stringify({ segment, rows: allRows.length, out: cfg.out }));
} else {
  // Print ranges for agent to fetch
  console.log(JSON.stringify({ spreadsheet_id: SPREADSHEET_ID, ranges: buildRanges(cfg) }, null, 2));
}
