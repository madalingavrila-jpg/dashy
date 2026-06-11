#!/usr/bin/env node
/** Merge MCP chunk text files into sheet-*.json cache. */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cache = join(root, "scripts/.cache");

function parseMcp(text) {
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

const segment = process.argv[2];
const dir = join(cache, `chunks-${segment}`);
if (!existsSync(dir)) {
  console.error(`Missing ${dir}`);
  process.exit(1);
}
const files = readdirSync(dir).filter((f) => f.endsWith(".txt")).sort();
const rows = files.flatMap((f) => parseMcp(readFileSync(join(dir, f), "utf8")));
const out = segment === "density" ? "sheet-density-weekly.json" : "sheet-complex-weekly.json";
writeFileSync(join(cache, out), `${JSON.stringify(rows, null, 2)}\n`);
console.log(JSON.stringify({ segment, chunks: files.length, rows: rows.length, out }));
