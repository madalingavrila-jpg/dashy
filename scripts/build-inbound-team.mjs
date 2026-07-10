#!/usr/bin/env node
/**
 * Build the `inboundTeam` section and merge it into data/dashboard.json.
 *
 * Inbound RO reps (Ana-Maria Preda, Catalin Corbeanu) live ONLY in the dedicated
 * "Inbound team" tab. They are deliberately kept out of the Complex/Density
 * rosters (see lib/agent-segments.mjs INBOUND_OWNER_IDS), so this build uses an
 * inbound-scoped classifier and inbound-scoped SF caches that the team builds
 * never read.
 *
 * Sources (Salesforce MCP exports, scripts/.cache/):
 *   sf-inbound-won-mtd.json              — Won_Date__c = THIS_MONTH (Sales Opportunity, 2 ids).
 *   sf-inbound-won-ytd-bydate.json       — Won_Date__c = THIS_YEAR (drives weekly Closed Won + YTD).
 *   sf-inbound-stage-history-2026-*.json — OpportunityFieldHistory StageName transitions (2 ids).
 *   sf-inbound-weekly-2026.json          — open + won/activated opps 2026 (New Opportunity leads).
 *
 * Databricks (reused from the team accounts-performance pull, which is a full RO
 * pull that already includes the inbound owners — filtered here by owner email):
 *   accounts-perf-accounts.json / accounts-perf-monthly.json / accounts-perf-quality.json
 *
 * Per person we compute: MTD won/activated (+ item lists), weekly history /
 * metrics / breakdown, WoW current-vs-prior rows, and accounts-performance
 * (totals / byMonth / accounts) using the EXACT same math as
 * build-accounts-performance.mjs. Inbound has no predefined targets — actuals only.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  INBOUND_OWNER_EMAILS,
  isInboundAgent,
} from "../lib/agent-segments.mjs";
import {
  accumulateMtdActivatedFromActivationDate,
  accumulateMtdReactivated,
  accumulateMtdWonFromWonDate,
  currentMonthKey,
  mergeWonExportRecords,
} from "../lib/mtd-history.mjs";
import {
  accumulateNewOpportunityFallback,
  accumulateWeeklyActiveFromActivationDate,
  accumulateWeeklyReactivations,
  accumulateWeeklyClosedWonFromWonDate,
  accumulateWeeklyStatusFromHistory,
  breakdownStoreToHistory,
  emptyWeeklyStatusCounts,
  initWeeklyBreakdownStore,
  weekKey,
  weekLabel,
} from "../lib/weekly-stages-build.mjs";
import {
  readMcpResult as readMcpResultFrom,
  round,
  buildMonthlyByProvider,
  buildQualityByProvider,
  buildCommissionRateByProvider,
  buildSegmentByProvider,
  assembleAccount,
  rollupByMonth,
  rollupQualityTotals,
} from "../lib/accounts-performance-build.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const cacheDir = path.join(here, ".cache");
const dashboardPath = path.join(root, "data", "dashboard.json");

const REPS = [
  { ownerId: "005Ts00000BtHpvIAF", name: "Ana-Maria Preda", email: "ana.preda@bolt.eu" },
  { ownerId: "005Qs00000OLyBRIA1", name: "Catalin Corbeanu", email: "catalin.corbeanu@aceolution.com" },
];

/** Inbound classifier for the shared MTD / weekly accumulators. */
const SEGMENT = "inbound";
const inboundClassifier = {
  segmentOf: (name, ownerId) => (isInboundAgent(name, ownerId) ? SEGMENT : null),
  isExcluded: () => false,
};
const segmentFn = inboundClassifier.segmentOf;
const isExcludedFn = inboundClassifier.isExcluded;

const WEEKLY_STATUS_KEYS = ["qualified", "negotiations", "closedWon", "active"];

function parseSfJson(file) {
  return JSON.parse(fs.readFileSync(path.join(cacheDir, file), "utf8"));
}

function recordsOf(file) {
  if (!fs.existsSync(path.join(cacheDir, file))) return [];
  const data = parseSfJson(file);
  return Array.isArray(data) ? data : (data.records ?? []);
}

// --- Load Salesforce inbound caches ---
const wonMtdRecords = recordsOf("sf-inbound-won-mtd.json");
const wonYtdRecords = recordsOf("sf-inbound-won-ytd-bydate.json");
const weeklyRecords = recordsOf("sf-inbound-weekly-2026.json");
// Prefer the merged full-year cache (built from monthly chunks by
// fetch-sf-stage-history.mjs --kind=inbound-stage-history). The legacy h1/h2
// half-year exports are only a fallback for pre-migration checkouts — reading
// both alongside the merged file would double-count every transition.
const mergedInboundHistory = recordsOf("sf-inbound-stage-history-2026.json");
const historyRecords =
  mergedInboundHistory.length > 0
    ? mergedInboundHistory
    : [
        ...recordsOf("sf-inbound-stage-history-2026-h1.json"),
        ...recordsOf("sf-inbound-stage-history-2026-h2.json"),
      ];
// Won_Date__c export is authoritative for both MTD and weekly Closed Won.
const wonRecords = mergeWonExportRecords([
  { records: wonMtdRecords },
  { records: wonYtdRecords },
]);
// Activated source of truth: Account.provider_first_active_date__c (inbound-scoped).
const activationRecords = recordsOf("sf-inbound-account-activation-2026.json");
// Reactivations: pre-tracking-year first-active accounts with a 2026 won opp
// (inbound-scoped), dated via the inbound stage-history transitions.
const reactivationRecords = recordsOf("sf-inbound-reactivation-2026.json");

// --- MTD store (per month → per owner), inbound-scoped ---
const mtdStore = new Map();
accumulateMtdActivatedFromActivationDate(activationRecords, mtdStore, inboundClassifier);
accumulateMtdReactivated(reactivationRecords, historyRecords, mtdStore, inboundClassifier);
accumulateMtdWonFromWonDate(wonRecords, mtdStore, inboundClassifier);

const monthKey = currentMonthKey();
const monthLabel = new Date().toLocaleString("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "Europe/Bucharest",
});
const monthAgents = mtdStore.get(monthKey) ?? new Map();

// --- Weekly store, inbound-scoped (add an inbound team bucket to each week) ---
const currentWeekKey = weekKey(new Date());
const currentWeekLabel = weekLabel(currentWeekKey);
const currentWeekNum = Number(currentWeekLabel.replace(/^W/, ""));

const weekStore = initWeeklyBreakdownStore(currentWeekNum);
for (const k of Object.keys(weekStore)) {
  weekStore[k].teams[SEGMENT] = emptyWeeklyStatusCounts();
}
accumulateWeeklyStatusFromHistory(historyRecords, weekStore, segmentFn, isExcludedFn);
accumulateWeeklyClosedWonFromWonDate(wonYtdRecords, weekStore, segmentFn, isExcludedFn);
accumulateWeeklyActiveFromActivationDate(activationRecords, weekStore, segmentFn, isExcludedFn);
accumulateWeeklyReactivations(reactivationRecords, historyRecords, weekStore, segmentFn, isExcludedFn);
accumulateNewOpportunityFallback(weeklyRecords, weekStore, segmentFn, isExcludedFn);
const weeklyBreakdown = breakdownStoreToHistory(weekStore);

/** Per-owner New Opportunity leads by ISO-week label (CreatedDate, 2026). */
function leadsByWeekByOwner(records) {
  const map = new Map();
  for (const rec of records ?? []) {
    if (rec.StageName !== "New Opportunity" || !rec.CreatedDate) continue;
    const ownerId = rec.OwnerId;
    if (!isInboundAgent(rec.Owner?.Name, ownerId)) continue;
    const created = new Date(rec.CreatedDate);
    if (Number.isNaN(created.getTime())) continue;
    const label = weekLabel(weekKey(created));
    if (!map.has(ownerId)) map.set(ownerId, {});
    const byWeek = map.get(ownerId);
    byWeek[label] = (byWeek[label] ?? 0) + 1;
  }
  return map;
}
const leadsMap = leadsByWeekByOwner(weeklyRecords);

function pctChange(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Weekly history + metrics + slim breakdown for one rep. */
function weeklyForRep(ownerId) {
  const leadsByWeek = leadsMap.get(ownerId) ?? {};
  const history = weeklyBreakdown.map((row) => {
    const a = row.agents[ownerId] ?? emptyWeeklyStatusCounts();
    return {
      week: row.week,
      leads: leadsByWeek[row.week] ?? 0,
      qualified: a.qualified ?? 0,
      negotiations: a.negotiations ?? 0,
      closedWon: a.closedWon ?? 0,
      active: a.active ?? 0,
    };
  });

  // Slim breakdown: keep per-week counts, but drill-down accounts only for the
  // current ISO week (mirrors the team weekly slim-at-source rule).
  const breakdown = weeklyBreakdown.map((row) => {
    const a = row.agents[ownerId];
    const counts = emptyWeeklyStatusCounts();
    for (const key of WEEKLY_STATUS_KEYS) counts[key] = a?.[key] ?? 0;
    const entry = { week: row.week, ...counts };
    if (row.week === currentWeekLabel && a?.accounts) entry.accounts = a.accounts;
    return entry;
  });

  const EMPTY_WEEK = { week: "—", leads: 0, qualified: 0, negotiations: 0, closedWon: 0, active: 0 };
  const foundIdx = history.findIndex((h) => h.week === currentWeekLabel);
  const curIdx = foundIdx >= 0 ? foundIdx : history.length - 1;
  const cur = history[curIdx] ?? { ...EMPTY_WEEK, week: currentWeekLabel };
  const prev = history[curIdx - 1] ?? EMPTY_WEEK;

  const METRICS = [
    { label: "Leads", key: "leads" },
    { label: "Qualified", key: "qualified" },
    { label: "Negotiations", key: "negotiations" },
    { label: "Closed Won", key: "closedWon" },
    { label: "Active", key: "active" },
  ];
  const metrics = METRICS.map(({ label, key }) => ({
    label,
    value: cur[key] ?? 0,
    previousValue: prev[key] ?? 0,
    changePercent: pctChange(cur[key] ?? 0, prev[key] ?? 0),
  }));

  const wow = {
    currentWeek: cur.week ?? currentWeekLabel,
    priorWeek: prev.week ?? "—",
    rows: METRICS.map(({ label, key }) => ({
      metric: label,
      current: cur[key] ?? 0,
      prior: prev[key] ?? 0,
      changePercent: pctChange(cur[key] ?? 0, prev[key] ?? 0),
    })),
  };

  return { metrics, history, breakdown, wow };
}

// --- Accounts performance (Databricks), inbound-scoped by owner email ---
// Reuses the EXACT shared math from lib/accounts-performance-build.mjs.
const readMcpResult = (file) => readMcpResultFrom(cacheDir, file);

const accountRows = readMcpResult("accounts-perf-accounts.json");
const monthlyRows = readMcpResult("accounts-perf-monthly.json");
let qualityRows = [];
try {
  qualityRows = readMcpResult("accounts-perf-quality.json");
} catch {
  console.warn("[build-inbound-team] no accounts-perf-quality.json — skipping quality metrics");
}
let commissionRows = [];
try {
  commissionRows = readMcpResult("accounts-perf-sf-commission.json");
} catch {
  console.warn("[build-inbound-team] no accounts-perf-sf-commission.json — commission will be empty");
}
let segmentRows = [];
try {
  segmentRows = readMcpResult("accounts-perf-sf-segment.json");
} catch {
  console.warn("[build-inbound-team] no accounts-perf-sf-segment.json — using Databricks segment");
}

const monthlyByProvider = buildMonthlyByProvider(monthlyRows);
const qualityByProvider = buildQualityByProvider(qualityRows);
const commissionRateByProvider = buildCommissionRateByProvider(commissionRows);
const segmentByProvider = buildSegmentByProvider(segmentRows);

// The shared accounts-perf-accounts.json cache is now YEAR-TO-DATE (it feeds the
// team's Accounts performance MOM cohorts). The inbound tab keeps its trailing
// 90-day window contract (windowDays: 90 below) by filtering rows here on the
// activation date (column 3) — so the inbound tab is unaffected by the YTD expansion.
const INBOUND_WINDOW_DAYS = 90;
const inboundCutoffMs = Date.now() - INBOUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/** Build accounts-performance accounts for one rep (by owner email). */
function accountsForOwner(email, agentId, agentName) {
  const accounts = [];
  for (const row of accountRows) {
    const ownerEmail = row[2];
    if ((ownerEmail || "").toLowerCase() !== email.toLowerCase()) continue;
    const activatedDate = row[3];
    if (activatedDate) {
      const t = Date.parse(activatedDate);
      if (!Number.isNaN(t) && t < inboundCutoffMs) continue;
    }
    accounts.push(
      assembleAccount(row, {
        agentId,
        agentName,
        segment: SEGMENT,
        monthlyByProvider,
        qualityByProvider,
        commissionRateByProvider,
        segmentByProvider,
      }),
    );
  }
  accounts.sort((a, b) => b.totalGmv - a.totalGmv);
  return accounts;
}

function accountsPerformanceForRep(accounts) {
  const byMonth = rollupByMonth(accounts);

  const totalGmv = accounts.reduce((s, a) => s + a.totalGmv, 0);
  const totalOrders = accounts.reduce((s, a) => s + a.totalOrders, 0);
  const totalCommission = accounts.reduce((s, a) => s + (a.totalCommission ?? 0), 0);
  const totalGmvNet = accounts.reduce((s, a) => s + (a.totalGmvNet ?? 0), 0);
  const totalDiscount = accounts.reduce((s, a) => s + (a.totalDiscount ?? 0), 0);

  return {
    totals: {
      accounts: accounts.length,
      gmv: totalGmv,
      gmvNet: Math.round(totalGmvNet),
      discount: Math.round(totalDiscount),
      orders: totalOrders,
      commission: totalCommission,
      aov: totalOrders > 0 ? round(totalGmv / totalOrders, 1) : 0,
      quality: rollupQualityTotals(accounts),
    },
    byMonth,
    dataMonthMax: byMonth.length ? byMonth[byMonth.length - 1].month : null,
    accounts,
  };
}

// --- Assemble per-rep payloads ---
const reps = REPS.map((rep) => {
  const mtdAgent = monthAgents.get(rep.ownerId);
  const mtd = {
    won: mtdAgent?.wonMtd ?? 0,
    activated: mtdAgent?.activatedMtd ?? 0,
    wonItems: mtdAgent?.wonItems ?? [],
    activatedItems: mtdAgent?.activatedItems ?? [],
  };
  const weekly = weeklyForRep(rep.ownerId);
  const accounts = accountsForOwner(rep.email, rep.ownerId, rep.name);
  const accountsPerformance = accountsPerformanceForRep(accounts);
  return {
    ownerId: rep.ownerId,
    name: rep.name,
    email: rep.email,
    mtd: { won: mtd.won, activated: mtd.activated, wonItems: mtd.wonItems, activatedItems: mtd.activatedItems },
    weekly: { metrics: weekly.metrics, history: weekly.history, breakdown: weekly.breakdown },
    wow: weekly.wow,
    accountsPerformance,
  };
});

const totals = {
  reps: reps.length,
  wonMtd: reps.reduce((s, r) => s + r.mtd.won, 0),
  activatedMtd: reps.reduce((s, r) => s + r.mtd.activated, 0),
  accounts90d: reps.reduce((s, r) => s + r.accountsPerformance.totals.accounts, 0),
  gmv: reps.reduce((s, r) => s + r.accountsPerformance.totals.gmv, 0),
  orders: reps.reduce((s, r) => s + r.accountsPerformance.totals.orders, 0),
  commission: reps.reduce((s, r) => s + r.accountsPerformance.totals.commission, 0),
};

const dataMonthMax = reps
  .map((r) => r.accountsPerformance.dataMonthMax)
  .filter(Boolean)
  .sort()
  .pop() ?? null;

const inboundTeam = {
  generatedAt: new Date().toISOString(),
  monthKey,
  monthLabel,
  currentWeek: currentWeekLabel,
  windowDays: 90,
  country: "Romania",
  currency: "EUR",
  dataMonthMax,
  reps,
  totals,
};

const dashboard = JSON.parse(fs.readFileSync(dashboardPath, "utf8"));
dashboard.inboundTeam = inboundTeam;
dashboard.updatedAt = inboundTeam.generatedAt;
fs.writeFileSync(dashboardPath, `${JSON.stringify(dashboard, null, 2)}\n`);

console.log("[build-inbound-team] wrote inboundTeam", {
  reps: reps.map((r) => `${r.name}: won ${r.mtd.won}, active ${r.mtd.activated}, accts90d ${r.accountsPerformance.totals.accounts}, gmv €${r.accountsPerformance.totals.gmv}`),
  totals,
  currentWeek: currentWeekLabel,
});
