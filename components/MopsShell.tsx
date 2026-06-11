"use client";

import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { MetricCards } from "@/components/MetricCards";
import { StageBreakdown } from "@/components/StageBreakdown";
import { MopsOnboardingTable } from "@/components/MopsOnboardingTable";
import { useDashboard } from "@/lib/useDashboard";

const SF_DASHBOARD_URL =
  "https://boltfood.lightning.force.com/lightning/r/Dashboard/01ZTs000000Bx9dMAC/view";

export function MopsShell() {
  const { model, error, loading, sourceHint } = useDashboard();
  const mops = model?.mops;

  return (
    <div className="mx-auto max-w-[1400px] space-y-md">
      <PageHeader
        title="MOps"
        subtitle="Open case workload — non-closed MOps cases only. Onboarding pipeline below is sales opportunities, not cases."
        updatedAt={model?.updatedAt}
        loading={loading}
        actions={
          <a
            href={mops?.dashboardUrl ?? SF_DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm text-label-md font-medium text-primary transition hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            SF dashboard
          </a>
        }
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      <section className="space-y-sm">
        <div>
          <p className="text-label-md font-semibold uppercase tracking-wide text-primary">
            {mops?.dashboardTitle ?? "[MOps] Open cases"}
          </p>
          <p className="text-body-md text-on-surface-variant">
            Open MOps cases only — closed cases are excluded from this view.
          </p>
        </div>
        <MetricCards metrics={mops?.metrics} loading={loading} columns={4} />
      </section>

      {mops?.openCaseStatuses?.length ? (
        <div className="glass-card rounded-xl p-lg">
          <h3 className="mb-md text-title-md font-bold text-on-surface">Open cases by status</h3>
          <div className="flex flex-wrap gap-sm">
            {mops.openCaseStatuses.map((row) => (
              <div
                key={row.status}
                className="rounded-lg border border-outline-variant/60 bg-surface-container-low px-md py-sm"
              >
                <p className="text-label-md text-on-surface-variant">{row.status}</p>
                <p className="text-title-lg font-bold text-on-surface">{row.count}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {mops?.openCaseRecordTypes?.length ? (
        <div className="glass-card rounded-xl p-lg">
          <h3 className="mb-md text-title-md font-bold text-on-surface">
            Open cases by record type
          </h3>
          <div className="flex flex-wrap gap-sm">
            {mops.openCaseRecordTypes.map((row) => (
              <div
                key={row.recordType}
                className="rounded-lg border border-outline-variant/60 bg-surface-container-low px-md py-sm"
              >
                <p className="text-label-md text-on-surface-variant">{row.recordType}</p>
                <p className="text-title-lg font-bold text-on-surface">{row.count}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {mops?.onboardingPipeline?.length ? (
        <div className="glass-card rounded-xl p-lg border border-outline-variant/40">
          <p className="mb-xs text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
            Sales opportunities · not cases
          </p>
          <h3 className="mb-xs text-title-md font-bold text-on-surface">
            Onboarding pipeline ({mops.totalLiveOnboarding ?? "—"} team opps)
          </h3>
          <p className="mb-md text-body-md text-on-surface-variant">
            Romania team opps in Contract sent through Ready to Activate — excludes Activated.
          </p>
          <StageBreakdown sales={mops.onboardingPipeline} loading={loading} />
        </div>
      ) : null}

      <MopsOnboardingTable agents={mops?.onboardingByAgent} loading={loading} />
    </div>
  );
}
