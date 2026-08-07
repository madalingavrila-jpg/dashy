#!/usr/bin/env node
/**
 * Helper: print C2 pull manifest for agent MCP calls + save instructions.
 * Agent runs MCP, then: node scripts/_save-c2-results.mjs <monthly-out> <quality-out> ...
 */
import { readFileSync, writeFileSync } from "node:fs";

const c2 = JSON.parse(readFileSync("/tmp/c2-queries.json", "utf8"));
const manifest = {
  databricks: [
    { name: "monthly", query: c2.monthly, out: "db-monthly-result.txt" },
    { name: "quality", query: c2.quality, out: "db-quality-result.txt" },
  ],
  sfComm: c2.sfComm.map((q, i) => ({ name: `batch-${i}`, query: q, out: `sf-comm-${i}-result.json` })),
};
writeFileSync("/tmp/c2-pull-manifest.json", JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({
  databricks: manifest.databricks.map((d) => ({ name: d.name, queryLen: d.query.length, out: d.out })),
  sfComm: manifest.sfComm.map((d) => ({ name: d.name, queryLen: d.query.length, out: d.out })),
}));
