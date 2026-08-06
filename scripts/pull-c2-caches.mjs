#!/usr/bin/env node
/**
 * Write C2 Databricks + SF commission cache files from MCP result files
 * dropped under agent-tools/ by the refresh agent.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = join(root, "scripts/.cache");
const tools = process.env.MCP_TOOLS_DIR ?? join(process.env.HOME, ".cursor/projects/Users-madalin-Desktop-dashy/agent-tools");

function writeMcpTable(file, header, dataRows) {
  writeFileSync(join(cacheDir, file), `${header}\n\n${JSON.stringify({ data: dataRows }, null, 2)}\n`);
  console.log(`wrote ${file}: ${dataRows.length} rows`);
}

function parseDbResult(path) {
  const raw = readFileSync(path, "utf8");
  const json = JSON.parse(raw.slice(raw.indexOf("{")));
  if (json.error) throw new Error(`${path}: ${json.error.message}`);
  return json.data ?? [];
}

function parseSfResult(path) {
  const raw = readFileSync(path, "utf8");
  const json = JSON.parse(raw.startsWith("{") ? raw : raw.slice(raw.indexOf("{")));
  return json.records ?? [];
}

// Databricks monthly + quality
for (const [src, dest, header] of [
  ["db-monthly-result.txt", "accounts-perf-monthly.json", "Monthly GROSS GMV / orders / commission per provider (fact_provider_monthly)."],
  ["db-quality-result.txt", "accounts-perf-quality.json", "Monthly availability & performance value/weight pairs per provider."],
]) {
  const p = join(tools, src);
  if (!existsSync(p)) {
    console.warn(`skip ${dest} — ${src} missing`);
    continue;
  }
  writeMcpTable(dest, header, parseDbResult(p));
}

// SF commission batches → merged (0..7 + legacy ac102693 batch-0 dump)
const commRecords = [];
const seen = new Set();
function addComm(path) {
  if (!existsSync(path)) return;
  for (const r of parseSfResult(path)) {
    if (seen.has(r.Id)) continue;
    seen.add(r.Id);
    commRecords.push(r);
  }
}
for (let i = 0; i <= 7; i++) addComm(join(tools, `sf-comm-${i}-result.json`));
addComm(join(tools, "ac102693-dd94-4875-91d1-a33be668b993.txt"));
if (commRecords.length) {
  const provOppRaw = readFileSync(join(cacheDir, "accounts-perf-prov-opp.json"), "utf8");
  const provOpp = JSON.parse(provOppRaw.slice(provOppRaw.indexOf("{"))).data ?? [];
  const oppToProvider = new Map(provOpp.map(([pid, oid]) => [oid, pid]));
  const commissionRows = [];
  const segmentRows = [];
  for (const r of commRecords) {
    const pid = oppToProvider.get(r.Id);
    if (!pid) continue;
    commissionRows.push([String(pid), r.Commission__c ?? null, r.Id]);
    segmentRows.push([String(pid), r.Account?.Account_Management_Segment__c ?? null, r.Id]);
  }
  writeMcpTable(
    "accounts-perf-sf-commission.json",
    "Salesforce Opportunity.Commission__c per provider (via dim_provider_opportunity won opp).",
    commissionRows,
  );
  writeMcpTable(
    "accounts-perf-sf-segment.json",
    "Salesforce Account.Account_Management_Segment__c per provider (via dim_provider_opportunity won opp).",
    segmentRows,
  );
} else {
  console.warn("skip commission/segment — no sf-comm-*-result.json files");
}
