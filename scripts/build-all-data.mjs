#!/usr/bin/env node
/**
 * Orchestrator — THE single "refresh all data" entry point.
 *
 * Rebuilds EVERY dashboard section from the cached Salesforce + Databricks
 * exports under scripts/.cache/, in dependency order, into data/dashboard.json:
 *
 *   1. build-dashboard-data.mjs    → Overview/MTD, Weekly, WoW, MOPS, Accounts
 *      (writes a fresh base dashboard.json; merge-preserves the sections below)
 *   2. build-my-pipeline.mjs       → salesPipeline.myPipeline   (merge)
 *   3. build-accounts-performance  → accountsPerformance        (merge, Databricks)
 *   4. build-inbound-team.mjs      → inboundTeam                (merge)
 *
 * Each step reads + rewrites data/dashboard.json, so order matters and a single
 * run can NEVER leave the file with empty/partial sections. Re-running is
 * idempotent — it refreshes all sections in place and never wipes a tab. The
 * day/week/month/quarter/year reporting logic lives inside the individual
 * builders and is preserved unchanged here.
 *
 * Refreshing the underlying caches (Salesforce + Databricks via MCP) is done by
 * the Cursor agent in scripts/refresh-and-deploy.sh; this orchestrator turns
 * those refreshed caches into the dashboard payload. Run `npm run build`
 * afterwards to regenerate the precomputed API artifacts and verify them.
 *
 * Usage: `npm run refresh-all`  (alias: `npm run data:build`)
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// Pre-flight: validate every cache in the canonical manifest (existence,
// parseability, row-count bounds, truncation signatures) and FAIL FAST instead
// of building partial data. Closed-month chunk files being old is fine (the
// incremental refresh reads them from disk); missing ones are a hard error.
// Escape hatch (not for normal refreshes): DASHY_SKIP_VALIDATE=1
if (process.env.DASHY_SKIP_VALIDATE === "1") {
  console.warn("[build-all-data] DASHY_SKIP_VALIDATE=1 — skipping cache validation gate.");
} else {
  console.log("[build-all-data] (0) Cache validation gate — validate-caches.mjs");
  const gate = spawnSync(process.execPath, [join(here, "validate-caches.mjs")], {
    stdio: "inherit",
    env: process.env,
  });
  if (gate.status !== 0) {
    console.error(
      "\n[build-all-data] ABORTED — cache validation failed; not building partial data. " +
        "Fix the caches above (see node scripts/gen-all-cache-queries.mjs for every canonical query) " +
        "and re-run `npm run refresh-all`.",
    );
    process.exit(gate.status ?? 1);
  }
}

const STEPS = [
  { label: "Overview/MTD/Weekly/WoW/MOPS/Accounts", script: "build-dashboard-data.mjs" },
  { label: "MyPipeline", script: "build-my-pipeline.mjs" },
  { label: "Accounts performance (Databricks)", script: "build-accounts-performance.mjs" },
  { label: "Inbound team", script: "build-inbound-team.mjs" },
  // Writes data/mtd-details.json only (never dashboard.json): full-year
  // per-month per-agent Won/Activated drill-down lists for /api/dashboard/mtd-details.
  { label: "MTD drill-down details", script: "build-mtd-details.mjs" },
];

let ok = 0;
for (const [index, step] of STEPS.entries()) {
  const n = index + 1;
  console.log(`\n[build-all-data] (${n}/${STEPS.length}) ${step.label} — ${step.script}`);
  const result = spawnSync(process.execPath, [join(here, step.script)], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(
      `\n[build-all-data] FAILED at step ${n}/${STEPS.length} (${step.script}) ` +
        `exit=${result.status ?? "signal"}. data/dashboard.json may be partial — ` +
        "fix the source/cache and re-run `npm run refresh-all`. Not deploying.",
    );
    process.exit(result.status ?? 1);
  }
  ok += 1;
}

console.log(
  `\n[build-all-data] OK — rebuilt all ${ok} sections into data/dashboard.json. ` +
    "Run `npm run build` to regenerate + verify the API artifacts.",
);
