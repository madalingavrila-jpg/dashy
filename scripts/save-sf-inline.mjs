#!/usr/bin/env node
/** Read SF MCP JSON from stdin or file → write scripts/.cache/ or agent-tools fix file */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const destArg = args[0];
const mode = args.includes("tools") ? "tools" : "cache";
const fileArg = args.find((a) => a.endsWith(".json") && a !== destArg);
if (!destArg) {
  console.error("Usage: node scripts/save-sf-inline.mjs <filename> [cache|tools] [input.json]");
  process.exit(1);
}
const raw = fileArg ? readFileSync(fileArg, "utf8") : readFileSync(0, "utf8");
const data = JSON.parse(raw.startsWith("{") ? raw : raw.slice(raw.indexOf("{")));
const out = {
  totalSize: data.totalSize ?? data.records?.length ?? 0,
  done: data.done !== false,
  records: data.records ?? [],
};
const dir = mode === "tools"
  ? (process.env.MCP_TOOLS_DIR ?? join(process.env.HOME, ".cursor/projects/Users-madalin-Desktop-dashy/agent-tools"))
  : join(root, "scripts/.cache");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, destArg), `${JSON.stringify(out)}\n`);
console.log(`wrote ${join(dir, destArg)}: ${out.records.length} records, done=${out.done}`);
