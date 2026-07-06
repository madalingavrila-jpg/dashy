#!/usr/bin/env node
/**
 * Builds data/mtd-details.json — per-month per-agent Won/Activated account
 * drill-down lists for EVERY month of the tracking year.
 *
 * data/dashboard.json is slimmed at source (lib/slim-dashboard-source.mjs):
 * prior months keep counts but drop wonItems/activatedItems. This artifact
 * captures those lists from the same SF caches BEFORE slimming, and is served
 * as the lazily-fetched /api/dashboard/mtd-details section so the Monthly
 * Overview tab can show which accounts are behind a historical Won/Activated
 * count without inflating the main /api/dashboard payload (350KB cap).
 *
 * Reads the same caches as build-dashboard-data.mjs (won exports + stage
 * history); writes ONLY data/mtd-details.json — never touches dashboard.json,
 * so it is safe to run alongside the data-refresh flow.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildHybridMtdStore, mergeWonExportRecords } from "../lib/mtd-history.mjs";
import { filterTeamAgents } from "../lib/agent-segments.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const cacheDir = join(root, "scripts/.cache");

function parseSfJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const activationExport =
  process.env.SF_ACTIVATION_EXPORT ?? join(cacheDir, "sf-account-activation-2026.json");
const wonExport = process.env.SF_WON_EXPORT ?? join(cacheDir, "sf-won-mtd.json");
const wonYtdByDateExport =
  process.env.SF_WON_YTD_EXPORT ?? join(cacheDir, "sf-won-ytd-bydate.json");

const activationData = existsSync(activationExport)
  ? parseSfJson(activationExport)
  : { records: [] };
const wonData = parseSfJson(wonExport);
const wonYtdByDateData = existsSync(wonYtdByDateExport)
  ? parseSfJson(wonYtdByDateExport)
  : { records: [] };
const extraWonExports = readdirSync(cacheDir)
  .filter((name) => /^sf-won-\d{4}-\d{2}\.json$/.test(name))
  .map((name) => parseSfJson(join(cacheDir, name)));

// Same canonical Won source as build-dashboard-data.mjs: full-year Won_Date
// export merged with the THIS_MONTH export (+ monthly archives), deduped by Id.
// Activated drill-downs come from the provider_first_active_date__c export.
const wonAllRecords = mergeWonExportRecords([wonYtdByDateData, wonData, ...extraWonExports]);
const store = buildHybridMtdStore(wonAllRecords, activationData.records ?? []);

// Keep each item slim — just what the drill-down popover needs (name, city,
// date, SF opportunity link). Drops sfAccountId from mapMtdItem's shape.
const slimItem = ({ id, name, city, closeDate, sfOpportunityId }) => ({
  id,
  name,
  city,
  closeDate,
  sfOpportunityId,
});

const months = [...store.keys()]
  .sort((a, b) => b.localeCompare(a))
  .map((monthKey) => ({
    monthKey,
    agents: filterTeamAgents([...store.get(monthKey).values()]).map((agent) => ({
      ownerId: agent.ownerId,
      wonItems: agent.wonItems.map(slimItem),
      activatedItems: agent.activatedItems.map(slimItem),
    })),
  }));

const payload = { updatedAt: new Date().toISOString(), months };
const outPath = join(root, "data/mtd-details.json");
writeFileSync(outPath, `${JSON.stringify(payload)}\n`);

const totalItems = months.reduce(
  (sum, month) =>
    sum +
    month.agents.reduce(
      (aSum, agent) => aSum + agent.wonItems.length + agent.activatedItems.length,
      0,
    ),
  0,
);
console.log("Wrote data/mtd-details.json", {
  months: months.map((m) => m.monthKey).join(", "),
  totalItems,
  bytes: readFileSync(outPath).length,
});
