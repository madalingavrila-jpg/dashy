"use client";

import { useEffect, useMemo, useState } from "react";
import type { AgentViewRow, WeeklyBreakdownRow, WeeklyHistoryRow } from "@/types/dashboard";
import {
  buildWowComparison,
  defaultWowWeeks,
  WOW_METRIC_OPTIONS,
  type WowCompareRow,
  type WowMetricKey,
  weekOptionLabel,
  weekOptionsFromHistory,
} from "@/lib/wowCompare";
import { formatWeekLabel } from "@/lib/weekDateRange";
import { AgentAvatar } from "@/components/AgentAvatar";

type WowComparisonBuilderProps = {
  history?: WeeklyHistoryRow[];
  breakdown?: WeeklyBreakdownRow[];
  agents?: AgentViewRow[];
  currentWeek?: string;
  pausedAgentIds?: string[];
  loading?: boolean;
};

function agentsForCompare(agents: AgentViewRow[]) {
  return agents.map((agent) => ({
    ownerId: agent.ownerId,
    name: agent.name,
    segment: agent.segment === "Complex" ? ("complex" as const) : ("density" as const),
    mtdTarget: 0,
    pipelineCount: 0,
    stageCounts: {},
    wonMtd: 0,
    activatedMtd: 0,
  }));
}

function selectClassName(): string {
  return "dashy-select w-full text-body-md font-medium";
}

function trendBadgeClass(trend: WowCompareRow["trend"]): string {
  if (trend === "up") return "trend-up";
  if (trend === "down") return "trend-down";
  return "trend-neutral";
}

function segmentBadgeClass(segment?: "complex" | "density"): string {
  if (segment === "complex") return "bg-primary-container/50 text-on-primary-container";
  if (segment === "density") return "bg-tertiary-container/50 text-on-tertiary-container";
  return "bg-surface-container-high text-on-surface-variant";
}

function MirroredRow({
  row,
  leftWeek,
  rightWeek,
  indent,
  showAvatar,
}: {
  row: WowCompareRow;
  leftWeek: string;
  rightWeek: string;
  indent?: boolean;
  showAvatar?: boolean;
}) {
  return (
    <tr className="hover:bg-surface-container-low">
      <td className={`px-lg py-md ${indent ? "pl-xl" : ""}`}>
        <div className="flex flex-wrap items-center gap-xs">
          {showAvatar ? <AgentAvatar name={row.label} size={28} /> : null}
          <span className="font-semibold">{row.label}</span>
          {row.subtitle && (
            <span className={`rounded-full px-xs py-[1px] text-[10px] font-bold uppercase ${segmentBadgeClass(row.segment)}`}>
              {row.subtitle}
            </span>
          )}
          {row.targetPaused && (
            <span className="rounded-full bg-surface-container-high px-xs py-[1px] text-[10px] font-semibold uppercase text-on-surface-variant">
              Paused
            </span>
          )}
        </div>
      </td>
      <td className="px-lg py-md text-right">
        <span className="text-data-mono font-data-mono font-bold text-primary" title={leftWeek}>
          {row.left.formatted}
        </span>
      </td>
      <td className="px-md py-md text-center">
        <div className="flex flex-col items-center gap-[2px]">
          <span className={`rounded-full px-xs py-[2px] text-[11px] font-bold ${trendBadgeClass(row.trend)}`}>
            {row.change}
          </span>
          <span className="text-[10px] text-on-surface-variant">{row.delta}</span>
        </div>
      </td>
      <td className="px-lg py-md text-left">
        <span className="text-data-mono font-data-mono text-on-surface-variant" title={rightWeek}>
          {row.right.formatted}
        </span>
      </td>
    </tr>
  );
}

export function WowComparisonBuilder({
  history,
  breakdown,
  agents,
  currentWeek,
  pausedAgentIds,
  loading,
}: WowComparisonBuilderProps) {
  const weekOptions = useMemo(() => weekOptionsFromHistory(history), [history]);
  const defaults = useMemo(
    () => defaultWowWeeks(history, currentWeek),
    [history, currentWeek],
  );

  const [leftWeek, setLeftWeek] = useState(defaults.leftWeek);
  const [rightWeek, setRightWeek] = useState(defaults.rightWeek);
  const [metric, setMetric] = useState<WowMetricKey>("closedWon");
  const [draftLeftWeek, setDraftLeftWeek] = useState(defaults.leftWeek);
  const [draftRightWeek, setDraftRightWeek] = useState(defaults.rightWeek);
  const [draftMetric, setDraftMetric] = useState<WowMetricKey>("closedWon");

  useEffect(() => {
    if (!weekOptions.length) return;
    setLeftWeek((current) => (weekOptions.includes(current) ? current : defaults.leftWeek));
    setRightWeek((current) => (weekOptions.includes(current) ? current : defaults.rightWeek));
    setDraftLeftWeek((current) => (weekOptions.includes(current) ? current : defaults.leftWeek));
    setDraftRightWeek((current) => (weekOptions.includes(current) ? current : defaults.rightWeek));
  }, [weekOptions, defaults.leftWeek, defaults.rightWeek]);

  const comparison = useMemo(() => {
    if (!history?.length || !leftWeek || !rightWeek || !agents?.length) return null;
    return buildWowComparison({
      history,
      breakdown,
      agents: agentsForCompare(agents),
      leftWeek,
      rightWeek,
      metric,
      pausedAgentIds,
    });
  }, [history, breakdown, agents, leftWeek, rightWeek, metric, pausedAgentIds]);

  if (loading && !history?.length) {
    return <div className="dashboard-card h-64 animate-pulse" />;
  }

  if (!weekOptions.length) {
    return (
      <div className="dashboard-card p-lg text-on-surface-variant">
        No weekly history available for WoW comparison.
      </div>
    );
  }

  return (
    <div className="dashboard-card overflow-hidden">
      <div className="border-b border-outline-variant/60 p-lg">
        <div className="flex flex-wrap items-start justify-between gap-md">
          <div>
            <p className="eyebrow text-brand">Comparison builder</p>
            <h3 className="mt-1 text-title-lg font-title-lg font-bold">Week-over-Week Comparison</h3>
            <p className="text-body-md text-on-surface-variant">
              Pick two weeks and a metric — mirrored view by total, team, and agent.
            </p>
          </div>
          <button
            type="button"
            className="dashy-btn dashy-btn-ghost"
            onClick={() => {
              setLeftWeek(defaults.leftWeek);
              setRightWeek(defaults.rightWeek);
              setDraftLeftWeek(defaults.leftWeek);
              setDraftRightWeek(defaults.rightWeek);
            }}
          >
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            Reset to current vs prior
          </button>
        </div>

        <div className="dashy-filter-bar mt-md">
          <label className="flex flex-col gap-xs">
            <span className="eyebrow text-brand">Period A</span>
            <select value={draftLeftWeek} onChange={(event) => setDraftLeftWeek(event.target.value)} className={selectClassName()}>
              {weekOptions.map((week) => (
                <option key={`left-${week}`} value={week}>
                  {weekOptionLabel(week)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-xs">
            <span className="eyebrow">Period B</span>
            <select value={draftRightWeek} onChange={(event) => setDraftRightWeek(event.target.value)} className={selectClassName()}>
              {weekOptions.map((week) => (
                <option key={`right-${week}`} value={week}>
                  {weekOptionLabel(week)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-xs">
            <span className="eyebrow">Metric</span>
            <select value={draftMetric} onChange={(event) => setDraftMetric(event.target.value as WowMetricKey)} className={selectClassName()}>
              {WOW_METRIC_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="dashy-btn dashy-btn-primary self-end"
            onClick={() => {
              setLeftWeek(draftLeftWeek);
              setRightWeek(draftRightWeek);
              setMetric(draftMetric);
            }}
          >
            <span className="material-symbols-outlined text-[17px]">refresh</span>
            Update
          </button>
        </div>
      </div>

      {comparison && (
        <>
        <div className="grid gap-sm border-b border-outline-variant/60 bg-surface-container-low/25 p-lg sm:grid-cols-3">
          {[comparison.total, ...comparison.teams].slice(0, 3).map((row) => (
            <div key={`kpi-${row.id}`} className="dashboard-card p-md shadow-none">
              <p className="eyebrow">{row.label}</p>
              <div className="mt-xs flex items-end justify-between gap-sm">
                <p className="text-[22px] font-extrabold tabular-nums text-on-surface">{row.left.formatted}</p>
                <span className={`rounded-full px-xs py-[2px] text-[11px] font-bold ${trendBadgeClass(row.trend)}`}>
                  {row.change}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-on-surface-variant">
                vs {row.right.formatted} · {comparison.metricLabel}
              </p>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-surface-container-lowest">
              <tr>
                <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">Scope</th>
                <th className="px-lg py-md text-right text-label-md font-semibold uppercase text-primary">{formatWeekLabel(comparison.leftWeek)}</th>
                <th className="px-md py-md text-center text-label-md font-semibold uppercase text-on-surface-variant">Δ</th>
                <th className="px-lg py-md text-left text-label-md font-semibold uppercase text-on-surface-variant">{formatWeekLabel(comparison.rightWeek)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              <MirroredRow row={comparison.total} leftWeek={comparison.leftWeek} rightWeek={comparison.rightWeek} />

              {comparison.hasBreakdown && comparison.teams.length > 0 && (
                <>
                  <tr className="bg-surface-container-low/60">
                    <td colSpan={4} className="px-lg py-sm text-label-md font-bold uppercase tracking-wide text-on-surface-variant">
                      By team
                    </td>
                  </tr>
                  {comparison.teams.map((row) => (
                    <MirroredRow
                      key={row.id}
                      row={row}
                      leftWeek={comparison.leftWeek}
                      rightWeek={comparison.rightWeek}
                      indent
                      showAvatar
                    />
                  ))}
                </>
              )}

              {comparison.hasBreakdown && comparison.agents.some((row) => row.left.value > 0 || row.right.value > 0) && (
                <>
                  <tr className="bg-surface-container-low/60">
                    <td colSpan={4} className="px-lg py-sm text-label-md font-bold uppercase tracking-wide text-on-surface-variant">
                      By agent
                    </td>
                  </tr>
                  {comparison.agents
                    .filter((row) => row.left.value > 0 || row.right.value > 0)
                    .map((row) => (
                      <MirroredRow
                        key={row.id}
                        row={row}
                        leftWeek={comparison.leftWeek}
                        rightWeek={comparison.rightWeek}
                        indent
                      />
                    ))}
                </>
              )}

              {!comparison.hasBreakdown && (
                <tr>
                  <td colSpan={4} className="px-lg py-md text-body-md text-on-surface-variant">
                    Team and agent breakdown is available for Qualified, Negotiations, Closed Won, and Active.
                    Leads are shown at total level only.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </>
      )}

      {leftWeek === rightWeek && (
        <div className="border-t border-outline-variant bg-surface-container-low px-lg py-sm text-body-md text-on-surface-variant">
          Week A and Week B are the same — pick different weeks to compare.
        </div>
      )}
    </div>
  );
}
