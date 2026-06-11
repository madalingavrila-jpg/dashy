#!/usr/bin/env node
/**
 * Builds data/dashboard.json from Salesforce MCP query exports.
 * Run after refreshing MCP query output files (see scripts/sf-export-paths.json).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { filterTeamAgents, buildMtdAchievement, isExcludedAgent, agentSegment } from "../lib/agent-segments.mjs";
import {
  accumulateWeeklyStatus,
  breakdownStoreToHistory,
  countWeeklyLeads,
  deriveWeeklyHistory,
  initWeeklyBreakdownStore,
  weekKey,
  weekLabel,
} from "../lib/weekly-stages-build.mjs";

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
/** Full THIS_MONTH won/activated opps — not a recent-N sample (see AGENTS.md SOQL). */
const wonExport = process.env.SF_WON_EXPORT ?? join(root, "scripts/.cache/sf-won-mtd.json");
const weeklyData = parseSfJson(weeklyExport);
const pipelineData = parseSfJson(pipelineExport);
const wonData = parseSfJson(wonExport);

const now = new Date().toISOString();
const currentWeekKey = weekKey(new Date("2026-06-11"));

// Weekly status breakdown by team + agent (Qualified / Negotiations / Closed Won / Active)
const weeklyBreakdownStore = initWeeklyBreakdownStore(24);
for (const rec of weeklyData.records ?? []) {
  accumulateWeeklyStatus(rec, weeklyBreakdownStore, agentSegment, isExcludedAgent);
}
const weeklyBreakdown = breakdownStoreToHistory(weeklyBreakdownStore);
const leadsByWeek = countWeeklyLeads(weeklyData.records, agentSegment, isExcludedAgent);
const history = deriveWeeklyHistory(weeklyBreakdown, leadsByWeek);

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

/** MTD window — export should already use CloseDate = THIS_MONTH; filter again for safety. */
const mtdRef = new Date();
const mtdYear = mtdRef.getFullYear();
const mtdMonth = mtdRef.getMonth();
const mtdStart = new Date(Date.UTC(mtdYear, mtdMonth, 1));
const mtdEnd = new Date(Date.UTC(mtdYear, mtdMonth + 1, 0, 23, 59, 59));
const mtdMonthLabel = mtdRef.toLocaleString("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "Europe/Bucharest",
});

for (const opp of wonData.records ?? []) {
  const agent = upsertAgent(opp);
  const closed = opp.CloseDate ? new Date(`${opp.CloseDate}T12:00:00Z`) : null;
  if (closed && closed >= mtdStart && closed <= mtdEnd) {
    if (WON_STAGES.includes(opp.StageName)) agent.wonMtd += 1;
    if (opp.StageName === "Activated") agent.activatedMtd += 1;
  }
  if (opp.StageName === "Activated" && closed?.getFullYear() === mtdYear) agent.wonYtd += 1;
}

const agents = filterTeamAgents(
  [...agentMap.values()].filter(
    (a) =>
      a.name !== "Administrator" &&
      !isExcludedAgent(a.name, a.ownerId) &&
      (a.pipelineCount > 0 || a.wonMtd > 0 || a.activatedMtd > 0),
  ),
).sort((a, b) => b.pipelineCount - a.pipelineCount);

const mtdAchievement = buildMtdAchievement(agents, mtdMonthLabel, {
  leadsMtd: 173,
  qualifiedMtd: 15,
});

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
  { id: "hit-003", priority: 3, company: "Jerry's Pizza", city: "Bucharest", segment: "complex", owner: "Ionut-Mădălin Gavrilă", stage: "Negotiations", sfOpportunityId: "001Ts00000JIIl2IAH", notes: "Complex tier 1A · market rank #5" },
  { id: "hit-004", priority: 4, company: "Kronburger", city: "Brasov", segment: "complex", owner: "Ionut-Mădălin Gavrilă", stage: "New Opportunity", sfOpportunityId: "001Ts00000785wcIAA", notes: "Stage 3 - Negotiation in progress" },
  { id: "hit-005", priority: 5, company: "Log Out", city: "Baia Mare", segment: "complex", owner: "Ionut-Mădălin Gavrilă", stage: "Contract sent", sfOpportunityId: "001Ts00000788NzIAI", notes: "Not yet started" },
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
    mtdAchievement,
    weeklyPerformance: {
      weekLabel: `W24 · 9–15 Jun 2026`,
      currentWeek: "W24",
      metrics: [
        metricRow("Leads", "leads"),
        metricRow("Qualified", "qualified"),
        metricRow("Negotiations", "negotiations"),
        metricRow("Closed Won", "closedWon"),
        metricRow("Active", "active"),
      ],
      history,
      breakdown: weeklyBreakdown,
    },
    wowReports: [
      {
        id: "prod-default",
        title: "Sales Production — WoW",
        description: "Romania week-over-week production (Sales Opportunity record type).",
        currentWeek: curWeek.week,
        priorWeek: prevWeek.week,
        rows: ["Leads", "Qualified", "Negotiations", "Closed Won", "Active"].map((metric, i) => {
          const keys = ["leads", "qualified", "negotiations", "closedWon", "active"];
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
