"use client";

import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { MetricCards } from "@/components/MetricCards";
import { MopsCasesTable } from "@/components/MopsCasesTable";
import { MopsOnboardingTable } from "@/components/MopsOnboardingTable";
import { useDashboard } from "@/lib/useDashboard";

const SF_DASHBOARD_URL =
  "https://boltfood.lightning.force.com/lightning/r/Dashboard/01ZTs000000Bx9dMAC/view";

export function MopsShell() {
  const { model, error, loading, sourceHint } = useDashboard({ sections: ["mops"] });
  const mops = model?.mops;

  return (
    <div className="dashy-page">
      <PageHeader
        title="MOps"
        subtitle="Live onboarding pipeline by agent + open MOps case workload."
        updatedAt={model?.updatedAt}
        loading={loading}
        actions={
          <a
            href={mops?.dashboardUrl ?? SF_DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="dashy-btn dashy-btn-ghost"
          >
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            SF dashboard
          </a>
        }
      />

      <DataAlert error={error} sourceHint={sourceHint} updatedAt={model?.updatedAt} />

      <section className="space-y-sm">
        <div>
          <p className="text-label-md font-semibold uppercase tracking-wide text-primary">
            MOps overview
          </p>
          <p className="text-body-md text-on-surface-variant">
            Live onboarding opportunities and open case workload at a glance.
          </p>
        </div>
        <MetricCards metrics={mops?.metrics} loading={loading} columns={4} />
      </section>

      <section className="space-y-sm">
        <div>
          <p className="text-label-md font-semibold uppercase tracking-wide text-primary">
            Onboarding pipeline (opportunities)
          </p>
          <p className="text-body-md text-on-surface-variant">
            Accounts each agent currently has in onboarding — sales opportunities, not cases.
          </p>
        </div>
        <MopsOnboardingTable
          agents={mops?.onboardingByAgent}
          total={mops?.totalLiveOnboarding}
          loading={loading}
        />
      </section>

      <section className="space-y-sm">
        <div>
          <p className="text-label-md font-semibold uppercase tracking-wide text-primary">
            Ready to Activate (opportunities)
          </p>
          <p className="text-body-md text-on-surface-variant">
            Accounts each agent has finished onboarding and is awaiting go-live — tracked separately
            from the onboarding pipeline above.
          </p>
        </div>
        <MopsOnboardingTable
          agents={mops?.readyToActivateByAgent}
          total={mops?.totalReadyToActivate}
          loading={loading}
          title="Ready to Activate"
          totalSuffix="accounts ready to activate"
          countColLabel="Ready to activate"
          loadingLabel="Loading Ready to Activate data…"
          emptyLabel="No accounts ready to activate for team reps."
          description={
            <>
              Sales opportunities (not cases) — team reps only, opportunities in the
              &ldquo;Ready to Activate&rdquo; stage (onboarding complete, awaiting go-live). Click a
              row to see that agent&apos;s accounts.
            </>
          }
        />
      </section>

      <section className="space-y-sm">
        <div>
          <p className="text-label-md font-semibold uppercase tracking-wide text-primary">
            Case workload (cases)
          </p>
          <p className="text-body-md text-on-surface-variant">
            Open MOps cases only — closed cases are excluded from the views below.
          </p>
        </div>
      </section>

      {mops?.openCaseStatuses?.length ? (
        <div className="dashboard-card rounded-xl p-lg">
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
        <div className="dashboard-card rounded-xl p-lg">
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

      {mops?.openByOwner?.length ? (
        <div className="dashboard-card rounded-xl p-lg">
          <h3 className="mb-md text-title-md font-bold text-on-surface">Open cases by owner</h3>
          <div className="flex flex-wrap gap-sm">
            {mops.openByOwner.map((row) => (
              <div
                key={row.ownerId}
                className="rounded-lg border border-outline-variant/60 bg-surface-container-low px-md py-sm"
              >
                <p className="text-label-md text-on-surface-variant">{row.name}</p>
                <p className="text-title-lg font-bold text-on-surface">{row.count}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <MopsCasesTable cases={mops?.openCasesList} loading={loading} />
    </div>
  );
}
