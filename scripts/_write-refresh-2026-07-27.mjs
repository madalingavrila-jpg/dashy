#!/usr/bin/env node
/** Write 2026-07-27 MCP pull results to scripts/.cache/ */
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
  "188e6999-25b4-4d79-a750-8c9939ce8f0e.txt": "sf-stage-history-2026-07.json",
  "bc7c822e-f748-44e3-b756-7e352107a207.txt": "sf-weekly-2026-07.json",
  "93442b04-126e-45d0-8146-4e99c3563d9c.txt": "sf-inbound-stage-history-2026-07.json",
  "fc89876c-e3ac-41b5-9c9b-e375c3eadbbf.txt": "sf-won-mtd.json",
  "0d4e750e-9207-47e0-8faa-143906fe076a.txt": "sf-won-ytd-bydate.json",
  "4681594d-cb85-46e5-b1e9-c050d5cc9547.txt": "sf-won-recent.json",
  "c3dbee20-d5fe-4384-bca4-3092eb5345af.txt": "sf-pipeline-open.json",
  "0f8fffac-ebea-4e73-b595-b07ea1ff5f0e.txt": "sf-account-activation-2026.json",
  "4645a13f-672c-4bb0-ac0c-53c23e1a18d0.txt": "mp-opps-working.json",
  "0ec92e47-c99e-43fd-a1ca-96be3f4287a5.txt": "mp-opps-newopp.json",
  "2fd9bd74-bcec-4488-8ca1-64045f6711c4.txt": "mp-leads.json",
  "9e163d5b-d6b4-43f4-8492-5d0a75391c4b.txt": "sf-mops-onboarding.json",
  "8d580518-e3ea-491e-8bc7-9800351c2ee6.txt": "sf-inbound-won-mtd.json",
  "309736d5-86a5-420e-89cd-a2d76414231e.txt": "sf-inbound-won-ytd-bydate.json",
  "58fd548a-34a8-493d-90fc-78be18ce0a6a.txt": "sf-inbound-weekly-2026.json",
  "49bd4106-d90f-44f3-bc43-70a64ed70326.txt": "sf-inbound-account-activation-2026.json",
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
counts["sf-reactivation-2026.json"] = writeSf("sf-reactivation-2026.json", readJson(join(tools, "inline-sf-reactivation-2026.json")));
counts["sf-inbound-reactivation-2026.json"] = writeSf("sf-inbound-reactivation-2026.json", readJson(join(tools, "inline-sf-inbound-reactivation-2026.json")));

const mpTotals = assembleMpTotals(
  readJson(join(tools, "inline-mp-totals-opps.json")),
  readJson(join(tools, "inline-mp-totals-leads.json")),
);
writeFileSync(join(cacheDir, "mp-totals.json"), `${JSON.stringify(mpTotals, null, 2)}\n`);
counts["mp-totals.json"] = Object.keys(mpTotals.opps).length;
console.log(`mp-totals.json: ${counts["mp-totals.json"]} reps`);

const mopsCases = assembleMopsCases(readJson(join(tools, "ad114daa-d220-4a4a-b4f7-13eecae83f22.txt")));
writeFileSync(join(cacheDir, "sf-mops-cases.json"), `${JSON.stringify(mopsCases, null, 2)}\n`);
counts["sf-mops-cases.json"] = mopsCases.openCases;
console.log(`sf-mops-cases.json: ${counts["sf-mops-cases.json"]} open cases`);

for (const [src, dest, header] of [
  [
    "da302121-db3c-434b-ac51-6ea80ac48051.txt",
    "accounts-perf-accounts.json",
    "RO providers activated YTD (won Sales Opportunity), with activation opp owner. Universe: dim_provider_opportunity ⨝ dim_provider_v2, provider_activated_ts >= 2026-01-01, country Romania, ROW_NUMBER dedup.",
  ],
  [
    "cc7d082f-77f0-49f4-8b68-4cb99efc77f0.txt",
    "accounts-perf-prov-opp.json",
    "provider_id → opportunity_id (won)",
  ],
]) {
  const raw = readFileSync(join(tools, src), "utf8");
  const parsed = JSON.parse(raw.slice(raw.indexOf("{")));
  counts[dest] = writeMcpTable(dest, header, parsed.data ?? []);
}

writeFileSync(join(tools, "refresh-counts-ab1-2026-07-27.json"), JSON.stringify(counts, null, 2));
console.log("write-refresh-2026-07-27 AB+C1 done");
