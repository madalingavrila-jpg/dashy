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
        subtitle={`${monthLabel} — Complex Team & Density Team with Won and Activated MTD targets.`}
        updatedAt={model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      <TeamProgressGrid
        teams={model?.teamProgress}
        month={monthLabel}
        loading={loading}
        variant="detailed"
      />

      <details className="group rounded-xl border border-outline-variant/60 bg-surface-container-low/30">
        <summary className="cursor-pointer list-none px-lg py-md [&::-webkit-details-marker]:hidden">
          <div className="flex items-center justify-between gap-sm">
            <div>
              <p className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
                Reference
              </p>
              <p className="text-body-md font-semibold text-on-surface">
                Pipeline stage counts (collapsed)
              </p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant transition group-open:rotate-180">
              expand_more
            </span>
          </div>
        </summary>
        <div className="border-t border-outline-variant/60 px-lg pb-lg pt-md">
          <p className="mb-md text-body-md text-on-surface-variant">
            Aggregate stage breakdown — click a stage to open filtered accounts in Salesforce.
          </p>
          <StageBreakdown sales={model?.snapshot.sales} loading={loading} />
        </div>
      </details>
    </div>
  );
}
