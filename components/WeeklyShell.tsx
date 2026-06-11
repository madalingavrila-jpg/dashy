"use client";

import { useMemo, useState } from "react";
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

  return (
    <div className="mx-auto max-w-[1400px] space-y-md">
      <PageHeader
        title="Weekly Performance"
        subtitle="All ISO weeks in 2026 — click a week for team & agent status breakdown vs targets."
        updatedAt={model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

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

      {selectedWeek && (
        <div className="glass-card space-y-md rounded-xl border border-primary/20 p-lg">
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
        </div>
      )}

      <WeeklyHistoryTable
        history={model?.weeklyPerformance.history}
        currentWeek={model?.weeklyPerformance.currentWeek}
        selectedWeek={selectedWeek}
        onWeekSelect={handleWeekSelect}
        loading={loading}
      />
    </div>
  );
}
