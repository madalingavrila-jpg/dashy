"use client";

import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { SettingsPanels } from "@/components/SettingsPanels";
import { TargetSettingsPanel } from "@/components/TargetSettingsPanel";
import { useDashboard } from "@/lib/useDashboard";

export function SettingsShell() {
  const { model, error, loading, sourceHint } = useDashboard();

  return (
    <div className="mx-auto max-w-[1400px] space-y-md">
      <PageHeader
        title="Settings & Admin"
        subtitle="Integration status and MTD target configuration."
        updatedAt={model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      <div className="grid grid-cols-1 gap-md xl:grid-cols-2">
        <SettingsPanels
          timezone={model?.settings.timezone}
          locale={model?.settings.locale}
          integrations={model?.settings.integrations}
          sources={model?.sources}
          loading={loading}
        />
        <TargetSettingsPanel agents={model?.agents} loading={loading} />
      </div>
    </div>
  );
}
