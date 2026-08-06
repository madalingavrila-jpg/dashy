#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = join(root, "scripts/.cache");
const toolsDir = join(process.env.HOME, ".cursor/projects/Users-madalin-Desktop-dashy/agent-tools");

mkdirSync(cacheDir, { recursive: true });

function readJson(path) {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw.startsWith("{") ? raw : raw.slice(raw.indexOf("{")));
}

function writeSf(file, data, extra = {}) {
  const out = { ...extra, totalSize: data.totalSize ?? data.records?.length ?? 0, done: data.done !== false, records: data.records ?? [] };
  writeFileSync(join(cacheDir, file), `${JSON.stringify(out)}\n`);
  return out.records.length;
}

function writeMcpTable(file, header, dataRows) {
  writeFileSync(join(cacheDir, file), `${header}\n\n${JSON.stringify({ data: dataRows }, null, 2)}\n`);
  return dataRows.length;
}

function assembleMpTotals(oppsResult, leadsResult) {
  const opps = {};
  for (const r of oppsResult.records ?? []) {
    const ownerId = r.OwnerId;
    const stage = r.StageName;
    const cnt = Number(r.cnt) || 0;
    if (!opps[ownerId]) opps[ownerId] = { total: 0 };
    opps[ownerId][stage] = cnt;
    opps[ownerId].total += cnt;
  }
  const leadsOpen = {};
  for (const r of leadsResult.records ?? []) leadsOpen[r.OwnerId] = Number(r.cnt) || 0;
  return { _comment: "Authoritative open-pipeline counts per rep from Salesforce GROUP BY.", opps, leadsOpen };
}

function assembleMopsCases(raw) {
  const records = raw.records ?? [];
  const byStatus = new Map(), byRecordType = new Map(), byOwner = new Map();
  let openNewOnboarding = 0;
  const outRecords = records.map((c) => {
    const status = c.Status ?? "Unknown";
    const recordType = c.RecordType?.Name ?? "Unknown";
    const ownerId = c.OwnerId;
    const ownerName = c.Owner?.Name ?? "Unknown";
    byStatus.set(status, (byStatus.get(status) ?? 0) + 1);
    byRecordType.set(recordType, (byRecordType.get(recordType) ?? 0) + 1);
    if (!byOwner.has(ownerId)) byOwner.set(ownerId, { ownerId, name: ownerName, count: 0 });
    byOwner.get(ownerId).count += 1;
    if (recordType === "New Onboarding") openNewOnboarding += 1;
    return { id: c.Id, caseNumber: c.CaseNumber, subject: c.Subject, status, ownerId, ownerName, recordType, url: `https://bolt.lightning.force.com/lightning/r/Case/${c.Id}/view` };
  });
  const sortDesc = (a, b) => b.count - a.count;
  return {
    openCases: records.length, openNewOnboarding,
    openByStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })).sort(sortDesc),
    openByRecordType: [...byRecordType.entries()].map(([recordType, count]) => ({ recordType, count })).sort(sortDesc),
    openByOwner: [...byOwner.values()].sort(sortDesc), records: outRecords,
  };
}

const counts = {};
const sfMappings = {
  "c31e527a-88ea-402e-9edc-199a13d25bbc.txt": "sf-stage-history-2026-07.json",
  "22e070d0-71bf-4988-8d9a-e9b90491ad91.txt": "sf-weekly-2026-07.json",
  "29e057a1-9843-4a2a-b82e-49ae40ac1373.txt": "sf-inbound-stage-history-2026-07.json",
  "a8df05c6-1093-408a-8604-c0b3ee8f3224.txt": "sf-won-mtd.json",
  "06da7790-2bd7-4d5b-b141-5a20850b9f3e.txt": "sf-won-ytd-bydate.json",
  "0f6edd04-c319-47f3-a8d1-ff8952b098a3.txt": "sf-won-recent.json",
  "52aeecbd-cf8e-4702-babb-8400b0029a6d.txt": "sf-pipeline-open.json",
  "a60e5035-c35d-49d5-8c10-566584588108.txt": "sf-account-activation-2026.json",
  "56f8c6c0-5500-4516-a233-012ab218af52.txt": "mp-opps-working.json",
  "1d63fcc3-1903-43a8-9747-3ecb781eae41.txt": "mp-opps-newopp.json",
  "0aabd717-253f-4b19-b07c-4a5eb38b53fc.txt": "mp-leads.json",
  "b1d4a43d-68cb-4b80-bbed-d7aa5a6809c5.txt": "sf-mops-onboarding.json",
  "1350f292-6472-4464-b1e6-2a9694b569c6.txt": "sf-inbound-won-ytd-bydate.json",
  "a5f38f42-0b6e-49a1-aa54-e1bbf404da55.txt": "sf-inbound-weekly-2026.json",
  "56523a78-a522-4c69-9d4f-ca0ecfb0d9cc.txt": "sf-inbound-account-activation-2026.json",
};

for (const [src, dest] of Object.entries(sfMappings)) {
  counts[dest] = writeSf(dest, readJson(join(toolsDir, src)));
}

// Inline pulls saved to agent-tools by companion script
for (const [src, dest, extra] of [
  ["inline-sf-reactivation-2026.json", "sf-reactivation-2026.json", null],
  ["inline-sf-pipeline-stage-counts.json", "sf-pipeline-stage-counts.json", {
    _query: "SELECT StageName, COUNT(Id) cnt FROM Opportunity WHERE RecordType.Name = 'Sales Opportunity' GROUP BY StageName",
    _note: "Live RO Sales Opportunity stage distribution. Refresh via Salesforce MCP on every data pull.",
  }],
  ["inline-sf-inbound-won-mtd.json", "sf-inbound-won-mtd.json", null],
  ["inline-sf-inbound-reactivation-2026.json", "sf-inbound-reactivation-2026.json", null],
]) {
  const data = readJson(join(toolsDir, src));
  counts[dest] = writeSf(dest, data, extra ?? {});
}

const mpOpps = readJson(join(toolsDir, "inline-mp-totals-opps.json"));
const mpLeads = readJson(join(toolsDir, "inline-mp-totals-leads.json"));
const mpTotals = assembleMpTotals(mpOpps, mpLeads);
writeFileSync(join(cacheDir, "mp-totals.json"), `${JSON.stringify(mpTotals, null, 2)}\n`);
counts["mp-totals.json"] = Object.keys(mpTotals.opps).length;

const mopsCases = assembleMopsCases(readJson(join(toolsDir, "d5821cf3-d01b-416c-b4c4-75f79919c74f.txt")));
writeFileSync(join(cacheDir, "sf-mops-cases.json"), `${JSON.stringify(mopsCases, null, 2)}\n`);
counts["sf-mops-cases.json"] = mopsCases.openCases;

const accountsRaw = readFileSync(join(toolsDir, "663df84b-c2e8-4d87-85a8-6e8614775f96.txt"), "utf8");
const accountsJson = JSON.parse(accountsRaw.slice(accountsRaw.indexOf("{")));
counts["accounts-perf-accounts.json"] = writeMcpTable(
  "accounts-perf-accounts.json",
  "RO providers activated YTD (won Sales Opportunity), with activation opp owner. Universe: dim_provider_opportunity ⨝ dim_provider_v2, provider_activated_ts >= 2026-01-01, country Romania, ROW_NUMBER dedup.",
  accountsJson.data ?? [],
);

const provOppRaw = readFileSync(join(toolsDir, "8eae1175-e4e2-41a2-93a0-9408e582dc85.txt"), "utf8");
const provOppJson = JSON.parse(provOppRaw.slice(provOppRaw.indexOf("{")));
counts["accounts-perf-prov-opp.json"] = writeMcpTable(
  "accounts-perf-prov-opp.json",
  "Provider → won opportunity map (same window/dedup as accounts-perf-accounts).",
  provOppJson.data ?? [],
);

console.log(JSON.stringify(counts, null, 2));
