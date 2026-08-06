#!/usr/bin/env node
/** One-shot: write MCP pull results from agent-tools into scripts/.cache/ */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = join(root, "scripts/.cache");
const tools = process.env.MCP_TOOLS_DIR ?? join(process.env.HOME, ".cursor/projects/Users-madalin-Desktop-dashy/agent-tools");
mkdirSync(cacheDir, { recursive: true });

function readJson(p) { return JSON.parse(readFileSync(p, "utf8")); }
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
  "b432c77b-c841-48ae-a08c-f9e866f94c98.txt": "sf-stage-history-2026-07.json",
  "ce306da3-4d43-468f-a4b7-fbc7bba0967d.txt": "sf-won-ytd-bydate.json",
  "ee36d105-4b95-4cd1-b070-384e39802b42.txt": "sf-won-recent.json",
  "5bd846f8-3e3f-4530-92d0-fc5d59a7f6ed.txt": "sf-pipeline-open.json",
  "1cdf9a3d-c849-4e21-a2bd-c4b7ccf9c687.txt": "sf-account-activation-2026.json",
  "27984e1d-ea9c-4600-9932-e49d018e5033.txt": "sf-inbound-stage-history-2026-07.json",
  "cfd6867d-c6aa-4e3c-88ff-f31898be0365.txt": "mp-opps-working.json",
  "ea2d2c28-6e75-4701-9fca-d9f2c4adef0a.txt": "mp-opps-newopp.json",
  "ef12f62a-cf67-4be5-94c5-20c8ffe3e2f4.txt": "mp-leads.json",
  "cea6d260-9729-4d77-908d-7ccf4d389225.txt": "sf-mops-onboarding.json",
  "7a8d4e2d-37da-4b21-b67a-d18ef6db8217.txt": "sf-inbound-won-ytd-bydate.json",
  "73169924-77a6-4d79-8aa9-cb70e0b26e87.txt": "sf-inbound-weekly-2026.json",
  "716808c1-3631-4b28-a723-42d59580cbfb.txt": "sf-inbound-account-activation-2026.json",
};
for (const [src, dest] of Object.entries(sfMap)) writeSf(dest, readJson(join(tools, src)));

for (const [src, dest] of [
  ["weekly-july-inline.json", "sf-weekly-2026-07.json"],
  ["won-mtd-inline.json", "sf-won-mtd.json"],
  ["inbound-won-mtd-inline.json", "sf-inbound-won-mtd.json"],
]) writeSf(dest, readJson(join(tools, src)));

const sc = readJson(join(tools, "stage-counts-inline.json"));
writeSf("sf-pipeline-stage-counts.json", sc, {
  _query: "SELECT StageName, COUNT(Id) cnt FROM Opportunity WHERE RecordType.Name = 'Sales Opportunity' GROUP BY StageName",
  _note: "Live RO Sales Opportunity stage distribution. Refresh via Salesforce MCP on every data pull.",
});

const mp = assembleMpTotals(readJson(join(tools, "mp-totals-opps-inline.json")), readJson(join(tools, "mp-totals-leads-inline.json")));
writeFileSync(join(cacheDir, "mp-totals.json"), `${JSON.stringify(mp, null, 2)}\n`);
console.log("wrote mp-totals.json");

const mops = assembleMops(readJson(join(tools, "c677a1a1-17fc-40c0-888b-6908abcd3900.txt")));
writeFileSync(join(cacheDir, "sf-mops-cases.json"), `${JSON.stringify(mops, null, 2)}\n`);
console.log(`wrote sf-mops-cases.json: ${mops.openCases} open cases`);

writeMcpTable("accounts-perf-accounts.json", "RO providers activated YTD (won Sales Opportunity), with activation opp owner. Universe: dim_provider_opportunity ⨝ dim_provider_v2, provider_activated_ts >= 2026-01-01, country Romania, ROW_NUMBER dedup.", parseDb(join(tools, "4c2dd592-b891-41a6-b79d-6846eaad81c3.txt")));
writeMcpTable("accounts-perf-prov-opp.json", "Provider → won opportunity map (same window/dedup as accounts-perf-accounts).", parseDb(join(tools, "612bf199-79b8-44a9-aec4-c3c29d581738.txt")));

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
  const provOpp = parseDb(join(cacheDir, "accounts-perf-prov-opp.json").replace(cacheDir, join(tools, "612bf199-79b8-44a9-aec4-c3c29d581738.txt")));
  const provOppRaw = readFileSync(join(tools, "612bf199-79b8-44a9-aec4-c3c29d581738.txt"), "utf8");
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

console.log("write-refresh-caches done");
