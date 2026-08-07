#!/usr/bin/env node
/** Write 2026-07-31 MCP pull results to scripts/.cache/ */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = join(root, "scripts/.cache");
const tools =
  process.env.MCP_TOOLS_DIR ??
  join(process.env.HOME, ".cursor/projects/Users-madalin-Desktop-dashy/agent-tools");
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
  const n = out.records.length;
  console.log(`${file}: ${n} records, done=${out.done}`);
  return n;
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
    openByRecordType: [...byRecordType.entries()]
      .map(([recordType, count]) => ({ recordType, count }))
      .sort(sortDesc),
    openByOwner: [...byOwner.values()].sort(sortDesc),
    records: outRecords,
  };
}

const counts = {};

const sfMap = {
  "1d7a2045-4901-4f2a-b3b3-1c98188759d5.txt": "sf-stage-history-2026-07.json",
  "711f8e53-be7e-4010-a253-6e0582ed562b.txt": "sf-weekly-2026-07.json",
  "fcc54945-a347-4080-b952-c228654fb8cc.txt": "sf-inbound-stage-history-2026-07.json",
  "be495ee2-008f-4ee4-a5ce-93350b1cca21.txt": "sf-won-mtd.json",
  "1eb775f6-51d8-4b96-bdda-8ab3153b6389.txt": "sf-won-ytd-bydate.json",
  "82ea221b-3c09-4854-9c56-60388f2f8493.txt": "sf-won-recent.json",
  "ec963717-c9eb-4693-a5a4-2b497b7f5bc2.txt": "sf-pipeline-open.json",
  "0a72088d-5c77-460b-91cf-61a8a165970b.txt": "sf-account-activation-2026.json",
  "38ba97f5-abfb-4170-8ddf-4bf80231b6f4.txt": "mp-opps-working.json",
  "f3155920-51ef-426f-b609-752c544cabef.txt": "mp-opps-newopp.json",
  "7def03eb-e2ba-4146-9ab2-9174f73636d9.txt": "mp-leads.json",
  "4360db6c-ceec-4843-9804-ee2a621be382.txt": "sf-mops-onboarding.json",
  "afd2120c-26aa-4673-bfe0-fef4a5e612ea.txt": "sf-inbound-won-mtd.json",
  "e0dbf1e3-94ea-429f-8c72-4f9a86db4b2f.txt": "sf-inbound-won-ytd-bydate.json",
  "a2e59bbd-64ab-41c0-b3ce-1f93dc27cf5c.txt": "sf-inbound-weekly-2026.json",
  "5df533c7-8fda-4ebf-9c9f-67ffca64babf.txt": "sf-inbound-account-activation-2026.json",
};

for (const [src, dest] of Object.entries(sfMap)) {
  counts[dest] = writeSf(dest, readJson(join(tools, src)));
}

// Inline small results saved separately
const stageCounts = {
  totalSize: 13,
  done: true,
  records: [
    { attributes: { type: "AggregateResult" }, StageName: "New Opportunity", cnt: 3534 },
    { attributes: { type: "AggregateResult" }, StageName: "Closed Lost", cnt: 22188 },
    { attributes: { type: "AggregateResult" }, StageName: "Negotiations", cnt: 715 },
    { attributes: { type: "AggregateResult" }, StageName: "Onboarding Checklist", cnt: 42 },
    { attributes: { type: "AggregateResult" }, StageName: "Reachout", cnt: 43 },
    { attributes: { type: "AggregateResult" }, StageName: "Contacting DCM", cnt: 22 },
    { attributes: { type: "AggregateResult" }, StageName: "Onboarding", cnt: 26 },
    { attributes: { type: "AggregateResult" }, StageName: "Activated", cnt: 7954 },
    { attributes: { type: "AggregateResult" }, StageName: "First Pitch", cnt: 10 },
    { attributes: { type: "AggregateResult" }, StageName: "Ready to Activate", cnt: 42 },
    { attributes: { type: "AggregateResult" }, StageName: "Closed Won", cnt: 57 },
    { attributes: { type: "AggregateResult" }, StageName: "Contract sent", cnt: 354 },
    { attributes: { type: "AggregateResult" }, StageName: "Escalation", cnt: 2 },
  ],
};
counts["sf-pipeline-stage-counts.json"] = writeSf("sf-pipeline-stage-counts.json", stageCounts, {
  _query:
    "SELECT StageName, COUNT(Id) cnt FROM Opportunity WHERE RecordType.Name = 'Sales Opportunity' GROUP BY StageName",
  _note:
    "Live RO Sales Opportunity stage distribution. Refresh via Salesforce MCP on every data pull.",
});

counts["sf-reactivation-2026.json"] = writeSf(
  "sf-reactivation-2026.json",
  readJson(join(tools, "inline-sf-reactivation-2026-07-31.json")),
);
counts["sf-inbound-reactivation-2026.json"] = writeSf("sf-inbound-reactivation-2026.json", {
  totalSize: 0,
  done: true,
  records: [],
});

const mpTotals = assembleMpTotals(
  readJson(join(tools, "inline-mp-totals-opps-2026-07-31.json")),
  readJson(join(tools, "inline-mp-totals-leads-2026-07-31.json")),
);
writeFileSync(join(cacheDir, "mp-totals.json"), `${JSON.stringify(mpTotals, null, 2)}\n`);
counts["mp-totals.json"] = Object.keys(mpTotals.opps).length;
console.log(`mp-totals.json: ${counts["mp-totals.json"]} reps`);

const mopsCases = assembleMopsCases(readJson(join(tools, "42cfe041-eb25-4340-b875-a0f64c011c6d.txt")));
writeFileSync(join(cacheDir, "sf-mops-cases.json"), `${JSON.stringify(mopsCases, null, 2)}\n`);
counts["sf-mops-cases.json"] = mopsCases.openCases;
console.log(`sf-mops-cases.json: ${counts["sf-mops-cases.json"]} open cases`);

for (const [src, dest, header] of [
  [
    "7d42b1cf-7cb6-41ff-aa0b-671823e595fd.txt",
    "accounts-perf-accounts.json",
    "RO providers activated YTD (won Sales Opportunity), with activation opp owner. Universe: dim_provider_opportunity ⨝ dim_provider_v2, provider_activated_ts >= 2026-01-01, country Romania, ROW_NUMBER dedup.",
  ],
  ["2719f10f-b6ad-45b3-8595-e378fae37e75.txt", "accounts-perf-prov-opp.json", "provider_id → opportunity_id (won)"],
]) {
  const raw = readFileSync(join(tools, src), "utf8");
  const parsed = JSON.parse(raw.slice(raw.indexOf("{")));
  counts[dest] = writeMcpTable(dest, header, parsed.data ?? []);
}

writeFileSync(join(tools, "refresh-counts-ab1-2026-07-31.json"), JSON.stringify(counts, null, 2));
console.log("write-refresh-2026-07-31 AB+C1 done");
