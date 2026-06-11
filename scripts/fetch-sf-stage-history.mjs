#!/usr/bin/env node
/**
 * Merge monthly OpportunityFieldHistory MCP exports into scripts/.cache/sf-stage-history-2026.json.
 *
 * Export each month via Salesforce MCP soqlQuery (Field = 'StageName', CreatedDate range):
 *
 * SELECT OpportunityId, Field, OldValue, NewValue, CreatedDate,
 *   Opportunity.OwnerId, Opportunity.Owner.Name, Opportunity.RecordType.Name,
 *   Opportunity.AccountId, Opportunity.Account.Name, Opportunity.Account.BillingCity,
 *   Opportunity.Name, Opportunity.StageName
 * FROM OpportunityFieldHistory
 * WHERE Field = 'StageName'
 *   AND CreatedDate >= YYYY-MM-01T00:00:00Z
 *   AND CreatedDate < YYYY-MM+1-01T00:00:00Z
 * ORDER BY CreatedDate ASC
 *
 * Save each response as scripts/.cache/sf-stage-history-2026-MM.json then run this script.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(__dirname, ".cache");
const outPath = join(cacheDir, "sf-stage-history-2026.json");

const monthFiles = readdirSync(cacheDir)
  .filter((f) => /^sf-stage-history-2026-\d{2}\.json$/.test(f))
  .sort();

if (monthFiles.length === 0) {
  console.error("No monthly exports found (sf-stage-history-2026-NN.json).");
  process.exit(1);
}

const allRecords = [];
for (const file of monthFiles) {
  const data = JSON.parse(readFileSync(join(cacheDir, file), "utf8"));
  const records = data.records ?? data;
  if (!Array.isArray(records)) {
    console.error(`Unexpected format in ${file}`);
    process.exit(1);
  }
  allRecords.push(...records);
  console.log(`${file}: ${records.length} records`);
}

allRecords.sort((a, b) => new Date(a.CreatedDate) - new Date(b.CreatedDate));

writeFileSync(outPath, `${JSON.stringify({ totalSize: allRecords.length, records: allRecords }, null, 2)}\n`);
console.log(`Wrote ${outPath} (${allRecords.length} total records)`);
