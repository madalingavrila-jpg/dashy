"use client";

import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { WowComparisonBuilder } from "@/components/WowComparisonBuilder";
import { WowReportsList } from "@/components/WowReportsList";
import { WowYtdTrendChart } from "@/components/WowYtdTrendChart";
import { useDashboard } from "@/lib/useDashboard";
import { useFilteredWeeklyHistory } from "@/lib/useFilteredWeeklyHistory";
import { DashyPage } from "@/components/ui/DashyUI";

export function WowShell() {
  const { model, error, loading, sourceHint, targetConfig } = useDashboard({
    sections: ["overview", "weekly", "agents"],
  });
  const { history: filteredHistory, statusBreakdown: filteredBreakdown } = useFilteredWeeklyHistory(
    model?.weeklyPerformance,
  );

  return (
    <DashyPage>
      <PageHeader
        title="WoW Reports"
        subtitle="YTD Closed Won vs Active trend chart below · compare any two weeks side-by-side."
        updatedAt={model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} updatedAt={model?.updatedAt} />

      <WowYtdTrendChart history={filteredHistory} loading={loading} />

      <WowComparisonBuilder
        history={filteredHistory}
        breakdown={filteredBreakdown}
        agents={model?.agents}
        currentWeek={model?.weeklyPerformance.currentWeek}
        pausedAgentIds={targetConfig.pausedAgentIds}
        loading={loading}
      />

      {model?.wowReports?.length ? (
        <details className="dashboard-card group overflow-hidden">
          <summary className="cursor-pointer list-none px-lg py-md text-body-md font-semibold text-on-surface-variant hover:bg-surface-container-low/60">
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
    </DashyPage>
  );
}
