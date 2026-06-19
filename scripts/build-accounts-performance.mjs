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
import { isTeamAgent, agentSegment, ownerIdForName } from "../lib/agent-segments.mjs";
import {
  readMcpResult as readMcpResultFrom,
  round,
  buildMonthlyByProvider,
  buildQualityByProvider,
  assembleAccount,
  rollupByMonth,
  rollupQualityTotals,
} from "../lib/accounts-performance-build.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const cacheDir = path.join(here, ".cache");
const dashboardPath = path.join(root, "data", "dashboard.json");

const readMcpResult = (file) => readMcpResultFrom(cacheDir, file);

function main() {
  // accounts: [provider_id, owner_name, owner_email, activated_date, provider_name,
  //            vendor_name, city_name, business_segment_v2, provider_status, first_order_date]
  const accountRows = readMcpResult("accounts-perf-accounts.json");
  // monthly: [provider_id, month, gmv, orders, commission]
  const monthlyRows = readMcpResult("accounts-perf-monthly.json");

  const monthlyByProvider = buildMonthlyByProvider(monthlyRows);

  // quality: [provider_id, month, orders, avail_v, avail_w, acc_v, acc_w, rej_v,
  //           rej_w, prep_v, prep_w, rat_v, rat_w, late_v, late_w]
  let qualityRows = [];
  try {
    qualityRows = readMcpResult("accounts-perf-quality.json");
  } catch {
    console.warn("[build-accounts-performance] no accounts-perf-quality.json cache — skipping quality metrics");
  }
  const qualityByProvider = buildQualityByProvider(qualityRows);

  const accounts = [];
  let skippedNonRoster = 0;

  for (const row of accountRows) {
    const ownerName = row[1];

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

    accounts.push(
      assembleAccount(row, {
        agentId,
        agentName: ownerName,
        segment,
        monthlyByProvider,
        qualityByProvider,
      }),
    );
  }

  accounts.sort((a, b) => b.totalGmv - a.totalGmv);

  // Team totals by month (across kept accounts).
  const byMonth = rollupByMonth(accounts);

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
  const qualityTotals = rollupQualityTotals(accounts);

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
