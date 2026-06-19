/**
 * Shared Databricks accounts-performance math, used by both
 * scripts/build-accounts-performance.mjs (team) and scripts/build-inbound-team.mjs
 * (inbound). Both builds read the same RO `accounts-perf-*.json` MCP exports and
 * assemble per-account GMV / orders / commission / quality rollups identically —
 * the only difference is how each row is attributed (roster name vs owner email)
 * and the segment label. Keep this module behavior-preserving: it is the single
 * implementation of the per-account assembly + monthly/quality rollups.
 *
 * Row layout for accounts-perf-accounts.json:
 *   [provider_id, owner_name, owner_email, activated_date, provider_name,
 *    vendor_name, city_name, business_segment_v2, provider_status, first_order_date]
 */
import fs from "node:fs";
import path from "node:path";

/** MCP execute_query results are written as a text file with a leading status line. */
export function readMcpResult(cacheDir, file) {
  const raw = fs.readFileSync(path.join(cacheDir, file), "utf8");
  const start = raw.indexOf("{");
  if (start < 0) throw new Error(`No JSON object in ${file}`);
  const parsed = JSON.parse(raw.slice(start));
  return parsed.data ?? [];
}

export function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

/**
 * Order/weight-weighted average of a value/weight series: Σ(value·weight)/Σweight.
 * Rows with null value or non-positive weight are ignored. Returns null when no
 * usable signal exists in the window.
 */
export function weightedAvg(rows, valueKey, weightKey) {
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

export function pct(value, digits = 1) {
  return value == null ? null : round(value * 100, digits);
}

/**
 * Index monthly rows by provider. Row layout (Databricks fact_provider_monthly):
 *   [provider_id, month, gmv_before_discounts, orders, commission,
 *    gmv_after_discounts?, campaign_discount?]
 * `gmv` is always GROSS (total_gmv_before_discounts_eur); `gmvNet`/`discount`
 * (columns 6/7) are optional context so the UI can prove the headline is gross.
 */
export function buildMonthlyByProvider(monthlyRows) {
  const monthlyByProvider = new Map();
  for (const [providerId, month, gmv, orders, commission, gmvNet, discount] of monthlyRows) {
    if (!monthlyByProvider.has(providerId)) monthlyByProvider.set(providerId, []);
    monthlyByProvider.get(providerId).push({
      month,
      gmv: round(gmv),
      orders: Math.round(Number(orders) || 0),
      commission: round(commission),
      gmvNet: gmvNet == null ? null : round(gmvNet),
      discount: discount == null ? null : round(discount),
    });
  }
  return monthlyByProvider;
}

/**
 * Index Salesforce commission-rate rows by provider.
 * Row: [provider_id, commission_rate_pct (Opportunity.Commission__c), opportunity_id]
 * Returns Map(provider_id → rate%) — null/absent rates are skipped.
 */
export function buildCommissionRateByProvider(rows) {
  const map = new Map();
  for (const row of rows ?? []) {
    const providerId = String(row[0]);
    const rate = row[1];
    if (rate == null) continue;
    const n = Number(rate);
    if (Number.isNaN(n)) continue;
    map.set(providerId, n);
  }
  return map;
}

/**
 * Index the Salesforce per-account segment by provider.
 * Row: [provider_id, Account.Account_Management_Segment__c, opportunity_id]
 * Returns Map(provider_id → clean segment label) — the SF picklist values are
 * "SMB (AM Segment)" / "Mid-market (AM Segment)" / "Enterprise (AM Segment)" /
 * "Others (AM Segment)"; we strip the redundant " (AM Segment)" suffix for display.
 * Null/blank values are skipped so callers fall back to the Databricks segment.
 */
export function buildSegmentByProvider(rows) {
  const map = new Map();
  for (const row of rows ?? []) {
    const providerId = String(row[0]);
    const raw = row[1];
    if (raw == null) continue;
    const clean = String(raw).replace(/\s*\(AM Segment\)\s*$/i, "").trim();
    if (!clean) continue;
    map.set(providerId, clean);
  }
  return map;
}

/**
 * Index quality rows by provider.
 * Row: [provider_id, month, orders, avail_v, avail_w, acc_v, acc_w, rej_v, rej_w,
 *       prep_v, prep_w, rat_v, rat_w, late_v, late_w]
 */
export function buildQualityByProvider(qualityRows) {
  const qualityByProvider = new Map();
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
  return qualityByProvider;
}

/** Launch→date order-weighted quality summary for one provider (undefined if no signal). */
export function qualityForProvider(qualityByProvider, providerId, launchMonth) {
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

/**
 * Assemble one account entry from an accounts-perf-accounts row + the indexed
 * monthly/quality maps. Attribution (agentId/agentName/segment) is supplied by
 * the caller; everything else (launch→date monthly series, totals, sparkline,
 * quality) is identical across builds.
 */
export function assembleAccount(
  row,
  {
    agentId,
    agentName,
    segment,
    monthlyByProvider,
    qualityByProvider,
    commissionRateByProvider,
    segmentByProvider,
  },
) {
  const [
    providerId,
    ,
    ,
    activatedDate,
    providerName,
    vendorName,
    cityName,
    segmentRaw,
    ,
    firstOrderDate,
  ] = row;

  // Per-account business segment shown under the name. The Salesforce
  // Account_Management_Segment__c (SMB / Mid-market / Enterprise / Others) is the
  // current source of truth — Databricks business_segment_v2 lags SF reclassifications
  // (e.g. Chili's moved to Enterprise in SF). Fall back to the Databricks value only
  // when SF has no segment for the provider.
  const sfSegment = segmentByProvider?.get(String(providerId)) ?? null;
  const businessSegment = sfSegment || segmentRaw || undefined;
  const businessSegmentSource = sfSegment ? "salesforce" : segmentRaw ? "databricks" : null;

  const launchDate = activatedDate || firstOrderDate || null;
  // Primary: the Salesforce negotiated rate (Opportunity.Commission__c, %); commission €
  // is derived as rate × GROSS GMV. When SF has no rate we FALL BACK to the actual
  // commission Databricks reports per month (fact_provider_monthly provider_commission, €).
  const commissionRatePct = commissionRateByProvider?.get(String(providerId)) ?? null;
  const hasSfRate = commissionRatePct != null;
  const sfCommissionEur = (gmv) => Math.round((commissionRatePct / 100) * gmv);
  // "Launch to date": drop months strictly before the launch month so the
  // sparkline starts at activation (Databricks may emit zero rows earlier).
  const launchMonth = launchDate ? launchDate.slice(0, 7) : null;
  const launchMonthly = (monthlyByProvider.get(providerId) ?? [])
    .slice()
    .sort((a, b) => a.month.localeCompare(b.month))
    .filter((m) => !launchMonth || m.month >= launchMonth);
  const monthly = launchMonthly.map((m) => {
    const gmv = Math.round(m.gmv);
    // Databricks actual commission (€) for the month — fallback when SF lacks a rate.
    const dbCommission = m.commission == null ? null : Math.round(m.commission);
    return {
      month: m.month,
      // gmv/aov are GROSS (before discounts); gmvNet/discount are context.
      gmv,
      orders: m.orders,
      aov: m.orders > 0 ? round(m.gmv / m.orders, 1) : 0,
      // commission € = SF rate × gross GMV, else the Databricks actual commission.
      commission: hasSfRate ? sfCommissionEur(gmv) : dbCommission,
      gmvNet: m.gmvNet == null ? null : Math.round(m.gmvNet),
      discount: m.discount == null ? null : Math.round(m.discount),
    };
  });

  const totalGmv = monthly.reduce((s, m) => s + m.gmv, 0);
  const totalOrders = monthly.reduce((s, m) => s + m.orders, 0);
  const totalGmvNet = monthly.reduce((s, m) => s + (m.gmvNet ?? 0), 0);
  const totalDiscount = monthly.reduce((s, m) => s + (m.discount ?? 0), 0);

  // Databricks actual commission summed over the same launch→date months.
  const dbCommissionTotal = launchMonthly.reduce(
    (s, m) => s + (m.commission == null ? 0 : m.commission),
    0,
  );
  const hasDbCommission = launchMonthly.some((m) => m.commission != null);

  // Resolve the commission source. SF rate wins; otherwise the Databricks actual
  // commission (with an effective % = commission ÷ gross GMV). "—" only when neither.
  let totalCommission;
  let commissionPct;
  let commissionSource;
  if (hasSfRate) {
    totalCommission = sfCommissionEur(totalGmv);
    commissionPct = commissionRatePct;
    commissionSource = "salesforce";
  } else if (hasDbCommission) {
    totalCommission = Math.round(dbCommissionTotal);
    commissionPct = totalGmv > 0 ? round((dbCommissionTotal / totalGmv) * 100, 1) : null;
    commissionSource = "databricks";
  } else {
    totalCommission = null;
    commissionPct = null;
    commissionSource = null;
  }

  return {
    id: String(providerId),
    accountName: (providerName || vendorName || `Provider ${providerId}`).trim(),
    city: (cityName || "—").trim(),
    agentId,
    agentName,
    segment,
    businessSegment,
    businessSegmentSource,
    launchDate,
    monthly,
    sparkline: monthly.map((m) => ({ month: m.month, value: m.gmv })),
    totalGmv,
    totalOrders,
    totalCommission,
    totalGmvNet,
    totalDiscount,
    // Salesforce negotiated commission rate (Opportunity.Commission__c, %); null if unset.
    commissionRatePct,
    // Effective commission % used for display/sort: the SF rate when present, else the
    // Databricks-derived rate (actual commission ÷ gross GMV). Null when neither exists.
    commissionPct,
    // Where the commission figure comes from: "salesforce" | "databricks" | null.
    commissionSource,
    aov: totalOrders > 0 ? round(totalGmv / totalOrders, 1) : 0,
    quality: qualityForProvider(qualityByProvider, providerId, launchMonth),
  };
}

/** Team/rep totals by month across the given assembled accounts. */
export function rollupByMonth(accounts) {
  const byMonthMap = new Map();
  for (const account of accounts) {
    for (const m of account.monthly) {
      if (!byMonthMap.has(m.month)) {
        byMonthMap.set(m.month, {
          month: m.month,
          gmv: 0,
          gmvNet: 0,
          discount: 0,
          orders: 0,
          commission: 0,
          accounts: 0,
        });
      }
      const bucket = byMonthMap.get(m.month);
      bucket.gmv += m.gmv;
      bucket.gmvNet += m.gmvNet ?? 0;
      bucket.discount += m.discount ?? 0;
      bucket.orders += m.orders;
      bucket.commission += m.commission ?? 0;
      if (m.orders > 0 || m.gmv > 0) bucket.accounts += 1;
    }
  }
  return [...byMonthMap.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((b) => ({
      month: b.month,
      gmv: Math.round(b.gmv),
      gmvNet: Math.round(b.gmvNet),
      discount: Math.round(b.discount),
      orders: b.orders,
      commission: Math.round(b.commission),
      aov: b.orders > 0 ? round(b.gmv / b.orders, 1) : 0,
      accounts: b.accounts,
    }));
}

/**
 * Order-weighted rollup of a single quality metric across accounts (availability
 * uses the same per-account ref orders as a proxy weight).
 */
export function rollupQuality(list, key, digits = 1) {
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

/** Combined quality totals across accounts (shared by team + inbound totals). */
export function rollupQualityTotals(accounts) {
  return {
    availabilityPct: rollupQuality(accounts, "availabilityPct"),
    acceptancePct: rollupQuality(accounts, "acceptancePct"),
    rejectionPct: rollupQuality(accounts, "rejectionPct", 2),
    prepMinutes: rollupQuality(accounts, "prepMinutes"),
    rating: rollupQuality(accounts, "rating", 2),
    lateDeliveryPct: rollupQuality(accounts, "lateDeliveryPct"),
    accountsWithSignal: accounts.filter((a) => a.quality).length,
  };
}
