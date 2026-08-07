#!/usr/bin/env node
/**
 * One-shot helper: write MCP pull results (saved as JSON files) into scripts/.cache/.
 * Usage: node scripts/save-mcp-pulls.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = join(root, "scripts/.cache");
const toolsDir = process.env.MCP_TOOLS_DIR ?? join(process.env.HOME, ".cursor/projects/Users-madalin-Desktop-dashy/agent-tools");

mkdirSync(cacheDir, { recursive: true });

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeSf(file, data, extra = {}) {
  const out = { ...extra, totalSize: data.totalSize ?? data.records?.length ?? 0, done: data.done !== false, records: data.records ?? [] };
  writeFileSync(join(cacheDir, file), `${JSON.stringify(out)}\n`);
  console.log(`wrote ${file}: ${out.records.length} records, done=${out.done}`);
}

function writeMcpTable(file, header, dataRows) {
  const body = `${header}\n\n${JSON.stringify({ data: dataRows }, null, 2)}\n`;
  writeFileSync(join(cacheDir, file), body);
  console.log(`wrote ${file}: ${dataRows.length} rows`);
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

function databricksToRows(result, columns) {
  const data = result.data ?? [];
  if (columns?.length) return data;
  return data;
}

function parseDatabricksFile(path, header) {
  const raw = readFileSync(path, "utf8");
  // MCP returns text with statement info + JSON block
  const jsonStart = raw.indexOf("{");
  const parsed = JSON.parse(raw.slice(jsonStart));
  const rows = parsed.data ?? [];
  writeMcpTable(path.split("/").pop().replace(".txt", ".json"), header, rows);
  return rows;
}

// --- SF records from agent-tools ---
const mappings = {
  "85a2523d-1852-4de7-a0f9-9cb7f58b426e.txt": "sf-stage-history-2026-07.json",
  "fd76e3f6-856c-4d12-a40a-089635cee664.txt": "sf-won-ytd-bydate.json",
  "d2f1b91b-5549-4b09-9eb1-0064aa74eee1.txt": "sf-won-recent.json",
  "d1efbcf9-8b43-42c0-a33d-0af2c26660b9.txt": "sf-pipeline-open.json",
  "e59eaa60-e236-4e69-b600-766d10da51e4.txt": "mp-opps-working.json",
  "e714a698-0594-4c2c-92f6-7e42fc7d1ee8.txt": "mp-opps-newopp.json",
  "513592a2-6ff7-4373-90c6-566844ebbc32.txt": "mp-leads.json",
  "bd089ec4-2782-492e-b606-fac3c72459eb.txt": "sf-mops-onboarding.json",
  "9f3ee0c1-5630-4d28-a1af-276c8c8109e1.txt": "sf-inbound-won-ytd-bydate.json",
  "603ad79d-8591-4dcf-bf87-b130bf742f9a.txt": "sf-inbound-weekly-2026.json",
  "ec9784e7-a6ce-4c3b-aa48-325881c71153.txt": "sf-inbound-stage-history-2026-07.json",
};

for (const [src, dest] of Object.entries(mappings)) {
  const data = readJson(join(toolsDir, src));
  writeSf(dest, data);
}

// Stage counts (with header fields)
const stageCounts = readJson(join(toolsDir, "stage-counts.json"));
writeSf("sf-pipeline-stage-counts.json", stageCounts, {
  _query: "SELECT StageName, COUNT(Id) cnt FROM Opportunity WHERE RecordType.Name = 'Sales Opportunity' GROUP BY StageName",
  _note: "Live RO Sales Opportunity stage distribution. Refresh via Salesforce MCP on every data pull.",
});

// Inline results passed via env JSON files or hardcoded paths for small pulls
const weeklyJuly = readJson(join(toolsDir, "weekly-july.json"));
writeSf("sf-weekly-2026-07.json", weeklyJuly);

const wonMtd = readJson(join(toolsDir, "won-mtd.json"));
writeSf("sf-won-mtd.json", wonMtd);

const inboundWonMtd = readJson(join(toolsDir, "inbound-won-mtd.json"));
writeSf("sf-inbound-won-mtd.json", inboundWonMtd);

// mp-totals assembly
const mpOpps = readJson(join(toolsDir, "mp-totals-opps.json"));
const mpLeads = readJson(join(toolsDir, "mp-totals-leads.json"));
const mpTotals = assembleMpTotals(mpOpps, mpLeads);
writeFileSync(join(cacheDir, "mp-totals.json"), `${JSON.stringify(mpTotals, null, 2)}\n`);
console.log(`wrote mp-totals.json: ${Object.keys(mpTotals.opps).length} reps`);

// mops-cases assembly
const mopsRaw = readJson(join(toolsDir, "82369bf5-450a-4279-bfe2-db74f8762d07.txt"));
const mopsCases = assembleMopsCases(mopsRaw);
writeFileSync(join(cacheDir, "sf-mops-cases.json"), `${JSON.stringify(mopsCases, null, 2)}\n`);
console.log(`wrote sf-mops-cases.json: ${mopsCases.openCases} open cases`);

// Databricks C1
const accountsRaw = readFileSync(join(toolsDir, "bd63921d-2f97-4ffb-87d6-e3f12d8efaed.txt"), "utf8");
const accountsJson = JSON.parse(accountsRaw.slice(accountsRaw.indexOf("{")));
writeMcpTable(
  "accounts-perf-accounts.json",
  "RO providers activated YTD (won Sales Opportunity), with activation opp owner. Universe: dim_provider_opportunity ⨝ dim_provider_v2, provider_activated_ts >= 2026-01-01, country Romania, ROW_NUMBER dedup.",
  accountsJson.data ?? [],
);

const provOppRaw = readFileSync(join(toolsDir, "5b8de004-ad63-4cd2-ad26-3b720edd6b11.txt"), "utf8");
const provOppJson = JSON.parse(provOppRaw.slice(provOppRaw.indexOf("{")));
writeMcpTable(
  "accounts-perf-prov-opp.json",
  "Provider → won opportunity map (same window/dedup as accounts-perf-accounts).",
  provOppJson.data ?? [],
);

// Databricks C2 (if present)
for (const [src, dest, header] of [
  ["db-monthly.json", "accounts-perf-monthly.json", "Monthly GROSS GMV / orders / commission per provider (fact_provider_monthly)."],
  ["db-quality.json", "accounts-perf-quality.json", "Monthly availability & performance value/weight pairs per provider."],
]) {
  const p = join(toolsDir, src);
  try {
    const raw = readFileSync(p, "utf8");
    const parsed = JSON.parse(raw.slice(raw.indexOf("{")));
    writeMcpTable(dest, header, parsed.data ?? []);
  } catch {
    console.warn(`skip ${dest} — ${src} not found yet`);
  }
}

// SF commission/segment (if present)
const commPath = join(toolsDir, "sf-commission-merged.json");
try {
  const merged = readJson(commPath);
  const provOpp = provOppJson.data ?? [];
  const oppToProvider = new Map(provOpp.map(([pid, oid]) => [oid, pid]));
  const commissionRows = [];
  const segmentRows = [];
  for (const r of merged.records ?? []) {
    const pid = oppToProvider.get(r.Id);
    if (!pid) continue;
    commissionRows.push([String(pid), r.Commission__c ?? null, r.Id]);
    segmentRows.push([String(pid), r.Account?.Account_Management_Segment__c ?? null, r.Id]);
  }
  writeMcpTable(
    "accounts-perf-sf-commission.json",
    "Salesforce Opportunity.Commission__c per provider (via dim_provider_opportunity won opp).",
    commissionRows,
  );
  writeMcpTable(
    "accounts-perf-sf-segment.json",
    "Salesforce Account.Account_Management_Segment__c per provider (via dim_provider_opportunity won opp).",
    segmentRows,
  );
} catch {
  console.warn("skip commission/segment — sf-commission-merged.json not found yet");
}

console.log("save-mcp-pulls done");
