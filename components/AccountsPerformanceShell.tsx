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

  const months = useMemo(() => (ap?.byMonth ?? []).map((m) => m.month), [ap]);
  const selectedMonth =
    monthChoice && months.includes(monthChoice)
      ? monthChoice
      : (ap?.dataMonthMax ?? months[months.length - 1] ?? "");

  const complexCount = useMemo(
    () => (ap?.agents ?? []).filter((a) => a.segment === "complex").reduce((s, a) => s + a.accounts, 0),
    [ap],
  );
  const densityCount = useMemo(
    () => (ap?.agents ?? []).filter((a) => a.segment === "density").reduce((s, a) => s + a.accounts, 0),
    [ap],
  );

  const filteredAccounts = useMemo<AccountsPerformanceAccount[]>(() => {
    const accounts = ap?.accounts ?? [];
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
  }, [ap, agentFilter, selectedMonth]);

  const totals = useMemo(() => {
    const gmv = filteredAccounts.reduce((s, a) => s + a.totalGmv, 0);
    const orders = filteredAccounts.reduce((s, a) => s + a.totalOrders, 0);
    const commission = filteredAccounts.reduce((s, a) => s + a.totalCommission, 0);
    return {
      accounts: filteredAccounts.length,
      gmv,
      orders,
      commission,
      aov: orders > 0 ? gmv / orders : 0,
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
        bucket.commission += m.commission;
      }
    }
    return months.map((m) => map.get(m)!);
  }, [filteredAccounts, months]);

  const maxMonthGmv = Math.max(...byMonth.map((m) => m.gmv), 1);

  const cards = [
    { label: "Accounts activated", value: formatInteger(totals.accounts), icon: "storefront" },
    { label: "GMV (launch → date)", value: formatEurCompact(totals.gmv), icon: "payments" },
    { label: "Orders", value: formatInteger(totals.orders), icon: "receipt_long" },
    { label: "Commission", value: formatEurCompact(totals.commission), icon: "percent" },
    { label: "AOV", value: formatEur(totals.aov), icon: "shopping_basket" },
  ];

  const subtitle = ap
    ? `${ap.windowDays}-day window · ${ap.country} · activated accounts with Bolt Food GMV, orders, AOV & commission by month`
    : "Accounts activated in the last 90 days with Bolt Food GMV, orders, AOV & commission.";

  return (
    <div className="mx-auto max-w-[1500px] space-y-md">
      <PageHeader
        title="Accounts performance"
        subtitle={subtitle}
        updatedAt={ap?.generatedAt ?? model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      <section className="grid grid-cols-2 gap-md md:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="glass-card rounded-xl p-md">
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

      <section className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-low p-md md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <label className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
            Agent
          </label>
          <select
            value={agentFilter}
            onChange={(event) => setAgentFilter(event.target.value as AgentFilter)}
            className="min-w-[260px] rounded-lg border border-outline-variant bg-surface-container px-md py-sm text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">All agents ({ap?.totals.accounts ?? 0})</option>
            <option value="seg:complex">Complex team ({complexCount})</option>
            <option value="seg:density">Density team ({densityCount})</option>
            <optgroup label="Individual agents">
              {(ap?.agents ?? []).map((agent) => (
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
            className="min-w-[180px] rounded-lg border border-outline-variant bg-surface-container px-md py-sm text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {months.map((month) => (
              <option key={month} value={month}>
                {monthLabel(month)}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="glass-card rounded-xl p-lg">
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
                  active ? "ring-2 ring-primary/50" : ""
                }`}
              >
                <span className="text-label-md font-semibold text-on-surface">
                  {formatEurCompact(m.gmv)}
                </span>
                <div className="flex w-full items-end justify-center" style={{ height: 110 }}>
                  <div
                    className={`w-10 rounded-t ${active ? "bg-primary" : "bg-primary/55"}`}
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
      </section>
    </div>
  );
}
