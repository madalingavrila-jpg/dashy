#!/usr/bin/env node
/**
 * Pull OpportunityFieldHistory from Salesforce REST API (requires SF CLI auth or env token).
 * Usage: node scripts/pull-sf-stage-history.mjs
 * Falls back to printing SOQL chunks if no auth available.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(__dirname, ".cache");
mkdirSync(cacheDir, { recursive: true });

const FIELDS = [
  "OpportunityId", "Field", "OldValue", "NewValue", "CreatedDate",
  "Opportunity.OwnerId", "Opportunity.Owner.Name", "Opportunity.RecordType.Name",
  "Opportunity.AccountId", "Opportunity.Account.Name", "Opportunity.Account.BillingCity",
  "Opportunity.Name", "Opportunity.StageName",
].join(", ");

const CHUNKS = [
  ["2026-01-01T00:00:00Z", "2026-01-16T00:00:00Z", "01a"],
  ["2026-01-16T00:00:00Z", "2026-02-01T00:00:00Z", "01b"],
  ["2026-02-01T00:00:00Z", "2026-02-16T00:00:00Z", "02a"],
  ["2026-02-16T00:00:00Z", "2026-03-01T00:00:00Z", "02b"],
  ["2026-03-01T00:00:00Z", "2026-03-16T00:00:00Z", "03a"],
  ["2026-03-16T00:00:00Z", "2026-04-01T00:00:00Z", "03b"],
  ["2026-04-01T00:00:00Z", "2026-04-16T00:00:00Z", "04a"],
  ["2026-04-16T00:00:00Z", "2026-05-01T00:00:00Z", "04b"],
  ["2026-05-01T00:00:00Z", "2026-05-16T00:00:00Z", "05a"],
  ["2026-05-16T00:00:00Z", "2026-06-01T00:00:00Z", "05b"],
  ["2026-06-01T00:00:00Z", "2026-07-01T00:00:00Z", "06"],
];

function soql(from, to) {
  return `SELECT ${FIELDS} FROM OpportunityFieldHistory WHERE Field = 'StageName' AND CreatedDate >= ${from} AND CreatedDate < ${to} ORDER BY CreatedDate ASC`;
}

function trySfCli(q) {
  try {
    const out = execSync(`sf data query --query "${q.replace(/"/g, '\\"')}" --json`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return JSON.parse(out);
  } catch {
    return null;
  }
}

const allRecords = [];
let usedCli = false;

for (const [from, to, tag] of CHUNKS) {
  const q = soql(from, to);
  const result = trySfCli(q);
  if (result?.result?.records) {
    usedCli = true;
    const records = result.result.records;
    writeFileSync(join(cacheDir, `sf-stage-history-2026-${tag}.json`), JSON.stringify({ records }, null, 2));
    allRecords.push(...records);
    console.log(`${tag}: ${records.length} records (sf cli)`);
  } else {
    console.log(`# ${tag}: ${q}`);
  }
}

if (usedCli) {
  allRecords.sort((a, b) => new Date(a.CreatedDate) - new Date(b.CreatedDate));
  const outPath = join(cacheDir, "sf-stage-history-2026.json");
  writeFileSync(outPath, `${JSON.stringify({ totalSize: allRecords.length, records: allRecords }, null, 2)}\n`);
  console.log(`Wrote ${outPath} (${allRecords.length} total)`);
} else {
  console.error("No SF CLI auth — run SOQL via MCP and save chunk files, then: node scripts/fetch-sf-stage-history.mjs");
  process.exit(1);
}
