#!/usr/bin/env node
/** Copy MCP agent-tools output files to expected C2 result paths. */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const tools = join(process.env.HOME, ".cursor/projects/Users-madalin-Desktop-dashy/agent-tools");

const mappings = process.argv.slice(2);
if (mappings.length === 0) {
  console.error("Usage: node _save-c2-results.mjs <srcBasename>:<destName> ...");
  process.exit(1);
}

for (const pair of mappings) {
  const [src, dest] = pair.split(":");
  const from = join(tools, src);
  const to = join(tools, dest);
  if (!existsSync(from)) {
    console.error(`MISSING ${from}`);
    process.exit(1);
  }
  copyFileSync(from, to);
  const raw = readFileSync(to, "utf8");
  const json = JSON.parse(raw.slice(raw.indexOf("{")));
  const rows = json.data?.length ?? json.records?.length ?? "?";
  console.log(`saved ${dest}: ${rows} rows`);
}
