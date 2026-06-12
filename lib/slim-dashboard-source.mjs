/**
 * Slim raw dashboard.json at build/source time — keeps aggregates, drops heavy drill-down lists
 * except for the current MTD month and current ISO week.
 */

const BUCHAREST = "Europe/Bucharest";
export const ACCOUNT_LIST_CAP = 28;

export function currentMonthKey(ref = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUCHAREST,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(ref);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return year && month ? `${year}-${month}` : "";
}

export function slimMtdHistory(mtdHistory, activeMonthKey) {
  if (!Array.isArray(mtdHistory)) return [];
  return mtdHistory.map((month) => {
    if (month.monthKey === activeMonthKey) {
      return month;
    }
    return {
      ...month,
      agents: (month.agents ?? []).map((agent) => ({
        ...agent,
        wonItems: [],
        activatedItems: [],
      })),
    };
  });
}

export function slimWeeklyBreakdown(breakdown, activeWeek) {
  if (!Array.isArray(breakdown)) return [];
  return breakdown.map((row) => {
    if (row.week === activeWeek) {
      return row;
    }
    return {
      ...row,
      agents: Object.fromEntries(
        Object.entries(row.agents ?? {}).map(([ownerId, agent]) => [
          ownerId,
          { ...agent, accounts: undefined },
        ]),
      ),
    };
  });
}

export function salesforceOpportunityListUrl(instanceUrl, stageNames) {
  const base = (instanceUrl ?? "https://bolt-eu.lightning.force.com").replace(/\/$/, "");
  return `${base}/lightning/o/Opportunity/list`;
}

export function capAccountLists(accounts, instanceUrl, cap = ACCOUNT_LIST_CAP) {
  if (!accounts || typeof accounts !== "object") {
    return { won: [], activated: [], backlog: [] };
  }

  const capList = (list) => (Array.isArray(list) ? list.slice(0, cap) : []);

  const wonTotal = accounts.won?.length ?? 0;
  const activatedTotal = accounts.activated?.length ?? 0;
  const backlogTotal = accounts.backlog?.length ?? 0;

  return {
    won: capList(accounts.won),
    activated: capList(accounts.activated),
    backlog: capList(accounts.backlog),
    meta: {
      won: { total: wonTotal, listUrl: salesforceOpportunityListUrl(instanceUrl) },
      activated: { total: activatedTotal, listUrl: salesforceOpportunityListUrl(instanceUrl) },
      backlog: { total: backlogTotal, listUrl: salesforceOpportunityListUrl(instanceUrl) },
    },
  };
}

/** Apply all source-level slimming to a raw dashboard payload before writing dashboard.json. */
export function slimDashboardRawData(data) {
  const updatedAt = data.updatedAt ?? new Date().toISOString();
  const activeMonthKey = currentMonthKey(new Date(updatedAt));
  const sp = data.salesPipeline ?? {};
  const activeWeek =
    sp.weeklyPerformance?.currentWeek ??
    sp.weeklyPerformance?.breakdown?.[sp.weeklyPerformance.breakdown.length - 1]?.week;

  const instanceUrl = data.salesforceInstanceUrl ?? "https://bolt-eu.lightning.force.com";

  const slimmed = {
    ...data,
    salesPipeline: {
      ...sp,
      mtdHistory: slimMtdHistory(sp.mtdHistory, activeMonthKey),
      weeklyPerformance: sp.weeklyPerformance
        ? {
            ...sp.weeklyPerformance,
            breakdown: slimWeeklyBreakdown(sp.weeklyPerformance.breakdown, activeWeek),
          }
        : sp.weeklyPerformance,
      accounts: capAccountLists(sp.accounts, instanceUrl),
      accountsByStage: undefined,
    },
  };

  if (slimmed.salesPipeline.accounts) {
    delete slimmed.salesPipeline.accounts.all;
  }

  delete slimmed.salesPipeline.accounts_all_removed;

  return slimmed;
}
