"use client";

import { Fragment, useState } from "react";
import type { AccountsPerformanceAccount } from "@/types/dashboard";
import { Sparkline } from "@/components/Sparkline";

type AccountsPerformanceTableProps = {
  accounts: AccountsPerformanceAccount[];
  selectedMonth: string;
  monthLabel: (month: string) => string;
  formatEur: (value: number) => string;
  formatInt: (value: number) => string;
  /** Latest month covered by the Databricks pull; later L-months are "pending". */
  dataMonthMax?: string | null;
  loading?: boolean;
};

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

/** "YYYY-MM" + n calendar months → "YYYY-MM". */
function addMonths(yearMonth: string, n: number): string {
  const [year, mo] = yearMonth.split("-").map(Number);
  const d = new Date(year, mo - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type LaunchMonthCell = {
  label: string;
  month: string;
  gmv: number | null;
  pending: boolean;
};

/**
 * L1/L2/L3 = the calendar month containing the launch date and the two months
 * that follow (L1 = launch month, L2 = +1, L3 = +2). GMV is looked up in the
 * account's monthly array; a missing month past the data cut-off is "pending"
 * (account too new), otherwise "—" (no GMV reported).
 */
function launchMonths(
  account: AccountsPerformanceAccount,
  dataMonthMax?: string | null,
): LaunchMonthCell[] | null {
  if (!account.launchDate) return null;
  const base = account.launchDate.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(base)) return null;
  return [0, 1, 2].map((offset) => {
    const month = addMonths(base, offset);
    const entry = account.monthly.find((m) => m.month === month);
    const pending = !entry && Boolean(dataMonthMax) && month > (dataMonthMax as string);
    return {
      label: `L${offset + 1}`,
      month,
      gmv: entry ? entry.gmv : null,
      pending,
    };
  });
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

export function AccountsPerformanceTable({
  accounts,
  selectedMonth,
  monthLabel,
  formatEur,
  formatInt,
  dataMonthMax,
  loading,
}: AccountsPerformanceTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
        No activated accounts for this filter.
      </div>
    );
  }

  const COLS = 11;
  const thBase = "px-xs py-xs text-label-md font-bold text-on-surface-variant";
  const numTh = `${thBase} text-right`;

  return (
    <div className="glass-card overflow-hidden rounded-xl">
      <table className="w-full table-fixed border-collapse text-left text-[13px]">
        <colgroup>
          <col className="w-[19%]" />
          <col className="w-[11%]" />
          <col className="w-[13%]" />
          <col className="w-[7%]" />
          <col className="w-[9%]" />
          <col className="w-[6%]" />
          <col className="w-[7%]" />
          <col className="w-[8%]" />
          <col className="w-[6%]" />
          <col className="w-[6%]" />
          <col className="w-[16%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-outline-variant bg-surface-container-low">
            <th className={thBase}>Account</th>
            <th className={thBase}>City</th>
            <th className={thBase}>Agent</th>
            <th className={thBase}>Launch</th>
            <th className={numTh} title={`GMV · ${monthLabel(selectedMonth)}`}>
              GMV
            </th>
            <th className={numTh} title={`Orders · ${monthLabel(selectedMonth)}`}>
              Ord.
            </th>
            <th className={numTh} title={`AOV · ${monthLabel(selectedMonth)}`}>
              AOV
            </th>
            <th className={numTh} title={`Partner commission · ${monthLabel(selectedMonth)}`}>
              Comm.
            </th>
            <th className={numTh} title="Average customer rating, out of 5">
              Rating
            </th>
            <th
              className={numTh}
              title="Share of open hours the restaurant was active (provider_active_rate)"
            >
              Avail.
            </th>
            <th className={numTh} title="GMV trend & total, launch → date">
              Trend · total
            </th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => {
            const month = account.monthly.find((m) => m.month === selectedMonth);
            const hasMonth = Boolean(month);
            const q = account.quality;
            const isOpen = expanded.has(account.id);
            const cells = launchMonths(account, dataMonthMax);
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
                    title={hasMonth ? formatEur(month!.gmv) : undefined}
                  >
                    {hasMonth ? eurShort(month!.gmv) : "—"}
                  </td>
                  <td className="px-xs py-xs text-right align-top text-on-surface">
                    {hasMonth ? formatInt(month!.orders) : "—"}
                  </td>
                  <td className="px-xs py-xs text-right align-top text-on-surface">
                    {hasMonth && month!.orders > 0 ? formatEur(month!.aov) : "—"}
                  </td>
                  <td
                    className="px-xs py-xs text-right align-top font-semibold text-on-surface"
                    title={hasMonth ? formatEur(month!.commission) : undefined}
                  >
                    {hasMonth ? eurShort(month!.commission) : "—"}
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
                      <Sparkline points={account.sparkline} colorClass="text-won" />
                      <span
                        className="w-14 shrink-0 text-right font-semibold text-on-surface"
                        title={formatEur(account.totalGmv)}
                      >
                        {eurShort(account.totalGmv)}
                      </span>
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
                                  className="min-w-[112px] rounded-md border border-outline-variant/60 bg-surface px-sm py-xs"
                                  title={`${monthLabel(m.month)} · GMV ${formatEur(
                                    m.gmv,
                                  )} · ${formatInt(m.orders)} orders · AOV ${
                                    m.orders > 0 ? formatEur(m.aov) : "—"
                                  } · commission ${formatEur(m.commission)}`}
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
                                    comm {eurShort(m.commission)}
                                  </span>
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
                          {cells ? (
                            <div>
                              <p className="mb-xs text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                                Since launch
                              </p>
                              <div className="flex gap-xs">
                                {cells.map((cell) => (
                                  <DetailStat
                                    key={cell.label}
                                    label={`${cell.label} · ${monthLabel(cell.month)}`}
                                    value={
                                      cell.gmv != null
                                        ? eurShort(cell.gmv)
                                        : cell.pending
                                          ? "pending"
                                          : "—"
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          ) : null}

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
                            <div className="flex gap-xs">
                              <DetailStat label="GMV" value={formatEur(account.totalGmv)} />
                              <DetailStat label="Orders" value={formatInt(account.totalOrders)} />
                              <DetailStat label="AOV" value={formatEur(account.aov)} />
                              <DetailStat
                                label="Commission"
                                value={formatEur(account.totalCommission)}
                              />
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
