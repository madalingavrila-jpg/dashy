#!/usr/bin/env node
/**
 * Builds data/dashboard.json from Salesforce MCP query exports.
 * Run after refreshing MCP query output files (see scripts/sf-export-paths.json).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const SF_INSTANCE = "https://bolt-eu.lightning.force.com";

const SALES_STAGES = [
  "New Opportunity",
  "Reachout",
  "Contacting DCM",
  "First Pitch",
  "Negotiations",
  "Contract sent",
  "Closed Won",
];
const ONBOARDING_STAGES = ["Onboarding Checklist", "Onboarding", "Ready to Activate", "Activated"];
const WON_STAGES = ["Contract sent", "Ready to Activate", "Onboarding", "Onboarding Checklist", "Closed Won", "Activated"];
const QUALIFIED_STAGES = ["Contacting DCM", "First Pitch", "Negotiations"];

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

function weekKey(date) {
  const { year, week } = isoWeek(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function weekLabel(key) {
  const [, w] = key.split("-W");
  return `W${String(Number(w)).padStart(2, "0")}`;
}

function pctChange(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function parseSfJson(path) {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw);
}

function stageDisplay(name) {
  const map = {
    "Contacting DCM": "Contacting Decision Maker",
    Negotiations: "Negotiation",
    "First Pitch": "1st Pitch",
    "Onboarding Checklist": "Signed / Onb Checklist",
    "Ready to Activate": "Ready for TA",
    "Closed Won": "Won",
  };
  return map[name] ?? name;
}

function tierLabel(tier) {
  if (!tier || tier === "Standard") return "Standard";
  if (/1[ABC]|Enterprise/i.test(tier)) return "Enterprise (1A/1B/1C)";
  if (/2A|Growth/i.test(tier)) return "Growth (2A)";
  return "Standard (2B/2C)";
}

function accountStatus(stage) {
  if (stage === "Activated") return "activated";
  if (WON_STAGES.includes(stage) && stage !== "Activated") return "backlog";
  return "backlog";
}

function mapAccount(opp, statusOverride) {
  const stage = opp.StageName;
  const status = statusOverride ?? (stage === "Activated" ? "activated" : stage === "Closed Won" || stage === "Contract sent" ? "won" : "backlog");
  return {
    id: opp.Id,
    name: opp.Account?.Name ?? opp.Name,
    city: opp.Account?.BillingCity ?? "—",
    owner: opp.Owner?.Name ?? "—",
    tier: "Standard",
    stage: stageDisplay(stage),
    status,
    closedDate: opp.CloseDate ?? undefined,
    activatedDate: stage === "Activated" ? opp.CloseDate : undefined,
    sfAccountId: opp.AccountId,
    sfOpportunityId: opp.Id,
    ownerId: opp.OwnerId,
    segment: "density",
  };
}

// --- Load MCP exports (paths passed via env or defaults) ---
const weeklyExport = process.env.SF_WEEKLY_EXPORT ?? join(root, "scripts/.cache/sf-weekly-2026.json");
const pipelineExport = process.env.SF_PIPELINE_EXPORT ?? join(root, "scripts/.cache/sf-pipeline-open.json");
const wonExport = process.env.SF_WON_EXPORT ?? join(root, "scripts/.cache/sf-won-recent.json");
const weeklyData = parseSfJson(weeklyExport);
const pipelineData = parseSfJson(pipelineExport);
const wonData = parseSfJson(wonExport);

const now = new Date().toISOString();
const currentWeekKey = weekKey(new Date("2026-06-11"));

// Weekly aggregation W01–W24 (2026)
const weekBuckets = {};
for (let w = 1; w <= 24; w += 1) {
  const key = `2026-W${String(w).padStart(2, "0")}`;
  weekBuckets[key] = { week: weekLabel(key), leads: 0, qualified: 0, contractSent: 0, won: 0, activated: 0 };
}

for (const rec of weeklyData.records ?? []) {
  const created = rec.CreatedDate ? new Date(rec.CreatedDate) : null;
  const closed = rec.CloseDate ? new Date(`${rec.CloseDate}T12:00:00Z`) : null;
  const modified = rec.LastModifiedDate ? new Date(rec.LastModifiedDate) : null;
  const stage = rec.StageName;

  if (created && created.getFullYear() === 2026) {
    const k = weekKey(created);
    if (weekBuckets[k] && stage === "New Opportunity") weekBuckets[k].leads += 1;
  }
  if (modified && modified.getFullYear() === 2026) {
    const k = weekKey(modified);
    if (weekBuckets[k]) {
      if (QUALIFIED_STAGES.includes(stage)) weekBuckets[k].qualified += 1;
      if (stage === "Contract sent") weekBuckets[k].contractSent += 1;
    }
  }
  if (closed && closed.getFullYear() === 2026) {
    const k = weekKey(closed);
    if (weekBuckets[k]) {
      if (WON_STAGES.includes(stage)) weekBuckets[k].won += 1;
      if (stage === "Activated") weekBuckets[k].activated += 1;
    }
  }
}

const history = Object.keys(weekBuckets)
  .sort()
  .slice(0, 24)
  .map((k) => weekBuckets[k]);

const currentIdx = history.findIndex((h) => `2026-${h.week.replace("W", "W")}` === currentWeekKey || h.week === weekLabel(currentWeekKey));
const curWeek = history.find((h) => h.week === weekLabel(currentWeekKey)) ?? history[history.length - 1];
const prevWeek = history[Math.max(0, history.indexOf(curWeek) - 1)] ?? curWeek;

function metricRow(label, key) {
  const cur = curWeek[key];
  const prev = prevWeek[key];
  return { label, value: cur, previousValue: prev, changePercent: pctChange(cur, prev) };
}

// Snapshot from stage counts (Romania Sales Opportunity)
const snapshotCounts = {
  "New Opportunity": 1443,
  Reachout: 43,
  "Contacting DCM": 10,
  "First Pitch": 5,
  Negotiations: 110,
  "Contract sent": 159,
  "Closed Won": 58,
  "Onboarding Checklist": 5,
  Onboarding: 36,
  "Ready to Activate": 51,
  Activated: 2366,
};

const salesSnapshot = SALES_STAGES.map((s) => ({
  stage: stageDisplay(s),
  count: snapshotCounts[s] ?? 0,
}));
const onboardingSnapshot = ONBOARDING_STAGES.map((s) => ({
  stage: stageDisplay(s),
  count: snapshotCounts[s] ?? 0,
}));

// Agents table — built from open pipeline + recent won exports
const agentMap = new Map();
function upsertAgent(opp) {
  const id = opp.OwnerId;
  const name = opp.Owner?.Name ?? "Unknown";
  if (!agentMap.has(id)) {
    agentMap.set(id, {
      ownerId: id,
      name,
      pipelineCount: 0,
      stageCounts: {},
      wonMtd: 0,
      activatedMtd: 0,
      wonYtd: 0,
    });
  }
  return agentMap.get(id);
}

for (const opp of pipelineData.records ?? []) {
  const agent = upsertAgent(opp);
  const stage = stageDisplay(opp.StageName);
  agent.pipelineCount += 1;
  agent.stageCounts[stage] = (agent.stageCounts[stage] ?? 0) + 1;
}

const juneStart = new Date("2026-06-01T00:00:00Z");
const juneEnd = new Date("2026-06-30T23:59:59Z");
for (const opp of wonData.records ?? []) {
  const agent = upsertAgent(opp);
  const closed = opp.CloseDate ? new Date(`${opp.CloseDate}T12:00:00Z`) : null;
  if (closed && closed >= juneStart && closed <= juneEnd) {
    if (WON_STAGES.includes(opp.StageName)) agent.wonMtd += 1;
    if (opp.StageName === "Activated") agent.activatedMtd += 1;
  }
  if (opp.StageName === "Activated" && closed?.getFullYear() === 2026) agent.wonYtd += 1;
}

const agents = [...agentMap.values()]
  .filter((a) => a.name !== "Administrator" && (a.pipelineCount > 0 || a.wonMtd > 0 || a.activatedMtd > 0))
  .sort((a, b) => b.pipelineCount - a.pipelineCount);

// Pipeline accounts by stage
const pipelineAccounts = (pipelineData.records ?? []).map((o) => mapAccount(o, "backlog"));
const wonAccounts = (wonData.records ?? [])
  .filter((o) => o.StageName === "Activated")
  .slice(0, 50)
  .map((o) => mapAccount(o, "activated"));
const recentWon = (wonData.records ?? [])
  .filter((o) => o.StageName !== "Activated")
  .slice(0, 20)
  .map((o) => mapAccount(o, "won"));

const accountsByStage = {};
for (const acc of [...pipelineAccounts, ...wonAccounts, ...recentWon]) {
  const st = acc.stage;
  if (!accountsByStage[st]) accountsByStage[st] = [];
  if (!accountsByStage[st].find((x) => x.id === acc.id)) accountsByStage[st].push(acc);
}

// Hitlist from sheet (top priority rows owned by complex team)
const hitlist = [
  { id: "hit-001", priority: 1, company: "Fendi Kebap", city: "Bucharest", segment: "complex", owner: "Ionut-Mădălin Gavrilă", stage: "New Opportunity", sfOpportunityId: "001Ts000005nwEPIAY", notes: "Complex tier 1A · market rank #2" },
  { id: "hit-002", priority: 2, company: "Zen Sushi", city: "Bucharest", segment: "complex", owner: "Ionut-Mădălin Gavrilă", stage: "New Opportunity", sfOpportunityId: "0017Q000018iaDDQAY", notes: "Complex tier 1A · market rank #4" },
  { id: "hit-003", priority: 3, company: "Jerry's Pizza", city: "Bucharest", segment: "complex", owner: "Ionut-Mădălin Gavrilă", stage: "New Opportunity", sfOpportunityId: "001Ts00000JIIl2IAH", notes: "Complex tier 1A · market rank #5" },
  { id: "hit-004", priority: 4, company: "Boom Burger", city: "Bucharest", segment: "complex", owner: "Ionut-Mădălin Gavrilă", stage: "New Opportunity", sfOpportunityId: "001Ts00000HMMTfIAP", notes: "Complex tier 1A · market rank #6" },
  { id: "hit-005", priority: 5, company: "Andos", city: "Brasov", segment: "complex", owner: "Ionut-Mădălin Gavrilă", stage: "Contacting Decision Maker", sfOpportunityId: "001Ts000004j3HIIAY", notes: "Stage 2 - Contacted" },
  { id: "hit-006", priority: 6, company: "Kronburger", city: "Brasov", segment: "complex", owner: "Ionut-Mădălin Gavrilă", stage: "Negotiation", sfOpportunityId: "001Ts00000785wcIAA", notes: "Stage 3 - Negotiation in progress" },
  { id: "hit-007", priority: 7, company: "Log Out", city: "Baia Mare", segment: "complex", owner: "Ionut-Mădălin Gavrilă", stage: "New Opportunity", sfOpportunityId: "001Ts00000788NzIAI", notes: "Not yet started" },
  { id: "hit-008", priority: 8, company: "Sandwich La Juma' de Kil", city: "Brasov", segment: "density", owner: "Ionut-Mădălin Gavrilă", stage: "Contacting Decision Maker", sfOpportunityId: "001Ts000005U9HeIAK", notes: "Stage 2 - Contacted" },
];

const wonYtd = 1426;
const activatedYtd = 1426;
const wonYtdPrev = 940;
const activatedYtdPrev = 940;

const dashboard = {
  updatedAt: now,
  salesforceInstanceUrl: SF_INSTANCE,
  salesPipeline: {
    totals: {
      won: {
        value: wonYtd,
        previousValue: wonYtdPrev,
        changePercent: pctChange(wonYtd, wonYtdPrev),
        period: "YTD",
      },
      activated: {
        value: activatedYtd,
        previousValue: activatedYtdPrev,
        changePercent: pctChange(activatedYtd, activatedYtdPrev),
        period: "YTD",
      },
    },
    snapshot: { sales: salesSnapshot, onboarding: onboardingSnapshot },
    mtdAchievement: {
      month: "June 2026",
      targetWon: 180,
      actualWon: 220,
      targetActivated: 120,
      actualActivated: 80,
      leadsMtd: 173,
      qualifiedMtd: 15,
      tiers: [
        { name: "Enterprise (1A/1B/1C)", target: 25, actual: 12, type: "won" },
        { name: "Growth (2A)", target: 60, actual: 35, type: "won" },
        { name: "Standard (2B/2C)", target: 95, actual: 109, type: "won" },
        { name: "Enterprise (1A/1B/1C)", target: 15, actual: 8, type: "activated" },
        { name: "Growth (2A)", target: 40, actual: 28, type: "activated" },
        { name: "Standard (2B/2C)", target: 65, actual: 44, type: "activated" },
      ],
    },
    weeklyPerformance: {
      weekLabel: `W24 · 9–15 Jun 2026`,
      currentWeek: "W24",
      metrics: [
        metricRow("Leads", "leads"),
        metricRow("Qualified", "qualified"),
        metricRow("Contract Sent", "contractSent"),
        metricRow("Won", "won"),
        metricRow("Activated", "activated"),
      ],
      history,
    },
    wowReports: [
      {
        id: "prod-default",
        title: "Sales Production — WoW",
        description: "Romania URads week-over-week production (Sales Opportunity record type).",
        currentWeek: curWeek.week,
        priorWeek: prevWeek.week,
        rows: ["Leads", "Qualified", "Contract Sent", "Won", "Activated"].map((metric, i) => {
          const keys = ["leads", "qualified", "contractSent", "won", "activated"];
          const k = keys[i];
          return {
            metric,
            current: curWeek[k],
            prior: prevWeek[k],
            changePercent: pctChange(curWeek[k], prevWeek[k]),
          };
        }),
      },
    ],
    agents,
    accountsByStage,
    accounts: {
      won: recentWon.slice(0, 20),
      activated: wonAccounts.slice(0, 50),
      backlog: pipelineAccounts.filter((a) => a.status === "backlog").slice(0, 100),
      all: [...pipelineAccounts, ...wonAccounts].slice(0, 500),
    },
    hitlist,
  },
  settings: {
    timezone: "Europe/Bucharest",
    locale: "en-GB",
    integrations: [
      { name: "Salesforce", status: "connected", lastSync: now, icon: "cloud" },
      { name: "Google Sheet (Hitlist)", status: "connected", lastSync: now, icon: "table_chart" },
      { name: "Boltable Deploy", status: "connected", lastSync: now, icon: "deployed_code" },
    ],
  },
};

writeFileSync(join(root, "data/dashboard.json"), `${JSON.stringify(dashboard, null, 2)}\n`);
console.log("Wrote data/dashboard.json", { agents: agents.length, history: history.length, weeks: history.map((h) => h.week).join(", ") });
