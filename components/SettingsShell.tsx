"use client";

import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { SettingsPanels } from "@/components/SettingsPanels";
import { useDashboard } from "@/lib/useDashboard";

export function SettingsShell() {
  const { model, error, loading, sourceHint } = useDashboard();

  return (
    <div className="mx-auto max-w-[1400px] space-y-md">
      <PageHeader
        title="Settings & Admin"
        subtitle="Read-only deployment and integration status — no authentication."
        updatedAt={model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      <SettingsPanels
        timezone={model?.settings.timezone}
        locale={model?.settings.locale}
        integrations={model?.settings.integrations}
        sources={model?.sources}
        loading={loading}
      />
    </div>
  );
}
