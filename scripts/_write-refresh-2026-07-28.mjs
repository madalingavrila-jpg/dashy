#!/usr/bin/env node
/** Write 2026-07-28 MCP pull results to scripts/.cache/ */
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

const sfMap = {
  "9934cd82-5b5a-4403-a6fc-395ca0dff8b2.txt": "sf-stage-history-2026-07.json",
  "c328aebf-b42f-4e5d-880a-3f6a4447c573.txt": "sf-weekly-2026-07.json",
  "7ca7d90a-e3dc-4e47-81cc-f31e4a93b93b.txt": "sf-inbound-stage-history-2026-07.json",
  "a4c4ff96-af9f-402c-b557-d69f47edf098.txt": "sf-won-mtd.json",
  "453477b9-b0c1-45a3-bebb-ab2cccf64fc5.txt": "sf-won-ytd-bydate.json",
  "2a816cf4-35d2-4b7b-ab75-d4debf48ff99.txt": "sf-won-recent.json",
  "e26b1c12-3a20-4c50-9a6b-b2d1c4113141.txt": "sf-pipeline-open.json",
  "d070f664-e28a-4e8c-be8a-fda376933126.txt": "sf-account-activation-2026.json",
  "845019bd-5bc9-4e02-8561-c6cf4e7ecfe2.txt": "mp-opps-working.json",
  "47b0c48b-d9f2-4d56-90e4-7839ac1c54ae.txt": "mp-opps-newopp.json",
  "be437750-b434-4502-917f-3860a7205b7f.txt": "mp-leads.json",
  "bd4cc9a3-6436-4a6f-9db6-c797afda9399.txt": "sf-mops-onboarding.json",
  "be16d5e0-bd77-44a2-9483-0fa5ec44f255.txt": "sf-inbound-won-mtd.json",
  "01e8e807-a9d0-48b3-bbae-f826dec4ab3a.txt": "sf-inbound-won-ytd-bydate.json",
  "57745f61-36ff-455d-9d52-db9990b91a7f.txt": "sf-inbound-weekly-2026.json",
  "65f781af-0080-4bc2-821c-766ed63ccd08.txt": "sf-inbound-account-activation-2026.json",
};

for (const [src, dest] of Object.entries(sfMap)) {
  counts[dest] = writeSf(dest, readJson(join(tools, src)));
}

counts["sf-pipeline-stage-counts.json"] = writeSf(
  "sf-pipeline-stage-counts.json",
  readJson(join(tools, "inline-sf-pipeline-stage-counts.json")),
  {
    _query: "SELECT StageName, COUNT(Id) cnt FROM Opportunity WHERE RecordType.Name = 'Sales Opportunity' GROUP BY StageName",
    _note: "Live RO Sales Opportunity stage distribution. Refresh via Salesforce MCP on every data pull.",
  },
);

counts["sf-reactivation-2026.json"] = writeSf(
  "sf-reactivation-2026.json",
  readJson(join(tools, "inline-sf-reactivation-2026.json")),
);

counts["sf-inbound-reactivation-2026.json"] = writeSf(
  "sf-inbound-reactivation-2026.json",
  readJson(join(tools, "inline-sf-inbound-reactivation-2026.json")),
);

const mpTotals = assembleMpTotals(
  readJson(join(tools, "inline-mp-totals-opps.json")),
  readJson(join(tools, "inline-mp-totals-leads.json")),
);
writeFileSync(join(cacheDir, "mp-totals.json"), `${JSON.stringify(mpTotals, null, 2)}\n`);
counts["mp-totals.json"] = Object.keys(mpTotals.opps).length;
console.log(`mp-totals.json: ${counts["mp-totals.json"]} reps`);

const mopsCases = assembleMopsCases(readJson(join(tools, "01a76b6c-ae66-455f-8a86-b7a62121dac5.txt")));
writeFileSync(join(cacheDir, "sf-mops-cases.json"), `${JSON.stringify(mopsCases, null, 2)}\n`);
counts["sf-mops-cases.json"] = mopsCases.openCases;
console.log(`sf-mops-cases.json: ${counts["sf-mops-cases.json"]} open cases`);

counts["accounts-perf-accounts.json"] = writeMcpTable(
  "accounts-perf-accounts.json",
  "RO providers activated YTD (won Sales Opportunity), with activation opp owner. Universe: dim_provider_opportunity ⨝ dim_provider_v2, provider_activated_ts >= 2026-01-01, country Romania, ROW_NUMBER dedup.",
  readJson(join(tools, "c17b84b3-c81a-439d-b933-5efc2558314e.txt")).data ?? [],
);

counts["accounts-perf-prov-opp.json"] = writeMcpTable(
  "accounts-perf-prov-opp.json",
  "provider_id → opportunity_id (won)",
  readJson(join(tools, "7604d610-ca54-47f7-9ff7-a55ceb9cb3bb.txt")).data ?? [],
);

writeFileSync(join(cacheDir, "_refresh-counts-2026-07-28-ab1.json"), `${JSON.stringify(counts, null, 2)}\n`);
console.log(JSON.stringify(counts, null, 2));
