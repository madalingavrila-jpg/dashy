#!/usr/bin/env node
/** One-shot: write 2026-07-21 MCP pull results to scripts/.cache/ */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = join(root, "scripts/.cache");
const tools = process.env.MCP_TOOLS_DIR ?? join(process.env.HOME, ".cursor/projects/Users-madalin-Desktop-dashy/agent-tools");
mkdirSync(cacheDir, { recursive: true });

function readJson(path) {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw.startsWith("{") ? raw : raw.slice(raw.indexOf("{")));
}

function writeSf(file, data, extra = {}) {
  const out = {
    ...extra,
    totalSize: data.totalSize ?? data.records?.length ?? 0,
    done: data.done !== false,
    records: data.records ?? [],
  };
  writeFileSync(join(cacheDir, file), `${JSON.stringify(out)}\n`);
  console.log(`${file}: ${out.records.length} records, done=${out.done}`);
  return out.records.length;
}

function writeMcpTable(file, header, dataRows) {
  writeFileSync(join(cacheDir, file), `${header}\n\n${JSON.stringify({ data: dataRows }, null, 2)}\n`);
  console.log(`${file}: ${dataRows.length} rows`);
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
  for (const r of leadsResult.records ?? []) {
    leadsOpen[r.OwnerId] = Number(r.cnt) || 0;
  }
  return { _comment: "Authoritative open-pipeline counts per rep from Salesforce GROUP BY.", opps, leadsOpen };
}

function assembleMopsCases(raw) {
  const records = raw.records ?? [];
  const byStatus = new Map();
  const byRecordType = new Map();
  const byOwner = new Map();
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
    return {
      id: c.Id,
      caseNumber: c.CaseNumber,
      subject: c.Subject,
      status,
      ownerId,
      ownerName,
      recordType,
      url: `https://bolt.lightning.force.com/lightning/r/Case/${c.Id}/view`,
    };
  });
  const sortDesc = (a, b) => b.count - a.count;
  return {
    openCases: records.length,
    openNewOnboarding,
    openByStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })).sort(sortDesc),
    openByRecordType: [...byRecordType.entries()].map(([recordType, count]) => ({ recordType, count })).sort(sortDesc),
    openByOwner: [...byOwner.values()].sort(sortDesc),
    records: outRecords,
  };
}

const counts = {};

// SF file pulls from agent-tools
const sfMap = {
  "5297d104-80b8-44c1-8056-75fc2f2daf85.txt": "sf-stage-history-2026-07.json",
  "c5777e64-aa76-4ac6-93ee-0c88124d62d3.txt": "sf-weekly-2026-07.json",
  "82a9b848-4d76-4f04-8f63-270b73dc9119.txt": "sf-inbound-stage-history-2026-07.json",
  "d9994c07-862f-46a5-b845-240dc6c85549.txt": "sf-won-mtd.json",
  "a9c472d4-5198-4d0d-a733-60c4b855df4e.txt": "sf-won-ytd-bydate.json",
  "5d6df140-99f8-4bab-a376-34114f36f44f.txt": "sf-won-recent.json",
  "763fb5f6-090c-4ab7-a583-8f68670b6078.txt": "sf-pipeline-open.json",
  "1587cac4-8e78-4795-897e-d062693ba9d5.txt": "sf-account-activation-2026.json",
  "d4e4643f-6117-42a0-bdad-3d059f7edc62.txt": "mp-opps-working.json",
  "a3394da8-1378-47c9-b74f-3d62aa89dd7b.txt": "mp-opps-newopp.json",
  "0e87b061-5358-4b60-9749-fd2df6caf3f8.txt": "mp-leads.json",
  "82c20cca-c3f9-45b1-9b03-f78438dfcdd1.txt": "sf-mops-onboarding.json",
  "00037453-af0a-44fd-85dd-3551cb0b069c.txt": "sf-inbound-won-ytd-bydate.json",
  "2aea0bfb-edec-42fe-a981-2fc0a9590348.txt": "sf-inbound-weekly-2026.json",
  "28176505-a487-44ca-8ab7-c872a20d7d16.txt": "sf-inbound-account-activation-2026.json",
};

for (const [src, dest] of Object.entries(sfMap)) {
  counts[dest] = writeSf(dest, readJson(join(tools, src)));
}

// Inline SF pulls saved by agent
const inlineSf = [
  "sf-pipeline-stage-counts.json",
  "sf-reactivation-2026.json",
  "sf-inbound-won-mtd.json",
  "sf-inbound-reactivation-2026.json",
  "mp-totals-opps.json",
  "mp-totals-leads.json",
];
for (const f of inlineSf) {
  const p = join(tools, f);
  const data = readJson(p);
  if (f === "sf-pipeline-stage-counts.json") {
    counts[f] = writeSf(f, data, {
      _query: "SELECT StageName, COUNT(Id) cnt FROM Opportunity WHERE RecordType.Name = 'Sales Opportunity' GROUP BY StageName",
      _note: "Live RO Sales Opportunity stage distribution. Refresh via Salesforce MCP on every data pull.",
    }).records?.length ?? writeSf(f, data, {
      _query: "SELECT StageName, COUNT(Id) cnt FROM Opportunity WHERE RecordType.Name = 'Sales Opportunity' GROUP BY StageName",
      _note: "Live RO Sales Opportunity stage distribution. Refresh via Salesforce MCP on every data pull.",
    });
  } else {
    counts[f] = writeSf(f.replace("mp-totals-opps.json", "mp-totals-opps-tmp.json").replace("mp-totals-leads.json", "mp-totals-leads-tmp.json"), data);
  }
}

// Fix inline - rewrite properly
const stageCounts = readJson(join(tools, "sf-pipeline-stage-counts.json"));
counts["sf-pipeline-stage-counts.json"] = writeSf("sf-pipeline-stage-counts.json", stageCounts, {
  _query: "SELECT StageName, COUNT(Id) cnt FROM Opportunity WHERE RecordType.Name = 'Sales Opportunity' GROUP BY StageName",
  _note: "Live RO Sales Opportunity stage distribution. Refresh via Salesforce MCP on every data pull.",
});
counts["sf-reactivation-2026.json"] = writeSf("sf-reactivation-2026.json", readJson(join(tools, "sf-reactivation-2026.json")));
counts["sf-inbound-won-mtd.json"] = writeSf("sf-inbound-won-mtd.json", readJson(join(tools, "sf-inbound-won-mtd.json")));
counts["sf-inbound-reactivation-2026.json"] = writeSf("sf-inbound-reactivation-2026.json", readJson(join(tools, "sf-inbound-reactivation-2026.json")));

const mpOpps = readJson(join(tools, "mp-totals-opps.json"));
const mpLeads = readJson(join(tools, "mp-totals-leads.json"));
const mpTotals = assembleMpTotals(mpOpps, mpLeads);
writeFileSync(join(cacheDir, "mp-totals.json"), `${JSON.stringify(mpTotals, null, 2)}\n`);
counts["mp-totals.json"] = Object.keys(mpTotals.opps).length;
console.log(`mp-totals.json: ${counts["mp-totals.json"]} reps`);

const mopsRaw = readJson(join(tools, "b91fe4c3-7785-43b9-8dcb-ab7549f4cdd7.txt"));
const mopsCases = assembleMopsCases(mopsRaw);
writeFileSync(join(cacheDir, "sf-mops-cases.json"), `${JSON.stringify(mopsCases, null, 2)}\n`);
counts["sf-mops-cases.json"] = mopsCases.openCases;
console.log(`sf-mops-cases.json: ${counts["sf-mops-cases.json"]} open cases`);

// Databricks C1
for (const [src, dest, header] of [
  ["72eb9edf-274f-4159-8c18-260473d76445.txt", "accounts-perf-accounts.json", "RO providers activated YTD (won Sales Opportunity), with activation opp owner. Universe: dim_provider_opportunity ⨝ dim_provider_v2, provider_activated_ts >= 2026-01-01, country Romania, ROW_NUMBER dedup."],
  ["506b4ef7-f5aa-49cf-968e-c6caccafd768.txt", "accounts-perf-prov-opp.json", "Provider → won opportunity map (same window/dedup as accounts-perf-accounts)."],
]) {
  const raw = readFileSync(join(tools, src), "utf8");
  const parsed = JSON.parse(raw.slice(raw.indexOf("{")));
  counts[dest] = writeMcpTable(dest, header, parsed.data ?? []);
}

writeFileSync(join(tools, "refresh-counts-ab.json"), JSON.stringify(counts, null, 2));
console.log("write-refresh-pulls done");
