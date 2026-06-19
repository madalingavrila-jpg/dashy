"use client";

import { useMemo, useState, type ReactNode } from "react";
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

function CollapseBlock({
  title,
  icon,
  defaultOpen = false,
  hint,
  children,
}: {
  title: string;
  icon: string;
  defaultOpen?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-outline-variant/70 bg-surface-container-low">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-sm rounded-xl px-md py-sm text-left transition-colors hover:bg-primary-container/15"
      >
        <span className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">
            {icon}
          </span>
          <span className="text-label-md font-semibold uppercase tracking-wide text-primary">
            {title}
          </span>
          {hint ? (
            <span className="text-[11px] font-normal normal-case text-on-surface-variant">{hint}</span>
          ) : null}
        </span>
        <span
          className={`material-symbols-outlined text-[20px] text-primary transition-transform ${
            open ? "rotate-90" : ""
          }`}
          aria-hidden="true"
        >
          chevron_right
        </span>
      </button>
      {open ? <div className="space-y-sm border-t border-outline-variant/60 px-md py-md">{children}</div> : null}
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

  const kpis = [
    { label: "Won MTD", value: formatInteger(rep.mtd.won), accent: "text-won" },
    { label: "Active MTD", value: formatInteger(rep.mtd.activated), accent: "text-activated" },
    { label: "Accounts 90d", value: formatInteger(ap.totals.accounts), accent: "text-on-surface" },
    { label: "GMV", value: formatEurCompact(ap.totals.gmv), accent: "text-on-surface" },
  ];

  const weekMetrics = mapWeeklyMetricViews(rep.weekly.metrics);
  const hasMtdItems = rep.mtd.wonItems.length > 0 || rep.mtd.activatedItems.length > 0;

  return (
    <section className="flex flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest">
      <div className="flex flex-wrap items-center justify-between gap-sm border-b border-outline-variant px-md py-sm">
        <div className="flex min-w-0 items-center gap-sm">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-container/50 text-on-secondary-container">
            <span className="material-symbols-outlined text-[20px]">person</span>
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-title-md font-bold text-on-surface">{rep.name}</h3>
            <p className="truncate text-[11px] text-on-surface-variant">{rep.email} · Inbound RO</p>
          </div>
        </div>
        <span className="rounded-full bg-secondary-container/40 px-sm py-[2px] text-[10px] font-bold text-on-secondary-container">
          Actuals only
        </span>
      </div>

      <div className="grid grid-cols-2 gap-sm border-b border-outline-variant px-md py-sm sm:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-lg bg-surface-container-low px-sm py-xs">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
              {kpi.label}
            </p>
            <p className={`text-title-md font-extrabold tabular-nums ${kpi.accent}`}>
              {loading && !rep ? "…" : kpi.value}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-sm px-md py-sm">
        {hasMtdItems ? (
          <CollapseBlock title="Won / Activated this month" icon="emoji_events">
            <MtdItemList title="Won this month" items={rep.mtd.wonItems} accent="text-won" />
            <MtdItemList title="Activated this month" items={rep.mtd.activatedItems} accent="text-activated" />
          </CollapseBlock>
        ) : null}

        <CollapseBlock title="Weekly performance" icon="show_chart" defaultOpen>
          <WeeklyMetricsGrid metrics={weekMetrics} loading={loading} />
          <WeeklyHistoryChart history={rep.weekly.history} loading={loading} />
        </CollapseBlock>

        <CollapseBlock title="Week over week" icon="compare_arrows">
          <WowReportsList reports={[repWowReport(rep)]} loading={loading} />
        </CollapseBlock>

        <CollapseBlock
          title="Accounts performance"
          icon="storefront"
          hint="activated last 90 days"
        >
          <div className="flex flex-wrap items-end justify-end gap-sm">
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
        </CollapseBlock>
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
    <div className="mx-auto max-w-[1500px] space-y-md">
      <PageHeader
        title="Inbound team"
        subtitle="Ana-Maria Preda & Catalin Corbeanu — inbound RO, side by side. Expand weekly, WoW and accounts per rep — actuals only."
        updatedAt={inbound?.generatedAt ?? model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      {inbound && (
        <section className="grid grid-cols-3 gap-sm md:grid-cols-6">
          {rollupCards.map((card) => (
            <div key={card.label} className="glass-card rounded-xl p-sm">
              <div className="flex items-center gap-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-primary">{card.icon}</span>
                <p className="text-[10px] font-semibold uppercase tracking-wide leading-tight">{card.label}</p>
              </div>
              <h3 className="mt-xs text-title-lg font-extrabold tabular-nums text-on-surface">
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

      {inbound && inbound.reps.length > 0 && (
        <section className="grid grid-cols-1 gap-md xl:grid-cols-2 xl:items-start">
          {inbound.reps.map((rep) => (
            <RepSection key={rep.ownerId} rep={rep} loading={loading} />
          ))}
        </section>
      )}
    </div>
  );
}
