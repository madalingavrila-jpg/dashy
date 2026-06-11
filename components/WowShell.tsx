"use client";

import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { WowComparisonBuilder } from "@/components/WowComparisonBuilder";
import { WowReportsList } from "@/components/WowReportsList";
import { useDashboard } from "@/lib/useDashboard";

export function WowShell() {
  const { model, error, loading, sourceHint, targetConfig } = useDashboard();

  return (
    <div className="mx-auto max-w-[1400px] space-y-md">
      <PageHeader
        title="WoW Reports"
        subtitle="Compare any two weeks side-by-side — totals, teams, and agents for each metric."
        updatedAt={model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      <WowComparisonBuilder
        history={model?.weeklyPerformance.history}
        breakdown={model?.weeklyPerformance.statusBreakdown}
        agents={model?.agents}
        currentWeek={model?.weeklyPerformance.currentWeek}
        pausedAgentIds={targetConfig.pausedAgentIds}
        loading={loading}
      />

      {model?.wowReports?.length ? (
        <details className="group">
          <summary className="cursor-pointer list-none rounded-xl border border-outline-variant bg-surface-container-low px-lg py-md text-body-md font-semibold text-on-surface-variant hover:bg-surface-container">
            <span className="inline-flex items-center gap-xs">
              <span className="material-symbols-outlined text-[20px] transition-transform group-open:rotate-90">
                chevron_right
              </span>
              Pre-configured reports ({model.wowReports.length})
            </span>
          </summary>
          <div className="mt-md">
            <WowReportsList reports={model.wowReports} loading={loading} />
          </div>
        </details>
      ) : null}
    </div>
  );
}
