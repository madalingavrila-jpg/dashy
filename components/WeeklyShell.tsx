"use client";

import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { WeeklyMetricsGrid, WeeklyHistoryChart } from "@/components/WeeklyCharts";
import { WeeklyHistoryTable } from "@/components/WeeklyHistoryTable";
import { useDashboard } from "@/lib/useDashboard";

export function WeeklyShell() {
  const { model, error, loading, sourceHint } = useDashboard();

  return (
    <div className="mx-auto max-w-[1400px] space-y-md">
      <PageHeader
        title="Weekly Performance"
        subtitle="All ISO weeks in 2026 — current week highlighted. Won and Activated tracked separately."
        updatedAt={model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      <WeeklyMetricsGrid
        metrics={model?.weeklyPerformance.metrics}
        weekLabel={model?.weeklyPerformance.weekLabel}
        loading={loading}
      />

      <WeeklyHistoryChart history={model?.weeklyPerformance.history} loading={loading} />

      <WeeklyHistoryTable
        history={model?.weeklyPerformance.history}
        currentWeek={model?.weeklyPerformance.currentWeek}
        loading={loading}
      />
    </div>
  );
}
