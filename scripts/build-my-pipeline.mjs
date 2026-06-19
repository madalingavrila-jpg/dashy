#!/usr/bin/env node
/**
 * Build the `salesPipeline.myPipeline` section and merge it into data/dashboard.json.
 *
 * Source: Salesforce MCP exports cached under scripts/.cache/:
 *   - mp-opps-working.json  — open Sales Opportunity records in the working stages
 *                              (Reachout, Contacting DCM, First Pitch, Negotiations, Contract sent) — FULL.
 *   - mp-opps-newopp.json   — most-recent "New Opportunity" stage opps (sampled; capped per agent).
 *   - mp-leads.json         — most-recent open Leads (not converted, not disqualified; sampled, capped per agent).
 *   - mp-totals.json        — authoritative per-rep open counts from SF GROUP BY (so totals stay exact
 *                              even where the embedded list is capped).
 *
 * MyPipeline = each rep's OPEN working pipeline (before win/onboarding/activation).
 *   Opportunities: only the open pre-win stages below. EXCLUDES Closed Won, Activated,
 *     Onboarding, Onboarding Checklist, Ready to Activate, Escalation, Closed Lost.
 *   Leads: open leads owned by the rep (IsConverted = false, Status != 'Disqualified').
 *   Accounts: distinct accounts that have an open opportunity assigned to the rep
 *     (derived from the opportunities list — excludes active/won/onboarding by construction).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { agentSegment, isExcludedAgent } from "../lib/agent-segments.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const cacheDir = join(root, "scripts/.cache");

const STAGES_INCLUDED = [
  "New Opportunity",
  "Reachout",
  "Contacting DCM",
  "First Pitch",
  "Negotiations",
  "Contract sent",
];
const STAGES_EXCLUDED = [
  "Closed Won",
  "Activated",
  "Onboarding",
  "Onboarding Checklist",
  "Ready to Activate",
  "Escalation",
  "Closed Lost",
];

/** More-advanced stages rank higher (used to pick an account's representative stage). */
const STAGE_RANK = {
  "New Opportunity": 1,
  Reachout: 2,
  "Contacting DCM": 3,
  "First Pitch": 4,
  Negotiations: 5,
  "Contract sent": 6,
};

const NEW_OPP_CAP_PER_AGENT = 75;
const LEADS_CAP_PER_AGENT = 50;

function parseSf(path) {
  const raw = readFileSync(path, "utf8");
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : (data.records ?? []);
}

function stageDisplay(name) {
  const map = {
    "Contacting DCM": "Contacting Decision Maker",
    Negotiations: "Negotiation",
    "First Pitch": "1st Pitch",
    "New Opportunity": "New Opportunity",
  };
  return map[name] ?? name;
}

const totals = JSON.parse(readFileSync(join(cacheDir, "mp-totals.json"), "utf8"));
const workingOpps = parseSf(join(cacheDir, "mp-opps-working.json"));
const newOpps = parseSf(join(cacheDir, "mp-opps-newopp.json"));
const leads = parseSf(join(cacheDir, "mp-leads.json"));

/** owner registry keyed by ownerId */
const owners = new Map();
function owner(ownerId, name) {
  if (!owners.has(ownerId)) {
    const segment = agentSegment(name, ownerId);
    owners.set(ownerId, { ownerId, name, segment });
  }
  return owners.get(ownerId);
}

const items = [];

function pushOpp(rec) {
  if (isExcludedAgent(rec.Owner?.Name, rec.OwnerId)) return false;
  const seg = agentSegment(rec.Owner?.Name, rec.OwnerId);
  if (!seg) return false;
  owner(rec.OwnerId, rec.Owner?.Name);
  items.push({
    type: "opportunity",
    id: rec.Id,
    name: rec.Name,
    stage: stageDisplay(rec.StageName),
    rawStage: rec.StageName,
    account: rec.Account?.Name ?? null,
    accountId: rec.AccountId ?? null,
    city: rec.Account?.City__r?.Name ?? rec.Account?.BillingCity ?? rec.Account?.ShippingCity ?? null,
    date: rec.CloseDate ?? null,
    ownerId: rec.OwnerId,
    ownerName: rec.Owner?.Name ?? "—",
    segment: seg,
  });
  return true;
}

// 1) Working-stage opps — include all.
for (const rec of workingOpps) pushOpp(rec);

// 2) New Opportunity — cap per agent (records arrive most-recent first).
const newOppByAgent = new Map();
for (const rec of newOpps) {
  const id = rec.OwnerId;
  const n = newOppByAgent.get(id) ?? 0;
  if (n >= NEW_OPP_CAP_PER_AGENT) continue;
  if (pushOpp(rec)) newOppByAgent.set(id, n + 1);
}

// 3) Leads — cap per agent (records arrive most-recent first).
const leadsByAgent = new Map();
for (const rec of leads) {
  if (isExcludedAgent(rec.Owner?.Name, rec.OwnerId)) continue;
  const seg = agentSegment(rec.Owner?.Name, rec.OwnerId);
  if (!seg) continue;
  const id = rec.OwnerId;
  const n = leadsByAgent.get(id) ?? 0;
  if (n >= LEADS_CAP_PER_AGENT) continue;
  owner(rec.OwnerId, rec.Owner?.Name);
  items.push({
    type: "lead",
    id: rec.Id,
    name: rec.Name || rec.Company || "(no name)",
    stage: rec.Status ?? "—",
    rawStage: rec.Status ?? null,
      account: rec.Company ?? null,
      accountId: null,
      city: rec.City__r?.Name ?? rec.City ?? rec.State ?? null,
    date: rec.CreatedDate ? rec.CreatedDate.slice(0, 10) : null,
    ownerId: rec.OwnerId,
    ownerName: rec.Owner?.Name ?? "—",
    segment: seg,
  });
  leadsByAgent.set(id, n + 1);
}

// 4) Accounts — distinct accounts that have an open opp (derived from opp items).
const accountMap = new Map();
for (const it of items) {
  if (it.type !== "opportunity" || !it.accountId) continue;
  const key = it.accountId;
  const existing = accountMap.get(key);
  if (existing) {
    existing.openOpps += 1;
    if ((STAGE_RANK[it.rawStage] ?? 0) > existing.rank) {
      existing.rank = STAGE_RANK[it.rawStage] ?? 0;
      existing.stage = it.stage;
    }
    if (!existing.city && it.city) existing.city = it.city;
  } else {
    accountMap.set(key, {
      type: "account",
      id: key,
      name: it.account ?? "(account)",
      stage: it.stage,
      rank: STAGE_RANK[it.rawStage] ?? 0,
      account: it.account ?? null,
      accountId: key,
      city: it.city ?? null,
      date: null,
      ownerId: it.ownerId,
      ownerName: it.ownerName,
      segment: it.segment,
      openOpps: 1,
    });
  }
}
for (const acc of accountMap.values()) {
  delete acc.rank;
  items.push(acc);
}

// Per-agent summary with authoritative totals (from GROUP BY) + embedded ("shown") counts.
const agents = [];
for (const o of owners.values()) {
  const oppShown = items.filter((i) => i.type === "opportunity" && i.ownerId === o.ownerId).length;
  const leadShown = items.filter((i) => i.type === "lead" && i.ownerId === o.ownerId).length;
  const accountShown = items.filter((i) => i.type === "account" && i.ownerId === o.ownerId).length;
  agents.push({
    ownerId: o.ownerId,
    name: o.name,
    segment: o.segment,
    totals: {
      opportunities: totals.opps?.[o.ownerId]?.total ?? oppShown,
      leads: totals.leadsOpen?.[o.ownerId] ?? leadShown,
      accounts: accountShown,
    },
    shown: { opportunities: oppShown, leads: leadShown, accounts: accountShown },
  });
}
agents.sort((a, b) => b.totals.opportunities - a.totals.opportunities || a.name.localeCompare(b.name));

const myPipeline = {
  generatedAt: new Date().toISOString(),
  stagesIncluded: STAGES_INCLUDED,
  stagesExcluded: STAGES_EXCLUDED,
  caps: { newOpportunityPerAgent: NEW_OPP_CAP_PER_AGENT, leadsPerAgent: LEADS_CAP_PER_AGENT },
  totals: {
    opportunities: agents.reduce((s, a) => s + a.totals.opportunities, 0),
    leads: agents.reduce((s, a) => s + a.totals.leads, 0),
    accounts: accountMap.size,
    opportunitiesShown: items.filter((i) => i.type === "opportunity").length,
    leadsShown: items.filter((i) => i.type === "lead").length,
  },
  agents,
  items,
};

// Merge into data/dashboard.json (preserve every other section).
const dataPath = join(root, "data/dashboard.json");
const dashboard = JSON.parse(readFileSync(dataPath, "utf8"));
dashboard.salesPipeline = dashboard.salesPipeline ?? {};
dashboard.salesPipeline.myPipeline = myPipeline;
dashboard.updatedAt = myPipeline.generatedAt;
writeFileSync(dataPath, `${JSON.stringify(dashboard, null, 2)}\n`);

console.log("Wrote myPipeline into data/dashboard.json", {
  agents: agents.length,
  oppsTotal: myPipeline.totals.opportunities,
  oppsShown: myPipeline.totals.opportunitiesShown,
  leadsTotal: myPipeline.totals.leads,
  leadsShown: myPipeline.totals.leadsShown,
  accounts: myPipeline.totals.accounts,
  items: items.length,
});
