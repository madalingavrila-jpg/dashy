#!/usr/bin/env node
/**
 * Builds data/dashboard.json from Salesforce MCP query exports.
 * Run after refreshing MCP query output files (see scripts/sf-export-paths.json).
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  filterTeamAgents,
  buildMtdAchievement,
  isExcludedAgent,
  agentSegment,
  enrichAgent,
} from "../lib/agent-segments.mjs";
import {
  buildMtdHistoryFromHybrid,
  currentMonthKey,
  mergeWonExportRecords,
  mtdAgentsForMonth,
  buildHybridMtdStore,
} from "../lib/mtd-history.mjs";
import {
  accumulateWeeklyStatusFromHistory,
  accumulateWeeklyClosedWonFromWonDate,
  accumulateNewOpportunityFallback,
  breakdownStoreToHistory,
  countWeeklyLeads,
  countMtdLeads,
  countMtdQualified,
  deriveWeeklyHistory,
  initWeeklyBreakdownStore,
  weekKey,
  weekLabel,
} from "../lib/weekly-stages-build.mjs";
import { slimDashboardRawData } from "../lib/slim-dashboard-source.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const SF_INSTANCE = "https://boltfood.lightning.force.com";

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
/**
 * Onboarding = opportunities still being onboarded (not yet Ready to Activate)
 * for the 12 team reps. Includes the signed "Onboarding Checklist" stage plus
 * the in-flight onboarding stages. "Ready to Activate" is split OUT into its own
 * parallel per-agent section (see READY_TO_ACTIVATE_STAGES). "Activated" is the
 * live end state.
 *
 * EXPLICIT allow-list (no keyword/substring matching). "Onboarding Checklist" is
 * deliberately EXCLUDED: in Bolt SF it is the *pre-Won* "Contract signed" stage
 * (display label "Signed / Onb Checklist"), confirmed by data — all 21 such opps
 * have NO Won_Date__c, i.e. they are not Closed Won yet. Counting them as
 * onboarding was the bug reported by Eusebiu; it must NOT be counted here.
 *
 * Verified against live Salesforce, RecordType "Sales Opportunity":
 *   Onboarding (38, all Won), Escalation (1, Won) → 39 onboarding opps.
 *   Onboarding Checklist (21, pre-Won / "Contract signed") → excluded.
 *   Ready to Activate (42) → tracked separately.
 * Excluded: "Onboarding Checklist" / "Contract sent" (both pre-Won), "Closed Won"
 * (the Won bucket itself), "Activated" (done), and "Closed Lost".
 */
const LIVE_ONBOARDING_STAGES = [
  "Onboarding",
  "Escalation",
];
/**
 * Ready to Activate = onboarding-complete opps awaiting go-live, shown in a
 * parallel per-agent section alongside onboarding. ~42 opps (19 Jun 2026).
 */
const READY_TO_ACTIVATE_STAGES = ["Ready to Activate"];
/** Cap accounts kept per agent in the payload; true totals stay in `count`. */
const MOPS_ONBOARDING_ACCOUNT_CAP = 40;
const MOPS_DASHBOARD_ID = "01ZTs000000Bx9dMAC";
const MOPS_DASHBOARD_URL = `https://boltfood.lightning.force.com/lightning/r/Dashboard/${MOPS_DASHBOARD_ID}/view`;
const MOPS_SF_INSTANCE = "https://boltfood.lightning.force.com";
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
const stageHistoryExport =
  process.env.SF_STAGE_HISTORY_EXPORT ?? join(root, "scripts/.cache/sf-stage-history-2026.json");
const pipelineExport = process.env.SF_PIPELINE_EXPORT ?? join(root, "scripts/.cache/sf-pipeline-open.json");
/** Won_Date__c = THIS_MONTH — Sales Opportunity (SF dashboard Won Date MTD). */
const wonExport = process.env.SF_WON_EXPORT ?? join(root, "scripts/.cache/sf-won-mtd.json");
/** Won_Date__c = THIS_YEAR — Sales Opportunity. Drives weekly Closed Won (ISO week of Won_Date__c). */
const wonYtdByDateExport =
  process.env.SF_WON_YTD_EXPORT ?? join(root, "scripts/.cache/sf-won-ytd-bydate.json");
const wonRecentExport = join(root, "scripts/.cache/sf-won-recent.json");
const wonCacheDir = join(root, "scripts/.cache");
const mopsCasesExport =
  process.env.SF_MOPS_CASES_EXPORT ?? join(root, "scripts/.cache/sf-mops-cases.json");
const mopsOnboardingExport =
  process.env.SF_MOPS_ONBOARDING_EXPORT ?? join(root, "scripts/.cache/sf-mops-onboarding.json");
const weeklyData = parseSfJson(weeklyExport);
const stageHistoryData = parseSfJson(stageHistoryExport);
const pipelineData = parseSfJson(pipelineExport);
const wonData = parseSfJson(wonExport);
const wonYtdByDateData = existsSync(wonYtdByDateExport)
  ? parseSfJson(wonYtdByDateExport)
  : { records: [] };
const wonRecentData = existsSync(wonRecentExport) ? parseSfJson(wonRecentExport) : { records: [] };
const extraWonExports = readdirSync(wonCacheDir)
  .filter((name) => /^sf-won-\d{4}-\d{2}\.json$/.test(name))
  .map((name) => parseSfJson(join(wonCacheDir, name)));
/**
 * Canonical Won source for ALL months: the full-year Won_Date export (THIS_YEAR)
 * merged with the THIS_MONTH export (+ monthly archives), deduped by Id. The
 * THIS_MONTH export carries the freshest current-month wins (it is refreshed more
 * often than the YTD pull), so merging it in keeps the current month exact.
 * buildHybridMtdStore counts Won from Won_Date__c for every month (no
 * field-history "Closed Won" fallback), so prior months reconcile to the SF
 * Won-Date dashboard instead of bulk stage backfills.
 */
const wonAllRecords = mergeWonExportRecords([wonYtdByDateData, wonData, ...extraWonExports]);
const mergedWonRecords = mergeWonExportRecords([wonData, ...extraWonExports, wonRecentData]);
const mtdHistoryStore = buildHybridMtdStore(wonAllRecords, stageHistoryData.records);
const mtdHistory = buildMtdHistoryFromHybrid(wonAllRecords, stageHistoryData.records);
const mopsCasesData = parseSfJson(mopsCasesExport);
const mopsOnboardingData = existsSync(mopsOnboardingExport)
  ? parseSfJson(mopsOnboardingExport)
  : { records: [] };

/**
 * Per-agent breakdown of opportunities in the given stage set (team reps only).
 *
 * `excludeAccountIds` is the set of accounts that are ALREADY Activated (current
 * stage = Activated). The three MOPS buckets must be mutually exclusive by the
 * account's current stage and Activated takes precedence: an account that is live
 * must DISAPPEAR from Onboarding and Ready to Activate (it counts only as Active).
 * This guards against stale exports where an opp advanced to Activated but a
 * sibling/duplicate opp is still parked in an onboarding/RTA stage.
 */
function buildAgentBreakdown(onboardingData, stages, excludeAccountIds = new Set()) {
  const byAgent = new Map();

  for (const opp of onboardingData.records ?? []) {
    if (!stages.includes(opp.StageName)) continue;
    if (opp.AccountId && excludeAccountIds.has(opp.AccountId)) continue;
    const ownerId = opp.OwnerId;
    const ownerName = opp.Owner?.Name ?? "Unknown";
    const enriched = enrichAgent({ ownerId, name: ownerName });
    if (!enriched) continue;

    if (!byAgent.has(ownerId)) {
      byAgent.set(ownerId, {
        ownerId,
        name: ownerName,
        segment: enriched.segment,
        count: 0,
        stageCounts: {},
        accounts: [],
      });
    }

    const agent = byAgent.get(ownerId);
    const stage = stageDisplay(opp.StageName);
    agent.count += 1;
    agent.stageCounts[stage] = (agent.stageCounts[stage] ?? 0) + 1;
    agent.accounts.push({
      id: opp.Id,
      name: opp.Account?.Name ?? opp.Name,
      city: opp.Account?.BillingCity ?? "—",
      stage,
      sfOpportunityId: opp.Id,
      sfAccountId: opp.AccountId,
    });
  }

  const rows = [...byAgent.values()].sort((a, b) => b.count - a.count);
  for (const agent of rows) {
    if (agent.accounts.length > MOPS_ONBOARDING_ACCOUNT_CAP) {
      agent.moreCount = agent.accounts.length - MOPS_ONBOARDING_ACCOUNT_CAP;
      agent.accounts = agent.accounts.slice(0, MOPS_ONBOARDING_ACCOUNT_CAP);
    }
  }
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return { rows, total };
}

function buildMopsSection(casesData, onboardingData, activatedAccountIds = new Set()) {
  const { rows: onboardingByAgent, total: totalLiveOnboarding } = buildAgentBreakdown(
    onboardingData,
    LIVE_ONBOARDING_STAGES,
    activatedAccountIds,
  );
  const { rows: readyToActivateByAgent, total: totalReadyToActivate } = buildAgentBreakdown(
    onboardingData,
    READY_TO_ACTIVATE_STAGES,
    activatedAccountIds,
  );
  const openCases = casesData.openCases ?? 0;
  const openNewOnboarding = casesData.openNewOnboarding ?? 0;
  const openOtherCases = Math.max(0, openCases - openNewOnboarding);
  const topOpenStatus = (casesData.openByStatus ?? [])[0];

  return {
    dashboardId: MOPS_DASHBOARD_ID,
    dashboardTitle: "[MOps] Open cases",
    dashboardUrl: MOPS_DASHBOARD_URL,
    salesforceInstanceUrl: MOPS_SF_INSTANCE,
    metrics: [
      {
        id: "onboarding-live",
        label: "Accounts in onboarding",
        value: totalLiveOnboarding,
        subtitle: "Onboarding → Escalation (opps)",
        icon: "rocket_launch",
      },
      {
        id: "ready-to-activate",
        label: "Ready to Activate",
        value: totalReadyToActivate,
        subtitle: "Onboarding complete, awaiting go-live (opps)",
        icon: "bolt",
      },
      {
        id: "open-cases",
        label: "Open cases",
        value: openCases,
        subtitle: "IsClosed = false",
        icon: "inbox",
      },
      {
        id: "open-new-onboarding",
        label: "Open onboarding cases",
        value: openNewOnboarding,
        subtitle: "New Onboarding record type",
        icon: "support_agent",
      },
      {
        id: "open-other-cases",
        label: "Other open cases",
        value: openOtherCases,
        subtitle: "Menu update, self signup, expansion…",
        icon: "folder_open",
      },
      ...(topOpenStatus
        ? [
            {
              id: "open-top-status",
              label: topOpenStatus.status,
              value: topOpenStatus.count,
              subtitle: "Largest open status bucket",
              icon: "pending",
            },
          ]
        : []),
    ],
    totalLiveOnboarding,
    onboardingByAgent,
    totalReadyToActivate,
    readyToActivateByAgent,
    openCaseStatuses: casesData.openByStatus ?? [],
    openCaseRecordTypes: casesData.openByRecordType ?? [],
    openByOwner: casesData.openByOwner ?? [],
    openCasesList: (casesData.records ?? []).map((row) => ({
      id: row.id,
      caseNumber: row.caseNumber,
      subject: row.subject,
      status: row.status,
      ownerId: row.ownerId,
      ownerName: row.ownerName,
      recordType: row.recordType,
    })),
  };
}

// Accounts whose current stage is Activated (live) — sourced from the Won_Date
// exports (current StageName per opp, team reps, current year). Used to keep the
// MOPS buckets mutually exclusive: an Activated account counts only as Active and
// is removed from Onboarding + Ready to Activate (Activated takes precedence).
const activatedAccountIds = new Set();
for (const rec of [...wonAllRecords, ...mergedWonRecords]) {
  if (rec.StageName === "Activated" && rec.AccountId) activatedAccountIds.add(rec.AccountId);
}
const mops = buildMopsSection(mopsCasesData, mopsOnboardingData, activatedAccountIds);

const now = new Date().toISOString();
// Dynamic current ISO week (Europe/Bucharest) — was hardcoded to a June-11
// (W24) date, which froze the tracked range at W24 and hid W25 once the
// calendar advanced. weekKey() already resolves the Bucharest ISO week.
const currentWeekKey = weekKey(new Date());
const currentWeekNum = Number(weekLabel(currentWeekKey).replace(/^W/, ""));

/** Monday–Sunday range for an ISO week, formatted like "16–22 Jun 2026" (Europe/Bucharest). */
function isoWeekRangeLabel(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4.getUTCDay() || 7) + 1);
  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  start.setUTCHours(12, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const fmt = (d, opts) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", ...opts }).format(d);
  const startDay = fmt(start, { day: "numeric" });
  const endDay = fmt(end, { day: "numeric" });
  const startMonth = fmt(start, { month: "short" });
  const endMonth = fmt(end, { month: "short" });
  const endYear = fmt(end, { year: "numeric" });
  return startMonth === endMonth
    ? `${startDay}–${endDay} ${endMonth} ${endYear}`
    : `${startDay} ${startMonth} – ${endDay} ${endMonth} ${endYear}`;
}
const currentWeekYear = Number(currentWeekKey.slice(0, 4));
const currentWeekLabelText = `${weekLabel(currentWeekKey)} · ${isoWeekRangeLabel(currentWeekYear, currentWeekNum)}`;

// Weekly status breakdown:
//  - Qualified / Negotiations / Active: OpportunityFieldHistory (first INTO stage).
//  - Closed Won: canonical Won definition (Won_Date__c, Sales Opportunity) bucketed
//    by ISO week of Won_Date__c — same rule as MTD Won, NOT field-history transitions.
const weeklyBreakdownStore = initWeeklyBreakdownStore(currentWeekNum);
accumulateWeeklyStatusFromHistory(
  stageHistoryData.records,
  weeklyBreakdownStore,
  agentSegment,
  isExcludedAgent,
);
accumulateWeeklyClosedWonFromWonDate(
  wonYtdByDateData.records,
  weeklyBreakdownStore,
  agentSegment,
  isExcludedAgent,
);
accumulateNewOpportunityFallback(
  weeklyData.records,
  weeklyBreakdownStore,
  agentSegment,
  isExcludedAgent,
);
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

// Snapshot from live stage counts (Romania Sales Opportunity), derived from the
// SF GROUP BY StageName export (scripts/.cache/sf-pipeline-stage-counts.json):
//   SELECT StageName, COUNT(Id) cnt FROM Opportunity
//   WHERE RecordType.Name = 'Sales Opportunity' AND <RO filter> GROUP BY StageName
// Was a hardcoded literal map; now refreshed from Salesforce on every data pull.
const stageCountsExport =
  process.env.SF_STAGE_COUNTS_EXPORT ?? join(root, "scripts/.cache/sf-pipeline-stage-counts.json");
function loadStageCounts(path) {
  if (!existsSync(path)) {
    throw new Error(
      `[build-dashboard-data] missing stage-counts export ${path}. ` +
        "Refresh it via the Salesforce MCP (GROUP BY StageName) before building.",
    );
  }
  const payload = parseSfJson(path);
  const counts = {};
  for (const rec of payload.records ?? []) {
    const stage = rec.StageName;
    if (!stage) continue;
    // Aggregate alias may be cnt / expr0 / COUNT(Id); fall back to any numeric field.
    const value =
      rec.cnt ??
      rec.expr0 ??
      rec["COUNT(Id)"] ??
      Object.values(rec).find((v) => typeof v === "number");
    counts[stage] = Number(value) || 0;
  }
  return counts;
}
const snapshotCounts = loadStageCounts(stageCountsExport);

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

/** MTD won = Won_Date__c (SF dashboard); activated = field history (Europe/Bucharest). */
const mtdMonthKey = currentMonthKey();
const mtdMonthLabel = new Date().toLocaleString("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "Europe/Bucharest",
});
const mtdYear = mtdMonthKey?.slice(0, 4);

const mtdMonthAgents = mtdAgentsForMonth(mtdHistoryStore, mtdMonthKey);
for (const mtdAgent of mtdMonthAgents.values()) {
  const agent = upsertAgent({
    OwnerId: mtdAgent.ownerId,
    Owner: { Name: mtdAgent.name },
  });
  agent.wonMtd = mtdAgent.wonMtd;
  agent.activatedMtd = mtdAgent.activatedMtd;
}

for (const opp of mergedWonRecords) {
  const agent = upsertAgent(opp);
  const closed = opp.CloseDate ? new Date(`${opp.CloseDate}T12:00:00Z`) : null;
  if (opp.StageName === "Activated" && closed?.getFullYear() === Number(mtdYear)) {
    agent.wonYtd += 1;
  }
}

const agents = filterTeamAgents(
  [...agentMap.values()].filter(
    (a) =>
      a.name !== "Administrator" &&
      !isExcludedAgent(a.name, a.ownerId) &&
      (a.pipelineCount > 0 || a.wonMtd > 0 || a.activatedMtd > 0),
  ),
).sort((a, b) => b.pipelineCount - a.pipelineCount);

// Leads / Qualified MTD derived from SF exports (Europe/Bucharest month) — was hardcoded.
const leadsMtd = countMtdLeads(weeklyData.records, agentSegment, isExcludedAgent, mtdMonthKey);
const qualifiedMtd = countMtdQualified(
  stageHistoryData.records,
  agentSegment,
  isExcludedAgent,
  mtdMonthKey,
);
const mtdAchievement = buildMtdAchievement(agents, mtdMonthLabel, { leadsMtd, qualifiedMtd });

// Pipeline accounts by stage
const pipelineAccounts = (pipelineData.records ?? []).map((o) => mapAccount(o, "backlog"));
const wonAccounts = mergedWonRecords
  .filter((o) => o.StageName === "Activated")
  .slice(0, 50)
  .map((o) => mapAccount(o, "activated"));
const recentWon = mergedWonRecords
  .filter((o) => o.StageName !== "Activated")
  .slice(0, 20)
  .map((o) => mapAccount(o, "won"));

const accountsByStage = {};
for (const acc of [...pipelineAccounts, ...wonAccounts, ...recentWon]) {
  const st = acc.stage;
  if (!accountsByStage[st]) accountsByStage[st] = [];
  if (!accountsByStage[st].find((x) => x.id === acc.id)) accountsByStage[st].push(acc);
}

// YTD totals derived from the canonical MTD store (was hardcoded 1426/1426,
// which violated Won≠Activated). Won = Σ per-month Won_Date counts for the
// current year; Activated = Σ per-month field-history Activated counts.
// previousValue = cumulative through the END of the prior month, so the trend
// reflects this (partial) month's contribution. Both are team-rep scoped.
function ytdTotalsFromStore(store, year) {
  let won = 0;
  let activated = 0;
  let wonThisMonth = 0;
  let activatedThisMonth = 0;
  const yearPrefix = `${year}-`;
  for (const [monthKey, monthAgents] of store) {
    if (!monthKey.startsWith(yearPrefix)) continue;
    let monthWon = 0;
    let monthActivated = 0;
    for (const agent of monthAgents.values()) {
      if (agentSegment(agent.name, agent.ownerId) && !isExcludedAgent(agent.name, agent.ownerId)) {
        monthWon += agent.wonMtd ?? 0;
        monthActivated += agent.activatedMtd ?? 0;
      }
    }
    won += monthWon;
    activated += monthActivated;
    if (monthKey === mtdMonthKey) {
      wonThisMonth = monthWon;
      activatedThisMonth = monthActivated;
    }
  }
  return {
    won,
    activated,
    wonPrev: won - wonThisMonth,
    activatedPrev: activated - activatedThisMonth,
  };
}
const ytdTotals = ytdTotalsFromStore(mtdHistoryStore, Number(mtdYear));
const wonYtd = ytdTotals.won;
const activatedYtd = ytdTotals.activated;
const wonYtdPrev = ytdTotals.wonPrev;
const activatedYtdPrev = ytdTotals.activatedPrev;

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
      weekLabel: currentWeekLabelText,
      currentWeek: weekLabel(currentWeekKey),
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
    mtdHistory,
    accountsByStage,
    accounts: {
      won: recentWon.slice(0, 20),
      activated: wonAccounts.slice(0, 50),
      backlog: pipelineAccounts.filter((a) => a.status === "backlog").slice(0, 100),
      all: [...pipelineAccounts, ...wonAccounts].slice(0, 500),
    },
  },
  mops,
  settings: {
    timezone: "Europe/Bucharest",
    locale: "en-GB",
    integrations: [
      { name: "Salesforce", status: "connected", lastSync: now, icon: "cloud" },
      { name: "Google Sheet (Hitlist)", status: "connected", lastSync: now, icon: "table_chart" },
      { name: "Boltable Deploy", status: "connected", lastSync: now, icon: "deployed_code" },
      { name: "MOps Dashboard (SF)", status: "connected", lastSync: now, icon: "dashboard" },
    ],
  },
};

const slimmed = slimDashboardRawData(dashboard);

// Merge-preserve: build-dashboard-data only owns the Overview/MTD/Weekly/WoW/MOPS
// sections. The myPipeline, accountsPerformance, and inboundTeam sections are
// produced by their own builders (run after this one by scripts/build-all-data.mjs).
// Carry forward any existing copies so a *standalone* run of this script never
// wipes those tabs — the orchestrator then refreshes them in place.
const dashboardPath = join(root, "data/dashboard.json");
if (existsSync(dashboardPath)) {
  try {
    const prev = parseSfJson(dashboardPath);
    if (prev.accountsPerformance) slimmed.accountsPerformance = prev.accountsPerformance;
    if (prev.inboundTeam) slimmed.inboundTeam = prev.inboundTeam;
    if (prev.salesPipeline?.myPipeline) {
      slimmed.salesPipeline.myPipeline = prev.salesPipeline.myPipeline;
    }
  } catch {
    // Corrupt/old file — proceed with a clean write; the orchestrator rebuilds the rest.
  }
}

writeFileSync(dashboardPath, `${JSON.stringify(slimmed, null, 2)}\n`);
console.log("Wrote data/dashboard.json", {
  agents: agents.length,
  history: history.length,
  totals: { wonYtd, activatedYtd },
  leadsMtd,
  qualifiedMtd,
  mtdHistoryMonths: mtdHistory.map((m) => `${m.monthKey}:${m.mtdAchievement.actualWon}/${m.mtdAchievement.actualActivated}`).join(", "),
  weeks: history.map((h) => h.week).join(", "),
});
