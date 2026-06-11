"use client";

import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { TeamProgressGrid } from "@/components/TeamProgressPanel";
import { StageBreakdown } from "@/components/StageBreakdown";
import { useDashboard } from "@/lib/useDashboard";

export function PipelineShell() {
  const { model, error, loading, sourceHint } = useDashboard();
  const monthLabel = model?.mtdMonthLabel ?? "Current month";

  return (
    <div className="mx-auto max-w-[1400px] space-y-md">
      <PageHeader
        title="Pipeline & Team Progress"
        subtitle={`${monthLabel} — Complex & Density Won MTD targets, plus stage breakdown.`}
        updatedAt={model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      <TeamProgressGrid
        teams={model?.teamProgress}
        month={monthLabel}
        loading={loading}
      />

      <StageBreakdown sales={model?.snapshot.sales} loading={loading} />
    </div>
  );
}
