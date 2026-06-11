"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { MetricCards } from "@/components/MetricCards";
import { TeamProgressGrid } from "@/components/TeamProgressPanel";
import { WeeklyMetricsGrid } from "@/components/WeeklyCharts";
import { useDashboard } from "@/lib/useDashboard";

export function OverviewShell() {
  const { model, error, loading, sourceHint } = useDashboard();
  const monthLabel = model?.mtdMonthLabel ?? "Current month";

  return (
    <div className="mx-auto max-w-[1400px] space-y-md">
      <PageHeader
        title="Overview Dashboard"
        subtitle={`${monthLabel} month-to-date status — Won and Activated tracked separately.`}
        updatedAt={model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      <section className="space-y-sm">
        <div className="flex flex-wrap items-end justify-between gap-sm">
          <div>
            <p className="text-label-md font-semibold uppercase tracking-wide text-primary">
              Current month · MTD
            </p>
            <h2 className="text-title-lg font-bold text-on-surface">{monthLabel}</h2>
          </div>
          <Link
            href="/mtd"
            className="text-label-md font-medium text-primary hover:underline"
          >
            Full MTD & segments →
          </Link>
        </div>
        <MetricCards metrics={model?.overviewMetrics} loading={loading} columns={6} />
      </section>

      <TeamProgressGrid
        teams={model?.teamProgress}
        month={monthLabel}
        loading={loading}
      />

      <WeeklyMetricsGrid
        metrics={model?.weeklyPerformance.metrics}
        weekLabel={model?.weeklyPerformance.weekLabel}
        loading={loading}
      />
    </div>
  );
}
