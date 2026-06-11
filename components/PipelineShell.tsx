"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { TeamProgressGrid } from "@/components/TeamProgressPanel";
import { StageBreakdown } from "@/components/StageBreakdown";
import { useDashboard } from "@/lib/useDashboard";
import { applyTargetConfig } from "@/lib/targetConfig";
import {
  applyMtdMonthToModel,
  mtdMonthOptions,
  resolveDefaultMonthKey,
} from "@/lib/mtdMonth";

export function PipelineShell() {
  const { baseModel, error, loading, sourceHint, targetConfig } = useDashboard();
  const [selectedMonthKey, setSelectedMonthKey] = useState("");

  const defaultMonthKey = useMemo(() => resolveDefaultMonthKey(baseModel), [baseModel]);
  const monthOptions = useMemo(() => mtdMonthOptions(baseModel?.mtdHistory), [baseModel?.mtdHistory]);

  useEffect(() => {
    if (defaultMonthKey && !selectedMonthKey) {
      setSelectedMonthKey(defaultMonthKey);
    }
  }, [defaultMonthKey, selectedMonthKey]);

  const model = useMemo(() => {
    if (!baseModel) return null;
    const monthKey = selectedMonthKey || defaultMonthKey;
    const withMonth = monthKey ? applyMtdMonthToModel(baseModel, monthKey) : baseModel;
    return applyTargetConfig(withMonth, targetConfig);
  }, [baseModel, defaultMonthKey, selectedMonthKey, targetConfig]);

  const monthLabel = model?.mtdMonthLabel ?? "Current month";

  return (
    <div className="mx-auto max-w-[1400px] space-y-md">
      <PageHeader
        title="Team Progress"
        subtitle={`${monthLabel} — Complex Team & Density Team with Won and Activated MTD targets.`}
        updatedAt={model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      <div className="flex flex-col gap-xs sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-label-md font-semibold uppercase tracking-wide text-primary">
            Month
          </p>
          <p className="text-body-md text-on-surface-variant">
            Defaults to the current month on first open. Past months use cached Salesforce won exports.
          </p>
        </div>
        <label className="flex min-w-[min(100%,280px)] flex-col gap-xs sm:max-w-xs">
          <span className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
            MTD month
          </span>
          <select
            value={selectedMonthKey || defaultMonthKey}
            onChange={(event) => setSelectedMonthKey(event.target.value)}
            disabled={loading || !monthOptions.length}
            className="w-full rounded-lg border-2 border-primary/30 bg-white px-md py-2.5 text-body-md font-medium text-on-surface shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <TeamProgressGrid
        teams={model?.teamProgress}
        month={monthLabel}
        loading={loading}
        variant="detailed"
        salesforceUrl={model?.salesforceInstanceUrl}
      />

      <details className="group rounded-xl border border-outline-variant/60 bg-surface-container-low/30">
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
    </div>
  );
}
