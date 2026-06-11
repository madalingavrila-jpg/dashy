#!/usr/bin/env node
/**
 * Parse bolt-pint read_sheet_values text output into JSON row arrays.
 * Usage: node scripts/csv-to-sheet-json.mjs < out.txt > rows.json
 *    or: node scripts/csv-to-sheet-json.mjs file1.txt file2.txt ...
 */
import { readFileSync, writeFileSync } from "fs";

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

const files = process.argv.slice(2);
const inputs = files.length
  ? files.map((f) => readFileSync(f, "utf8")).join("\n")
  : readFileSync(0, "utf8");
const rows = parseMcpSheetOutput(inputs);
process.stdout.write(`${JSON.stringify(rows)}\n`);
