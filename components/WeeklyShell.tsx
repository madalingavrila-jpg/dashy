"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { WeeklyMetricsGrid, WeeklyHistoryChart } from "@/components/WeeklyCharts";
import { WeeklyHistoryTable } from "@/components/WeeklyHistoryTable";
import {
  WeeklyDetailPanel,
  WeeklyFilterSelect,
  type WeeklyFilter,
} from "@/components/WeeklyDetailPanel";
import { useDashboard } from "@/lib/useDashboard";
import { buildWeeklyDetailViews } from "@/lib/weeklyDetail";
import type { AgentRow } from "@/types/dashboard";

function agentsForWeeklyBuild(
  agents: Array<{
    ownerId: string;
    name: string;
    segment: string;
    pipelineCount: string;
    wonMtd: string;
    activatedMtd: string;
  }>,
): AgentRow[] {
  return agents.map((agent) => ({
    ownerId: agent.ownerId,
    name: agent.name,
    segment: agent.segment === "Complex" ? "complex" : "density",
    mtdTarget: 0,
    pipelineCount: Number.parseInt(agent.pipelineCount.replace(/[^\d]/g, ""), 10) || 0,
    stageCounts: {},
    wonMtd: Number.parseInt(agent.wonMtd.replace(/[^\d]/g, ""), 10) || 0,
    activatedMtd: Number.parseInt(agent.activatedMtd.replace(/[^\d]/g, ""), 10) || 0,
  }));
}

export function WeeklyShell() {
  const { model, error, loading, sourceHint, targetConfig } = useDashboard();
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [filter, setFilter] = useState<WeeklyFilter>("all");
  const detailRef = useRef<HTMLDivElement>(null);

  const selectedDetail = useMemo(() => {
    if (!selectedWeek || !model?.weeklyPerformance.statusBreakdown.length) return undefined;
    const row = model.weeklyPerformance.statusBreakdown.find((entry) => entry.week === selectedWeek);
    if (!row || !model.agents.length) return undefined;
    const built = buildWeeklyDetailViews([row], agentsForWeeklyBuild(model.agents), {
      weekly: targetConfig.weekly,
      weeklyPerRep: targetConfig.weeklyPerRep,
    });
    return built[0];
  }, [model, selectedWeek, targetConfig]);

  const handleWeekSelect = (week: string) => {
    setSelectedWeek((current) => (current === week ? null : week));
  };

  useEffect(() => {
    if (!selectedWeek || !selectedDetail) {
      return;
    }
    detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedWeek, selectedDetail]);

  const hasBreakdown = (model?.weeklyPerformance.statusBreakdown.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-[1400px] space-y-md">
      <PageHeader
        title="Weekly Performance"
        subtitle="Click any week in the chart or table below to open team & agent status drill-down (Qualified · Negotiations · Closed Won · Active)."
        updatedAt={model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      {!selectedWeek && hasBreakdown && !loading && (
        <div className="flex items-start gap-sm rounded-xl border border-primary/30 bg-primary-container/20 px-md py-sm">
          <span className="material-symbols-outlined mt-[2px] text-primary">touch_app</span>
          <p className="text-body-md text-on-surface">
            <span className="font-semibold">New:</span> select a week row (marked{" "}
            <span className="rounded-full bg-secondary px-xs py-[1px] text-[10px] font-bold text-on-secondary">
              OPEN
            </span>
            ) to see Complex &amp; Density teams with progress vs weekly targets. Edit targets in{" "}
            <a href="/settings/" className="font-semibold text-primary underline">
              Settings
            </a>
            .
          </p>
        </div>
      )}

      <WeeklyMetricsGrid
        metrics={model?.weeklyPerformance.metrics}
        weekLabel={model?.weeklyPerformance.weekLabel}
        loading={loading}
      />

      <WeeklyHistoryChart
        history={model?.weeklyPerformance.history}
        loading={loading}
        selectedWeek={selectedWeek}
        onWeekSelect={handleWeekSelect}
      />

      <WeeklyHistoryTable
        history={model?.weeklyPerformance.history}
        currentWeek={model?.weeklyPerformance.currentWeek}
        selectedWeek={selectedWeek}
        onWeekSelect={handleWeekSelect}
        loading={loading}
      />

      {selectedWeek && (
        <div
          ref={detailRef}
          id="weekly-detail"
          className="glass-card space-y-md rounded-xl border-2 border-primary/40 p-lg shadow-lg ring-1 ring-primary/10"
        >
          <div className="flex flex-wrap items-end justify-between gap-md">
            <WeeklyFilterSelect
              value={filter}
              onChange={setFilter}
              agents={model?.agents.map((agent) => ({
                ownerId: agent.ownerId,
                name: agent.name,
                segment: agent.segment,
              }))}
            />
          </div>
          <WeeklyDetailPanel
            detail={selectedDetail}
            filter={filter}
            loading={loading}
            onClose={() => setSelectedWeek(null)}
          />
          {!loading && !selectedDetail && (
            <p className="rounded-lg bg-surface-container-low px-md py-sm text-body-md text-on-surface-variant">
              No status breakdown for {selectedWeek}. Refresh the page or wait for dashboard data to
              finish loading.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
