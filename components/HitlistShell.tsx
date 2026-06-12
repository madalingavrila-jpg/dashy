"use client";

import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { HitlistTable } from "@/components/HitlistTable";
import { useDashboard } from "@/lib/useDashboard";

export function HitlistShell() {
  const { model, error, loading, sourceHint } = useDashboard({ sections: ["overview"] });

  return (
    <div className="mx-auto max-w-[1400px] space-y-md">
      <PageHeader
        title="Hitlist Priority List"
        subtitle="Priority targets from Complex and Density segments."
        updatedAt={model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      <HitlistTable rows={model?.hitlist} loading={loading} />
    </div>
  );
}
