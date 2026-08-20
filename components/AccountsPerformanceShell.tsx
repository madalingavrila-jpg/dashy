"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { AccountsPerformanceTable } from "@/components/AccountsPerformanceTable";
import { useDashboard } from "@/lib/useDashboard";
import { formatInteger } from "@/lib/format";
import type { AccountsPerformanceAccount } from "@/types/dashboard";

type AgentFilter = "all" | "seg:complex" | "seg:density" | `agent:${string}`;

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

export function AccountsPerformanceShell() {
  const { model, error, loading, sourceHint } = useDashboard({
    sections: ["accounts-performance"],
  });
  const ap = model?.accountsPerformance;

  const [agentFilter, setAgentFilter] = useState<AgentFilter>("all");
  const [monthChoice, setMonthChoice] = useState<string>("");

  // The accountsPerformance dataset is now YEAR-TO-DATE (it feeds the Accounts
  // performance MOM tab's full activation-month cohorts). This original tab keeps
  // its trailing-window contract by filtering, client-side, to accounts activated
  // in the last `windowDays` days — so it looks exactly as before the YTD expansion.
  const windowDays = ap?.windowDays ?? 90;
  const windowedAccounts = useMemo<AccountsPerformanceAccount[]>(() => {
    const accounts = ap?.accounts ?? [];
    if (!accounts.length) return accounts;
    const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    return accounts.filter((a) => {
      if (!a.launchDate) return false;
      const t = Date.parse(a.launchDate);
      return Number.isNaN(t) ? false : t >= cutoff;
    });
  }, [ap, windowDays]);

  // Months present in the windowed set (drives the selector + GMV bar chart).
  const months = useMemo(() => {
    const set = new Set<string>();
    for (const a of windowedAccounts) for (const m of a.monthly) set.add(m.month);
    return [...set].sort((x, y) => x.localeCompare(y));
  }, [windowedAccounts]);

  const selectedMonth =
    monthChoice && months.includes(monthChoice)
      ? monthChoice
      : (months[months.length - 1] ?? "");

  // Agent summaries recomputed from the windowed set so the dropdown counts match.
  const windowAgents = useMemo(() => {
    const map = new Map<string, { agentId: string; name: string; segment: string; accounts: number }>();
    for (const a of windowedAccounts) {
      if (!map.has(a.agentId)) {
        map.set(a.agentId, { agentId: a.agentId, name: a.agentName, segment: a.segment, accounts: 0 });
      }
      map.get(a.agentId)!.accounts += 1;
    }
    return [...map.values()].sort((x, y) => y.accounts - x.accounts);
  }, [windowedAccounts]);

  const complexCount = useMemo(
    () => windowAgents.filter((a) => a.segment === "complex").reduce((s, a) => s + a.accounts, 0),
    [windowAgents],
  );
  const densityCount = useMemo(
    () => windowAgents.filter((a) => a.segment === "density").reduce((s, a) => s + a.accounts, 0),
    [windowAgents],
  );

  const filteredAccounts = useMemo<AccountsPerformanceAccount[]>(() => {
    const accounts = windowedAccounts;
    let result = accounts;
    if (agentFilter === "seg:complex") result = accounts.filter((a) => a.segment === "complex");
    else if (agentFilter === "seg:density") result = accounts.filter((a) => a.segment === "density");
    else if (agentFilter.startsWith("agent:")) {
      const id = agentFilter.slice("agent:".length);
      result = accounts.filter((a) => a.agentId === id);
    }
    return result
      .slice()
      .sort((a, b) => {
        const am = a.monthly.find((m) => m.month === selectedMonth)?.gmv ?? 0;
        const bm = b.monthly.find((m) => m.month === selectedMonth)?.gmv ?? 0;
        return bm - am || b.totalGmv - a.totalGmv;
      });
  }, [windowedAccounts, agentFilter, selectedMonth]);

  const totals = useMemo(() => {
    const gmv = filteredAccounts.reduce((s, a) => s + a.totalGmv, 0);
    const orders = filteredAccounts.reduce((s, a) => s + a.totalOrders, 0);
    const commission = filteredAccounts.reduce((s, a) => s + (a.totalCommission ?? 0), 0);
    return {
      accounts: filteredAccounts.length,
      gmv,
      orders,
      commission,
      aov: orders > 0 ? gmv / orders : 0,
    };
  }, [filteredAccounts]);

  const quality = useMemo(() => {
    const rollup = (key: "availabilityPct" | "acceptancePct" | "rejectionPct" | "prepMinutes" | "rating" | "lateDeliveryPct") => {
      let sv = 0;
      let sw = 0;
      for (const a of filteredAccounts) {
        const q = a.quality;
        const v = q?.[key];
        if (q == null || v == null) continue;
        const w = q.refOrders > 0 ? q.refOrders : 1;
        sv += v * w;
        sw += w;
      }
      return sw > 0 ? sv / sw : null;
    };
    return {
      availabilityPct: rollup("availabilityPct"),
      acceptancePct: rollup("acceptancePct"),
      rejectionPct: rollup("rejectionPct"),
      prepMinutes: rollup("prepMinutes"),
      rating: rollup("rating"),
      lateDeliveryPct: rollup("lateDeliveryPct"),
      count: filteredAccounts.filter((a) => a.quality).length,
    };
  }, [filteredAccounts]);

  const byMonth = useMemo(() => {
    const map = new Map<string, { month: string; gmv: number; orders: number; commission: number }>();
    for (const month of months) map.set(month, { month, gmv: 0, orders: 0, commission: 0 });
    for (const account of filteredAccounts) {
      for (const m of account.monthly) {
        const bucket = map.get(m.month);
        if (!bucket) continue;
        bucket.gmv += m.gmv;
        bucket.orders += m.orders;
        bucket.commission += m.commission ?? 0;
      }
    }
    return months.map((m) => map.get(m)!);
  }, [filteredAccounts, months]);

  const maxMonthGmv = Math.max(...byMonth.map((m) => m.gmv), 1);

  const cards = [
    { label: "Accounts activated", value: formatInteger(totals.accounts), icon: "storefront", hint: undefined },
    {
      label: "GMV gross",
      value: formatEurCompact(totals.gmv),
      icon: "payments",
      hint: "GMV before discounts (launch → date)",
    },
    { label: "Orders", value: formatInteger(totals.orders), icon: "receipt_long", hint: undefined },
    {
      label: "Commission",
      value: formatEurCompact(totals.commission),
      icon: "percent",
      hint: "Commission summed across accounts: Salesforce rate (Opportunity.Commission__c) × gross GMV, or the actual Databricks commission when an account has no SF rate",
    },
    {
      label: "AOV gross",
      value: formatEur(totals.aov),
      icon: "shopping_basket",
      hint: "Gross GMV ÷ delivered orders",
    },
  ];

  const fmtPct = (value: number | null, digits = 1) =>
    value == null ? "—" : `${value.toFixed(digits)}%`;
  const qualityCards = [
    { label: "Availability", value: fmtPct(quality.availabilityPct), icon: "schedule", hint: "Share of open hours active" },
    { label: "Rating", value: quality.rating == null ? "—" : `${quality.rating.toFixed(2)}/5`, icon: "star", hint: "Avg customer rating" },
    { label: "Prep time", value: quality.prepMinutes == null ? "—" : `${quality.prepMinutes.toFixed(1)} min`, icon: "skillet", hint: "Avg minutes to prepare" },
    { label: "Acceptance", value: fmtPct(quality.acceptancePct), icon: "task_alt", hint: "Order acceptance rate" },
    { label: "Late deliveries", value: fmtPct(quality.lateDeliveryPct), icon: "timer", hint: "Late-delivered order rate" },
  ];

  const subtitle = ap
    ? `${ap.windowDays}-day window · ${ap.country} · activated accounts with Bolt Food gross GMV (before discounts), orders, gross AOV, commission & availability/performance by month`
    : "Accounts activated in the last 90 days with Bolt Food gross GMV (before discounts), orders, gross AOV, commission & availability/performance.";

  return (
    <div className="dashy-page">
      <PageHeader
        title="Accounts performance"
        subtitle={subtitle}
        updatedAt={ap?.generatedAt ?? model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} updatedAt={model?.updatedAt} />

      <section className="grid grid-cols-2 gap-md md:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="dashboard-card rounded-xl p-md" title={card.hint}>
            <div className="flex items-center gap-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">{card.icon}</span>
              <p className="text-label-md font-label-md">{card.label}</p>
            </div>
            <h3 className="mt-xs text-headline-md font-headline-md font-extrabold text-on-surface">
              {loading && !ap ? "…" : card.value}
            </h3>
          </div>
        ))}
      </section>

      <section className="space-y-xs">
        <div className="flex items-center gap-xs px-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-[16px] text-won">monitoring</span>
          <p className="text-label-md font-semibold uppercase tracking-wide text-primary">
            Availability &amp; performance
          </p>
          <span className="text-[11px] text-on-surface-variant">
            {ap?.qualityPeriod ?? "launch → date, order-weighted"} · {quality.count} accounts
          </span>
        </div>
        <div className="grid grid-cols-2 gap-md md:grid-cols-5">
          {qualityCards.map((card) => (
            <div key={card.label} className="dashboard-card rounded-xl p-md" title={card.hint}>
              <div className="flex items-center gap-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px] text-won">{card.icon}</span>
                <p className="text-label-md font-label-md">{card.label}</p>
              </div>
              <h3 className="mt-xs text-headline-md font-headline-md font-extrabold text-on-surface">
                {loading && !ap ? "…" : card.value}
              </h3>
            </div>
          ))}
        </div>
      </section>

      <section className="dashy-filter-bar flex flex-col gap-sm md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <label className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
            Agent
          </label>
          <select
            value={agentFilter}
            onChange={(event) => setAgentFilter(event.target.value as AgentFilter)}
            className="dashy-select min-w-[260px]"
          >
            <option value="all">All agents ({windowedAccounts.length})</option>
            <option value="seg:complex">Complex team ({complexCount})</option>
            <option value="seg:density">Density team ({densityCount})</option>
            <optgroup label="Individual agents">
              {windowAgents.map((agent) => (
                <option key={agent.agentId} value={`agent:${agent.agentId}`}>
                  {agent.name} ({agent.accounts})
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
            Month (table breakdown)
          </label>
          <select
            value={selectedMonth}
            onChange={(event) => setMonthChoice(event.target.value)}
            className="dashy-select min-w-[180px]"
          >
            {months.map((month) => (
              <option key={month} value={month}>
                {monthLabel(month)}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="dashboard-card rounded-xl p-lg">
        <h3 className="mb-md text-title-md font-bold text-on-surface">
          Team GMV by month{" "}
          <span className="text-label-md font-normal text-on-surface-variant">
            (click a month to drive the table)
          </span>
        </h3>
        <div className="flex items-end justify-between gap-md" style={{ minHeight: 160 }}>
          {byMonth.map((m) => {
            const active = m.month === selectedMonth;
            return (
              <button
                key={m.month}
                type="button"
                onClick={() => setMonthChoice(m.month)}
                className={`flex flex-1 flex-col items-center gap-xs rounded-lg p-xs transition-colors hover:bg-surface-container-low ${
                  active ? "ring-2 ring-won/50" : ""
                }`}
              >
                <span className="text-label-md font-semibold text-on-surface">
                  {formatEurCompact(m.gmv)}
                </span>
                <div className="flex w-full items-end justify-center" style={{ height: 110 }}>
                  <div
                    className={`w-10 rounded-t ${active ? "bg-won" : "bg-won/55"}`}
                    style={{ height: `${Math.max(6, (m.gmv / maxMonthGmv) * 100)}%` }}
                    title={`${monthLabel(m.month)} · GMV ${formatEur(m.gmv)} · ${formatInteger(
                      m.orders,
                    )} orders · commission ${formatEur(m.commission)}`}
                  />
                </div>
                <span className="text-label-md font-semibold text-on-surface-variant">
                  {monthLabel(m.month)}
                </span>
                <span className="text-[10px] text-on-surface-variant">
                  {formatInteger(m.orders)} orders
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-sm">
        <div className="flex items-center justify-between">
          <p className="text-label-md font-semibold uppercase tracking-wide text-primary">
            Accounts · {monthLabel(selectedMonth)} breakdown + launch-to-date trend
          </p>
          <p className="text-label-md text-on-surface-variant">
            {formatInteger(filteredAccounts.length)} accounts
          </p>
        </div>
        <AccountsPerformanceTable
          accounts={filteredAccounts}
          selectedMonth={selectedMonth}
          monthLabel={monthLabel}
          formatEur={formatEur}
          formatInt={formatInteger}
          dataMonthMax={ap?.dataMonthMax}
          loading={loading}
        />
        {ap?.metricsNote ? (
          <p className="px-xs text-[11px] leading-relaxed text-on-surface-variant">
            {ap.metricsNote}
          </p>
        ) : null}
        {ap?.qualityNote ? (
          <p className="px-xs text-[11px] leading-relaxed text-on-surface-variant">
            {ap.qualityNote}
          </p>
        ) : null}
      </section>
    </div>
  );
}
