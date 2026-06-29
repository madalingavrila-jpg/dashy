"use client";

import { Fragment, useMemo, useState } from "react";
import type { AccountsPerformanceAccount } from "@/types/dashboard";
import { Sparkline } from "@/components/Sparkline";

type AccountsPerformanceMomTableProps = {
  /** Accounts whose activation/launch month is the selected cohort. */
  accounts: AccountsPerformanceAccount[];
  /** The selected activation month ("YYYY-MM"); all numeric columns are scoped to it. */
  selectedMonth: string;
  monthLabel: (month: string) => string;
  formatEur: (value: number) => string;
  formatInt: (value: number) => string;
  loading?: boolean;
};

/**
 * Selected-month figures for an account from its `monthly[]` entry. The MOM table
 * shows the SELECTED activation month's numbers (not launch-to-date): GMV, orders,
 * AOV, commission € and the effective commission % for that month.
 */
function monthFiguresOf(account: AccountsPerformanceAccount, month: string) {
  const m = account.monthly.find((x) => x.month === month);
  const gmv = m?.gmv ?? 0;
  const orders = m?.orders ?? 0;
  const commission = m?.commission ?? null;
  // Effective % for the month = commission ÷ gross GMV (equals the SF rate when
  // commission was derived as rate × gross GMV; the Databricks-actual rate otherwise).
  const commissionPct = commission != null && gmv > 0 ? (commission / gmv) * 100 : null;
  return {
    gmv,
    orders,
    commission,
    aov: orders > 0 ? gmv / orders : 0,
    commissionPct,
    hasMonth: Boolean(m),
  };
}

function segmentBadge(segment: "complex" | "density" | "inbound") {
  if (segment === "complex") return "bg-primary-container/40 text-on-primary-container";
  if (segment === "inbound") return "bg-secondary-container/40 text-on-secondary-container";
  return "bg-tertiary-container/40 text-on-tertiary-container";
}

function segmentLabel(segment: "complex" | "density" | "inbound") {
  if (segment === "complex") return "Complex";
  if (segment === "inbound") return "Inbound";
  return "Density";
}

type Tone = "good" | "warn" | "bad" | "muted";

function toneClass(tone: Tone): string {
  switch (tone) {
    case "good":
      return "text-won";
    case "warn":
      return "text-amber-600";
    case "bad":
      return "text-error";
    default:
      return "text-on-surface";
  }
}

/** Higher-is-better metric → tone by thresholds. */
function toneHigh(value: number | null | undefined, good: number, warn: number): Tone {
  if (value == null) return "muted";
  if (value >= good) return "good";
  if (value < warn) return "bad";
  return "warn";
}

/** Lower-is-better metric (prep, late, rejection) → tone by thresholds. */
function toneLow(value: number | null | undefined, good: number, warn: number): Tone {
  if (value == null) return "muted";
  if (value <= good) return "good";
  if (value > warn) return "bad";
  return "warn";
}

function pctStr(value: number | null | undefined, digits = 1): string {
  return value == null ? "—" : `${value.toFixed(digits)}%`;
}

/**
 * Effective commission % shown in the table: the Salesforce negotiated rate
 * (Opportunity.Commission__c) when present, else the Databricks-derived rate
 * (actual commission ÷ gross GMV).
 */
function commissionPctOf(account: AccountsPerformanceAccount): number | null {
  return account.commissionPct ?? account.commissionRatePct ?? null;
}

/** Subtle source marker for the commission cell: SF rate vs Databricks actual. */
function commissionSourceMark(
  account: AccountsPerformanceAccount,
): { label: string; title: string } | null {
  if (account.commissionSource === "databricks")
    return { label: "DB", title: "actual (Databricks)" };
  if (account.commissionSource === "salesforce")
    return { label: "SF", title: "from Salesforce rate" };
  return null;
}

/** Compact euro (e.g. €1.2k) for dense trend/launch cells. */
function eurShort(value: number): string {
  return `€${new Intl.NumberFormat("en-IE", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)}`;
}

function formatLaunch(date: string | null): string {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

/** A labelled metric chip used inside the expanded detail row. */
function DetailStat({
  label,
  value,
  tone = "muted",
  hint,
}: {
  label: string;
  value: string;
  tone?: Tone;
  hint?: string;
}) {
  return (
    <div
      className="flex min-w-[68px] flex-col rounded-md border border-outline-variant/60 bg-surface px-sm py-xs"
      title={hint}
    >
      <span className="text-[9px] font-bold uppercase tracking-wide text-on-surface-variant">
        {label}
      </span>
      <span className={`text-[13px] font-semibold ${toneClass(tone)}`}>{value}</span>
    </div>
  );
}

type SortKey =
  | "account"
  | "city"
  | "agent"
  | "launch"
  | "gmv"
  | "orders"
  | "aov"
  | "commission"
  | "commissionPct"
  | "rating"
  | "availability";

type SortDir = "asc" | "desc";

/** Text columns default to A→Z; every metric/date column defaults to high→low. */
function defaultDir(key: SortKey): SortDir {
  return key === "account" || key === "city" || key === "agent" ? "asc" : "desc";
}

/**
 * Sort value for a column. Every financial metric column here is the account's
 * SELECTED-MONTH figure (this is a cohort view scoped to the activation month:
 * "what did the accounts activated this month generate IN that month"), not a
 * launch-to-date total. Quality columns (rating/availability) have no monthly
 * granularity in the payload, so they remain launch-to-date.
 */
function sortValue(
  account: AccountsPerformanceAccount,
  key: SortKey,
  month: string,
): string | number | null {
  switch (key) {
    case "account":
      return account.accountName ?? "";
    case "city":
      return account.city ?? "";
    case "agent":
      return account.agentName ?? "";
    case "launch": {
      if (!account.launchDate) return null;
      const t = Date.parse(account.launchDate);
      return Number.isNaN(t) ? null : t;
    }
    case "gmv":
      return monthFiguresOf(account, month).gmv;
    case "orders":
      return monthFiguresOf(account, month).orders;
    case "aov": {
      const f = monthFiguresOf(account, month);
      return f.orders > 0 ? f.aov : null;
    }
    case "commission":
      return monthFiguresOf(account, month).commission;
    case "commissionPct":
      return monthFiguresOf(account, month).commissionPct;
    case "rating":
      return account.quality?.rating ?? null;
    case "availability":
      return account.quality?.availabilityPct ?? null;
    default:
      return null;
  }
}

function compareAccounts(
  a: AccountsPerformanceAccount,
  b: AccountsPerformanceAccount,
  key: SortKey,
  dir: SortDir,
  month: string,
): number {
  const mult = dir === "asc" ? 1 : -1;
  const va = sortValue(a, key, month);
  const vb = sortValue(b, key, month);

  let primary: number;
  if (typeof va === "string" || typeof vb === "string") {
    primary =
      mult *
      String(va ?? "").localeCompare(String(vb ?? ""), undefined, { sensitivity: "base" });
  } else {
    // Missing numeric values always sink to the bottom, regardless of direction.
    if (va == null && vb == null) primary = 0;
    else if (va == null) primary = 1;
    else if (vb == null) primary = -1;
    else primary = mult * (va - vb);
  }
  if (primary !== 0) return primary;
  // Stable tie-break: heaviest selected-month GMV first, then name A→Z.
  return (
    monthFiguresOf(b, month).gmv - monthFiguresOf(a, month).gmv ||
    String(a.accountName ?? "").localeCompare(String(b.accountName ?? ""))
  );
}

/** Clickable column header that toggles asc/desc and exposes aria-sort. */
function SortHeader({
  label,
  sortKey,
  className,
  align = "left",
  title,
  active,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  className: string;
  align?: "left" | "right";
  title?: string;
  active: boolean;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const icon = active ? (dir === "asc" ? "arrow_upward" : "arrow_downward") : "unfold_more";
  return (
    <th
      className={className}
      title={title}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`group/sort inline-flex w-full items-center gap-[2px] rounded transition-colors hover:text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          align === "right" ? "justify-end" : "justify-start"
        } ${active ? "text-on-surface" : ""}`}
      >
        <span>{label}</span>
        <span
          className={`material-symbols-outlined text-[14px] ${
            active ? "opacity-100" : "opacity-30 group-hover/sort:opacity-60"
          }`}
        >
          {icon}
        </span>
      </button>
    </th>
  );
}

export function AccountsPerformanceMomTable({
  accounts,
  selectedMonth,
  monthLabel,
  formatEur,
  formatInt,
  loading,
}: AccountsPerformanceMomTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "gmv", dir: "desc" });

  const onSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: defaultDir(key) },
    );

  const sortedAccounts = useMemo(
    () => accounts.slice().sort((a, b) => compareAccounts(a, b, sort.key, sort.dir, selectedMonth)),
    [accounts, sort, selectedMonth],
  );

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (loading && !accounts.length) {
    return <div className="glass-card animate-pulse rounded-xl p-lg h-96" />;
  }

  if (!accounts.length) {
    return (
      <div className="glass-card rounded-xl p-lg text-center text-body-md text-on-surface-variant">
        No accounts activated in this month.
      </div>
    );
  }

  const COLS = 11;
  const thBase = "px-xs py-xs text-label-md font-bold text-on-surface-variant";
  const numTh = `${thBase} text-right`;

  return (
    <div className="glass-card overflow-hidden rounded-xl">
      <div className="flex flex-wrap items-center gap-x-md gap-y-1 border-b border-outline-variant bg-surface-container-low px-md py-xs text-[11px] text-on-surface-variant">
        <span className="inline-flex items-center gap-1 font-semibold text-on-surface">
          <span className="material-symbols-outlined text-[14px] text-won">info</span>
          Activation cohort · GMV, orders, AOV &amp; commission are for {monthLabel(selectedMonth)} only, gross (before discounts)
        </span>
        <span>GMV = before-discount GMV in {monthLabel(selectedMonth)}</span>
        <span>AOV = month gross GMV ÷ month orders</span>
        <span>Commission = Salesforce rate (Commission__c) × month gross GMV; falls back to actual Databricks commission (DB) when no SF rate</span>
        <span className="opacity-70">Rating &amp; availability are launch → date (no monthly granularity); full monthly breakdown on expand</span>
      </div>
      <table className="w-full table-fixed border-collapse text-left text-[13px]">
        <colgroup>
          <col className="w-[16%]" />
          <col className="w-[10%]" />
          <col className="w-[11%]" />
          <col className="w-[7%]" />
          <col className="w-[9%]" />
          <col className="w-[6%]" />
          <col className="w-[7%]" />
          <col className="w-[11%]" />
          <col className="w-[6%]" />
          <col className="w-[6%]" />
          <col className="w-[11%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-outline-variant bg-surface-container-low">
            <SortHeader
              label="Account"
              sortKey="account"
              className={thBase}
              active={sort.key === "account"}
              dir={sort.dir}
              onSort={onSort}
            />
            <SortHeader
              label="City"
              sortKey="city"
              className={thBase}
              active={sort.key === "city"}
              dir={sort.dir}
              onSort={onSort}
            />
            <SortHeader
              label="Agent"
              sortKey="agent"
              className={thBase}
              active={sort.key === "agent"}
              dir={sort.dir}
              onSort={onSort}
            />
            <SortHeader
              label="Launch"
              sortKey="launch"
              className={thBase}
              active={sort.key === "launch"}
              dir={sort.dir}
              onSort={onSort}
            />
            <SortHeader
              label="GMV gross"
              sortKey="gmv"
              className={numTh}
              align="right"
              title="GMV before discounts (gross), generated launch → date"
              active={sort.key === "gmv"}
              dir={sort.dir}
              onSort={onSort}
            />
            <SortHeader
              label="Ord."
              sortKey="orders"
              className={numTh}
              align="right"
              title="Delivered orders, launch → date"
              active={sort.key === "orders"}
              dir={sort.dir}
              onSort={onSort}
            />
            <SortHeader
              label="AOV gross"
              sortKey="aov"
              className={numTh}
              align="right"
              title="AOV = gross GMV (before discounts) ÷ delivered orders, launch → date"
              active={sort.key === "aov"}
              dir={sort.dir}
              onSort={onSort}
            />
            <th
              className={numTh}
              title="Commission € (Salesforce rate × gross GMV, or actual Databricks commission when no SF rate) and the effective commission %, launch → date"
              aria-sort={
                sort.key === "commission" || sort.key === "commissionPct"
                  ? sort.dir === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              <div className="flex w-full items-center justify-end gap-[3px]">
                <button
                  type="button"
                  onClick={() => onSort("commission")}
                  className={`group/sort inline-flex items-center gap-[1px] rounded transition-colors hover:text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    sort.key === "commission" ? "text-on-surface" : ""
                  }`}
                  title="Sort by commission €"
                >
                  <span>Comm€</span>
                  <span
                    className={`material-symbols-outlined text-[14px] ${
                      sort.key === "commission"
                        ? "opacity-100"
                        : "opacity-30 group-hover/sort:opacity-60"
                    }`}
                  >
                    {sort.key === "commission"
                      ? sort.dir === "asc"
                        ? "arrow_upward"
                        : "arrow_downward"
                      : "unfold_more"}
                  </span>
                </button>
                <span className="opacity-40">/</span>
                <button
                  type="button"
                  onClick={() => onSort("commissionPct")}
                  className={`group/sort inline-flex items-center gap-[1px] rounded transition-colors hover:text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    sort.key === "commissionPct" ? "text-on-surface" : ""
                  }`}
                  title="Sort by effective commission % (Salesforce rate, or Databricks actual when no SF rate)"
                >
                  <span>%</span>
                  <span
                    className={`material-symbols-outlined text-[14px] ${
                      sort.key === "commissionPct"
                        ? "opacity-100"
                        : "opacity-30 group-hover/sort:opacity-60"
                    }`}
                  >
                    {sort.key === "commissionPct"
                      ? sort.dir === "asc"
                        ? "arrow_upward"
                        : "arrow_downward"
                      : "unfold_more"}
                  </span>
                </button>
              </div>
            </th>
            <SortHeader
              label="Rating"
              sortKey="rating"
              className={numTh}
              align="right"
              title="Average customer rating, out of 5 (launch → date — no monthly granularity)"
              active={sort.key === "rating"}
              dir={sort.dir}
              onSort={onSort}
            />
            <SortHeader
              label="Avail."
              sortKey="availability"
              className={numTh}
              align="right"
              title="Share of open hours the restaurant was active (provider_active_rate) — launch → date, no monthly granularity"
              active={sort.key === "availability"}
              dir={sort.dir}
              onSort={onSort}
            />
            <th className={numTh} title="GMV trend, launch → date">
              Trend
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedAccounts.map((account) => {
            const q = account.quality;
            const isOpen = expanded.has(account.id);
            // All financial cells below are scoped to the selected activation month.
            const f = monthFiguresOf(account, selectedMonth);
            const me = account.monthly.find((m) => m.month === selectedMonth);
            return (
              <Fragment key={account.id}>
                <tr
                  className="group cursor-pointer border-b border-outline-variant/50 transition-colors hover:bg-surface-container-low"
                  onClick={() => toggle(account.id)}
                  aria-expanded={isOpen}
                >
                  <td className="px-xs py-xs align-top">
                    <div className="flex items-start gap-xs">
                      <span
                        className={`material-symbols-outlined mt-[1px] shrink-0 text-[16px] text-on-surface-variant transition-transform ${
                          isOpen ? "rotate-90" : ""
                        }`}
                      >
                        chevron_right
                      </span>
                      <div className="min-w-0">
                        <p
                          className="truncate font-semibold text-on-surface"
                          title={account.accountName}
                        >
                          {account.accountName}
                        </p>
                        {account.businessSegment ? (
                          <p
                            className="truncate text-[11px] text-on-surface-variant"
                            title={account.businessSegment}
                          >
                            {account.businessSegment}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-xs py-xs align-top text-on-surface-variant">
                    <span className="block truncate" title={account.city}>
                      {account.city || "—"}
                    </span>
                  </td>
                  <td className="px-xs py-xs align-top">
                    <span className="block truncate text-on-surface" title={account.agentName}>
                      {account.agentName}
                    </span>
                    <span
                      className={`mt-[2px] inline-flex rounded-full px-xs py-[1px] text-[9px] font-bold ${segmentBadge(
                        account.segment,
                      )}`}
                    >
                      {segmentLabel(account.segment)}
                    </span>
                  </td>
                  <td className="px-xs py-xs align-top text-[11px] text-on-surface-variant">
                    {formatLaunch(account.launchDate)}
                  </td>
                  <td
                    className="px-xs py-xs text-right align-top font-semibold text-on-surface"
                    title={`${monthLabel(selectedMonth)} gross GMV (before discounts) ${formatEur(f.gmv)}${
                      me?.gmvNet != null
                        ? ` · net ${formatEur(me.gmvNet)} · discount ${formatEur(
                            me.discount ?? me.gmv - me.gmvNet,
                          )}`
                        : ""
                    }`}
                  >
                    {eurShort(f.gmv)}
                  </td>
                  <td className="px-xs py-xs text-right align-top text-on-surface">
                    {formatInt(f.orders)}
                  </td>
                  <td className="px-xs py-xs text-right align-top text-on-surface">
                    {f.orders > 0 ? formatEur(f.aov) : "—"}
                  </td>
                  <td
                    className="px-xs py-xs text-right align-top"
                    title={(() => {
                      const eur = f.commission != null ? formatEur(f.commission) : "no commission";
                      const monthName = monthLabel(selectedMonth);
                      if (account.commissionSource === "salesforce")
                        return `${eur} in ${monthName} · Salesforce rate ${pctStr(account.commissionRatePct)} (Commission__c) × month gross GMV`;
                      if (account.commissionSource === "databricks")
                        return `${eur} in ${monthName} · actual commission (Databricks), no Salesforce rate · ${pctStr(
                          f.commissionPct,
                        )} of month gross GMV`;
                      return "No Salesforce rate and no Databricks commission";
                    })()}
                  >
                    <span className="block font-semibold text-on-surface">
                      {f.commission != null ? eurShort(f.commission) : "—"}
                    </span>
                    <span className="block text-[11px] text-on-surface-variant">
                      {pctStr(f.commissionPct)}
                      {(() => {
                        const mark = commissionSourceMark(account);
                        return mark ? (
                          <span
                            className={`ml-[2px] align-top text-[8px] font-bold ${
                              account.commissionSource === "databricks"
                                ? "text-amber-600"
                                : "opacity-40"
                            }`}
                            title={mark.title}
                          >
                            {mark.label}
                          </span>
                        ) : null;
                      })()}
                    </span>
                  </td>
                  <td className="px-xs py-xs text-right align-top">
                    <span className={`font-semibold ${toneClass(toneHigh(q?.rating, 4.5, 4))}`}>
                      {q?.rating != null ? q.rating.toFixed(2) : "—"}
                    </span>
                  </td>
                  <td className="px-xs py-xs text-right align-top">
                    <span
                      className={`font-semibold ${toneClass(toneHigh(q?.availabilityPct, 95, 85))}`}
                    >
                      {pctStr(q?.availabilityPct, 0)}
                    </span>
                  </td>
                  <td className="px-xs py-xs align-top">
                    <div className="flex items-center justify-end gap-xs">
                      <Sparkline points={account.sparkline} width={72} colorClass="text-won" />
                    </div>
                  </td>
                </tr>
                {isOpen ? (
                  <tr className="border-b border-outline-variant/50 bg-surface-container-low/40">
                    <td colSpan={COLS} className="px-md py-sm">
                      <div className="space-y-sm">
                        <div>
                          <p className="mb-xs text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                            Monthly breakdown
                          </p>
                          <div className="flex flex-wrap gap-xs">
                            {account.monthly.length ? (
                              account.monthly.map((m) => (
                                <div
                                  key={m.month}
                                  className={`min-w-[112px] rounded-md border bg-surface px-sm py-xs ${
                                    m.month === selectedMonth
                                      ? "border-won ring-1 ring-won/50"
                                      : "border-outline-variant/60"
                                  }`}
                                  title={`${monthLabel(m.month)} · gross GMV ${formatEur(
                                    m.gmv,
                                  )}${
                                    m.gmvNet != null
                                      ? ` · net ${formatEur(m.gmvNet)} · discount ${formatEur(
                                          m.discount ?? m.gmv - m.gmvNet,
                                        )}`
                                      : ""
                                  } · ${formatInt(m.orders)} orders · AOV ${
                                    m.orders > 0 ? formatEur(m.aov) : "—"
                                  } · commission ${m.commission != null ? formatEur(m.commission) : "—"}`}
                                >
                                  <span className="block text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                                    {monthLabel(m.month)}
                                  </span>
                                  <span className="block text-[13px] font-semibold text-on-surface">
                                    {eurShort(m.gmv)}
                                  </span>
                                  <span className="block text-[10px] text-on-surface-variant">
                                    {formatInt(m.orders)} ord ·{" "}
                                    {m.orders > 0 ? formatEur(m.aov) : "—"} AOV
                                  </span>
                                  <span className="block text-[10px] text-on-surface-variant">
                                    comm {m.commission != null ? eurShort(m.commission) : "—"}
                                  </span>
                                  {m.gmvNet != null ? (
                                    <span className="block text-[10px] text-on-surface-variant/80">
                                      net {eurShort(m.gmvNet)} · −
                                      {eurShort(m.discount ?? m.gmv - m.gmvNet)} disc
                                    </span>
                                  ) : null}
                                </div>
                              ))
                            ) : (
                              <span className="text-[12px] text-on-surface-variant">
                                No monthly GMV reported.
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-md">
                          <div>
                            <p className="mb-xs text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                              Quality (launch → date)
                            </p>
                            <div className="flex flex-wrap gap-xs">
                              <DetailStat
                                label="Prep"
                                value={q?.prepMinutes != null ? `${q.prepMinutes.toFixed(1)}m` : "—"}
                                tone={toneLow(q?.prepMinutes, 20, 30)}
                                hint="Average minutes to prepare an order"
                              />
                              <DetailStat
                                label="Accept"
                                value={pctStr(q?.acceptancePct)}
                                tone={toneHigh(q?.acceptancePct, 98, 95)}
                                hint="Order acceptance rate"
                              />
                              <DetailStat
                                label="Reject"
                                value={pctStr(q?.rejectionPct, 2)}
                                tone={toneLow(q?.rejectionPct, 1, 3)}
                                hint="Order rejection rate (lower is better)"
                              />
                              <DetailStat
                                label="Late"
                                value={pctStr(q?.lateDeliveryPct)}
                                tone={toneLow(q?.lateDeliveryPct, 20, 35)}
                                hint="Late-delivered order rate (lower is better)"
                              />
                              <DetailStat
                                label="Avail."
                                value={pctStr(q?.availabilityPct)}
                                tone={toneHigh(q?.availabilityPct, 95, 85)}
                                hint="Share of open hours active"
                              />
                              <DetailStat
                                label="Rating"
                                value={q?.rating != null ? `${q.rating.toFixed(2)}/5` : "—"}
                                tone={toneHigh(q?.rating, 4.5, 4)}
                                hint="Average customer rating"
                              />
                            </div>
                          </div>

                          <div>
                            <p className="mb-xs text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                              Launch → date totals
                            </p>
                            <div className="flex flex-wrap gap-xs">
                              <DetailStat
                                label="GMV gross"
                                value={formatEur(account.totalGmv)}
                                hint="GMV before discounts (Databricks total_gmv_before_discounts_eur)"
                              />
                              <DetailStat label="Orders" value={formatInt(account.totalOrders)} />
                              <DetailStat
                                label="AOV gross"
                                value={formatEur(account.aov)}
                                hint="Gross GMV ÷ delivered orders"
                              />
                              <DetailStat
                                label={
                                  account.commissionSource === "databricks"
                                    ? "Commission (DB)"
                                    : "Commission"
                                }
                                value={
                                  account.totalCommission != null
                                    ? formatEur(account.totalCommission)
                                    : "—"
                                }
                                hint={
                                  account.commissionSource === "salesforce"
                                    ? `Salesforce commission rate ${pctStr(
                                        account.commissionRatePct,
                                      )} (Opportunity.Commission__c) × gross GMV`
                                    : account.commissionSource === "databricks"
                                      ? "Actual commission from Databricks (no Salesforce rate on the activation opportunity)"
                                      : "No Salesforce rate and no Databricks commission"
                                }
                              />
                              <DetailStat
                                label="Commission %"
                                value={pctStr(commissionPctOf(account))}
                                hint={
                                  account.commissionSource === "databricks"
                                    ? "Databricks actual commission ÷ gross GMV (no Salesforce rate)"
                                    : "Salesforce negotiated rate (Opportunity.Commission__c)"
                                }
                              />
                              {account.totalGmvNet != null ? (
                                <DetailStat
                                  label="GMV net"
                                  value={formatEur(account.totalGmvNet)}
                                  hint="After-discount GMV — context only, not used for headline figures"
                                />
                              ) : null}
                              {account.totalDiscount != null ? (
                                <DetailStat
                                  label="Discount"
                                  value={formatEur(account.totalDiscount)}
                                  hint="Campaign discount (gross − net GMV)"
                                />
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
