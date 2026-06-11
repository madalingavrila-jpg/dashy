"use client";

import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { WowReportsList } from "@/components/WowReportsList";
import { useDashboard } from "@/lib/useDashboard";

export function WowShell() {
  const { model, error, loading, sourceHint } = useDashboard();

  return (
    <div className="mx-auto max-w-[1400px] space-y-md">
      <PageHeader
        title="WoW Reports Builder"
        subtitle="Pre-configured week-over-week comparisons from dashboard data (read-only display)."
        updatedAt={model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-md py-sm text-body-md text-on-surface-variant">
        Reports are defined in <code className="text-primary">data/dashboard.json</code> under{" "}
        <code className="text-primary">salesPipeline.wowReports</code>. Update via Cursor agent
        workflow — no manual builder on Boltable.
      </div>

      <WowReportsList reports={model?.wowReports} loading={loading} />
    </div>
  );
}
