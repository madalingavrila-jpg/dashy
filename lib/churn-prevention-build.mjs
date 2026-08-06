/**
 * Churn Prevention assembly — join Databricks YTD activations with Salesforce
 * Account.Status__c for Complex + Density accounts.
 *
 * DB accounts-perf-accounts row:
 *   [provider_id, owner_name, owner_email, activated_date, provider_name,
 *    vendor_name, city_name, business_segment_v2, provider_status, first_order_date]
 *
 * SF status cache row (assembled mcp-table):
 *   [provider_id, account_id, account_name, status, is_deleted,
 *    inactive_30_days, billing_city, sf_first_active]
 *
 * prov-opp row: [provider_id, opportunity_id]
 */

export const PROBLEM_STATUSES = new Set(["inactive", "hidden", "deleted"]);

const SF_INSTANCE = "https://boltfood.lightning.force.com";

/** Index SF status rows by provider_id (string). */
export function buildSfStatusByProvider(rows) {
  const map = new Map();
  for (const row of rows ?? []) {
    const providerId = String(row[0] ?? "");
    if (!providerId || providerId === "null") continue;
    map.set(providerId, {
      accountId: row[1] ? String(row[1]) : null,
      accountName: row[2] != null ? String(row[2]) : null,
      status: row[3] != null ? String(row[3]).toLowerCase() : null,
      isDeleted: Boolean(row[4]),
      inactive30Days: Boolean(row[5]),
      billingCity: row[6] != null ? String(row[6]) : null,
      sfFirstActive: row[7] != null ? String(row[7]).slice(0, 10) : null,
    });
  }
  return map;
}

/** Index provider → opportunity_id. */
export function buildOppByProvider(rows) {
  const map = new Map();
  for (const row of rows ?? []) {
    const providerId = String(row[0] ?? "");
    const oppId = row[1] != null ? String(row[1]) : null;
    if (!providerId || !oppId || oppId === "null") continue;
    map.set(providerId, oppId);
  }
  return map;
}

/**
 * Effective SF status: soft-deleted Accounts count as deleted even when
 * Status__c is missing from a normal SOQL pull.
 */
export function effectiveSfStatus(sf) {
  if (!sf) return null;
  if (sf.isDeleted) return "deleted";
  return sf.status;
}

/** True when SF status is inactive/hidden/deleted (or IsDeleted). */
export function isProblemStatus(sfStatus) {
  return sfStatus != null && PROBLEM_STATUSES.has(sfStatus);
}

/**
 * Index monthly fact rows → Map(provider_id → [{ month, orders }]).
 * Row: [provider_id, month, gmv, orders, ...]
 */
export function buildMonthlyOrdersByProvider(monthlyRows) {
  const map = new Map();
  for (const row of monthlyRows ?? []) {
    const providerId = String(row[0] ?? "");
    if (!providerId || providerId === "null") continue;
    const month = row[1] != null ? String(row[1]).slice(0, 7) : null;
    if (!month) continue;
    const orders = Math.round(Number(row[3]) || 0);
    if (!map.has(providerId)) map.set(providerId, []);
    map.get(providerId).push({ month, orders });
  }
  return map;
}

/** Sum delivered orders in calendar months on/after the activation month (YYYY-MM). */
export function ordersSinceActivationMonth(monthlyByProvider, providerId, activatedDate) {
  const rows = monthlyByProvider?.get(String(providerId)) ?? [];
  if (!rows.length) return 0;
  const actMonth = activatedDate ? String(activatedDate).slice(0, 7) : null;
  let total = 0;
  for (const r of rows) {
    if (actMonth && r.month < actMonth) continue;
    total += r.orders;
  }
  return total;
}

/**
 * Ordered since this activation.
 * True if either:
 *   - firstOrderDate ≥ activatedDate (when both set), OR
 *   - any monthly delivered-orders total in months ≥ activation month is > 0
 *     (covers reactivations where lifetime first_order_date is before this
 *     activation — e.g. Avocadoo: activated 2026-07-01, first_order 2026-06-30,
 *     but 198+ orders in Jul/Aug).
 * False only when neither signal shows post-activation orders.
 * `ordersAfterActivation` is the pre-summed monthly total (null = monthly absent).
 */
export function hasOrderSinceActivation(
  activatedDate,
  firstOrderDate,
  ordersAfterActivation = null,
) {
  if (ordersAfterActivation != null && Number(ordersAfterActivation) > 0) return true;
  if (firstOrderDate && activatedDate) {
    return String(firstOrderDate).slice(0, 10) >= String(activatedDate).slice(0, 10);
  }
  if (firstOrderDate && !activatedDate) return true;
  return false;
}

export function accountUrl(accountId) {
  return accountId
    ? `${SF_INSTANCE}/lightning/r/Account/${accountId}/view`
    : null;
}

export function opportunityUrl(oppId) {
  return oppId
    ? `${SF_INSTANCE}/lightning/r/Opportunity/${oppId}/view`
    : null;
}

/**
 * Assemble one churn-prevention account row.
 * Pass `ordersAfterActivation` from fact_provider_monthly (months ≥ activation month)
 * so reactivations with an older first_order_date are not falsely marked never-ordered.
 */
export function assembleChurnAccount(
  dbRow,
  { agentId, agentName, segment, sf, opportunityId, ordersAfterActivation = null },
) {
  const providerId = String(dbRow[0]);
  const activatedDate = dbRow[3] != null ? String(dbRow[3]).slice(0, 10) : null;
  const providerName = dbRow[4] != null ? String(dbRow[4]) : null;
  const cityFromDb = dbRow[6] != null ? String(dbRow[6]) : null;
  const dbStatus = dbRow[8] != null ? String(dbRow[8]).toLowerCase() : null;
  const firstOrderDate = dbRow[9] != null ? String(dbRow[9]).slice(0, 10) : null;

  const sfStatus = effectiveSfStatus(sf);
  const ordered = hasOrderSinceActivation(
    activatedDate,
    firstOrderDate,
    ordersAfterActivation,
  );
  const problemStatus = isProblemStatus(sfStatus);
  const statusMismatch =
    sfStatus != null && dbStatus != null && sfStatus !== dbStatus;

  return {
    id: providerId,
    accountName: sf?.accountName || providerName || `Provider ${providerId}`,
    city: sf?.billingCity || cityFromDb || "",
    agentId,
    agentName,
    segment,
    activatedDate,
    sfStatus,
    dbStatus,
    statusMismatch,
    inactive30Days: Boolean(sf?.inactive30Days),
    hasOrder: ordered,
    neverOrdered: !ordered,
    problemStatus,
    firstOrderDate,
    ordersAfterActivation:
      ordersAfterActivation == null ? null : Math.round(Number(ordersAfterActivation) || 0),
    accountId: sf?.accountId ?? null,
    opportunityId: opportunityId ?? null,
    accountUrl: accountUrl(sf?.accountId),
    opportunityUrl: opportunityUrl(opportunityId),
  };
}

/** Roll up headline totals for the section. */
export function rollupChurnTotals(accounts) {
  const problemStatus = accounts.filter((a) => a.problemStatus).length;
  const neverOrdered = accounts.filter((a) => a.neverOrdered).length;
  const both = accounts.filter((a) => a.problemStatus && a.neverOrdered).length;
  const bySfStatus = {};
  for (const a of accounts) {
    const key = a.sfStatus ?? "unknown";
    bySfStatus[key] = (bySfStatus[key] ?? 0) + 1;
  }
  return {
    accounts: accounts.length,
    problemStatus,
    neverOrdered,
    both,
    bySfStatus,
  };
}
