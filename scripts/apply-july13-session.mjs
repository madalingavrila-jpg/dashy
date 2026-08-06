#!/usr/bin/env node
/** Apply July 13 refresh MCP pulls from agent-tools → scripts/.cache/ */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
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
  return readJson(p).data ?? [];
}
function assembleMpTotals(opps, leads) {
  const oppsMap = {};
  for (const r of opps.records ?? []) {
    const id = r.OwnerId;
    const st = r.StageName;
    const c = Number(r.cnt) || 0;
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
  const byStatus = new Map();
  const byRT = new Map();
  const byOwner = new Map();
  let openNewOnboarding = 0;
  const outRecords = records.map((c) => {
    const status = c.Status ?? "Unknown";
    const rt = c.RecordType?.Name ?? "Unknown";
    const oid = c.OwnerId;
    const on = c.Owner?.Name ?? "Unknown";
    byStatus.set(status, (byStatus.get(status) ?? 0) + 1);
    byRT.set(rt, (byRT.get(rt) ?? 0) + 1);
    if (!byOwner.has(oid)) byOwner.set(oid, { ownerId: oid, name: on, count: 0 });
    byOwner.get(oid).count += 1;
    if (rt === "New Onboarding") openNewOnboarding += 1;
    return {
      id: c.Id, caseNumber: c.CaseNumber, subject: c.Subject, status,
      ownerId: oid, ownerName: on, recordType: rt,
      url: `https://bolt.lightning.force.com/lightning/r/Case/${c.Id}/view`,
    };
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
  "808130d7-8f11-4d69-8901-e687275617a1.txt": "sf-stage-history-2026-07.json",
  "e20446fe-51e3-40c5-90d3-ea55c95be97c.txt": "sf-account-activation-2026.json",
  "90237dd4-9a50-4003-92ef-529aa4ea5bf8.txt": "sf-won-mtd.json",
  "1e508e3f-34b5-47d8-aa60-968d9a540b1a.txt": "sf-won-ytd-bydate.json",
  "5de7baac-33ca-4ac2-811f-e22d0742627e.txt": "sf-won-recent.json",
  "5e4159b7-d60a-4fc0-9d4c-8874091d1215.txt": "sf-pipeline-open.json",
  "a0ed03e3-92bb-4bb8-8cb6-ea6f5aad3708.txt": "sf-inbound-stage-history-2026-07.json",
  "b8fa1f2d-94b2-4714-a825-a73e110d9fed.txt": "mp-opps-working.json",
  "35350726-2416-4613-9ff3-fc5e0b01a3c5.txt": "mp-opps-newopp.json",
  "3abbf29e-3636-41f7-8b04-fbf88fbd6b56.txt": "mp-leads.json",
  "2d5dabed-35e1-433b-858d-5722d235a0b7.txt": "sf-mops-onboarding.json",
  "5ed669f5-bcc2-486e-b9fe-7e01c4a6d515.txt": "sf-inbound-won-ytd-bydate.json",
  "68303d11-6109-4708-b1b6-322a0b90abe1.txt": "sf-inbound-weekly-2026.json",
  "59459ae3-701d-4a49-8646-b5b04857a441.txt": "sf-inbound-account-activation-2026.json",
};
for (const [src, dest] of Object.entries(sfMap)) {
  const p = join(tools, src);
  if (!existsSync(p)) { console.warn(`skip ${dest} — ${src} missing`); continue; }
  writeSf(dest, readJson(p));
}

for (const [src, dest, extra] of [
  ["fix-reactivation.json", "sf-reactivation-2026.json", {}],
  ["fix-weekly-july.json", "sf-weekly-2026-07.json", {}],
  ["fix-inbound-won-mtd.json", "sf-inbound-won-mtd.json", {}],
  ["fix-stage-counts.json", "sf-pipeline-stage-counts.json", {
    _query: "SELECT StageName, COUNT(Id) cnt FROM Opportunity WHERE RecordType.Name = 'Sales Opportunity' GROUP BY StageName",
    _note: "Live RO Sales Opportunity stage distribution. Refresh via Salesforce MCP on every data pull.",
  }],
]) {
  const p = join(tools, src);
  if (!existsSync(p)) { console.warn(`skip ${dest} — ${src} missing`); continue; }
  writeSf(dest, readJson(p), extra);
}

writeSf("sf-inbound-reactivation-2026.json", { totalSize: 0, done: true, records: [] });

const mopsPath = join(tools, "960d25bc-3eb0-4036-b4c9-da716f497394.txt");
if (existsSync(mopsPath)) {
  const mops = assembleMops(readJson(mopsPath));
  writeFileSync(join(cacheDir, "sf-mops-cases.json"), `${JSON.stringify(mops, null, 2)}\n`);
  console.log(`wrote sf-mops-cases.json: ${mops.openCases} open cases`);
}

const mpOppsPath = join(tools, "mp-totals-opps-inline.json");
const mpLeadsPath = join(tools, "mp-totals-leads-inline.json");
if (existsSync(mpOppsPath) && existsSync(mpLeadsPath)) {
  const mp = assembleMpTotals(readJson(mpOppsPath), readJson(mpLeadsPath));
  writeFileSync(join(cacheDir, "mp-totals.json"), `${JSON.stringify(mp, null, 2)}\n`);
  console.log(`wrote mp-totals.json: ${Object.keys(mp.opps).length} reps`);
}

writeMcpTable(
  "accounts-perf-accounts.json",
  "RO providers activated YTD (won Sales Opportunity), with activation opp owner. Universe: dim_provider_opportunity ⨝ dim_provider_v2, provider_activated_ts >= 2026-01-01, country Romania, ROW_NUMBER dedup.",
  parseDb(join(tools, "abbcd3e2-80af-4822-8b20-876c7c27dc16.txt")),
);
writeMcpTable(
  "accounts-perf-prov-opp.json",
  "Provider → won opportunity map (same window/dedup as accounts-perf-accounts).",
  parseDb(join(tools, "cec6cff5-5850-46a4-9b09-b50b773e9f9e.txt")),
);

for (const [src, dest, header] of [
  ["db-monthly-result.txt", "accounts-perf-monthly.json", "Monthly GROSS GMV / orders / commission per provider (fact_provider_monthly)."],
  ["db-quality-result.txt", "accounts-perf-quality.json", "Monthly availability & performance value/weight pairs per provider."],
]) {
  const p = join(tools, src);
  if (!existsSync(p)) { console.warn(`skip ${dest} — ${src} missing`); continue; }
  writeMcpTable(dest, header, parseDb(p));
}

const commRecords = [];
for (let i = 1; i <= 6; i++) {
  const p = join(tools, `sf-comm-${i}-result.json`);
  if (!existsSync(p)) continue;
  commRecords.push(...(readJson(p).records ?? []));
}
if (commRecords.length) {
  const provOppData = parseDb(join(tools, "cec6cff5-5850-46a4-9b09-b50b773e9f9e.txt"));
  const oppToProvider = new Map(provOppData.map(([pid, oid]) => [oid, pid]));
  const commissionRows = [];
  const segmentRows = [];
  for (const r of commRecords) {
    const pid = oppToProvider.get(r.Id);
    if (!pid) continue;
    commissionRows.push([String(pid), r.Commission__c ?? null, r.Id]);
    segmentRows.push([String(pid), r.Account?.Account_Management_Segment__c ?? null, r.Id]);
  }
  writeMcpTable("accounts-perf-sf-commission.json", "Salesforce Opportunity.Commission__c per provider (via dim_provider_opportunity won opp).", commissionRows);
  writeMcpTable("accounts-perf-sf-segment.json", "Salesforce Account.Account_Management_Segment__c per provider (via dim_provider_opportunity won opp).", segmentRows);
} else {
  console.warn("skip commission/segment — no sf-comm-*-result.json files");
}

console.log("apply-july13-session done");
