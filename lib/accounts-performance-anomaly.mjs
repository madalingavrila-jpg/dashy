/**
 * Guard the Accounts performance / Monthly cohorts tabs against corrupted
 * Databricks provider facts.
 *
 * ## Why this exists (the August 2026 warehouse break)
 * `main.ng_delivery.fact_provider_monthly` (and `fact_provider_daily`) started
 * emitting wildly inflated GMV/orders on **2026-08-12** — e.g. a provider doing
 * ~100–160 orders/day through 11 Aug jumps to 7k–9.6k/day from the 12th. The
 * cache matches the live warehouse, so this is bad source data, not a bad pull.
 * It hit ~60% of providers, which dragged the August team total to €57M against
 * €3.7M in July and made both tabs unusable.
 *
 * ## What we do about it
 * Two layers, heuristic first so it self-heals once Databricks is fixed:
 *
 * 1. **Detect** corrupt months from the monthly rows alone: compare each month's
 *    delivered orders against the last CLEAN month over the providers present in
 *    BOTH months (a matched set — raw totals grow just because the activated
 *    universe grows). Healthy months land at 0.86–1.70× (Jan→Jul 2026); August
 *    lands at 14.4×, so `MONTH_JUMP_FACTOR` separates them with a wide margin in
 *    both directions. No provider is hardcoded and nothing triggers once the
 *    source is repaired.
 * 2. **Repair or suppress.** When a daily cache is available we rebuild the month
 *    from its clean days only (per provider: drop days whose orders explode
 *    against the median of that provider's earlier accepted days, falling back to
 *    the documented `KNOWN_WAREHOUSE_BREAK` cut-off when a provider has too few
 *    days to form a baseline) — the month stays, marked `partial`. With no daily
 *    cache we drop the month's GMV/orders/commission entirely rather than publish
 *    a fake number; account counts, launch dates and every other tab are untouched.
 *
 * Quality metrics are order-weighted off the same corrupt `fact_provider_monthly`
 * rows, so a flagged month's quality rows are always dropped — including in the
 * `partial` case, where the value/weight pairs are monthly-only and cannot be
 * rebuilt from daily data.
 *
 * Closed, healthy months are never touched: a month is only ever flagged by the
 * jump test, so Jan–Jul aggregates stay bit-identical.
 */

/**
 * TEMPORARY — the first corrupt day of the known Databricks warehouse break.
 * Only used as a fallback inside the daily repair, for providers with too few
 * days in the month to build their own baseline. Delete this constant (and the
 * fallback) once `fact_provider_daily` is fixed upstream; the jump heuristic
 * above does not depend on it.
 */
export const KNOWN_WAREHOUSE_BREAK = { month: "2026-08", fromDate: "2026-08-12" };

/**
 * A month is corrupt when its matched-provider delivered orders are at least
 * this many times the last clean month's (scaled by the gap in months, so a
 * still-broken month never becomes the baseline that hides the next one).
 */
export const MONTH_JUMP_FACTOR = 3;

/** Below this many matched providers the ratio is too noisy to act on. */
export const MIN_MATCHED_PROVIDERS = 20;

/** A day is corrupt when its orders are at least this many times the baseline. */
export const DAY_JUMP_FACTOR = 15;

/** Accepted days needed before a provider's own daily median is trustworthy. */
export const MIN_BASELINE_DAYS = 5;

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function monthGap(from, to) {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

/**
 * Months whose delivered orders jump implausibly against the last clean month.
 * Row layout: [provider_id, month, gmv, orders, ...].
 */
export function detectCorruptMonths(monthlyRows) {
  const ordersByMonth = new Map();
  for (const [providerId, month, , orders] of monthlyRows) {
    if (!ordersByMonth.has(month)) ordersByMonth.set(month, new Map());
    ordersByMonth.get(month).set(String(providerId), Number(orders) || 0);
  }

  const months = [...ordersByMonth.keys()].sort();
  const corrupt = [];
  let baselineMonth = months[0] ?? null;

  for (const month of months.slice(1)) {
    const baseline = ordersByMonth.get(baselineMonth);
    const current = ordersByMonth.get(month);
    let baseSum = 0;
    let curSum = 0;
    let matched = 0;
    for (const [providerId, orders] of current) {
      const before = baseline.get(providerId);
      if (!(before > 0)) continue;
      matched += 1;
      baseSum += before;
      curSum += orders;
    }
    if (matched < MIN_MATCHED_PROVIDERS || baseSum <= 0) {
      baselineMonth = month;
      continue;
    }
    const ratio = curSum / baseSum;
    if (ratio >= MONTH_JUMP_FACTOR * monthGap(baselineMonth, month)) {
      corrupt.push({
        month,
        comparedWith: baselineMonth,
        jumpFactor: Math.round(ratio * 10) / 10,
        matchedProviders: matched,
      });
      continue; // a corrupt month never becomes the baseline
    }
    baselineMonth = month;
  }
  return corrupt;
}

/**
 * Rebuild one month's provider rows from the clean days of the daily cache.
 * Daily row layout mirrors the monthly one:
 *   [provider_id, date, gmv_before, orders, commission, gmv_after, discount]
 * Returns null when the daily cache has no rows for the month.
 */
function repairMonthFromDaily(month, dailyRows) {
  const byProvider = new Map();
  for (const row of dailyRows) {
    const date = String(row[1] ?? "").slice(0, 10);
    if (date.slice(0, 7) !== month) continue;
    const providerId = String(row[0]);
    if (!byProvider.has(providerId)) byProvider.set(providerId, []);
    byProvider.get(providerId).push({
      date,
      gmv: Number(row[2]) || 0,
      orders: Number(row[3]) || 0,
      commission: Number(row[4]) || 0,
      gmvNet: row[5] == null ? null : Number(row[5]) || 0,
      discount: row[6] == null ? null : Number(row[6]) || 0,
    });
  }
  if (!byProvider.size) return null;

  const rows = [];
  let keptDays = 0;
  let droppedDays = 0;
  let throughDate = null;

  for (const [providerId, days] of byProvider) {
    days.sort((a, b) => a.date.localeCompare(b.date));
    const kept = [];
    for (const day of days) {
      const baseline =
        kept.length >= MIN_BASELINE_DAYS ? median(kept.map((d) => d.orders)) : null;
      const corrupt =
        baseline > 0
          ? day.orders >= DAY_JUMP_FACTOR * baseline
          : month === KNOWN_WAREHOUSE_BREAK.month && day.date >= KNOWN_WAREHOUSE_BREAK.fromDate;
      if (corrupt) {
        droppedDays += 1;
        continue;
      }
      kept.push(day);
    }
    keptDays += kept.length;
    if (!kept.length) continue;
    const last = kept[kept.length - 1].date;
    if (!throughDate || last > throughDate) throughDate = last;
    const sum = (key) => kept.reduce((s, d) => s + (d[key] ?? 0), 0);
    rows.push([
      providerId,
      month,
      Math.round(sum("gmv") * 100) / 100,
      Math.round(sum("orders")),
      Math.round(sum("commission") * 100) / 100,
      Math.round(sum("gmvNet") * 100) / 100,
      Math.round(sum("discount") * 100) / 100,
    ]);
  }
  return { rows, keptDays, droppedDays, throughDate };
}

function monthLabel(month) {
  const [year, mo] = month.split("-").map(Number);
  if (!year || !mo) return month;
  return `${new Date(Date.UTC(year, mo - 1, 1)).toLocaleString("en-GB", { month: "short", timeZone: "UTC" })} ${year}`;
}

function describe(flagged) {
  const suppressed = flagged.filter((f) => f.status === "suppressed");
  const partial = flagged.filter((f) => f.status === "partial");
  const parts = [];
  if (suppressed.length) {
    parts.push(
      `${suppressed.map((f) => monthLabel(f.month)).join(", ")} GMV, orders, commission and ` +
        "quality are excluded — Databricks ng_delivery.fact_provider_monthly reported " +
        `~${suppressed.map((f) => `${f.jumpFactor}×`).join("/")} the expected volume (source anomaly). ` +
        "Account counts and launch dates are unaffected.",
    );
  }
  if (partial.length) {
    parts.push(
      `${partial
        .map((f) => `${monthLabel(f.month)} covers ${f.throughDate} only`)
        .join(", ")} — later days were dropped as a Databricks source anomaly; quality is ` +
        "excluded for those months.",
    );
  }
  return parts.join(" ");
}

/**
 * Drop (or rebuild from daily) the provider facts of any month the warehouse
 * corrupted. Returns the sanitized rows plus a `dataQuality` summary for the UI
 * (null when everything looks healthy, which is the expected steady state).
 */
export function sanitizeProviderFacts(monthlyRows, qualityRows = [], { dailyRows = [] } = {}) {
  const corrupt = detectCorruptMonths(monthlyRows);
  if (!corrupt.length) return { monthlyRows, qualityRows, dataQuality: null };

  const flagged = [];
  const replacements = new Map();
  for (const entry of corrupt) {
    const repaired = dailyRows.length ? repairMonthFromDaily(entry.month, dailyRows) : null;
    if (repaired && repaired.rows.length) {
      const { rows, ...stats } = repaired;
      replacements.set(entry.month, rows);
      flagged.push({ ...entry, status: "partial", ...stats });
    } else {
      flagged.push({ ...entry, status: "suppressed" });
    }
  }

  const flaggedMonths = new Set(flagged.map((f) => f.month));
  const sanitizedMonthly = monthlyRows.filter((row) => !flaggedMonths.has(row[1]));
  for (const rows of replacements.values()) sanitizedMonthly.push(...rows);
  sanitizedMonthly.sort((a, b) => String(a[0]).localeCompare(String(b[0])) || a[1].localeCompare(b[1]));

  return {
    monthlyRows: sanitizedMonthly,
    // Quality value/weight pairs come from the same corrupt monthly rows and have
    // no daily equivalent — drop them for every flagged month.
    qualityRows: qualityRows.filter((row) => !flaggedMonths.has(row[1])),
    dataQuality: {
      source: "databricks",
      months: flagged,
      note: describe(flagged),
    },
  };
}
