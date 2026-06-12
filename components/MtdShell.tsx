"use client";

import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { MtdProgressCards, TierTrackingTable, MtdSummaryCards } from "@/components/MtdPanels";
import { useDashboard } from "@/lib/useDashboard";

export function MtdShell() {
  const { model, error, loading, sourceHint } = useDashboard({ sections: ["overview", "mtd"] });

  return (
    <div className="mx-auto max-w-[1400px] space-y-md">
      <PageHeader
        title="MTD & Segment Tracking"
        subtitle={`${model?.mtdAchievement.month ?? "Current month"} only — month-to-date production, not year-to-date.`}
        updatedAt={model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      <MtdSummaryCards
        month={model?.mtdAchievement.month}
        leadsMtd={model?.mtdAchievement.leadsMtd}
        qualifiedMtd={model?.mtdAchievement.qualifiedMtd}
        loading={loading}
      />

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
