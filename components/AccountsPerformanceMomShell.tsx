"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { AccountsPerformanceMomTable } from "@/components/AccountsPerformanceMomTable";
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

/** Activation/launch month for an account ("YYYY-MM") or null if no launch date. */
function activationMonth(account: AccountsPerformanceAccount): string | null {
  if (!account.launchDate) return null;
  const base = account.launchDate.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(base) ? base : null;
}

/**
 * Selected-month figures for an account, taken from its `monthly[]` entry for
 * that month. All MOM metrics (cards, comparison chart, table) are scoped to the
 * selected activation month — NOT launch-to-date — so each cohort shows what the
 * accounts activated that month generated IN that month.
 */
function monthFigures(account: AccountsPerformanceAccount, month: string) {
  const m = account.monthly.find((x) => x.month === month);
  const gmv = m?.gmv ?? 0;
  const orders = m?.orders ?? 0;
  const commission = m?.commission ?? null;
  return {
    gmv,
    orders,
    commission,
    aov: orders > 0 ? gmv / orders : 0,
  };
}

export function AccountsPerformanceMomShell() {
  const { model, error, loading, sourceHint } = useDashboard({
    sections: ["accounts-performance"],
  });
  const ap = model?.accountsPerformance;

  const [agentFilter, setAgentFilter] = useState<AgentFilter>("all");
  const [monthChoice, setMonthChoice] = useState<string>("");

  // Apply the agent/segment filter first (mirrors the Accounts performance tab).
  const filteredAccounts = useMemo<AccountsPerformanceAccount[]>(() => {
    const accounts = ap?.accounts ?? [];
    if (agentFilter === "seg:complex") return accounts.filter((a) => a.segment === "complex");
    if (agentFilter === "seg:density") return accounts.filter((a) => a.segment === "density");
    if (agentFilter.startsWith("agent:")) {
      const id = agentFilter.slice("agent:".length);
      return accounts.filter((a) => a.agentId === id);
    }
    return accounts;
  }, [ap, agentFilter]);

  // Group accounts into activation-month cohorts (the month the account launched).
  const cohorts = useMemo(() => {
    const map = new Map<string, AccountsPerformanceAccount[]>();
    for (const account of filteredAccounts) {
      const month = activationMonth(account);
      if (!month) continue;
      if (!map.has(month)) map.set(month, []);
      map.get(month)!.push(account);
    }
    return map;
  }, [filteredAccounts]);

  // Cohort months, newest first, with summary rollups for the comparison chart.
  const cohortMonths = useMemo(
    () => [...cohorts.keys()].sort((a, b) => b.localeCompare(a)),
    [cohorts],
  );

  const selectedMonth =
    monthChoice && cohorts.has(monthChoice) ? monthChoice : (cohortMonths[0] ?? "");

  const cohortAccounts = useMemo(
    () => cohorts.get(selectedMonth) ?? [],
    [cohorts, selectedMonth],
  );

  const complexCount = useMemo(
    () => (ap?.agents ?? []).filter((a) => a.segment === "complex").reduce((s, a) => s + a.accounts, 0),
    [ap],
  );
  const densityCount = useMemo(
    () => (ap?.agents ?? []).filter((a) => a.segment === "density").reduce((s, a) => s + a.accounts, 0),
    [ap],
  );

  // Per-cohort summary — SELECTED MONTH only (each account's figures for the
  // selected activation month, summed across the cohort).
  const summary = useMemo(() => {
    let gmv = 0;
    let orders = 0;
    let commission = 0;
    for (const a of cohortAccounts) {
      const f = monthFigures(a, selectedMonth);
      gmv += f.gmv;
      orders += f.orders;
      commission += f.commission ?? 0;
    }
    return {
      accounts: cohortAccounts.length,
      gmv,
      orders,
      commission,
      aov: orders > 0 ? gmv / orders : 0,
    };
  }, [cohortAccounts, selectedMonth]);

  // Comparison across activation-month cohorts (oldest → newest). Each bar is the
  // cohort's GMV IN ITS OWN activation month — a true month-over-month comparison.
  const cohortBars = useMemo(() => {
    return [...cohortMonths]
      .slice()
      .sort((a, b) => a.localeCompare(b))
      .map((month) => {
        const list = cohorts.get(month) ?? [];
        let gmv = 0;
        let orders = 0;
        for (const a of list) {
          const f = monthFigures(a, month);
          gmv += f.gmv;
          orders += f.orders;
        }
        return { month, accounts: list.length, gmv, orders };
      });
  }, [cohortMonths, cohorts]);

  const maxCohortGmv = Math.max(...cohortBars.map((c) => c.gmv), 1);

  const quality = useMemo(() => {
    const rollup = (
      key: "availabilityPct" | "acceptancePct" | "rejectionPct" | "prepMinutes" | "rating" | "lateDeliveryPct",
    ) => {
      let sv = 0;
      let sw = 0;
      for (const a of cohortAccounts) {
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
      rating: rollup("rating"),
      prepMinutes: rollup("prepMinutes"),
      acceptancePct: rollup("acceptancePct"),
      lateDeliveryPct: rollup("lateDeliveryPct"),
      count: cohortAccounts.filter((a) => a.quality).length,
    };
  }, [cohortAccounts]);

  const monthName = selectedMonth ? monthLabel(selectedMonth) : "—";
  const cards = [
    {
      label: "Accounts activated",
      value: formatInteger(summary.accounts),
      icon: "storefront",
      hint: `Accounts launched in ${monthName}`,
    },
    {
      label: "GMV generated",
      value: formatEurCompact(summary.gmv),
      icon: "payments",
      hint: `Gross GMV (before discounts) generated by this cohort in ${monthName}`,
    },
    { label: "Orders", value: formatInteger(summary.orders), icon: "receipt_long", hint: `Delivered orders in ${monthName}` },
    {
      label: "Commission",
      value: formatEurCompact(summary.commission),
      icon: "percent",
      hint: `Commission in ${monthName}, summed across the cohort: Salesforce rate (Opportunity.Commission__c) × that month's gross GMV, or the actual Databricks commission when an account has no SF rate`,
    },
    {
      label: "AOV gross",
      value: formatEur(summary.aov),
      icon: "shopping_basket",
      hint: `Gross GMV ÷ delivered orders in ${monthName}, cohort-wide`,
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
    ? `Activation cohorts · ${ap.country} · pick an activation month to see the accounts that launched that month and the gross GMV (before discounts), orders, AOV & commission they generated IN that month (metrics are scoped to the selected month, not launch-to-date)`
    : "Pick an activation month to see the accounts that launched that month and what they generated in that month.";

  return (
    <div className="mx-auto max-w-[1500px] space-y-md">
      <PageHeader
        title="Accounts performance MOM"
        subtitle={subtitle}
        updatedAt={ap?.generatedAt ?? model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      <section className="grid grid-cols-2 gap-md md:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="glass-card rounded-xl p-md" title={card.hint}>
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
            launch → date, order-weighted · {quality.count} accounts
          </span>
        </div>
        <div className="grid grid-cols-2 gap-md md:grid-cols-5">
          {qualityCards.map((card) => (
            <div key={card.label} className="glass-card rounded-xl p-md" title={card.hint}>
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
            Activation month (cohort)
          </label>
          <select
            value={selectedMonth}
            onChange={(event) => setMonthChoice(event.target.value)}
            className="min-w-[200px] rounded-lg border border-outline-variant bg-surface-container px-md py-sm text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {cohortMonths.map((month) => (
              <option key={month} value={month}>
                {monthLabel(month)} ({(cohorts.get(month) ?? []).length})
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="glass-card rounded-xl p-lg">
        <h3 className="mb-md text-title-md font-bold text-on-surface">
          GMV generated by activation cohort{" "}
          <span className="text-label-md font-normal text-on-surface-variant">
            (each cohort&apos;s GMV in its own activation month · click a month to drive the table)
          </span>
        </h3>
        {cohortBars.length ? (
          <div className="flex items-end justify-between gap-md" style={{ minHeight: 160 }}>
            {cohortBars.map((c) => {
              const active = c.month === selectedMonth;
              return (
                <button
                  key={c.month}
                  type="button"
                  onClick={() => setMonthChoice(c.month)}
                  className={`flex flex-1 flex-col items-center gap-xs rounded-lg p-xs transition-colors hover:bg-surface-container-low ${
                    active ? "ring-2 ring-won/50" : ""
                  }`}
                >
                  <span className="text-label-md font-semibold text-on-surface">
                    {formatEurCompact(c.gmv)}
                  </span>
                  <div className="flex w-full items-end justify-center" style={{ height: 110 }}>
                    <div
                      className={`w-10 rounded-t ${active ? "bg-won" : "bg-won/55"}`}
                      style={{ height: `${Math.max(6, (c.gmv / maxCohortGmv) * 100)}%` }}
                      title={`${monthLabel(c.month)} cohort · ${formatInteger(
                        c.accounts,
                      )} accounts · GMV ${formatEur(c.gmv)} · ${formatInteger(c.orders)} orders`}
                    />
                  </div>
                  <span className="text-label-md font-semibold text-on-surface-variant">
                    {monthLabel(c.month)}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">
                    {formatInteger(c.accounts)} accounts
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-body-md text-on-surface-variant">No activation cohorts available.</p>
        )}
      </section>

      <section className="space-y-sm">
        <div className="flex items-center justify-between">
          <p className="text-label-md font-semibold uppercase tracking-wide text-primary">
            Accounts activated · {monthName} cohort · {monthName} figures
          </p>
          <p className="text-label-md text-on-surface-variant">
            {formatInteger(cohortAccounts.length)} accounts
          </p>
        </div>
        <AccountsPerformanceMomTable
          accounts={cohortAccounts}
          selectedMonth={selectedMonth}
          monthLabel={monthLabel}
          formatEur={formatEur}
          formatInt={formatInteger}
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
