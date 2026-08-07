#!/usr/bin/env node
/** Write 2026-07-15 MCP pull results into scripts/.cache/ */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = join(root, "scripts/.cache");
const tools = join(process.env.HOME, ".cursor/projects/Users-madalin-Desktop-dashy/agent-tools");
mkdirSync(cacheDir, { recursive: true });

function readJson(p) {
  const raw = readFileSync(p, "utf8");
  return JSON.parse(raw.startsWith("{") ? raw : raw.slice(raw.indexOf("{")));
}
function readJsonFirst(...paths) {
  for (const p of paths) {
    try {
      return readJson(p);
    } catch {
      /* try next */
    }
  }
  throw new Error(`missing cache input — tried: ${paths.join(", ")}`);
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
function parseDb(path) {
  const raw = readFileSync(path, "utf8");
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

// Batch A + B SF file pulls
const sfMap = {
  "68fb1651-3166-44d2-bbb3-59f8361958ec.txt": "sf-stage-history-2026-07.json",
  "99d09338-b4e1-4f14-b71b-1f8e2db42ee4.txt": "sf-won-mtd.json",
  "f95136a3-671a-44fb-8cfe-47ea9651aee1.txt": "sf-won-ytd-bydate.json",
  "218956c1-1ca2-4e89-bc79-66e40de1ffea.txt": "sf-won-recent.json",
  "79b51f58-134f-4524-9caa-1afa42b17154.txt": "sf-pipeline-open.json",
  "ad76d394-5f9b-43a2-863f-4242fca3daac.txt": "sf-account-activation-2026.json",
  "d6cb8195-7c42-416c-8bc1-0ad16712169a.txt": "sf-inbound-stage-history-2026-07.json",
  "489d3d9e-939f-4092-9ad7-e651ed8638a4.txt": "mp-opps-working.json",
  "9f6ed416-eff7-4576-8e2a-f37088780d41.txt": "mp-opps-newopp.json",
  "cfc91191-f843-4fa8-844a-067ac74f2f5b.txt": "mp-leads.json",
  "825a7b26-184a-4887-bd82-4a81927dd501.txt": "sf-mops-onboarding.json",
  "7bdd3716-6919-4db6-b200-0418156f1d00.txt": "sf-inbound-won-ytd-bydate.json",
  "2467c5b9-861b-4418-b737-380850b9b1ac.txt": "sf-inbound-weekly-2026.json",
  "56bddf36-010f-4e57-91d8-4f9410f31e5e.txt": "sf-inbound-account-activation-2026.json",
};
for (const [src, dest] of Object.entries(sfMap)) writeSf(dest, readJson(join(tools, src)));

// Inline re-query results saved to agent-tools (with fallbacks)
for (const [names, dest] of [
  [["inline-weekly-july.json", "weekly-july.json"], "sf-weekly-2026-07.json"],
  [["inline-reactivation-team.json", "fix-reactivation.json"], "sf-reactivation-2026.json"],
  [["inline-reactivation-inbound.json"], "sf-inbound-reactivation-2026.json"],
  [["inline-inbound-won-mtd.json", "inbound-won-mtd.json"], "sf-inbound-won-mtd.json"],
  [["inline-stage-counts.json", "stage-counts-fresh.json", "fix-stage-counts.json"], "sf-pipeline-stage-counts.json"],
]) {
  const data = readJsonFirst(...names.map((n) => join(tools, n)));
  if (dest === "sf-pipeline-stage-counts.json") {
    writeSf(dest, data, {
      _query: "SELECT StageName, COUNT(Id) cnt FROM Opportunity WHERE RecordType.Name = 'Sales Opportunity' GROUP BY StageName",
      _note: "Live RO Sales Opportunity stage distribution. Refresh via Salesforce MCP on every data pull.",
    });
  } else {
    writeSf(dest, data);
  }
}

const mp = assembleMpTotals(
  readJsonFirst(
    join(tools, "inline-mp-totals-opps.json"),
    join(tools, "mp-totals-opps-fresh.json"),
    join(tools, "mp-totals-opps-inline.json"),
  ),
  readJsonFirst(
    join(tools, "inline-mp-totals-leads.json"),
    join(tools, "mp-totals-leads-fresh.json"),
    join(tools, "mp-totals-leads-inline.json"),
  ),
);
writeFileSync(join(cacheDir, "mp-totals.json"), `${JSON.stringify(mp, null, 2)}\n`);
console.log("wrote mp-totals.json");

const mops = assembleMops(readJson(join(tools, "fab46764-53ae-4036-832b-17095ccc75d4.txt")));
writeFileSync(join(cacheDir, "sf-mops-cases.json"), `${JSON.stringify(mops, null, 2)}\n`);
console.log(`wrote sf-mops-cases.json: ${mops.openCases} open cases`);

writeMcpTable("accounts-perf-accounts.json", "RO providers activated YTD (won Sales Opportunity), with activation opp owner. Universe: dim_provider_opportunity ⨝ dim_provider_v2, provider_activated_ts >= 2026-01-01, country Romania, ROW_NUMBER dedup.", parseDb(join(tools, "8eb9c29f-e8d4-4f41-a2e7-38875d6df539.txt")));
writeMcpTable("accounts-perf-prov-opp.json", "Provider → won opportunity map (same window/dedup as accounts-perf-accounts).", parseDb(join(tools, "448c1686-12b0-4052-ad6c-03ffc39e887d.txt")));

for (const [src, dest, header] of [
  ["ae3c4883-473f-4b44-a788-fdce05c8a48d.txt", "accounts-perf-monthly.json", "Monthly GROSS GMV / orders / commission per provider (fact_provider_monthly)."],
  ["e7635a92-6e69-4845-8c28-804949c874ee.txt", "accounts-perf-quality.json", "Monthly availability & performance value/weight pairs per provider."],
]) writeMcpTable(dest, header, parseDb(join(tools, src)));

const commRecords = [];
for (let i = 1; i <= 6; i++) {
  const p = join(tools, `sf-comm-${i}-result.json`);
  try { commRecords.push(...(readJson(p).records ?? [])); } catch { /* skip */ }
}
if (commRecords.length) {
  const provOppData = parseDb(join(tools, "448c1686-12b0-4052-ad6c-03ffc39e887d.txt"));
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
} else {
  console.warn("skip commission/segment — no sf-comm-*-result.json files");
}

console.log("write-2026-07-15-refresh done");
