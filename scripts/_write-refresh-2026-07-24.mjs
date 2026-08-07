#!/usr/bin/env node
/**
 * Write all MCP pull results for 2026-07-24 cache refresh into scripts/.cache/
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = join(root, "scripts/.cache");
const tools = join(process.env.HOME, ".cursor/projects/Users-madalin-Desktop-dashy/agent-tools");

mkdirSync(cacheDir, { recursive: true });

function readJson(path) {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw.slice(raw.indexOf("{")));
}

function writeSf(file, data, extra = {}) {
  const records = data.records ?? [];
  const out = {
    ...extra,
    totalSize: data.totalSize ?? records.length,
    done: data.done !== false,
    records,
  };
  writeFileSync(join(cacheDir, file), `${JSON.stringify(out)}\n`);
  console.log(`OK ${file}: ${records.length} records done=${out.done}`);
  return records.length;
}

function writeMcpTable(file, header, dataRows) {
  writeFileSync(join(cacheDir, file), `${header}\n\n${JSON.stringify({ data: dataRows }, null, 2)}\n`);
  console.log(`OK ${file}: ${dataRows.length} rows`);
  return dataRows.length;
}

function parseDb(path) {
  const raw = readFileSync(path, "utf8");
  const json = JSON.parse(raw.slice(raw.indexOf("{")));
  if (json.error) throw new Error(`${path}: ${json.error.message ?? JSON.stringify(json.error)}`);
  return json.data ?? [];
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
  return {
    _comment: "Authoritative open-pipeline counts per rep from Salesforce GROUP BY.",
    opps,
    leadsOpen,
  };
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

const sfMappings = {
  "236d7848-8b16-4f78-9112-3794a88d1bdc.txt": "sf-stage-history-2026-07.json",
  "75548a3b-b51f-4c5c-bed2-39e0d177fd58.txt": "sf-weekly-2026-07.json",
  "06c0f165-4424-4934-9e9e-faca636a327c.txt": "sf-inbound-stage-history-2026-07.json",
  "1240c5f0-d725-4ca8-8e64-cd03df1f8fa7.txt": "sf-won-mtd.json",
  "f6abbf21-cfe3-40da-9cf1-f2544e156c18.txt": "sf-won-ytd-bydate.json",
  "05d6109d-6f90-45b1-8d0e-6f44b18510e7.txt": "sf-won-recent.json",
  "07d1a610-d4df-48b1-adce-7bf65f9094dc.txt": "sf-pipeline-open.json",
  "61fbe2bd-6619-44ea-baed-1d4c803fb343.txt": "sf-account-activation-2026.json",
  "2a657ac9-fb23-4d7e-8651-611005e1df43.txt": "mp-opps-working.json",
  "9c7b481d-4344-4601-a8d4-adb3afa67e9a.txt": "mp-opps-newopp.json",
  "298caa5d-c78b-4406-bb61-668ef65fc53b.txt": "mp-leads.json",
  "0f5c316d-4379-49af-a5c8-fa62bb971ba1.txt": "sf-mops-onboarding.json",
  "90661095-3407-4295-9942-1e2c22b05d5e.txt": "sf-inbound-won-ytd-bydate.json",
  "9c1a0e0f-35bd-42bb-93a9-63de7b2cb6bc.txt": "sf-inbound-weekly-2026.json",
  "4406d71d-2cf4-4c66-84c5-862ff7062cd9.txt": "sf-inbound-account-activation-2026.json",
};

for (const [src, dest] of Object.entries(sfMappings)) {
  counts[dest] = writeSf(dest, readJson(join(tools, src)));
}

counts["sf-pipeline-stage-counts.json"] = writeSf(
  "sf-pipeline-stage-counts.json",
  readJson(join(tools, "inline-sf-pipeline-stage-counts.json")),
  {
    _query:
      "SELECT StageName, COUNT(Id) cnt FROM Opportunity WHERE RecordType.Name = 'Sales Opportunity' GROUP BY StageName",
    _note:
      "Live RO Sales Opportunity stage distribution. Refresh via Salesforce MCP on every data pull.",
  },
);

for (const [src, dest] of [
  ["inline-sf-reactivation-2026.json", "sf-reactivation-2026.json"],
  ["inline-sf-inbound-won-mtd.json", "sf-inbound-won-mtd.json"],
  ["inline-sf-inbound-reactivation-2026.json", "sf-inbound-reactivation-2026.json"],
]) {
  counts[dest] = writeSf(dest, readJson(join(tools, src)));
}

const mpTotals = assembleMpTotals(
  readJson(join(tools, "inline-mp-totals-opps.json")),
  readJson(join(tools, "inline-mp-totals-leads.json")),
);
writeFileSync(join(cacheDir, "mp-totals.json"), `${JSON.stringify(mpTotals, null, 2)}\n`);
counts["mp-totals.json"] = Object.keys(mpTotals.opps).length;
console.log(`OK mp-totals.json: ${counts["mp-totals.json"]} reps`);

const mopsCases = assembleMopsCases(readJson(join(tools, "d08208b0-4139-4517-a5f5-dbf15c8f7502.txt")));
writeFileSync(join(cacheDir, "sf-mops-cases.json"), `${JSON.stringify(mopsCases, null, 2)}\n`);
counts["sf-mops-cases.json"] = mopsCases.openCases;
console.log(`OK sf-mops-cases.json: ${counts["sf-mops-cases.json"]} open cases`);

counts["accounts-perf-accounts.json"] = writeMcpTable(
  "accounts-perf-accounts.json",
  "RO providers activated YTD (won Sales Opportunity), with activation opp owner. Universe: dim_provider_opportunity ⨝ dim_provider_v2, provider_activated_ts >= 2026-01-01, country Romania, ROW_NUMBER dedup.",
  parseDb(join(tools, "ab4ad680-66de-4c09-b2a6-1c66fad65804.txt")),
);
counts["accounts-perf-prov-opp.json"] = writeMcpTable(
  "accounts-perf-prov-opp.json",
  "Provider → won opportunity map (same window/dedup as accounts-perf-accounts).",
  parseDb(join(tools, "0db0502e-ec70-47e4-bf15-904312e495e7.txt")),
);

counts["accounts-perf-monthly.json"] = writeMcpTable(
  "accounts-perf-monthly.json",
  "Monthly GROSS GMV / orders / commission per provider (fact_provider_monthly).",
  parseDb(join(tools, "db-monthly-result.txt")),
);
counts["accounts-perf-quality.json"] = writeMcpTable(
  "accounts-perf-quality.json",
  "Monthly availability & performance value/weight pairs per provider.",
  parseDb(join(tools, "db-quality-result.txt")),
);

const commRecords = [];
const seen = new Set();
for (let i = 0; i <= 6; i++) {
  const p = join(tools, `sf-comm-${i}-result.json`);
  if (!existsSync(p)) continue;
  for (const r of readJson(p).records ?? []) {
    if (seen.has(r.Id)) continue;
    seen.add(r.Id);
    commRecords.push(r);
  }
}
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
counts["accounts-perf-sf-commission.json"] = writeMcpTable(
  "accounts-perf-sf-commission.json",
  "Salesforce Opportunity.Commission__c per provider (via dim_provider_opportunity won opp).",
  commissionRows,
);
counts["accounts-perf-sf-segment.json"] = writeMcpTable(
  "accounts-perf-sf-segment.json",
  "Salesforce Account.Account_Management_Segment__c per provider (via dim_provider_opportunity won opp).",
  segmentRows,
);

writeFileSync(join(cacheDir, "_refresh-counts-2026-07-24.json"), `${JSON.stringify(counts, null, 2)}\n`);
console.log("DONE", JSON.stringify(counts));
