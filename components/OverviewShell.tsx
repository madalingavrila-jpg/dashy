"use client";

import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { MetricCards } from "@/components/MetricCards";
import { DualFunnelGrid } from "@/components/FunnelPanel";
import { WeeklyMetricsGrid } from "@/components/WeeklyCharts";
import { useDashboard } from "@/lib/useDashboard";

export function OverviewShell() {
  const { model, error, loading, sourceHint } = useDashboard();

  return (
    <div className="mx-auto max-w-[1400px] space-y-md">
      <PageHeader
        title="Overview Dashboard"
        subtitle="URads sales pipeline snapshot — Won and Activated tracked separately."
        updatedAt={model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      <MetricCards metrics={model?.overviewMetrics} loading={loading} columns={6} />

      <DualFunnelGrid
        sales={model?.snapshot.sales}
        onboarding={model?.snapshot.onboarding}
        loading={loading}
      />

      <WeeklyMetricsGrid
        metrics={model?.weeklyPerformance.metrics}
        weekLabel={model?.weeklyPerformance.weekLabel}
        loading={loading}
      />
    </div>
  );
}
