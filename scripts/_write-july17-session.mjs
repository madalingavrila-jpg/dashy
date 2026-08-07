#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = join(root, "scripts/.cache");
const tools = process.env.MCP_TOOLS_DIR ?? join(process.env.HOME, ".cursor/projects/Users-madalin-Desktop-dashy/agent-tools");
mkdirSync(cacheDir, { recursive: true });

function readJson(p) {
  const raw = readFileSync(p, "utf8");
  return JSON.parse(raw.startsWith("{") ? raw : raw.slice(raw.indexOf("{")));
}
function writeSf(file, data, extra = {}) {
  const out = { ...extra, totalSize: data.totalSize ?? data.records?.length ?? 0, done: data.done !== false, records: data.records ?? [] };
  writeFileSync(join(cacheDir, file), `${JSON.stringify(out)}\n`);
  console.log(`wrote ${file}: ${out.records.length} records, done=${out.done}`);
}
function writeMcpTable(file, header, rows) {
  writeFileSync(join(cacheDir, file), `${header}\n\n${JSON.stringify({ data: rows }, null, 2)}\n`);
  console.log(`wrote ${file}: ${rows.length} rows`);
}
function parseDb(p) {
  const raw = readFileSync(p, "utf8");
  return JSON.parse(raw.slice(raw.indexOf("{"))).data ?? [];
}
function assembleMpTotals(opps, leads) {
  const oppsMap = {};
  for (const r of opps.records ?? []) {
    const id = r.OwnerId, st = r.StageName, c = Number(r.cnt) || 0;
    if (!oppsMap[id]) oppsMap[id] = { total: 0 };
    oppsMap[id][st] = c;
    oppsMap[id].total += c;
  }
  const leadsOpen = {};
  for (const r of leads.records ?? []) leadsOpen[r.OwnerId] = Number(r.cnt) || 0;
  return { _comment: "Authoritative open-pipeline counts per rep from Salesforce GROUP BY.", opps: oppsMap, leadsOpen };
}
function assembleMops(raw) {
  const records = raw.records ?? [];
  const byStatus = new Map(), byRT = new Map(), byOwner = new Map();
  let openNewOnboarding = 0;
  const outRecords = records.map((c) => {
    const status = c.Status ?? "Unknown", rt = c.RecordType?.Name ?? "Unknown", oid = c.OwnerId, on = c.Owner?.Name ?? "Unknown";
    byStatus.set(status, (byStatus.get(status) ?? 0) + 1);
    byRT.set(rt, (byRT.get(rt) ?? 0) + 1);
    if (!byOwner.has(oid)) byOwner.set(oid, { ownerId: oid, name: on, count: 0 });
    byOwner.get(oid).count += 1;
    if (rt === "New Onboarding") openNewOnboarding += 1;
    return { id: c.Id, caseNumber: c.CaseNumber, subject: c.Subject, status, ownerId: oid, ownerName: on, recordType: rt, url: `https://bolt.lightning.force.com/lightning/r/Case/${c.Id}/view` };
  });
  const sd = (a, b) => b.count - a.count;
  return {
    openCases: records.length, openNewOnboarding,
    openByStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })).sort(sd),
    openByRecordType: [...byRT.entries()].map(([recordType, count]) => ({ recordType, count })).sort(sd),
    openByOwner: [...byOwner.values()].sort(sd), records: outRecords,
  };
}

const sfMap = {
  "3231580f-1589-437f-b263-8566fc1b0dfb.txt": "sf-stage-history-2026-07.json",
  "101aba1b-7648-4a18-a8f4-63a8b48ea0ea.txt": "sf-inbound-stage-history-2026-07.json",
  "a850a1e2-2168-4c7a-ba75-a516d8c81ee0.txt": "sf-account-activation-2026.json",
  "531d823a-fb0d-4dae-bc99-a5efaee3499d.txt": "sf-won-mtd.json",
  "eb0a85a1-cf5f-446b-83b2-07dfafb11780.txt": "sf-won-ytd-bydate.json",
  "bada589e-8fca-49dd-a236-a6c9e52950b7.txt": "sf-won-recent.json",
  "24541898-3222-4af1-a215-62e6bf7d5c87.txt": "sf-pipeline-open.json",
  "9f89c1d6-911a-4c61-b69e-d62687f0347a.txt": "mp-opps-working.json",
  "959ead67-8094-4d36-97e3-c5f1a7633f97.txt": "mp-opps-newopp.json",
  "b25c0047-5ab8-4f58-810e-197865078a63.txt": "mp-leads.json",
  "1d09c12a-3886-4861-b34e-09f1000396b2.txt": "sf-mops-onboarding.json",
  "64efbfd5-0d66-426d-8042-d6b1f1bfbb2d.txt": "sf-inbound-account-activation-2026.json",
  "756a74b8-a7b4-4370-82d9-cfe93eb57dc2.txt": "sf-inbound-won-ytd-bydate.json",
  "c4cc20cd-53cc-412e-aba5-8ba5bd3ea410.txt": "sf-inbound-weekly-2026.json",
};
for (const [src, dest] of Object.entries(sfMap)) writeSf(dest, readJson(join(tools, src)));

// weekly July was inline in MCP response — saved separately
writeSf("sf-weekly-2026-07.json", readJson(join(tools, "weekly-july-inline.json")));

writeSf("sf-reactivation-2026.json", readJson(join(tools, "reactivation-inline.json")));
writeSf("sf-inbound-reactivation-2026.json", readJson(join(tools, "inbound-reactivation-inline.json")));
writeSf("sf-inbound-won-mtd.json", readJson(join(tools, "inbound-won-mtd-inline.json")));

const sc = readJson(join(tools, "stage-counts-inline.json"));
writeSf("sf-pipeline-stage-counts.json", sc, {
  _query: "SELECT StageName, COUNT(Id) cnt FROM Opportunity WHERE RecordType.Name = 'Sales Opportunity' GROUP BY StageName",
  _note: "Live RO Sales Opportunity stage distribution. Refresh via Salesforce MCP on every data pull.",
});

const mp = assembleMpTotals(readJson(join(tools, "mp-totals-opps-inline.json")), readJson(join(tools, "mp-totals-leads-inline.json")));
writeFileSync(join(cacheDir, "mp-totals.json"), `${JSON.stringify(mp, null, 2)}\n`);
console.log("wrote mp-totals.json");

const mops = assembleMops(readJson(join(tools, "d9a931cd-f283-4b7c-8532-26aa61cbe88f.txt")));
writeFileSync(join(cacheDir, "sf-mops-cases.json"), `${JSON.stringify(mops, null, 2)}\n`);
console.log(`wrote sf-mops-cases.json: ${mops.openCases} open cases`);

writeMcpTable("accounts-perf-accounts.json", "RO providers activated YTD (won Sales Opportunity), with activation opp owner. Universe: dim_provider_opportunity ⨝ dim_provider_v2, provider_activated_ts >= 2026-01-01, country Romania, ROW_NUMBER dedup.", parseDb(join(tools, "82341e03-c18a-4ba0-bd0f-32e8a9c4b31d.txt")));
writeMcpTable("accounts-perf-prov-opp.json", "Provider → won opportunity map (same window/dedup as accounts-perf-accounts).", parseDb(join(tools, "ee82845d-2910-4b4f-aeb3-ef7d40aa2a5c.txt")));

for (const [src, dest, header] of [
  ["db-monthly-result.txt", "accounts-perf-monthly.json", "Monthly GROSS GMV / orders / commission per provider (fact_provider_monthly)."],
  ["db-quality-result.txt", "accounts-perf-quality.json", "Monthly availability & performance value/weight pairs per provider."],
]) {
  try { writeMcpTable(dest, header, parseDb(join(tools, src))); } catch (e) { console.warn(`skip ${dest}: ${e.message}`); }
}

const commRecords = [];
for (let i = 1; i <= 6; i++) {
  const p = join(tools, `sf-comm-${i}-result.json`);
  try { commRecords.push(...(readJson(p).records ?? [])); } catch { /* skip */ }
}
if (commRecords.length) {
  const provOppRaw = readFileSync(join(tools, "ee82845d-2910-4b4f-aeb3-ef7d40aa2a5c.txt"), "utf8");
  const provOppData = JSON.parse(provOppRaw.slice(provOppRaw.indexOf("{"))).data ?? [];
  const oppToProvider = new Map(provOppData.map(([pid, oid]) => [oid, pid]));
  const commissionRows = [], segmentRows = [];
  for (const r of commRecords) {
    const pid = oppToProvider.get(r.Id);
    if (!pid) continue;
    commissionRows.push([String(pid), r.Commission__c ?? null, r.Id]);
    segmentRows.push([String(pid), r.Account?.Account_Management_Segment__c ?? null, r.Id]);
  }
  writeMcpTable("accounts-perf-sf-commission.json", "Salesforce Opportunity.Commission__c per provider (via dim_provider_opportunity won opp).", commissionRows);
  writeMcpTable("accounts-perf-sf-segment.json", "Salesforce Account.Account_Management_Segment__c per provider (via dim_provider_opportunity won opp).", segmentRows);
}

console.log("session write done");
