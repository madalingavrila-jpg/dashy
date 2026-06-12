"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { WeeklyMetricsGrid, WeeklyHistoryChart } from "@/components/WeeklyCharts";
import { WeeklyHistoryTable } from "@/components/WeeklyHistoryTable";
import {
  WeeklyDetailPanel,
  type WeeklyFilter,
} from "@/components/WeeklyDetailPanel";
import { useDashboard } from "@/lib/useDashboard";
import { useFilteredWeeklyHistory } from "@/lib/useFilteredWeeklyHistory";
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
  const { model, error, loading, sourceHint, targetConfig } = useDashboard({
    sections: ["weekly", "agents"],
  });
  const { history: filteredHistory, statusBreakdown: filteredBreakdown, visibleWeekRange } =
    useFilteredWeeklyHistory(model?.weeklyPerformance);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [filter, setFilter] = useState<WeeklyFilter>("all");
  const detailRef = useRef<HTMLDivElement>(null);

  const selectedDetail = useMemo(() => {
    if (!selectedWeek || !filteredBreakdown.length) return undefined;
    const row = filteredBreakdown.find((entry) => entry.week === selectedWeek);
    if (!row || !model?.agents.length) return undefined;
    const built = buildWeeklyDetailViews([row], agentsForWeeklyBuild(model.agents), {
      weekly: targetConfig.weekly,
      weeklyPerRep: targetConfig.weeklyPerRep,
      pausedAgentIds: targetConfig.pausedAgentIds,
    });
    return built[0];
  }, [filteredBreakdown, model, selectedWeek, targetConfig]);

  const agentTimeline = useMemo(() => {
    if (!filteredBreakdown.length || !model?.agents.length) return [];
    if (filter === "all" || filter === "complex" || filter === "density") return [];
    return buildWeeklyDetailViews(
      filteredBreakdown,
      agentsForWeeklyBuild(model.agents),
      { weekly: targetConfig.weekly, weeklyPerRep: targetConfig.weeklyPerRep, pausedAgentIds: targetConfig.pausedAgentIds },
    );
  }, [model, filter, targetConfig, filteredBreakdown]);

  const handleWeekSelect = (week: string) => {
    setFilter("all");
    setSelectedWeek((current) => (current === week ? null : week));
  };

  useEffect(() => {
    if (!selectedWeek) {
      return;
    }
    const row = document.getElementById(`week-row-${selectedWeek}`);
    const target = detailRef.current ?? row;
    target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedWeek, selectedDetail]);

  const hasBreakdown = filteredBreakdown.length > 0;
  const agentOptions = model?.agents.map((agent) => ({
    ownerId: agent.ownerId,
    name: agent.name,
    segment: agent.segment,
  }));

  const expandedContent =
    selectedWeek &&
    (loading && !selectedDetail ? (
      <div className="glass-card h-48 animate-pulse rounded-xl" />
    ) : selectedDetail ? (
      <WeeklyDetailPanel
        detail={selectedDetail}
        filter={filter}
        onFilterChange={setFilter}
        agents={agentOptions}
        loading={loading}
        onClose={() => setSelectedWeek(null)}
        salesforceUrl={model?.salesforceInstanceUrl}
        agentTimeline={agentTimeline}
      />
    ) : (
      <p className="rounded-lg bg-surface-container-low px-md py-sm text-body-md text-on-surface-variant">
        No status breakdown for {selectedWeek}. Refresh the page or wait for dashboard data to finish
        loading.
      </p>
    ));

  return (
    <div className="mx-auto max-w-[1400px] space-y-md">
      <PageHeader
        title="Weekly Performance"
        subtitle="Click any week row (chevron) or chart bar to expand Complex & Density team cards inline — click agent rows inside to see accounts."
        updatedAt={model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      {!selectedWeek && hasBreakdown && !loading && (
        <div className="flex items-start gap-sm rounded-xl border border-primary/30 bg-primary-container/20 px-md py-sm">
          <span className="material-symbols-outlined mt-[2px] text-primary">touch_app</span>
          <p className="text-body-md text-on-surface">
            <span className="font-semibold">Tip:</span> click any week row — the{" "}
            <span className="material-symbols-outlined align-middle text-[16px]">chevron_right</span>{" "}
            expands team cards right below that week. Click an agent name inside to expand their
            accounts. Use <span className="font-semibold">Filter view</span> for one team or agent.
          </p>
        </div>
      )}

      <WeeklyMetricsGrid
        metrics={model?.weeklyPerformance.metrics}
        weekLabel={model?.weeklyPerformance.weekLabel}
        loading={loading}
      />

      <WeeklyHistoryChart
        history={filteredHistory}
        loading={loading}
        selectedWeek={selectedWeek}
        onWeekSelect={handleWeekSelect}
      />

      <WeeklyHistoryTable
        history={filteredHistory}
        currentWeek={model?.weeklyPerformance.currentWeek}
        selectedWeek={selectedWeek}
        onWeekSelect={handleWeekSelect}
        loading={loading}
        visibleWeekRange={visibleWeekRange}
        expandedContent={expandedContent || undefined}
        detailRef={detailRef}
      />
    </div>
  );
}
