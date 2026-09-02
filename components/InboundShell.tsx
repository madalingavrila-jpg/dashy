"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { AgentAvatar } from "@/components/AgentAvatar";
import { WeeklyMetricsGrid, WeeklyHistoryChart } from "@/components/WeeklyCharts";
import { AccountsPerformanceTable } from "@/components/AccountsPerformanceTable";
import { WowReportsList } from "@/components/WowReportsList";
import { useDashboard } from "@/lib/useDashboard";
import { fetchMtdDetails } from "@/lib/api";
import { getRepMtdTarget } from "@/lib/targetConfig";
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
  MtdDetails,
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

function RepSection({
  rep,
  loading,
  mtdMonthLabel,
  activatedTarget,
}: {
  rep: InboundRep;
  loading?: boolean;
  mtdMonthLabel: string;
  activatedTarget: number;
}) {
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

  const activatedProgress = activatedTarget
    ? Math.round((rep.mtd.activated / activatedTarget) * 100)
    : 0;
  const kpis = [
    { label: "Won", value: formatInteger(rep.mtd.won), accent: "text-won" },
    {
      label: "Activated",
      value: activatedTarget
        ? `${formatInteger(rep.mtd.activated)} / ${formatInteger(activatedTarget)}`
        : formatInteger(rep.mtd.activated),
      accent: "text-activated",
    },
    { label: "Accounts 90d", value: formatInteger(ap.totals.accounts), accent: "text-on-surface" },
    { label: "GMV gross", value: formatEurCompact(ap.totals.gmv), accent: "text-on-surface" },
  ];

  const weekMetrics = mapWeeklyMetricViews(rep.weekly.metrics);
  const hasMtdItems = rep.mtd.wonItems.length > 0 || rep.mtd.activatedItems.length > 0;

  return (
    <section className="flex flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest">
      <div className="flex flex-wrap items-center justify-between gap-sm border-b border-outline-variant px-md py-sm">
        <div className="flex min-w-0 items-center gap-sm">
          <AgentAvatar name={rep.name} size={36} />
          <div className="min-w-0">
            <h3 className="truncate text-title-md font-bold text-on-surface">{rep.name}</h3>
            <p className="truncate text-[11px] text-on-surface-variant">{rep.email} · Inbound RO</p>
          </div>
        </div>
        <span className="rounded-full bg-activated-container px-sm py-[2px] text-[10px] font-bold text-activated">
          {activatedTarget
            ? `Activation target ${formatInteger(activatedTarget)}`
            : "No activation target"}
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
        {activatedTarget > 0 ? (
          <div className="space-y-xs rounded-lg bg-surface-container-low px-sm py-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-activated">
                {mtdMonthLabel} activation progress
              </span>
              <span className="font-bold tabular-nums text-on-surface">
                {activatedProgress}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-container">
              <div
                className="h-full rounded-full bg-activated"
                style={{ width: `${Math.min(100, activatedProgress)}%` }}
              />
            </div>
          </div>
        ) : null}
        {hasMtdItems ? (
          <CollapseBlock title={`Won / Activated · ${mtdMonthLabel}`} icon="emoji_events">
            <MtdItemList title="Won" items={rep.mtd.wonItems} accent="text-won" />
            <MtdItemList title="Activated" items={rep.mtd.activatedItems} accent="text-activated" />
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
                  className="dashy-select min-w-[160px]"
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
  const { model, error, loading, sourceHint, targetConfig } = useDashboard({
    sections: ["inbound"],
  });
  const inbound = model?.inboundTeam;
  const [selectedMonthKey, setSelectedMonthKey] = useState("");
  const [mtdDetails, setMtdDetails] = useState<MtdDetails | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchMtdDetails(controller.signal)
      .then(setMtdDetails)
      .catch(() => {
        // Counts and targets still render if historical drill-downs are unavailable.
      });
    return () => controller.abort();
  }, []);

  const monthOptions = inbound?.mtdHistory ?? [];
  const activeMonthKey = selectedMonthKey || inbound?.monthKey || "";
  const selectedHistory = monthOptions.find((month) => month.monthKey === activeMonthKey);
  const activeMonthLabel = selectedHistory?.monthLabel ?? inbound?.monthLabel ?? "Current month";

  const displayedReps = useMemo(() => {
    if (!inbound) return [];
    if (!selectedHistory) return inbound.reps;
    const detailMonth = mtdDetails?.months.find((month) => month.monthKey === activeMonthKey);
    const detailsByOwner = new Map(
      detailMonth?.agents.map((agent) => [agent.ownerId, agent]) ?? [],
    );
    const historyByOwner = new Map(selectedHistory.reps.map((rep) => [rep.ownerId, rep]));
    return inbound.reps.map((rep) => {
      const history = historyByOwner.get(rep.ownerId);
      const details = detailsByOwner.get(rep.ownerId);
      return {
        ...rep,
        mtd: {
          won: history?.won ?? 0,
          activated: history?.activated ?? 0,
          wonItems: history?.wonItems.length ? history.wonItems : (details?.wonItems ?? []),
          activatedItems: history?.activatedItems.length
            ? history.activatedItems
            : (details?.activatedItems ?? []),
        },
      };
    });
  }, [inbound, selectedHistory, mtdDetails, activeMonthKey]);

  const activatedTargets = useMemo(
    () =>
      new Map(
        displayedReps.map((rep) => [
          rep.ownerId,
          getRepMtdTarget(targetConfig, rep.ownerId, "activated", 0, activeMonthKey),
        ]),
      ),
    [displayedReps, targetConfig, activeMonthKey],
  );
  const wonTotal = displayedReps.reduce((sum, rep) => sum + rep.mtd.won, 0);
  const activatedTotal = displayedReps.reduce((sum, rep) => sum + rep.mtd.activated, 0);
  const activatedTargetTotal = displayedReps.reduce(
    (sum, rep) => sum + (activatedTargets.get(rep.ownerId) ?? 0),
    0,
  );

  const rollupCards = inbound
    ? [
        { label: "Won", value: formatInteger(wonTotal), icon: "emoji_events" },
        { label: "Activated", value: formatInteger(activatedTotal), icon: "rocket_launch" },
        {
          label: "Activation target",
          value: activatedTargetTotal ? formatInteger(activatedTargetTotal) : "—",
          icon: "flag",
        },
        { label: "Accounts (90d)", value: formatInteger(inbound.totals.accounts90d), icon: "storefront" },
        { label: "GMV gross", value: formatEurCompact(inbound.totals.gmv), icon: "payments" },
        { label: "Commission", value: formatEurCompact(inbound.totals.commission), icon: "percent" },
      ]
    : [];

  return (
    <div className="dashy-page">
      <PageHeader
        title="Inbound team"
        subtitle={`${activeMonthLabel} monthly overview for Ana-Maria Preda & Catalin Corbeanu, with per-rep activation targets.`}
        updatedAt={inbound?.generatedAt ?? model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} updatedAt={model?.updatedAt} />

      {inbound && (
        <div className="dashy-filter-bar justify-between">
          <div className="min-w-0">
            <p className="eyebrow text-brand">Reporting period</p>
            <p className="mt-0.5 text-[13px] text-on-surface-variant">
              Current month is live MTD; past months show final Won and Activated results.
            </p>
          </div>
          <label className="flex min-w-[min(100%,240px)] flex-col gap-1 sm:max-w-xs">
            <span className="eyebrow">Filter by month</span>
            <select
              value={activeMonthKey}
              onChange={(event) => setSelectedMonthKey(event.target.value)}
              disabled={loading || !monthOptions.length}
              className="dashy-select w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {monthOptions.map((month) => (
                <option key={month.monthKey} value={month.monthKey}>
                  {month.monthLabel}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {inbound && (
        <section className="grid grid-cols-3 gap-sm md:grid-cols-6">
          {rollupCards.map((card) => (
            <div key={card.label} className="dashboard-card rounded-xl p-sm">
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
        <div className="dashboard-card h-96 animate-pulse rounded-2xl" />
      )}

      {!inbound && !loading && (
        <div className="dashboard-card rounded-2xl p-lg text-center text-body-md text-on-surface-variant">
          No inbound team data available yet. Run the inbound refresh workflow.
        </div>
      )}

      {inbound && displayedReps.length > 0 && (
        <section className="grid grid-cols-1 gap-md xl:grid-cols-2 xl:items-start">
          {displayedReps.map((rep) => (
            <RepSection
              key={rep.ownerId}
              rep={rep}
              loading={loading}
              mtdMonthLabel={activeMonthLabel}
              activatedTarget={activatedTargets.get(rep.ownerId) ?? 0}
            />
          ))}
        </section>
      )}
    </div>
  );
}
