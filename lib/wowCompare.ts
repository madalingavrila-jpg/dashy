import type {
  AgentRow,
  WeeklyBreakdownRow,
  WeeklyHistoryRow,
  WeeklyStatusKey,
} from "@/types/dashboard";
import { formatInteger, formatSignedDelta, formatSignedPct, pctChange, trendDirection } from "@/lib/format";
import { DASHBOARD_WEEK_YEAR, formatWeekLabel } from "@/lib/weekDateRange";
import { filterWeeklyHistory, pickDefaultWeek, sortWeekCodes } from "@/lib/weekQuarterFilter";

export type WowMetricKey = keyof Omit<WeeklyHistoryRow, "week">;

export const WOW_METRIC_OPTIONS: Array<{ key: WowMetricKey; label: string }> = [
  { key: "leads", label: "Leads" },
  { key: "qualified", label: "Qualified" },
  { key: "negotiations", label: "Negotiations" },
  { key: "closedWon", label: "Closed Won" },
  { key: "active", label: "Active" },
];

/** Metrics with per-team / per-agent breakdown in statusBreakdown. */
export const WOW_BREAKDOWN_METRICS = new Set<WowMetricKey>([
  "qualified",
  "negotiations",
  "closedWon",
  "active",
]);

export function isBreakdownMetric(metric: WowMetricKey): metric is WeeklyStatusKey {
  return WOW_BREAKDOWN_METRICS.has(metric);
}

export { sortWeekCodes } from "@/lib/weekQuarterFilter";

export function weekOptionsFromHistory(history: WeeklyHistoryRow[] | undefined): string[] {
  if (!history?.length) return [];
  return sortWeekCodes(filterWeeklyHistory(history).map((row) => row.week));
}

export function weekOptionLabel(week: string, year: number = DASHBOARD_WEEK_YEAR): string {
  return formatWeekLabel(week, year);
}

function historyValue(history: WeeklyHistoryRow[] | undefined, week: string, metric: WowMetricKey): number {
  const row = history?.find((entry) => entry.week === week);
  return row?.[metric] ?? 0;
}

function breakdownRow(
  breakdown: WeeklyBreakdownRow[] | undefined,
  week: string,
): WeeklyBreakdownRow | undefined {
  return breakdown?.find((entry) => entry.week === week);
}

function teamValue(
  row: WeeklyBreakdownRow | undefined,
  segment: "complex" | "density",
  metric: WeeklyStatusKey,
): number {
  return row?.teams[segment][metric] ?? 0;
}

export type WowCompareCell = {
  value: number;
  formatted: string;
};

export type WowCompareRow = {
  id: string;
  label: string;
  subtitle?: string;
  segment?: "complex" | "density";
  targetPaused?: boolean;
  left: WowCompareCell;
  right: WowCompareCell;
  delta: string;
  change: string;
  trend: "up" | "down" | "neutral";
};

export type WowCompareModel = {
  metric: WowMetricKey;
  metricLabel: string;
  leftWeek: string;
  rightWeek: string;
  hasBreakdown: boolean;
  total: WowCompareRow;
  teams: WowCompareRow[];
  agents: WowCompareRow[];
};

function compareCell(value: number): WowCompareCell {
  return { value, formatted: formatInteger(value) };
}

function compareRow(
  id: string,
  label: string,
  leftValue: number,
  rightValue: number,
  extras?: Pick<WowCompareRow, "subtitle" | "segment" | "targetPaused">,
): WowCompareRow {
  const changePct = pctChange(leftValue, rightValue);
  return {
    id,
    label,
    ...extras,
    left: compareCell(leftValue),
    right: compareCell(rightValue),
    delta: formatSignedDelta(leftValue, rightValue),
    change: formatSignedPct(changePct),
    trend: trendDirection(changePct),
  };
}

export function buildWowComparison(input: {
  history: WeeklyHistoryRow[] | undefined;
  breakdown: WeeklyBreakdownRow[] | undefined;
  agents: AgentRow[];
  leftWeek: string;
  rightWeek: string;
  metric: WowMetricKey;
  pausedAgentIds?: string[];
}): WowCompareModel | null {
  const { history, breakdown, agents, leftWeek, rightWeek, metric } = input;
  const pausedAgentIds = input.pausedAgentIds ?? [];
  const metricLabel = WOW_METRIC_OPTIONS.find((option) => option.key === metric)?.label ?? metric;

  if (!leftWeek || !rightWeek) return null;

  const leftHistory = historyValue(history, leftWeek, metric);
  const rightHistory = historyValue(history, rightWeek, metric);
  const hasBreakdown = isBreakdownMetric(metric);

  const leftBreakdown = breakdownRow(breakdown, leftWeek);
  const rightBreakdown = breakdownRow(breakdown, rightWeek);

  const teams: WowCompareRow[] = hasBreakdown
    ? (["complex", "density"] as const).map((segment) => {
        const label = segment === "complex" ? "Complex Team" : "Density Team";
        const leftValue = teamValue(leftBreakdown, segment, metric);
        const rightValue = teamValue(rightBreakdown, segment, metric);
        return compareRow(segment, label, leftValue, rightValue, {
          segment,
          subtitle: segment === "complex" ? "Complex" : "Density",
        });
      })
    : [];

  const agentsRows: WowCompareRow[] = hasBreakdown
    ? agents
        .map((agent) => {
          const leftValue = leftBreakdown?.agents[agent.ownerId]?.[metric] ?? 0;
          const rightValue = rightBreakdown?.agents[agent.ownerId]?.[metric] ?? 0;
          const paused = pausedAgentIds.includes(agent.ownerId);
          return compareRow(agent.ownerId, agent.name, leftValue, rightValue, {
            subtitle: agent.segment === "complex" ? "Complex" : "Density",
            segment: agent.segment,
            targetPaused: paused,
          });
        })
        .sort(
          (a, b) =>
            Math.max(b.left.value, b.right.value) - Math.max(a.left.value, a.right.value) ||
            a.label.localeCompare(b.label),
        )
    : [];

  return {
    metric,
    metricLabel,
    leftWeek,
    rightWeek,
    hasBreakdown,
    total: compareRow("total", "Total", leftHistory, rightHistory),
    teams,
    agents: agentsRows,
  };
}

export function defaultWowWeeks(
  history: WeeklyHistoryRow[] | undefined,
  currentWeek?: string,
): { leftWeek: string; rightWeek: string } {
  const weeks = weekOptionsFromHistory(history);
  if (!weeks.length) return { leftWeek: "", rightWeek: "" };

  const normalizedCurrent = pickDefaultWeek(weeks, currentWeek);
  const currentIdx = weeks.indexOf(normalizedCurrent);
  const priorIdx = currentIdx > 0 ? currentIdx - 1 : Math.max(0, currentIdx - 1);
  const rightWeek = weeks[priorIdx] ?? weeks[0];
  const leftWeek = normalizedCurrent;

  return { leftWeek, rightWeek };
}
