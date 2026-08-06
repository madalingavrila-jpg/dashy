#!/usr/bin/env node
/** One-shot: merge 4 SF weekly-july batch files → scripts/.cache/sf-weekly-2026-07.json */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tools = process.env.MCP_TOOLS_DIR ?? join(process.env.HOME, ".cursor/projects/Users-madalin-Desktop-dashy/agent-tools");
const cache = join(root, "scripts/.cache");

const batches = ["weekly-july-b1.json", "weekly-july-b2.json", "weekly-july-b3.json", "weekly-july-b4.json"];
const records = [];
for (const f of batches) {
  const p = join(tools, f);
  if (!existsSync(p)) {
    console.error(`missing ${p}`);
    process.exit(1);
  }
  const j = JSON.parse(readFileSync(p, "utf8"));
  records.push(...(j.records ?? []));
}
records.sort((a, b) => b.CreatedDate.localeCompare(a.CreatedDate));
const out = { totalSize: records.length, done: true, records };
writeFileSync(join(cache, "sf-weekly-2026-07.json"), `${JSON.stringify(out)}\n`);
console.log(`wrote sf-weekly-2026-07.json: ${records.length} records`);
