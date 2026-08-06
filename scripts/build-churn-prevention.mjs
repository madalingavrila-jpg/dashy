#!/usr/bin/env node
/**
 * Build the `churnPrevention` section of data/dashboard.json.
 *
 * Sources:
 *   scripts/.cache/accounts-perf-accounts.json       — YTD RO activation universe (Databricks)
 *   scripts/.cache/accounts-perf-prov-opp.json       — provider → opportunity map
 *   scripts/.cache/accounts-perf-monthly.json        — monthly delivered orders (post-activation signal)
 *   scripts/.cache/churn-prevention-sf-status.json   — Salesforce Account.Status__c etc.
 *
 * Keeps only Complex + Density roster owners (lib/agent-segments.mjs).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isTeamAgent, agentSegment, ownerIdForName } from "../lib/agent-segments.mjs";
import { readMcpResult } from "../lib/accounts-performance-build.mjs";
import {
  assembleChurnAccount,
  buildMonthlyOrdersByProvider,
  buildOppByProvider,
  buildSfStatusByProvider,
  ordersSinceActivationMonth,
  rollupChurnTotals,
} from "../lib/churn-prevention-build.mjs";
import { currentTrackingYear } from "../lib/weekly-stages-build.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const cacheDir = path.join(here, ".cache");
const dashboardPath = path.join(root, "data", "dashboard.json");

function main() {
  const year = currentTrackingYear();
  const accountRows = readMcpResult(cacheDir, "accounts-perf-accounts.json");
  const oppRows = readMcpResult(cacheDir, "accounts-perf-prov-opp.json");
  const oppByProvider = buildOppByProvider(oppRows);

  let monthlyByProvider = new Map();
  try {
    const monthlyRows = readMcpResult(cacheDir, "accounts-perf-monthly.json");
    monthlyByProvider = buildMonthlyOrdersByProvider(monthlyRows);
  } catch {
    console.warn(
      "[build-churn-prevention] no accounts-perf-monthly.json — hasOrder falls back to first_order_date only.",
    );
  }

  let sfRows = [];
  try {
    sfRows = readMcpResult(cacheDir, "churn-prevention-sf-status.json");
  } catch {
    console.warn(
      "[build-churn-prevention] no churn-prevention-sf-status.json — SF status will be null. " +
        "Run: node scripts/gen-churn-prevention-queries.mjs then pull via Salesforce MCP.",
    );
  }
  const sfByProvider = buildSfStatusByProvider(sfRows);

  const accounts = [];
  let skippedNonRoster = 0;
  let missingSf = 0;

  for (const row of accountRows) {
    const ownerName = row[1];
    if (!ownerName || !isTeamAgent(ownerName)) {
      skippedNonRoster += 1;
      continue;
    }
    const agentId = ownerIdForName(ownerName);
    const segment = agentSegment(ownerName);
    if (!agentId || !segment || segment === "inbound") {
      skippedNonRoster += 1;
      continue;
    }

    const providerId = String(row[0]);
    const sf = sfByProvider.get(providerId) ?? null;
    if (!sf) missingSf += 1;

    const activatedDate = row[3] != null ? String(row[3]).slice(0, 10) : null;
    const ordersAfterActivation = ordersSinceActivationMonth(
      monthlyByProvider,
      providerId,
      activatedDate,
    );

    accounts.push(
      assembleChurnAccount(row, {
        agentId,
        agentName: ownerName,
        segment,
        sf,
        opportunityId: oppByProvider.get(providerId) ?? null,
        ordersAfterActivation,
      }),
    );
  }

  // Problem accounts first, then never-ordered, then by activated date desc.
  accounts.sort((a, b) => {
    if (a.problemStatus !== b.problemStatus) return a.problemStatus ? -1 : 1;
    if (a.neverOrdered !== b.neverOrdered) return a.neverOrdered ? -1 : 1;
    return String(b.activatedDate ?? "").localeCompare(String(a.activatedDate ?? ""));
  });

  const agentMap = new Map();
  for (const account of accounts) {
    if (!agentMap.has(account.agentId)) {
      agentMap.set(account.agentId, {
        agentId: account.agentId,
        name: account.agentName,
        segment: account.segment,
        accounts: 0,
        problemStatus: 0,
        neverOrdered: 0,
      });
    }
    const a = agentMap.get(account.agentId);
    a.accounts += 1;
    if (account.problemStatus) a.problemStatus += 1;
    if (account.neverOrdered) a.neverOrdered += 1;
  }
  const agents = [...agentMap.values()].sort(
    (x, y) => y.problemStatus - x.problemStatus || y.accounts - x.accounts,
  );

  const totals = rollupChurnTotals(accounts);

  const churnPrevention = {
    generatedAt: new Date().toISOString(),
    year,
    country: "Romania",
    metricsNote:
      "YTD Romania activations by Complex + Density reps. SF Status__c is the source of truth " +
      "for inactive (archived/inactive), hidden, and deleted; Databricks provider_status is a " +
      "platform cross-check. Never ordered = no delivered orders in any calendar month on/after " +
      "activation (fact_provider_monthly) and first_order_date is before activation (or null).",
    totals,
    agents,
    accounts,
  };

  const dashboard = JSON.parse(fs.readFileSync(dashboardPath, "utf8"));
  dashboard.churnPrevention = churnPrevention;
  fs.writeFileSync(dashboardPath, `${JSON.stringify(dashboard, null, 2)}\n`);

  console.log(
    `[build-churn-prevention] ${accounts.length} accounts across ${agents.length} reps ` +
      `(${skippedNonRoster} non-roster skipped; ${missingSf} missing SF status); ` +
      `problem=${totals.problemStatus}, neverOrdered=${totals.neverOrdered}, both=${totals.both}.`,
  );
}

main();
