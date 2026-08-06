#!/usr/bin/env node
/**
 * Generate Salesforce SOQL batches for the Churn Prevention SF status cache
 * (`scripts/.cache/churn-prevention-sf-status.json`).
 *
 * Reads the YTD activation universe (`accounts-perf-accounts.json`), keeps only
 * Complex + Density roster owners, and emits SOQL with Provider_Id__c IN-lists
 * of ≤300 IDs (same HTTP-431-safe batching as accounts-perf sf-commission).
 *
 * Usage:
 *   node scripts/gen-churn-prevention-queries.mjs
 *   node scripts/gen-churn-prevention-queries.mjs --json   # machine-readable batches
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isTeamAgent } from "../lib/agent-segments.mjs";
import { readMcpResult } from "../lib/accounts-performance-build.mjs";
import { chunk } from "./gen-accounts-perf-queries.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const cacheDir = path.join(here, ".cache");

export const SF_STATUS_BATCH_SIZE = 300;

/** Distinct provider_ids from the YTD universe attributed to Complex/Density. */
export function readTeamActivatedProviderIds() {
  const rows = readMcpResult(cacheDir, "accounts-perf-accounts.json");
  const ids = [];
  const seen = new Set();
  for (const row of rows) {
    const ownerName = row[1];
    if (!ownerName || !isTeamAgent(ownerName)) continue;
    const id = String(row[0]);
    if (!id || id === "null" || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/**
 * SOQL batches for Account.Status__c (+ IsDeleted / Inactive_30_days__c).
 * Provider_Id__c is a number field — emit unquoted IDs.
 */
export function sfStatusQueries(providerIds) {
  return chunk(providerIds, SF_STATUS_BATCH_SIZE).map(
    (batch) =>
      "SELECT Id, Name, Provider_Id__c, Status__c, IsDeleted, " +
      "Inactive_30_days__c, BillingCity, provider_first_active_date__c " +
      "FROM Account " +
      `WHERE Provider_Id__c IN (${batch.join(",")})`,
  );
}

function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, "").split("=");
      return [k, v ?? true];
    }),
  );

  if (!fs.existsSync(path.join(cacheDir, "accounts-perf-accounts.json"))) {
    console.error(
      "[gen-churn-prevention-queries] missing accounts-perf-accounts.json — pull batch C1 first.",
    );
    process.exit(1);
  }

  const ids = readTeamActivatedProviderIds();
  const queries = sfStatusQueries(ids);

  if (args.json) {
    console.log(JSON.stringify({ providerCount: ids.length, batchSize: SF_STATUS_BATCH_SIZE, queries }, null, 2));
    return;
  }

  console.error(
    `[gen-churn-prevention-queries] ${ids.length} Complex/Density providers, ` +
      `${queries.length} SF status batch(es) of ≤${SF_STATUS_BATCH_SIZE}.`,
  );
  queries.forEach((q, i) => {
    console.log(`-- [churn-prevention-sf-status batch ${i + 1}/${queries.length}]`);
    console.log(q);
    console.log("");
  });
}

if (import.meta.url === `file://${process.argv[1]}`) main();
