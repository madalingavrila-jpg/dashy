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
  accumulateMtdActivatedFromStageHistory,
  accumulateMtdWonFromWonDate,
  currentMonthKey,
  mergeWonExportRecords,
} from "../lib/mtd-history.mjs";
import {
  accumulateNewOpportunityFallback,
  accumulateWeeklyClosedWonFromWonDate,
  accumulateWeeklyStatusFromHistory,
  breakdownStoreToHistory,
  emptyWeeklyStatusCounts,
  initWeeklyBreakdownStore,
  weekKey,
  weekLabel,
} from "../lib/weekly-stages-build.mjs";

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
const historyRecords = [
  ...recordsOf("sf-inbound-stage-history-2026-h1.json"),
  ...recordsOf("sf-inbound-stage-history-2026-h2.json"),
  ...recordsOf("sf-inbound-stage-history-2026.json"),
];
// Won_Date__c export is authoritative for both MTD and weekly Closed Won.
const wonRecords = mergeWonExportRecords([
  { records: wonMtdRecords },
  { records: wonYtdRecords },
]);

// --- MTD store (per month → per owner), inbound-scoped ---
const mtdStore = new Map();
accumulateMtdActivatedFromStageHistory(historyRecords, mtdStore, inboundClassifier);
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
// Reuses the EXACT math from scripts/build-accounts-performance.mjs.
function readMcpResult(file) {
  const raw = fs.readFileSync(path.join(cacheDir, file), "utf8");
  const start = raw.indexOf("{");
  if (start < 0) throw new Error(`No JSON object in ${file}`);
  const parsed = JSON.parse(raw.slice(start));
  return parsed.data ?? [];
}
function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}
function weightedAvg(rows, valueKey, weightKey) {
  let sv = 0;
  let sw = 0;
  for (const row of rows) {
    const v = row[valueKey];
    const w = row[weightKey];
    if (v == null || w == null) continue;
    const wn = Number(w);
    const vn = Number(v);
    if (!(wn > 0) || Number.isNaN(vn)) continue;
    sv += vn * wn;
    sw += wn;
  }
  if (sw <= 0) return null;
  return sv / sw;
}
function pct(value, digits = 1) {
  return value == null ? null : round(value * 100, digits);
}

const accountRows = readMcpResult("accounts-perf-accounts.json");
const monthlyRows = readMcpResult("accounts-perf-monthly.json");
let qualityRows = [];
try {
  qualityRows = readMcpResult("accounts-perf-quality.json");
} catch {
  console.warn("[build-inbound-team] no accounts-perf-quality.json — skipping quality metrics");
}

const monthlyByProvider = new Map();
for (const [providerId, month, gmv, orders, commission] of monthlyRows) {
  if (!monthlyByProvider.has(providerId)) monthlyByProvider.set(providerId, []);
  monthlyByProvider.get(providerId).push({
    month,
    gmv: round(gmv),
    orders: Math.round(Number(orders) || 0),
    commission: round(commission),
  });
}
const qualityByProvider = new Map();
for (const row of qualityRows) {
  const [providerId, month, orders, av, aw, cv, cw, rjv, rjw, pv, pw, rtv, rtw, ltv, ltw] = row;
  if (!qualityByProvider.has(providerId)) qualityByProvider.set(providerId, []);
  qualityByProvider.get(providerId).push({
    month,
    orders: Math.round(Number(orders) || 0),
    avail_v: av, avail_w: aw, acc_v: cv, acc_w: cw, rej_v: rjv, rej_w: rjw,
    prep_v: pv, prep_w: pw, rat_v: rtv, rat_w: rtw, late_v: ltv, late_w: ltw,
  });
}
function qualityForProvider(providerId, launchMonth) {
  const rows = (qualityByProvider.get(providerId) ?? []).filter(
    (r) => !launchMonth || r.month >= launchMonth,
  );
  if (!rows.length) return undefined;
  const availability = weightedAvg(rows, "avail_v", "avail_w");
  const acceptance = weightedAvg(rows, "acc_v", "acc_w");
  const rejection = weightedAvg(rows, "rej_v", "rej_w");
  const prep = weightedAvg(rows, "prep_v", "prep_w");
  const rating = weightedAvg(rows, "rat_v", "rat_w");
  const late = weightedAvg(rows, "late_v", "late_w");
  const refOrders = rows.reduce((s, r) => s + r.orders, 0);
  const monthsCovered = rows.filter(
    (r) => r.avail_v != null || r.acc_v != null || r.rat_v != null,
  ).length;
  const quality = {
    availabilityPct: pct(availability),
    acceptancePct: pct(acceptance),
    rejectionPct: pct(rejection, 2),
    prepMinutes: prep == null ? null : round(prep, 1),
    rating: rating == null ? null : round(rating, 2),
    lateDeliveryPct: pct(late),
    refOrders,
    monthsCovered,
  };
  const hasSignal = [
    quality.availabilityPct, quality.acceptancePct, quality.rejectionPct,
    quality.prepMinutes, quality.rating, quality.lateDeliveryPct,
  ].some((v) => v != null);
  return hasSignal ? quality : undefined;
}

/** Build accounts-performance accounts for one rep (by owner email). */
function accountsForOwner(email, agentId, agentName) {
  const accounts = [];
  for (const row of accountRows) {
    const [
      providerId, ownerName, ownerEmail, activatedDate, providerName,
      vendorName, cityName, segmentRaw, , firstOrderDate,
    ] = row;
    if ((ownerEmail || "").toLowerCase() !== email.toLowerCase()) continue;

    const launchDate = activatedDate || firstOrderDate || null;
    const launchMonth = launchDate ? launchDate.slice(0, 7) : null;
    const monthly = (monthlyByProvider.get(providerId) ?? [])
      .slice()
      .sort((a, b) => a.month.localeCompare(b.month))
      .filter((m) => !launchMonth || m.month >= launchMonth)
      .map((m) => ({
        month: m.month,
        gmv: Math.round(m.gmv),
        orders: m.orders,
        aov: m.orders > 0 ? round(m.gmv / m.orders, 1) : 0,
        commission: Math.round(m.commission),
      }));
    const totalGmv = monthly.reduce((s, m) => s + m.gmv, 0);
    const totalOrders = monthly.reduce((s, m) => s + m.orders, 0);
    const totalCommission = monthly.reduce((s, m) => s + m.commission, 0);

    accounts.push({
      id: String(providerId),
      accountName: (providerName || vendorName || `Provider ${providerId}`).trim(),
      city: (cityName || "—").trim(),
      agentId,
      agentName,
      segment: SEGMENT,
      businessSegment: segmentRaw || undefined,
      launchDate,
      monthly,
      sparkline: monthly.map((m) => ({ month: m.month, value: m.gmv })),
      totalGmv,
      totalOrders,
      totalCommission,
      aov: totalOrders > 0 ? round(totalGmv / totalOrders, 1) : 0,
      quality: qualityForProvider(providerId, launchMonth),
    });
  }
  accounts.sort((a, b) => b.totalGmv - a.totalGmv);
  return accounts;
}

function rollupQuality(list, key, digits = 1) {
  let sv = 0;
  let sw = 0;
  for (const a of list) {
    const q = a.quality;
    if (!q || q[key] == null) continue;
    const w = q.refOrders > 0 ? q.refOrders : 1;
    sv += q[key] * w;
    sw += w;
  }
  return sw > 0 ? round(sv / sw, digits) : null;
}

function accountsPerformanceForRep(accounts) {
  const byMonthMap = new Map();
  for (const account of accounts) {
    for (const m of account.monthly) {
      if (!byMonthMap.has(m.month)) {
        byMonthMap.set(m.month, { month: m.month, gmv: 0, orders: 0, commission: 0, accounts: 0 });
      }
      const bucket = byMonthMap.get(m.month);
      bucket.gmv += m.gmv;
      bucket.orders += m.orders;
      bucket.commission += m.commission;
      if (m.orders > 0 || m.gmv > 0) bucket.accounts += 1;
    }
  }
  const byMonth = [...byMonthMap.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((b) => ({
      month: b.month,
      gmv: Math.round(b.gmv),
      orders: b.orders,
      commission: Math.round(b.commission),
      aov: b.orders > 0 ? round(b.gmv / b.orders, 1) : 0,
      accounts: b.accounts,
    }));

  const totalGmv = accounts.reduce((s, a) => s + a.totalGmv, 0);
  const totalOrders = accounts.reduce((s, a) => s + a.totalOrders, 0);
  const totalCommission = accounts.reduce((s, a) => s + a.totalCommission, 0);
  const accountsWithQuality = accounts.filter((a) => a.quality);

  return {
    totals: {
      accounts: accounts.length,
      gmv: totalGmv,
      orders: totalOrders,
      commission: totalCommission,
      aov: totalOrders > 0 ? round(totalGmv / totalOrders, 1) : 0,
      quality: {
        availabilityPct: rollupQuality(accounts, "availabilityPct"),
        acceptancePct: rollupQuality(accounts, "acceptancePct"),
        rejectionPct: rollupQuality(accounts, "rejectionPct", 2),
        prepMinutes: rollupQuality(accounts, "prepMinutes"),
        rating: rollupQuality(accounts, "rating", 2),
        lateDeliveryPct: rollupQuality(accounts, "lateDeliveryPct"),
        accountsWithSignal: accountsWithQuality.length,
      },
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
