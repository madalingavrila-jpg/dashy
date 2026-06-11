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
        title="Team Progress"
        subtitle={`${monthLabel} — Complex & Density agents with Won and Activated MTD targets.`}
        updatedAt={model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      <TeamProgressGrid
        teams={model?.teamProgress}
        month={monthLabel}
        loading={loading}
      />

      <section className="space-y-sm pt-sm">
        <div>
          <p className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
            Reference
          </p>
          <h2 className="text-title-lg font-bold text-on-surface">Pipeline stage counts</h2>
          <p className="text-body-md text-on-surface-variant">
            Aggregate stage breakdown — click a stage to open filtered accounts in Salesforce.
          </p>
        </div>
        <StageBreakdown sales={model?.snapshot.sales} loading={loading} />
      </section>
    </div>
  );
}
