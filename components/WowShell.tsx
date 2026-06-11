"use client";

import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { WowComparisonBuilder } from "@/components/WowComparisonBuilder";
import { WowReportsList } from "@/components/WowReportsList";
import { WowYtdTrendChart } from "@/components/WowYtdTrendChart";
import { useDashboard } from "@/lib/useDashboard";

export function WowShell() {
  const { model, error, loading, sourceHint, targetConfig } = useDashboard();

  return (
    <div className="mx-auto max-w-[1400px] space-y-md">
      <PageHeader
        title="WoW Reports"
        subtitle="YTD Closed Won vs Active trend chart below · compare any two weeks side-by-side."
        updatedAt={model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      <WowYtdTrendChart history={model?.weeklyPerformance.history} loading={loading} />

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
