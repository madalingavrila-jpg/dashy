#!/usr/bin/env node
/**
 * Parse bolt-pint read_sheet_values text output into JSON row arrays.
 * Reads from stdin or file paths passed as args.
 *
 * Usage:
 *   node scripts/fetch-hitlist-sheets.mjs complex < complex-raw.txt
 *   node scripts/fetch-hitlist-sheets.mjs density density-raw.txt
 */
import { readFileSync, writeFileSync } from "fs";

function parseMcpSheetOutput(text) {
  const rows = [];
  const lines = text.split("\n");
  for (const line of lines) {
    const m = line.match(/^Row\s+\d+:\s+(\[.+\])\s*$/);
    if (!m) continue;
    try {
      rows.push(JSON.parse(m[1].replace(/'/g, '"')));
    } catch {
      // fallback: eval-like parse for arrays with mixed quotes
      const inner = m[1];
      const parsed = eval(inner);
      rows.push(parsed);
    }
  }
  return rows;
}

const segment = process.argv[2] || "complex";
const inputPath = process.argv[3];
const input = inputPath ? readFileSync(inputPath, "utf8") : readFileSync(0, "utf8");
const rows = parseMcpSheetOutput(input);
const out = segment === "density"
  ? "scripts/.cache/sheet-density-weekly.json"
  : "scripts/.cache/sheet-complex-weekly.json";
writeFileSync(out, JSON.stringify(rows, null, 2));
console.log(`Wrote ${rows.length} rows to ${out}`);
