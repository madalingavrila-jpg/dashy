"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { WeeklyMetricsGrid, WeeklyHistoryChart } from "@/components/WeeklyCharts";
import { AccountsPerformanceTable } from "@/components/AccountsPerformanceTable";
import { WowReportsList } from "@/components/WowReportsList";
import { useDashboard } from "@/lib/useDashboard";
import {
  formatInteger,
  formatSignedDelta,
  formatSignedPct,
  pctChange,
  trendDirection,
} from "@/lib/format";
import { formatWeekLabel } from "@/lib/weekDateRange";
import type {
  InboundRep,
  WeeklyMetric,
  WeeklyMetricView,
  WowReportView,
} from "@/types/dashboard";

function formatEur(value: number): string {
  const abs = Math.abs(value);
  const digits = abs > 0 && abs < 100 ? 1 : 0;
  return `€${new Intl.NumberFormat("en-IE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)}`;
}

function formatEurCompact(value: number): string {
  return `€${new Intl.NumberFormat("en-IE", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)}`;
}

function monthLabel(month: string): string {
  const [year, mo] = month.split("-").map(Number);
  if (!year || !mo) return month;
  return new Date(year, mo - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

function mapWeeklyMetricViews(metrics: WeeklyMetric[]): WeeklyMetricView[] {
  return metrics.map((metric) => {
    const changePercent = metric.changePercent ?? pctChange(metric.value, metric.previousValue ?? 0);
    return {
      label: metric.label,
      value: formatInteger(metric.value),
      priorValue: formatInteger(metric.previousValue ?? 0),
      delta: formatSignedDelta(metric.value, metric.previousValue ?? 0),
      change: formatSignedPct(changePercent),
      trend: trendDirection(changePercent),
    };
  });
}

function repWowReport(rep: InboundRep): WowReportView {
  return {
    id: `inbound-wow-${rep.ownerId}`,
    title: `${rep.name} — Week over week`,
    description: "Inbound production: current ISO week vs prior week (actuals).",
    currentWeek: formatWeekLabel(rep.wow.currentWeek),
    priorWeek: formatWeekLabel(rep.wow.priorWeek),
    rows: rep.wow.rows.map((row) => ({
      metric: row.metric,
      current: formatInteger(row.current),
      prior: formatInteger(row.prior),
      change: formatSignedPct(row.changePercent),
      trend: trendDirection(row.changePercent),
    })),
  };
}

function MtdItemList({ title, items, accent }: { title: string; items: { id: string; name: string; city: string; closeDate: string }[]; accent: string }) {
  if (!items.length) return null;
  return (
    <div>
      <p className={`mb-xs text-[10px] font-bold uppercase tracking-wide ${accent}`}>
        {title} ({items.length})
      </p>
      <div className="flex flex-wrap gap-xs">
        {items.map((item) => (
          <span
            key={item.id}
            className="rounded-md border border-outline-variant/60 bg-surface px-sm py-xs text-[11px] text-on-surface"
            title={`${item.name}${item.city && item.city !== "—" ? ` · ${item.city}` : ""} · ${item.closeDate}`}
          >
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function RepSection({ rep, loading }: { rep: InboundRep; loading?: boolean }) {
  const ap = rep.accountsPerformance;
  const months = useMemo(() => ap.byMonth.map((m) => m.month), [ap]);
  const [monthChoice, setMonthChoice] = useState<string>("");
  const selectedMonth =
    monthChoice && months.includes(monthChoice)
      ? monthChoice
      : (ap.dataMonthMax ?? months[months.length - 1] ?? "");

  const accounts = useMemo(
    () =>
      ap.accounts
        .slice()
        .sort((a, b) => {
          const am = a.monthly.find((m) => m.month === selectedMonth)?.gmv ?? 0;
          const bm = b.monthly.find((m) => m.month === selectedMonth)?.gmv ?? 0;
          return bm - am || b.totalGmv - a.totalGmv;
        }),
    [ap.accounts, selectedMonth],
  );

  const cards = [
    { label: "Won MTD", value: formatInteger(rep.mtd.won), icon: "emoji_events", accent: "text-won" },
    { label: "Activated MTD", value: formatInteger(rep.mtd.activated), icon: "rocket_launch", accent: "text-activated" },
    { label: "Accounts (90d)", value: formatInteger(ap.totals.accounts), icon: "storefront", accent: "text-on-surface" },
    { label: "GMV (launch → date)", value: formatEurCompact(ap.totals.gmv), icon: "payments", accent: "text-on-surface" },
    { label: "Orders", value: formatInteger(ap.totals.orders), icon: "receipt_long", accent: "text-on-surface" },
    { label: "Commission", value: formatEurCompact(ap.totals.commission), icon: "percent", accent: "text-on-surface" },
  ];

  const weekMetrics = mapWeeklyMetricViews(rep.weekly.metrics);

  return (
    <section className="space-y-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-lg">
      <div className="flex flex-wrap items-center justify-between gap-sm border-b border-outline-variant pb-sm">
        <div className="flex items-center gap-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container/50 text-on-secondary-container">
            <span className="material-symbols-outlined">person</span>
          </span>
          <div>
            <h3 className="text-title-lg font-title-lg font-bold text-on-surface">{rep.name}</h3>
            <p className="text-label-md text-on-surface-variant">{rep.email} · Inbound RO</p>
          </div>
        </div>
        <span className="rounded-full bg-secondary-container/40 px-sm py-[2px] text-[11px] font-bold text-on-secondary-container">
          Actuals only · no target
        </span>
      </div>

      <div className="grid grid-cols-2 gap-md md:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => (
          <div key={card.label} className="glass-card rounded-xl p-md">
            <div className="flex items-center gap-xs text-on-surface-variant">
              <span className={`material-symbols-outlined text-[18px] ${card.accent}`}>{card.icon}</span>
              <p className="text-label-md font-label-md">{card.label}</p>
            </div>
            <h4 className="mt-xs text-headline-md font-headline-md font-extrabold text-on-surface">
              {loading && !rep ? "…" : card.value}
            </h4>
          </div>
        ))}
      </div>

      {(rep.mtd.wonItems.length > 0 || rep.mtd.activatedItems.length > 0) && (
        <div className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-low p-md md:flex-row md:gap-lg">
          <MtdItemList title="Won this month" items={rep.mtd.wonItems} accent="text-won" />
          <MtdItemList title="Activated this month" items={rep.mtd.activatedItems} accent="text-activated" />
        </div>
      )}

      <div className="space-y-sm">
        <p className="text-label-md font-semibold uppercase tracking-wide text-primary">Weekly performance</p>
        <WeeklyMetricsGrid metrics={weekMetrics} loading={loading} />
        <WeeklyHistoryChart history={rep.weekly.history} loading={loading} />
      </div>

      <div className="space-y-sm">
        <p className="text-label-md font-semibold uppercase tracking-wide text-primary">Week over week</p>
        <WowReportsList reports={[repWowReport(rep)]} loading={loading} />
      </div>

      <div className="space-y-sm">
        <div className="flex flex-wrap items-end justify-between gap-sm">
          <p className="text-label-md font-semibold uppercase tracking-wide text-primary">
            Accounts performance · activated last 90 days
          </p>
          {months.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                Month (table breakdown)
              </label>
              <select
                value={selectedMonth}
                onChange={(event) => setMonthChoice(event.target.value)}
                className="min-w-[160px] rounded-lg border border-outline-variant bg-surface-container px-md py-sm text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {months.map((month) => (
                  <option key={month} value={month}>
                    {monthLabel(month)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <AccountsPerformanceTable
          accounts={accounts}
          selectedMonth={selectedMonth}
          monthLabel={monthLabel}
          formatEur={formatEur}
          formatInt={formatInteger}
          dataMonthMax={ap.dataMonthMax}
          loading={loading}
        />
      </div>
    </section>
  );
}

export function InboundShell() {
  const { model, error, loading, sourceHint } = useDashboard({ sections: ["inbound"] });
  const inbound = model?.inboundTeam;

  const rollupCards = inbound
    ? [
        { label: "Reps", value: formatInteger(inbound.totals.reps), icon: "groups" },
        { label: "Won MTD", value: formatInteger(inbound.totals.wonMtd), icon: "emoji_events" },
        { label: "Activated MTD", value: formatInteger(inbound.totals.activatedMtd), icon: "rocket_launch" },
        { label: "Accounts (90d)", value: formatInteger(inbound.totals.accounts90d), icon: "storefront" },
        { label: "GMV (launch → date)", value: formatEurCompact(inbound.totals.gmv), icon: "payments" },
        { label: "Commission", value: formatEurCompact(inbound.totals.commission), icon: "percent" },
      ]
    : [];

  return (
    <div className="mx-auto max-w-[1500px] space-y-lg">
      <PageHeader
        title="Inbound team"
        subtitle="Ana-Maria Preda & Catalin Corbeanu — inbound RO, broken down per person. Overview, weekly, WoW and accounts performance — actuals only."
        updatedAt={inbound?.generatedAt ?? model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      {inbound && (
        <section className="grid grid-cols-2 gap-md md:grid-cols-3 lg:grid-cols-6">
          {rollupCards.map((card) => (
            <div key={card.label} className="glass-card rounded-xl p-md">
              <div className="flex items-center gap-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px] text-primary">{card.icon}</span>
                <p className="text-label-md font-label-md">{card.label}</p>
              </div>
              <h3 className="mt-xs text-headline-md font-headline-md font-extrabold text-on-surface">
                {card.value}
              </h3>
            </div>
          ))}
        </section>
      )}

      {!inbound && loading && (
        <div className="glass-card h-96 animate-pulse rounded-2xl" />
      )}

      {!inbound && !loading && (
        <div className="glass-card rounded-2xl p-lg text-center text-body-md text-on-surface-variant">
          No inbound team data available yet. Run the inbound refresh workflow.
        </div>
      )}

      {(inbound?.reps ?? []).map((rep) => (
        <RepSection key={rep.ownerId} rep={rep} loading={loading} />
      ))}
    </div>
  );
}
