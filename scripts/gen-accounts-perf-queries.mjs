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
 * YTD window. The activation UNIVERSE is now **year-to-date** (every RO account
 * activated since Jan 1 of the current year — see the canonical universe query
 * below), so the IN-list is larger (~1,600 providers × ~6 months ≈ 6,200 rows) —
 * still comfortably under the 10k cap and never truncated. If the IN-list ever
 * grows past what one MCP call can take, pass `--chunk=<n>` to split it into
 * batches (concatenate the results into one cache file).
 *
 * ## Canonical universe + prov→opp queries (run ad hoc via the Databricks MCP)
 * The activation universe (`accounts-perf-accounts.json`) and the provider→won
 * opportunity map (`accounts-perf-prov-opp.json`) are YTD + RO-scoped and deduped
 * to one activation opportunity per provider. Re-pull both on every refresh so the
 * universe includes EVERY account activated this year (Jan, Feb, … onward):
 *
 *   -- universe (10 cols, matches build-accounts-performance row layout)
 *   SELECT po.provider_id, po.opportunity_owner_user_name, po.opportunity_owner_email,
 *          CAST(po.provider_activated_ts AS DATE) AS activated_date,
 *          pv.provider_name, pv.vendor_name, pv.city_name, pv.business_segment_v2,
 *          pv.provider_status, CAST(pv.first_delivered_order_ts AS DATE) AS first_order_date
 *   FROM main.ng_delivery.dim_provider_opportunity po
 *   LEFT JOIN main.ng_delivery.dim_provider_v2 pv ON pv.provider_id = po.provider_id
 *   WHERE po.provider_activated_ts >= '<YEAR>-01-01' AND po.country_name = 'Romania'
 *   QUALIFY ROW_NUMBER() OVER (PARTITION BY po.provider_id ORDER BY po.provider_activated_ts DESC) = 1
 *
 *   -- provider → opportunity map (same window/dedup)
 *   SELECT po.provider_id, po.opportunity_id
 *   FROM main.ng_delivery.dim_provider_opportunity po
 *   WHERE po.provider_activated_ts >= '<YEAR>-01-01' AND po.country_name = 'Romania'
 *   QUALIFY ROW_NUMBER() OVER (PARTITION BY po.provider_id ORDER BY po.provider_activated_ts DESC) = 1
 *
 * ## SF commission/segment batches (the 431 fix)
 * `--kind=sf-commission` emits the Salesforce SOQL that feeds BOTH
 * `accounts-perf-sf-commission.json` and `accounts-perf-sf-segment.json`,
 * PRE-SPLIT into batches of ≤ SF_COMMISSION_BATCH_SIZE (300) opportunity IDs.
 * The Salesforce MCP puts the SOQL in the URL query string, so large IN-lists
 * blow the server header limit: 2 batches for 1,665 providers (~830 IDs each)
 * failed with HTTP 431 on 2026-07-02. 300 IDs per query is a safe margin and
 * the batch count scales with the universe (~6 batches at current size).
 * Requires accounts-perf-prov-opp.json (batch C1) to exist.
 *
 * ## Usage
 *   node scripts/gen-accounts-perf-queries.mjs            # print all three kinds
 *   node scripts/gen-accounts-perf-queries.mjs --kind=monthly
 *   node scripts/gen-accounts-perf-queries.mjs --kind=quality
 *   node scripts/gen-accounts-perf-queries.mjs --kind=sf-commission
 *   node scripts/gen-accounts-perf-queries.mjs --chunk=300 # batched Databricks IN-lists
 *
 * The agent runs each printed query through the matching MCP (Databricks
 * `user-mcp-databricks-bolt` → `execute_query` for monthly/quality; Salesforce
 * `user-Salesforce` → `soqlQuery` for sf-commission) and writes the JSON result
 * to the matching cache file. Column order MUST stay aligned with what
 * lib/accounts-performance-build.mjs reads — do not reorder/rename columns.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const cacheDir = path.join(here, ".cache");

// Metric-month window for the fact_provider_monthly pulls: Jan 1 of the current
// year through the start of next month (exclusive). Dynamic so it never goes stale.
const now = new Date();
const WINDOW_START = `${now.getUTCFullYear()}-01-01`;
const WINDOW_END = (() => {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1; // 0-indexed → next month is +1 over the +1
  const nextYear = m === 12 ? y + 1 : y;
  const nextMonth = m === 12 ? 1 : m + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
})();

/** Distinct activated provider_ids from the accounts cache (the RO YTD universe). */
export function readActivatedProviderIds() {
  const file = path.join(cacheDir, "accounts-perf-accounts.json");
  const raw = fs.readFileSync(file, "utf8");
  const parsed = JSON.parse(raw.slice(raw.indexOf("{")));
  const rows = parsed.data ?? [];
  return [...new Set(rows.map((r) => String(r[0])))];
}

/** Distinct won opportunity IDs from the prov→opp map (feeds the SF commission/segment pull). */
export function readWonOpportunityIds() {
  const file = path.join(cacheDir, "accounts-perf-prov-opp.json");
  const raw = fs.readFileSync(file, "utf8");
  const parsed = JSON.parse(raw.slice(raw.indexOf("{")));
  const rows = parsed.data ?? [];
  return [...new Set(rows.map((r) => String(r[1])).filter((id) => id && id !== "null"))];
}

/**
 * Batch size for the SF commission/segment IN-list pulls. The Salesforce MCP
 * sends SOQL in the URL query string: ~830 quoted opportunity IDs (2 batches
 * for a 1,665-provider universe) blew past the server header limit with an
 * HTTP 431 on 2026-07-02. ~300 IDs ≈ 6.5 KB per query — comfortable margin,
 * and the batch count scales automatically as the universe grows.
 */
export const SF_COMMISSION_BATCH_SIZE = 300;

/**
 * Pre-split SF commission/segment SOQL batches (one pull feeds BOTH
 * accounts-perf-sf-commission.json and accounts-perf-sf-segment.json).
 * Returns one query string per batch of ≤ SF_COMMISSION_BATCH_SIZE IDs.
 */
export function sfCommissionQueries(oppIds) {
  return chunk(oppIds, SF_COMMISSION_BATCH_SIZE).map(
    (batch) =>
      "SELECT Id, Commission__c, Account.Account_Management_Segment__c FROM Opportunity " +
      `WHERE Id IN (${batch.map((id) => `'${id}'`).join(",")})`,
  );
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
  const kinds = args.kind ? [args.kind] : ["monthly", "quality", "sf-commission"];

  const dbKinds = kinds.filter((k) => k === "monthly" || k === "quality");
  if (dbKinds.length > 0) {
    const ids = readActivatedProviderIds();
    const size = Number(args.chunk) || 0;
    const batches = chunk(ids, size);
    console.error(
      `[gen-accounts-perf-queries] ${ids.length} activated providers, ` +
        `${batches.length} Databricks batch(es)${size ? ` of ≤${size}` : ""}.`,
    );
    for (const kind of dbKinds) {
      const build = kind === "monthly" ? monthlyQuery : qualityQuery;
      batches.forEach((batch, i) => {
        const tag = batches.length > 1 ? ` [${kind} batch ${i + 1}/${batches.length}]` : ` [${kind}]`;
        console.log(`-- ${tag}`);
        console.log(build(batch));
        console.log("");
      });
    }
  }

  if (kinds.includes("sf-commission")) {
    const oppIds = readWonOpportunityIds();
    const queries = sfCommissionQueries(oppIds);
    console.error(
      `[gen-accounts-perf-queries] ${oppIds.length} won opportunity IDs, ` +
        `${queries.length} SF commission/segment batch(es) of ≤${SF_COMMISSION_BATCH_SIZE} ` +
        "(pre-split — avoids HTTP 431 from an oversized query string).",
    );
    queries.forEach((q, i) => {
      console.log(`-- [sf-commission batch ${i + 1}/${queries.length}] — feeds accounts-perf-sf-commission.json + accounts-perf-sf-segment.json`);
      console.log(q);
      console.log("");
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
