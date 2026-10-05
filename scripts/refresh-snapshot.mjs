#!/usr/bin/env node
/**
 * Print the Slack snapshot that accompanies the standing "data refresh is done"
 * DM to Bianca (see .cursor/rules/slack-notifications.mdc). Reads the freshly
 * built data/dashboard.json so the numbers always match what is live.
 *
 *   node scripts/refresh-snapshot.mjs            # full message (greeting + snapshot)
 *   node scripts/refresh-snapshot.mjs --snapshot # snapshot block only
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const dashboard = JSON.parse(fs.readFileSync(path.join(root, "data", "dashboard.json"), "utf8"));

// Targets are deliberately omitted: data/dashboard.json carries segment defaults
// only, while the live site applies data/target-config.json overrides at runtime.
const n = (v) => Number(v ?? 0).toLocaleString("en-US");
const eur = (v) => `€${n(Math.round(Number(v ?? 0)))}`;

const sp = dashboard.salesPipeline ?? {};
const totals = sp.totals ?? {};
const mtd = sp.mtdAchievement ?? {};
const history = sp.mtdHistory ?? [];
const prior = history[1]?.mtdAchievement;
const priorLabel = history[1]?.monthLabel;
const weekly = sp.weeklyPerformance ?? {};
const inbound = dashboard.inboundTeam?.totals ?? {};
const perf = dashboard.accountsPerformance?.totals ?? {};
const churn = dashboard.churnPrevention?.totals ?? {};
const mp = sp.myPipeline?.totals ?? {};
const mopsMetric = (id) => (dashboard.mops?.metrics ?? []).find((m) => m.id === id)?.value;

const lines = [
  `*YTD:* Won ${n(totals.won?.value)} · Activated ${n(totals.activated?.value)}`,
  `*${mtd.month} MTD (team):* Won ${n(mtd.actualWon)} · Activated ${n(mtd.actualActivated)} · Leads ${n(mtd.leadsMtd)} · Qualified ${n(mtd.qualifiedMtd)}`,
];
if (prior) {
  lines.push(`*${priorLabel} (closed):* Won ${n(prior.actualWon)} · Activated ${n(prior.actualActivated)}`);
}
lines.push(
  `*Inbound MTD:* Won ${n(inbound.wonMtd)} · Activated ${n(inbound.activatedMtd)}`,
  `*Week ${weekly.currentWeek}:* ${(weekly.metrics ?? []).map((m) => `${m.label} ${n(m.value)}`).join(" · ")}`,
  `*Accounts performance:* ${n(perf.accounts)} roster accounts · GMV ${eur(perf.gmv)} · ${n(perf.orders)} orders`,
  `*Churn watch:* ${n(churn.problemStatus)} problem status · ${n(churn.neverOrdered)} never ordered`,
  `*MOPS:* ${n(mopsMetric("open-cases"))} open cases (${n(mopsMetric("open-new-onboarding"))} onboarding) · ${n(mopsMetric("ready-to-activate"))} ready to activate`,
  `*My Pipeline:* ${n(mp.opportunities)} open opps · ${n(mp.leads)} open leads`,
);

const snapshot = lines.join("\n");
const full = [
  `Hi Bianca — dashy data refresh is done ✅ Latest SF + Databricks data is live on dashy.boltable.eu (updated ${dashboard.updatedAt}). Please check the data when you get a chance.`,
  "",
  "*Snapshot of this update*",
  snapshot,
].join("\n");

process.stdout.write((process.argv.includes("--snapshot") ? snapshot : full) + "\n");
