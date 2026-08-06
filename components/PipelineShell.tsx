"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { TeamProgressGrid } from "@/components/TeamProgressPanel";
import { StageBreakdown } from "@/components/StageBreakdown";
import { MtdProgressCards } from "@/components/MtdPanels";
import { DashyPage, SoftTip } from "@/components/ui/DashyUI";
import { useDashboard } from "@/lib/useDashboard";
import { applyTargetConfig } from "@/lib/targetConfig";
import { fetchMtdDetails } from "@/lib/api";
import {
  applyMtdMonthToModel,
  mergeMtdDetailsIntoHistory,
  mtdMonthOptions,
  resolveDefaultMonthKey,
} from "@/lib/mtdMonth";
import type { MtdDetails } from "@/types/dashboard";

export function PipelineShell() {
  const { baseModel, error, loading, sourceHint, targetConfig } = useDashboard({
    sections: ["overview", "mtd"],
  });
  const [selectedMonthKey, setSelectedMonthKey] = useState("");
  const [mtdDetails, setMtdDetails] = useState<MtdDetails | null>(null);

  // Prior months' drill-down lists are slimmed out of the main payload; fetch
  // the lazy mtd-details section once so every month can show its accounts.
  useEffect(() => {
    const controller = new AbortController();
    fetchMtdDetails(controller.signal)
      .then((details) => setMtdDetails(details))
      .catch(() => {
        // Non-fatal: counts/progress still render; only historical drill-downs stay hidden.
      });
    return () => controller.abort();
  }, []);

  const defaultMonthKey = useMemo(() => resolveDefaultMonthKey(baseModel), [baseModel]);
  const monthOptions = useMemo(() => mtdMonthOptions(baseModel?.mtdHistory), [baseModel?.mtdHistory]);

  useEffect(() => {
    if (defaultMonthKey && !selectedMonthKey) {
      setSelectedMonthKey(defaultMonthKey);
    }
  }, [defaultMonthKey, selectedMonthKey]);

  const activeMonthKey = selectedMonthKey || defaultMonthKey;
  // The default month is the live MTD slice; anything else is a slimmed
  // historical month (final counts; drill-downs come from mtd-details).
  const isLiveMonth = !activeMonthKey || activeMonthKey === defaultMonthKey;

  const detailedModel = useMemo(() => {
    if (!baseModel) return null;
    if (!mtdDetails) return baseModel;
    return {
      ...baseModel,
      mtdHistory: mergeMtdDetailsIntoHistory(baseModel.mtdHistory, mtdDetails),
    };
  }, [baseModel, mtdDetails]);

  const model = useMemo(() => {
    if (!detailedModel) return null;
    const withMonth = activeMonthKey
      ? applyMtdMonthToModel(detailedModel, activeMonthKey)
      : detailedModel;
    return applyTargetConfig(withMonth, targetConfig);
  }, [detailedModel, activeMonthKey, targetConfig]);

  const monthLabel = model?.mtdMonthLabel ?? "Current month";

  return (
    <DashyPage>
      <PageHeader
        title="Monthly Overview"
        subtitle={`${monthLabel} — the Overview team breakdown filtered by month: per-agent Won & Activated vs monthly targets.`}
        updatedAt={model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} updatedAt={model?.updatedAt} />

      <div className="dashy-filter-bar justify-between">
        <div className="min-w-0">
          <p className="eyebrow text-brand">Reporting period</p>
          <p className="mt-0.5 text-[13px] text-on-surface-variant">
            Defaults to the current month (live MTD). Past months show final historical numbers.
          </p>
        </div>
        <label className="flex min-w-[min(100%,240px)] flex-col gap-1 sm:max-w-xs">
          <span className="eyebrow">
            Filter by month
          </span>
          <select
            value={selectedMonthKey || defaultMonthKey}
            onChange={(event) => setSelectedMonthKey(event.target.value)}
            disabled={loading || !monthOptions.length}
            className="dashy-select w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <MtdProgressCards
        month={monthLabel}
        wonProgress={model?.mtdAchievement.wonProgress}
        activatedProgress={model?.mtdAchievement.activatedProgress}
        targetWon={model?.mtdAchievement.targetWon}
        actualWon={model?.mtdAchievement.actualWon}
        targetActivated={model?.mtdAchievement.targetActivated}
        actualActivated={model?.mtdAchievement.actualActivated}
        loading={loading}
      />

      {!isLiveMonth ? (
        <SoftTip>
          <span className="font-semibold text-on-surface">{monthLabel}</span> — final historical
          numbers. Click an agent&apos;s Won or Activated count to see that month&apos;s accounts.
        </SoftTip>
      ) : null}

      <TeamProgressGrid
        teams={model?.teamProgress}
        month={monthLabel}
        loading={loading}
        variant="detailed"
        salesforceUrl={model?.salesforceInstanceUrl}
      />

      <details className="dashboard-card group overflow-hidden">
        <summary className="cursor-pointer list-none px-lg py-md [&::-webkit-details-marker]:hidden">
          <div className="flex items-center justify-between gap-sm">
            <div>
              <p className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
                Reference
              </p>
              <p className="text-body-md font-semibold text-on-surface">
                Pipeline stage counts (collapsed)
              </p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant transition group-open:rotate-180">
              expand_more
            </span>
          </div>
        </summary>
        <div className="border-t border-outline-variant/60 px-lg pb-lg pt-md">
          <p className="mb-md text-body-md text-on-surface-variant">
            Aggregate stage breakdown — click a stage to open filtered accounts in Salesforce.
          </p>
          <StageBreakdown sales={model?.snapshot.sales} loading={loading} />
        </div>
      </details>
    </DashyPage>
  );
}
