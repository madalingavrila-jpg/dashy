"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { MetricCards } from "@/components/MetricCards";
import { DualFunnelGrid } from "@/components/FunnelPanel";
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
            Full MTD & tiers →
          </Link>
        </div>
        <MetricCards metrics={model?.overviewMetrics} loading={loading} columns={6} />
      </section>

      <section className="space-y-sm">
        <div>
          <p className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
            Year to date
          </p>
          <h2 className="text-body-lg text-on-surface-variant">Cumulative YTD totals</h2>
        </div>
        <MetricCards
          metrics={model?.overviewYtdMetrics}
          loading={loading}
          columns={2}
          compact
        />
      </section>

      <DualFunnelGrid
        sales={model?.snapshot.sales}
        onboarding={model?.snapshot.onboarding}
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
