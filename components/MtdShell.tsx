"use client";

import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { MtdProgressCards, TierTrackingTable } from "@/components/MtdPanels";
import { useDashboard } from "@/lib/useDashboard";

export function MtdShell() {
  const { model, error, loading, sourceHint } = useDashboard();

  return (
    <div className="mx-auto max-w-[1400px] space-y-md">
      <PageHeader
        title="MTD & Tiers Tracking"
        subtitle="Month-to-date achievement vs targets, broken down by tier."
        updatedAt={model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      <MtdProgressCards
        month={model?.mtdAchievement.month}
        wonProgress={model?.mtdAchievement.wonProgress}
        activatedProgress={model?.mtdAchievement.activatedProgress}
        targetWon={model?.mtdAchievement.targetWon}
        actualWon={model?.mtdAchievement.actualWon}
        targetActivated={model?.mtdAchievement.targetActivated}
        actualActivated={model?.mtdAchievement.actualActivated}
        loading={loading}
      />

      <TierTrackingTable tiers={model?.mtdAchievement.tiers} loading={loading} />
    </div>
  );
}
