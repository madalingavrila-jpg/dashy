#!/usr/bin/env node
/**
 * Save inline MCP JSON stubs + copy C2 result files from agent-tools.
 * Run after MCP C2 pulls complete.
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const tools = join(process.env.HOME, ".cursor/projects/Users-madalin-Desktop-dashy/agent-tools");

// Inline stubs from re-pull (written by shell heredocs below if missing)
const inlineFiles = [
  "inline-sf-reactivation-2026.json",
  "inline-sf-inbound-won-mtd.json",
  "inline-sf-inbound-reactivation-2026.json",
  "inline-mp-totals-opps.json",
  "inline-mp-totals-leads.json",
];

for (const f of inlineFiles) {
  const p = join(tools, f);
  if (!existsSync(p)) console.warn(`missing ${f}`);
  else console.log(`ok ${f}`);
}

// C2 result file aliases
const c2Map = [
  ["db-monthly-result.txt", "db-monthly-result.txt"],
  ["db-quality-result.txt", "db-quality-result.txt"],
];
for (let i = 0; i <= 6; i++) {
  c2Map.push([`sf-comm-${i}-result.json`, `sf-comm-${i}-result.json`]);
}
for (const [name] of c2Map) {
  const p = join(tools, name);
  if (!existsSync(p)) console.warn(`missing C2 ${name}`);
  else {
    const raw = readFileSync(p, "utf8");
    const n = raw.includes('"data"') ? (JSON.parse(raw.slice(raw.indexOf("{"))).data?.length ?? "?") : (JSON.parse(raw.slice(raw.indexOf("{"))).records?.length ?? "?");
    console.log(`ok C2 ${name}: ${n} rows`);
  }
}

console.log("finalize check done");
