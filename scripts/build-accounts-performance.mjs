#!/usr/bin/env node
/**
 * Build the `accountsPerformance` section of data/dashboard.json from Databricks
 * extracts cached by the Cursor agent (Boltable has no DB credentials at runtime).
 *
 * Source caches (written by the agent via the Databricks MCP):
 *   scripts/.cache/accounts-perf-accounts.json  — one row per provider activated in the
 *       last 90 days (RO, won Sales Opportunity), with the activation opportunity owner.
 *   scripts/.cache/accounts-perf-monthly.json    — monthly GMV / delivered orders /
 *       provider commission (EUR) per provider since 2026-01.
 *   scripts/.cache/accounts-perf-quality.json    — monthly availability & performance
 *       value/weight pairs per provider since 2026-01 (fact_provider_monthly).
 *
 * Databricks tables used (catalog `main`):
 *   ng_delivery.dim_provider_opportunity  — provider_id ↔ SF opportunity owner + provider_activated_ts
 *   ng_delivery.dim_provider_v2           — provider_id ↔ vendor_id, name, city, segment, first order
 *   ng_delivery.fact_provider_monthly     — monthly GMV / orders / commission (fresh: max 2026-06)
 *                                           + availability & performance value/weight columns:
 *       provider_active_rate (availability), provider_acceptance_rate, provider_rejected_order_rate,
 *       provider_preparation_minutes_per_order, provider_rating_per_order, late_delivery_order_rate.
 *
 * Attribution: rep = owner of the won Sales Opportunity whose activation transition
 * happened in the last 90 days (deduped to one opp per provider). Only the 12-rep
 * roster is kept (see lib/agent-segments.mjs); excluded reps and AM/external owners drop.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isTeamAgent, agentSegment } from "../lib/agent-segments.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const cacheDir = path.join(here, ".cache");
const dashboardPath = path.join(root, "data", "dashboard.json");

/** Roster name → Salesforce Owner ID (from AGENTS.md / lib/agent-segments). */
const ROSTER = [
  { ownerId: "005Ts0000060ICnIAM", test: (n) => /gavril|madalin/.test(n) },
  { ownerId: "005Qs00000Mxc6EIAR", test: (n) => /ringheanu|r\u00eengheanu|\bpaul\b/.test(n) && !/patru|patr(u|a)/.test(n) },
  { ownerId: "005Ts000005c4hFIAQ", test: (n) => /corneliu/.test(n) && /(stefan|tefan)/.test(n) && /radu/.test(n) },
  { ownerId: "005Qs00000Pr1HKIAZ", test: (n) => /vlad/.test(n) && /popa/.test(n) },
  { ownerId: "005Qs00000N2Hh3IAF", test: (n) => /andrei/.test(n) && /patru|patr(u|a)/.test(n) },
  { ownerId: "005Ts000002AX4nIAG", test: (n) => /teodorescu/.test(n) },
  { ownerId: "005Ts00000BtGPDIA3", test: (n) => /boboc/.test(n) },
  { ownerId: "005Ts00000BtX53IAF", test: (n) => /toltic/.test(n) },
  { ownerId: "005Ts000002AWIQIA4", test: (n) => /hanganu/.test(n) },
  { ownerId: "005Ts00000BtZV3IAN", test: (n) => /borcaeas/.test(n) },
  { ownerId: "005Ts000001Ak10IAC", test: (n) => /mihnea/.test(n) },
  { ownerId: "005Ts000006V3vpIAC", test: (n) => /oroles/.test(n) || (/rosu/.test(n) && !/borcaeas/.test(n)) },
];

function normalizeName(name) {
  return (name ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function ownerIdForName(name) {
  const n = normalizeName(name);
  const match = ROSTER.find((entry) => entry.test(n));
  return match?.ownerId;
}

/** MCP execute_query results are written as a text file with a leading status line. */
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

/**
 * Order/weight-weighted average of a value/weight series: Σ(value·weight)/Σweight.
 * Rows with null value or non-positive weight are ignored. Returns null when no
 * usable signal exists in the window.
 */
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

function main() {
  // accounts: [provider_id, owner_name, owner_email, activated_date, provider_name,
  //            vendor_name, city_name, business_segment_v2, provider_status, first_order_date]
  const accountRows = readMcpResult("accounts-perf-accounts.json");
  // monthly: [provider_id, month, gmv, orders, commission]
  const monthlyRows = readMcpResult("accounts-perf-monthly.json");

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

  // quality: [provider_id, month, orders, avail_v, avail_w, acc_v, acc_w, rej_v,
  //           rej_w, prep_v, prep_w, rat_v, rat_w, late_v, late_w]
  const qualityByProvider = new Map();
  let qualityRows = [];
  try {
    qualityRows = readMcpResult("accounts-perf-quality.json");
  } catch {
    console.warn("[build-accounts-performance] no accounts-perf-quality.json cache — skipping quality metrics");
  }
  for (const row of qualityRows) {
    const [providerId, month, orders, av, aw, cv, cw, rjv, rjw, pv, pw, rtv, rtw, ltv, ltw] = row;
    if (!qualityByProvider.has(providerId)) qualityByProvider.set(providerId, []);
    qualityByProvider.get(providerId).push({
      month,
      orders: Math.round(Number(orders) || 0),
      avail_v: av,
      avail_w: aw,
      acc_v: cv,
      acc_w: cw,
      rej_v: rjv,
      rej_w: rjw,
      prep_v: pv,
      prep_w: pw,
      rat_v: rtv,
      rat_w: rtw,
      late_v: ltv,
      late_w: ltw,
    });
  }

  /** Build the launch→date weighted quality summary for one provider. */
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
      quality.availabilityPct,
      quality.acceptancePct,
      quality.rejectionPct,
      quality.prepMinutes,
      quality.rating,
      quality.lateDeliveryPct,
    ].some((v) => v != null);
    return hasSignal ? quality : undefined;
  }

  const accounts = [];
  let skippedNonRoster = 0;

  for (const row of accountRows) {
    const [
      providerId,
      ownerName,
      ,
      activatedDate,
      providerName,
      vendorName,
      cityName,
      segmentRaw,
      ,
      firstOrderDate,
    ] = row;

    if (!ownerName || !isTeamAgent(ownerName)) {
      skippedNonRoster += 1;
      continue;
    }
    const agentId = ownerIdForName(ownerName);
    const segment = agentSegment(ownerName);
    if (!agentId || !segment) {
      skippedNonRoster += 1;
      continue;
    }

    const launchDate = activatedDate || firstOrderDate || null;
    // "Launch to date": drop months strictly before the launch month so the
    // sparkline starts at activation (Databricks may emit zero rows earlier).
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
      agentName: ownerName,
      segment,
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

  // Team totals by month (across kept accounts).
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

  // Per-agent summary (drives the filter dropdown + headline numbers).
  const agentMap = new Map();
  for (const account of accounts) {
    if (!agentMap.has(account.agentId)) {
      agentMap.set(account.agentId, {
        agentId: account.agentId,
        name: account.agentName,
        segment: account.segment,
        accounts: 0,
        gmv: 0,
        orders: 0,
        commission: 0,
      });
    }
    const a = agentMap.get(account.agentId);
    a.accounts += 1;
    a.gmv += account.totalGmv;
    a.orders += account.totalOrders;
    a.commission += account.totalCommission;
  }
  const agents = [...agentMap.values()]
    .map((a) => ({ ...a, gmv: Math.round(a.gmv), commission: Math.round(a.commission) }))
    .sort((a, b) => b.gmv - a.gmv);

  const totalGmv = accounts.reduce((s, a) => s + a.totalGmv, 0);
  const totalOrders = accounts.reduce((s, a) => s + a.totalOrders, 0);
  const totalCommission = accounts.reduce((s, a) => s + a.totalCommission, 0);

  // Team quality roll-up: each account's launch→date metric weighted by its
  // delivered orders in the window (availability uses the same weight as a proxy).
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
  const accountsWithQuality = accounts.filter((a) => a.quality);
  const qualityTotals = {
    availabilityPct: rollupQuality(accounts, "availabilityPct"),
    acceptancePct: rollupQuality(accounts, "acceptancePct"),
    rejectionPct: rollupQuality(accounts, "rejectionPct", 2),
    prepMinutes: rollupQuality(accounts, "prepMinutes"),
    rating: rollupQuality(accounts, "rating", 2),
    lateDeliveryPct: rollupQuality(accounts, "lateDeliveryPct"),
    accountsWithSignal: accountsWithQuality.length,
  };

  const monthsCovered = byMonth.map((m) => m.month);
  const accountsPerformance = {
    generatedAt: new Date().toISOString(),
    windowDays: 90,
    country: "Romania",
    currency: "EUR",
    dataMonthMax: monthsCovered.length ? monthsCovered[monthsCovered.length - 1] : null,
    metricsNote:
      "GMV before discounts, delivered orders, and provider commission (EUR) from Bolt Food " +
      "(Databricks fact_provider_monthly). Accounts = restaurants activated in the last 90 days " +
      "(SF won Sales Opportunity → provider activation), attributed to the activating rep.",
    qualityPeriod: "Launch → date (order-weighted average across each account's active months)",
    qualityNote:
      "Availability = share of open hours the restaurant was active (provider_active_rate). " +
      "Acceptance / rejection = order acceptance & rejection rate. Prep = minutes to prepare an " +
      "order. Rating = average customer rating (out of 5). Late = delivery-late order rate. " +
      "Source: Databricks ng_delivery.fact_provider_monthly value/weight columns, weighted by " +
      "each metric's own denominator (orders, rated orders, or active minutes) over the same " +
      "launch→date months as GMV.",
    totals: {
      accounts: accounts.length,
      gmv: totalGmv,
      orders: totalOrders,
      commission: totalCommission,
      aov: totalOrders > 0 ? round(totalGmv / totalOrders, 1) : 0,
      quality: qualityTotals,
    },
    byMonth,
    agents,
    accounts,
  };

  const dashboard = JSON.parse(fs.readFileSync(dashboardPath, "utf8"));
  dashboard.accountsPerformance = accountsPerformance;
  fs.writeFileSync(dashboardPath, `${JSON.stringify(dashboard, null, 2)}\n`);

  console.log(
    `[build-accounts-performance] ${accounts.length} accounts across ${agents.length} reps ` +
      `(${skippedNonRoster} non-roster rows skipped); months ${monthsCovered.join(", ")}; ` +
      `GMV €${totalGmv.toLocaleString("en-IE")}.`,
  );
}

main();
