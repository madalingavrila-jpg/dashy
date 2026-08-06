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
const BUCHAREST = "Europe/Bucharest";

/** Current calendar month (YYYY-MM) in Europe/Bucharest — the data query month. */
export function currentQueryMonth(ref = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUCHAREST,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(ref);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  return year && month ? `${year}-${month}` : "";
}

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

/** True when any monthly row for the provider has orders > 0 in `month` (YYYY-MM). */
export function hasOrdersInMonth(monthlyByProvider, providerId, month) {
  if (!month) return false;
  const rows = monthlyByProvider?.get(String(providerId)) ?? [];
  return rows.some((r) => r.month === month && r.orders > 0);
}

/**
 * Ordered since this activation — monthly fact only.
 *
 * hasOrder = true when:
 *   - any delivered orders in months >= activationMonth (YYYY-MM), OR
 *   - any delivered orders in the query month (Europe/Bucharest current month)
 *
 * neverOrdered = !hasOrder. firstOrderDate is display-only and must not drive this.
 */
export function hasOrderSinceActivation({
  ordersAfterActivation = 0,
  hasOrderInQueryMonth = false,
} = {}) {
  if (Number(ordersAfterActivation) > 0) return true;
  if (hasOrderInQueryMonth) return true;
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
 * Pass monthly order signals from fact_provider_monthly — neverOrdered is
 * monthly-based only (activation month + later, plus query-month override).
 */
export function assembleChurnAccount(
  dbRow,
  {
    agentId,
    agentName,
    segment,
    sf,
    opportunityId,
    ordersAfterActivation = 0,
    hasOrderInQueryMonth = false,
  },
) {
  const providerId = String(dbRow[0]);
  const activatedDate = dbRow[3] != null ? String(dbRow[3]).slice(0, 10) : null;
  const providerName = dbRow[4] != null ? String(dbRow[4]) : null;
  const cityFromDb = dbRow[6] != null ? String(dbRow[6]) : null;
  const dbStatus = dbRow[8] != null ? String(dbRow[8]).toLowerCase() : null;
  const firstOrderDate = dbRow[9] != null ? String(dbRow[9]).slice(0, 10) : null;

  const sfStatus = effectiveSfStatus(sf);
  const ordered = hasOrderSinceActivation({
    ordersAfterActivation,
    hasOrderInQueryMonth,
  });
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
    ordersAfterActivation: Math.round(Number(ordersAfterActivation) || 0),
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
