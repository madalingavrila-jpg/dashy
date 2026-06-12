"use client";

import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { SettingsPanels } from "@/components/SettingsPanels";
import { TargetSettingsPanel } from "@/components/TargetSettingsPanel";
import { useDashboard } from "@/lib/useDashboard";

export function SettingsShell() {
  const { model, error, loading, sourceHint } = useDashboard({
    sections: ["overview", "mtd", "weekly", "agents"],
  });

  return (
    <div className="mx-auto max-w-[1400px] space-y-md">
      <PageHeader
        title="Settings & Admin"
        subtitle="MTD + Weekly status targets at the top (password required). Integrations below."
        updatedAt={model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      <section id="mtd-targets" aria-labelledby="mtd-targets-heading">
        <TargetSettingsPanel
          agents={model?.agents}
          loading={loading}
          mtdHistory={model?.mtdHistory}
          weeklyHistory={model?.weeklyPerformance.history}
          currentWeek={model?.weeklyPerformance.currentWeek}
        />
      </section>

      <div className="grid grid-cols-1 gap-md xl:grid-cols-2">
        <SettingsPanels
          timezone={model?.settings.timezone}
          locale={model?.settings.locale}
          integrations={model?.settings.integrations}
          sources={model?.sources}
          updatedAt={model?.updatedAt}
          loading={loading}
        />
      </div>
    </div>
  );
}
