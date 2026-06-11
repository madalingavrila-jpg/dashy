"use client";

import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { MetricCards } from "@/components/MetricCards";
import { DualFunnelGrid } from "@/components/FunnelPanel";
import { StageBreakdown } from "@/components/StageBreakdown";
import { useDashboard } from "@/lib/useDashboard";

export function PipelineShell() {
  const { model, error, loading, sourceHint } = useDashboard();

  return (
    <div className="mx-auto max-w-[1400px] space-y-md">
      <PageHeader
        title="Pipeline Funnel View"
        subtitle="Dual funnel — commercial Won vs operational Activated."
        updatedAt={model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      <div className="grid grid-cols-1 gap-md md:grid-cols-2">
        <MetricCards metrics={model?.totals.won ? [model.totals.won] : []} loading={loading} columns={2} />
        <MetricCards
          metrics={model?.totals.activated ? [model.totals.activated] : []}
          loading={loading}
          columns={2}
        />
      </div>

      <DualFunnelGrid
        sales={model?.snapshot.sales}
        onboarding={model?.snapshot.onboarding}
        loading={loading}
      />

      <StageBreakdown sales={model?.snapshot.sales} loading={loading} />
    </div>
  );
}
