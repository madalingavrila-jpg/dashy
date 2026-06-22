export type WeeklyHistoryCounts = {
  week: string;
  leads: number;
  qualified: number;
  negotiations: number;
  closedWon: number;
  active: number;
};

type WeeklyMetricLike = { label: string; value: number | string };

const WEEKLY_METRIC_KEYS: Record<string, keyof Omit<WeeklyHistoryCounts, "week">> = {
  Leads: "leads",
  Qualified: "qualified",
  Negotiations: "negotiations",
  "Closed Won": "closedWon",
  Active: "active",
};

function parseWeekNumber(weekCode: string): number | null {
  const match = /^W(\d{1,2})$/i.exec(weekCode.trim());
  return match ? Number(match[1]) : null;
}

function parseMetricValue(value: number | string): number {
  if (typeof value === "number") return value;
  return Number.parseInt(String(value).replace(/[^\d-]/g, ""), 10) || 0;
}

/** Build a history row from current-week metric cards when the history array lags behind. */
export function synthesizeCurrentWeekHistoryRow(
  currentWeek: string,
  metrics: WeeklyMetricLike[] | undefined,
): WeeklyHistoryCounts | null {
  if (!metrics?.length) return null;

  const row: WeeklyHistoryCounts = {
    week: currentWeek,
    leads: 0,
    qualified: 0,
    negotiations: 0,
    closedWon: 0,
    active: 0,
  };

  for (const metric of metrics) {
    const key = WEEKLY_METRIC_KEYS[metric.label];
    if (key) row[key] = parseMetricValue(metric.value);
  }

  return row;
}

function sortHistoryByWeek<T extends { week: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => (parseWeekNumber(a.week) ?? 0) - (parseWeekNumber(b.week) ?? 0),
  );
}

/**
 * Ensure the active ISO week appears in weekly history when metrics exist but the
 * stored history array stopped at the prior week (partial refresh / stale build).
 */
export function ensureCurrentWeekInHistory<T extends WeeklyHistoryCounts>(
  history: T[] | undefined,
  currentWeek: string | undefined,
  metrics: WeeklyMetricLike[] | undefined,
): T[] {
  const rows = history ?? [];
  if (!currentWeek || rows.some((row) => row.week === currentWeek)) {
    return rows;
  }

  const synthesized = synthesizeCurrentWeekHistoryRow(currentWeek, metrics);
  if (!synthesized) return rows;

  return sortHistoryByWeek([...rows, synthesized as T]);
}
