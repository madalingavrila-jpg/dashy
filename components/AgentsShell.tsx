"use client";

import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { AgentsTable } from "@/components/AgentsTable";
import { useDashboard } from "@/lib/useDashboard";
import { formatTargetSummary } from "@/lib/targetConfig";

export function AgentsShell() {
  const { model, error, loading, sourceHint, targetConfig } = useDashboard({ sections: ["agents"] });

  return (
    <div className="mx-auto max-w-[1400px] space-y-md">
      <PageHeader
        title="Sales Agents"
        subtitle="All Romania opportunity owners — drill down to accounts in a new tab."
        updatedAt={model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      <AgentsTable
        agents={model?.agents}
        targetSummary={formatTargetSummary(targetConfig)}
        loading={loading}
      />
    </div>
  );
}
