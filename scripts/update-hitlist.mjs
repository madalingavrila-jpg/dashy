#!/usr/bin/env node
/**
 * Build hitlist from weekly tracker sheet exports + Salesforce cross-check.
 * Usage: node scripts/update-hitlist.mjs
 * Expects cache files:
 *   scripts/.cache/sheet-complex-weekly.json
 *   scripts/.cache/sheet-density-weekly.json
 *   scripts/.cache/sf-hitlist-opps.json (written by this script via stdin or pre-fetched)
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const DENSITY_EXCLUDED_STAGES = new Set([
  "0 - Not Started",
  "8 - Live",
  "9 - Deal Lost",
  "10 - Already Live",
  "11 - To be moved to Complex",
]);

const OWNER_MAP = {
  "Andrei Pătru": "Andrei-Georgian Pătru",
  "Andrei Patru": "Andrei-Georgian Pătru",
  "Ionut-Mădălin Gavrilă": "Ionut-Mădălin Gavrilă",
  "Paul-Daniel Rîngheanu": "Paul-Daniel Rîngheanu",
  "Corneliu-Ștefan Radu": "Corneliu-Ștefan Radu",
  "Vlad-Bogdan Popa": "Vlad-Bogdan Popa",
  "Oroles Rosu": "Oroles Roșu",
  "Georgian Borcaeas": "Borcaeas Georgian",
  "Daniel Boboc": "Daniel-Alexandru Boboc",
  "Ciprian Teodorescu": "Ciprian Teodorescu",
  "Silviu-Mihnea Voicu": "Silviu-Mihnea Voicu",
  "Daniel Toltică": "Daniel-Marian Toltică",
  "Eusebiu Hanganu": "Eusebiu Hanganu",
};

function normalizeOwner(name) {
  if (!name || name === ".") return "";
  return OWNER_MAP[name.trim()] ?? name.trim();
}

function isValidSfId(id) {
  return typeof id === "string" && /^001[a-zA-Z0-9]{12,15}$/.test(id.trim());
}

function isProcessStarted(val) {
  return String(val).toUpperCase() === "TRUE";
}

function parseComplexRows(rows) {
  const candidates = [];
  for (const row of rows) {
    if (!row || row.length < 25) continue;
    const [sfAccountId, company, , owner, city, , , , , , , , , , , , status, , tier, , , , , chance, processStarted] = row;
    if (!company || company.includes("Opportunity Name")) continue;
    if (!isProcessStarted(processStarted)) continue;
    candidates.push({
      segment: "complex",
      sfAccountId: isValidSfId(sfAccountId) ? sfAccountId.trim() : "",
      company: String(company).trim(),
      city: String(city).trim(),
      owner: normalizeOwner(owner),
      sheetStage: String(status || "").trim(),
      tier: String(tier || "").trim(),
      chance: String(chance || "").trim(),
      processStarted: true,
    });
  }
  return candidates;
}

function parseDensityRows(rows) {
  const candidates = [];
  for (const row of rows) {
    if (!row || row.length < 17) continue;
    const [sfAccountId, company, , owner, city, , , , , , h1Scope, , , , processStarted, , sheetStage] = row;
    if (!company || company.includes("Opportunity Name")) continue;
    if (!isProcessStarted(processStarted)) continue;
    if (h1Scope !== "In Scope") continue;
    const stage = String(sheetStage || "").trim();
    if (DENSITY_EXCLUDED_STAGES.has(stage)) continue;
    candidates.push({
      segment: "density",
      sfAccountId: isValidSfId(sfAccountId) ? sfAccountId.trim() : "",
      company: String(company).trim(),
      city: String(city).trim(),
      owner: normalizeOwner(owner),
      sheetStage: stage,
      tier: "",
      chance: "",
      processStarted: true,
    });
  }
  return candidates;
}

function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[''`]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Name-only cross-check: compare provider/opportunity names, not GMV/tier/dates. */
function namesMatch(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na))) return true;
  const ta = new Set(na.split(" ").filter((w) => w.length > 2));
  const tb = new Set(nb.split(" ").filter((w) => w.length > 2));
  if (!ta.size || !tb.size) return false;
  let overlap = 0;
  for (const w of ta) if (tb.has(w)) overlap++;
  const min = Math.min(ta.size, tb.size);
  return overlap >= Math.max(2, Math.ceil(min * 0.6));
}

function dedupeKey(c) {
  return `${c.segment}|${normalizeName(c.company)}|${normalizeName(c.city)}`;
}

function dedupe(candidates) {
  const seen = new Map();
  for (const c of candidates) {
    const key = dedupeKey(c);
    if (!seen.has(key)) seen.set(key, c);
    else if (c.sfAccountId && !seen.get(key).sfAccountId) seen.set(key, c);
  }
  return [...seen.values()];
}

function mapSfStage(stage) {
  if (!stage) return "Unknown";
  return stage;
}

function buildNotes(c, sfStage) {
  const parts = [];
  if (c.segment === "complex" && c.tier) parts.push(`Complex tier ${c.tier}`);
  if (c.chance) parts.push(`chance: ${c.chance}`);
  if (c.sheetStage && c.sheetStage !== sfStage) parts.push(`sheet: ${c.sheetStage}`);
  return parts.length ? parts.join(" · ") : undefined;
}

function main() {
  const complexPath = join(root, "scripts/.cache/sheet-complex-weekly.json");
  const densityPath = join(root, "scripts/.cache/sheet-density-weekly.json");
  const sfPath = join(root, "scripts/.cache/sf-hitlist-opps.json");
  const dashboardPath = join(root, "data/dashboard.json");

  if (!existsSync(complexPath) || !existsSync(densityPath) || !existsSync(sfPath)) {
    console.error("Missing cache files. Need sheet-complex-weekly.json, sheet-density-weekly.json, sf-hitlist-opps.json");
    process.exit(1);
  }

  const complexRows = JSON.parse(readFileSync(complexPath, "utf8"));
  const densityRows = JSON.parse(readFileSync(densityPath, "utf8"));
  const sfData = JSON.parse(readFileSync(sfPath, "utf8"));

  const complexCandidates = parseComplexRows(complexRows);
  const densityCandidates = parseDensityRows(densityRows);
  const allCandidates = dedupe([...complexCandidates, ...densityCandidates]);

  const sfRecords = sfData.records ?? sfData;
  const byAccountId = new Map();
  const sfByName = [];
  for (const rec of sfRecords) {
    const accountId = rec.AccountId;
    const stage = rec.StageName;
    if (accountId) {
      const existing = byAccountId.get(accountId);
      if (!existing || (existing.StageName === "Activated" && stage !== "Activated")) {
        byAccountId.set(accountId, rec);
      }
    }
    const accountName = rec.Account?.Name ?? "";
    const oppName = rec.Name ?? "";
    if (accountName) sfByName.push({ rec, name: accountName, kind: "account" });
    if (oppName && normalizeName(oppName) !== normalizeName(accountName)) {
      sfByName.push({ rec, name: oppName, kind: "opportunity" });
    }
  }

  function findSfByName(company) {
    const exact = sfByName.filter((e) => normalizeName(e.name) === normalizeName(company));
    if (exact.length) {
      const nonActivated = exact.find((e) => e.rec.StageName !== "Activated");
      return (nonActivated ?? exact[0]).rec;
    }
    const fuzzy = sfByName.filter((e) => namesMatch(company, e.name));
    if (!fuzzy.length) return null;
    const nonActivated = fuzzy.find((e) => e.rec.StageName !== "Activated");
    return (nonActivated ?? fuzzy[0]).rec;
  }

  const stats = {
    complexConsidered: complexCandidates.length,
    densityConsidered: densityCandidates.length,
    complexDeduped: dedupe(complexCandidates).length,
    densityDeduped: dedupe(densityCandidates).length,
    matchedByName: 0,
    matchedByAccountId: 0,
    passedSf: 0,
    skippedActivated: 0,
    includedNoSfMatch: 0,
    added: 0,
    updated: 0,
  };

  const hitlistEntries = [];
  const existingHitlist = existsSync(dashboardPath)
    ? JSON.parse(readFileSync(dashboardPath, "utf8")).salesPipeline?.hitlist ?? []
    : [];

  // Keep existing entries that still qualify (re-validate)
  const existingKeys = new Set(existingHitlist.map((h) => `${h.segment}|${h.company.toLowerCase()}|${h.city.toLowerCase()}`));

  for (const c of allCandidates) {
    let sfRec = null;
    let matchMethod = null;
    if (c.sfAccountId && byAccountId.has(c.sfAccountId)) {
      sfRec = byAccountId.get(c.sfAccountId);
      matchMethod = "accountId";
    }
    if (!sfRec) {
      sfRec = findSfByName(c.company);
      if (sfRec) matchMethod = "name";
    }

    if (sfRec?.StageName === "Activated") {
      stats.skippedActivated++;
      continue;
    }

    if (sfRec) {
      if (matchMethod === "name") stats.matchedByName++;
      if (matchMethod === "accountId") stats.matchedByAccountId++;
      stats.passedSf++;
      const sfStage = mapSfStage(sfRec.StageName);
      const accountId = sfRec.AccountId ?? c.sfAccountId;
      const owner = sfRec.Owner?.Name ?? c.owner;
      const city = sfRec.Account?.BillingCity ?? c.city;
      hitlistEntries.push({
        segment: c.segment,
        company: sfRec.Account?.Name ?? c.company,
        city: city || c.city,
        owner: owner || c.owner,
        stage: sfStage,
        sfOpportunityId: accountId,
        notes: buildNotes(c, sfStage),
        _sortTier: c.tier,
        _sortChance: c.chance === "High" ? 0 : c.chance === "Medium" ? 1 : 2,
      });
      continue;
    }

    // Active pipeline on sheet but no SF name match — still include
    stats.includedNoSfMatch++;
    const sheetStage = c.sheetStage || "Unknown";
    hitlistEntries.push({
      segment: c.segment,
      company: c.company,
      city: c.city,
      owner: c.owner,
      stage: sheetStage,
      sfOpportunityId: c.sfAccountId || undefined,
      notes: [buildNotes(c, sheetStage), "SF: no match (name only)"].filter(Boolean).join(" · "),
      _sortTier: c.tier,
      _sortChance: c.chance === "High" ? 0 : c.chance === "Medium" ? 1 : 2,
    });
  }

  // Sort: complex first (by tier 1A/1B/1C), then density; within segment by chance
  const tierOrder = (t) => {
    const m = String(t).match(/^(\d+)([A-C])?/);
    if (!m) return 99;
    return parseInt(m[1], 10) * 10 + (m[2] === "A" ? 0 : m[2] === "B" ? 1 : m[2] === "C" ? 2 : 3);
  };

  hitlistEntries.sort((a, b) => {
    if (a.segment !== b.segment) return a.segment === "complex" ? -1 : 1;
    if (a.segment === "complex") {
      const td = tierOrder(a._sortTier) - tierOrder(b._sortTier);
      if (td !== 0) return td;
    }
    return a._sortChance - b._sortChance;
  });

  const hitlist = hitlistEntries.map((e, i) => ({
    id: `hit-${String(i + 1).padStart(3, "0")}`,
    priority: i + 1,
    company: e.company,
    city: e.city,
    segment: e.segment,
    owner: e.owner,
    stage: e.stage,
    sfOpportunityId: e.sfOpportunityId,
    ...(e.notes ? { notes: e.notes } : {}),
  }));

  stats.added = hitlist.length;
  stats.updated = hitlist.filter((h) => existingKeys.has(`${h.segment}|${h.company.toLowerCase()}|${h.city.toLowerCase()}`)).length;

  const dashboard = JSON.parse(readFileSync(dashboardPath, "utf8"));
  dashboard.updatedAt = new Date().toISOString();
  dashboard.salesPipeline.hitlist = hitlist;
  if (dashboard.settings?.integrations) {
    for (const integ of dashboard.settings.integrations) {
      if (integ.name === "Salesforce" || integ.name === "Google Sheet (Hitlist)") {
        integ.lastSync = dashboard.updatedAt;
      }
    }
  }

  writeFileSync(dashboardPath, `${JSON.stringify(dashboard, null, 2)}\n`);
  writeFileSync(join(root, "scripts/.cache/hitlist-stats.json"), `${JSON.stringify(stats, null, 2)}\n`);

  console.log(JSON.stringify({ hitlistCount: hitlist.length, stats, sample: hitlist.slice(0, 8) }, null, 2));
}

main();
