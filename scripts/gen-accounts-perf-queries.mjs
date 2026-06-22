#!/usr/bin/env node
/**
 * Generate the SCOPED Databricks queries for the accounts-performance caches
 * (`accounts-perf-monthly.json` + `accounts-perf-quality.json`).
 *
 * ## Why this exists (the 10k-truncation bug)
 * `fact_provider_monthly` is huge. A naive `... ORDER BY provider_id` pull is
 * silently capped by the MCP at **10,000 rows**, so only the lowest provider_ids
 * survive (max ~198841) — every account activated later (provider_id up the the
 * 1,000,000s, e.g. Chernomorka 1012623) drops out and shows €0 GMV / 0 orders.
 * 542 of 825 activated accounts were missing before this fix.
 *
 * ## The fix
 * Scope BOTH queries to exactly the activated providers we already have in
 * `accounts-perf-accounts.json` with `WHERE provider_id IN (<ids>)` over the
 * Jan–Jun 2026 window. 825 providers × 6 months ≈ 5,000 rows — comfortably under
 * the 10k cap and never truncated. If the IN-list ever grows past what one MCP
 * call can take, pass `--chunk=<n>` to split it into batches (concatenate the
 * results into one cache file).
 *
 * ## Usage
 *   node scripts/gen-accounts-perf-queries.mjs            # print both queries
 *   node scripts/gen-accounts-perf-queries.mjs --kind=monthly
 *   node scripts/gen-accounts-perf-queries.mjs --kind=quality
 *   node scripts/gen-accounts-perf-queries.mjs --chunk=300 # batched IN-lists
 *
 * The agent runs each printed query through the Databricks MCP
 * (`user-mcp-databricks-bolt` → `execute_query`) and writes the JSON result to
 * the matching cache file. Column order MUST stay aligned with what
 * lib/accounts-performance-build.mjs reads — do not reorder/rename columns.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const cacheDir = path.join(here, ".cache");

const WINDOW_START = "2026-01-01";
const WINDOW_END = "2026-07-01"; // exclusive upper bound

/** Distinct activated provider_ids from the accounts cache (the 825 universe). */
export function readActivatedProviderIds() {
  const file = path.join(cacheDir, "accounts-perf-accounts.json");
  const raw = fs.readFileSync(file, "utf8");
  const parsed = JSON.parse(raw.slice(raw.indexOf("{")));
  const rows = parsed.data ?? [];
  return [...new Set(rows.map((r) => String(r[0])))];
}

/**
 * Monthly GROSS GMV / orders / commission (+ net GMV & discount context) per
 * provider/month. Columns (order matters — see buildMonthlyByProvider):
 *   [provider_id, month, gmv_before_discounts, orders, commission,
 *    gmv_after_discounts, campaign_discount]
 */
export function monthlyQuery(ids) {
  return (
    "SELECT provider_id, " +
    "date_format(metric_timestamp_partition,'yyyy-MM') AS m, " +
    "ROUND(SUM(total_gmv_before_discounts_eur),2) AS gmv_before, " +
    "CAST(SUM(delivered_orders_count) AS INT) AS orders, " +
    "ROUND(SUM(total_provider_commission_eur),2) AS commission, " +
    "ROUND(SUM(total_gmv_after_discounts_eur),2) AS gmv_after, " +
    "ROUND(SUM(total_campaign_discount_eur),2) AS discount " +
    "FROM main.ng_delivery.fact_provider_monthly " +
    `WHERE provider_id IN (${ids.join(",")}) ` +
    `AND metric_timestamp_partition >= '${WINDOW_START}' ` +
    `AND metric_timestamp_partition < '${WINDOW_END}' ` +
    "GROUP BY 1,2 ORDER BY 1,2"
  );
}

/**
 * Monthly availability & performance value/weight pairs per provider/month.
 * Columns (order matters — see buildQualityByProvider):
 *   [provider_id, month, orders,
 *    avail_v, avail_w, acc_v, acc_w, rej_v, rej_w,
 *    prep_v, prep_w, rat_v, rat_w, late_v, late_w]
 */
export function qualityQuery(ids) {
  return (
    "SELECT provider_id, " +
    "date_format(metric_timestamp_partition,'yyyy-MM') AS month, " +
    "delivered_orders_count AS orders, " +
    "provider_active_rate_value AS avail_v, provider_active_rate_weight AS avail_w, " +
    "provider_acceptance_rate_value AS acc_v, provider_acceptance_rate_weight AS acc_w, " +
    "provider_rejected_order_rate_value AS rej_v, provider_rejected_order_rate_weight AS rej_w, " +
    "provider_preparation_minutes_per_order_value AS prep_v, provider_preparation_minutes_per_order_weight AS prep_w, " +
    "provider_rating_per_order_value AS rat_v, provider_rating_per_order_weight AS rat_w, " +
    "late_delivery_order_rate_value AS late_v, late_delivery_order_rate_weight AS late_w " +
    "FROM main.ng_delivery.fact_provider_monthly " +
    `WHERE provider_id IN (${ids.join(",")}) ` +
    `AND metric_timestamp_partition >= '${WINDOW_START}' ` +
    `AND metric_timestamp_partition < '${WINDOW_END}' ` +
    "ORDER BY provider_id, month"
  );
}

/** Split an array into chunks of at most `size` (size<=0 → one chunk). */
export function chunk(arr, size) {
  if (!size || size <= 0 || size >= arr.length) return [arr];
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, "").split("=");
      return [k, v ?? true];
    }),
  );
  const ids = readActivatedProviderIds();
  const size = Number(args.chunk) || 0;
  const batches = chunk(ids, size);
  const kinds = args.kind ? [args.kind] : ["monthly", "quality"];

  console.error(
    `[gen-accounts-perf-queries] ${ids.length} activated providers, ` +
      `${batches.length} batch(es)${size ? ` of ≤${size}` : ""}.`,
  );

  for (const kind of kinds) {
    const build = kind === "monthly" ? monthlyQuery : qualityQuery;
    batches.forEach((batch, i) => {
      const tag = batches.length > 1 ? ` [${kind} batch ${i + 1}/${batches.length}]` : ` [${kind}]`;
      console.log(`-- ${tag}`);
      console.log(build(batch));
      console.log("");
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
