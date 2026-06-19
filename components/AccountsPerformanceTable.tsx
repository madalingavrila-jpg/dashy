"use client";

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

function segmentBadge(segment: "complex" | "density") {
  return segment === "complex"
    ? "bg-primary-container/40 text-on-primary-container"
    : "bg-tertiary-container/40 text-on-tertiary-container";
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

function QualityValue({ value, tone }: { value: string; tone: Tone }) {
  return (
    <span className={`text-body-md font-semibold ${toneClass(tone)}`}>{value}</span>
  );
}

function formatLaunch(date: string | null): string {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
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

export function AccountsPerformanceTable({
  accounts,
  selectedMonth,
  monthLabel,
  formatEur,
  formatInt,
  dataMonthMax,
  loading,
}: AccountsPerformanceTableProps) {
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

  return (
    <div className="glass-card overflow-hidden rounded-xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-left">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low">
              <th className="sticky left-0 z-20 bg-surface-container-low px-sm py-xs text-label-md font-bold text-on-surface-variant">
                Account
              </th>
              <th className="px-sm py-xs text-label-md font-bold text-on-surface-variant">City</th>
              <th className="px-sm py-xs text-label-md font-bold text-on-surface-variant">Agent</th>
              <th className="px-sm py-xs text-label-md font-bold text-on-surface-variant">Launch</th>
              <th
                className="border-l border-outline-variant px-sm py-xs text-right text-label-md font-bold text-on-surface-variant"
                colSpan={4}
              >
                {monthLabel(selectedMonth)}
              </th>
              <th
                className="border-l border-outline-variant px-sm py-xs text-center text-label-md font-bold text-on-surface-variant"
                colSpan={6}
              >
                Availability &amp; performance · launch → date
              </th>
              <th className="border-l border-outline-variant px-sm py-xs text-right text-label-md font-bold text-on-surface-variant">
                Launch → date
              </th>
            </tr>
            <tr className="border-b border-outline-variant text-[10px] uppercase tracking-wide text-on-surface-variant">
              <th className="sticky left-0 z-20 bg-surface-container-low px-sm pb-xs" />
              <th className="px-sm pb-xs" />
              <th className="px-sm pb-xs" />
              <th className="px-sm pb-xs" />
              <th className="border-l border-outline-variant px-xs pb-xs text-right font-semibold">GMV</th>
              <th className="px-xs pb-xs text-right font-semibold">Orders</th>
              <th className="px-xs pb-xs text-right font-semibold">AOV</th>
              <th className="px-xs pb-xs text-right font-semibold">Comm.</th>
              <th
                className="border-l border-outline-variant px-xs pb-xs text-right font-semibold"
                title="Share of open hours the restaurant was active (provider_active_rate)"
              >
                Avail.
              </th>
              <th
                className="px-xs pb-xs text-right font-semibold"
                title="Average customer rating, out of 5"
              >
                Rating
              </th>
              <th
                className="px-xs pb-xs text-right font-semibold"
                title="Average minutes to prepare an order"
              >
                Prep
              </th>
              <th
                className="px-xs pb-xs text-right font-semibold"
                title="Order acceptance rate"
              >
                Accept
              </th>
              <th
                className="px-xs pb-xs text-right font-semibold"
                title="Order rejection rate (lower is better)"
              >
                Reject
              </th>
              <th
                className="px-xs pb-xs text-right font-semibold"
                title="Late-delivered order rate (lower is better)"
              >
                Late
              </th>
              <th className="border-l border-outline-variant px-sm pb-xs text-right font-semibold">
                GMV trend · total · L1/L2/L3 since launch
              </th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => {
              const month = account.monthly.find((m) => m.month === selectedMonth);
              const hasMonth = Boolean(month);
              return (
                <tr
                  key={account.id}
                  className="group border-b border-outline-variant/50 transition-colors hover:bg-surface-container-low"
                >
                  <td className="sticky left-0 z-10 bg-surface px-sm py-xs transition-colors group-hover:bg-surface-container-low">
                    <p
                      className="max-w-[180px] truncate text-body-md font-semibold text-on-surface"
                      title={account.accountName}
                    >
                      {account.accountName}
                    </p>
                    {account.businessSegment ? (
                      <p className="text-[11px] text-on-surface-variant">{account.businessSegment}</p>
                    ) : null}
                  </td>
                  <td className="px-sm py-xs text-body-md text-on-surface-variant">
                    <span className="block max-w-[120px] truncate" title={account.city}>
                      {account.city}
                    </span>
                  </td>
                  <td className="px-sm py-xs">
                    <span
                      className="block max-w-[140px] truncate text-body-md text-on-surface"
                      title={account.agentName}
                    >
                      {account.agentName}
                    </span>
                    <span
                      className={`mt-[2px] inline-flex rounded-full px-xs py-[1px] text-[10px] font-bold ${segmentBadge(
                        account.segment,
                      )}`}
                    >
                      {account.segment === "complex" ? "Complex" : "Density"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-sm py-xs text-[12px] text-on-surface-variant">
                    {formatLaunch(account.launchDate)}
                  </td>
                  <td className="whitespace-nowrap border-l border-outline-variant/40 px-xs py-xs text-right text-[13px] font-semibold text-on-surface">
                    {hasMonth ? formatEur(month!.gmv) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-xs py-xs text-right text-[13px] text-on-surface">
                    {hasMonth ? formatInt(month!.orders) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-xs py-xs text-right text-[13px] text-on-surface">
                    {hasMonth && month!.orders > 0 ? formatEur(month!.aov) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-xs py-xs text-right text-[13px] text-on-surface">
                    {hasMonth ? formatEur(month!.commission) : "—"}
                  </td>
                  {(() => {
                    const q = account.quality;
                    return (
                      <>
                        <td className="border-l border-outline-variant/40 px-xs py-xs text-right">
                          <QualityValue
                            value={pctStr(q?.availabilityPct)}
                            tone={toneHigh(q?.availabilityPct, 95, 85)}
                          />
                        </td>
                        <td className="px-xs py-xs text-right">
                          <QualityValue
                            value={q?.rating != null ? q.rating.toFixed(2) : "—"}
                            tone={toneHigh(q?.rating, 4.5, 4)}
                          />
                        </td>
                        <td className="px-xs py-xs text-right">
                          <QualityValue
                            value={q?.prepMinutes != null ? `${q.prepMinutes.toFixed(1)}m` : "—"}
                            tone={toneLow(q?.prepMinutes, 20, 30)}
                          />
                        </td>
                        <td className="px-xs py-xs text-right">
                          <QualityValue
                            value={pctStr(q?.acceptancePct)}
                            tone={toneHigh(q?.acceptancePct, 98, 95)}
                          />
                        </td>
                        <td className="px-xs py-xs text-right">
                          <QualityValue
                            value={pctStr(q?.rejectionPct, 2)}
                            tone={toneLow(q?.rejectionPct, 1, 3)}
                          />
                        </td>
                        <td className="px-xs py-xs text-right">
                          <QualityValue
                            value={pctStr(q?.lateDeliveryPct)}
                            tone={toneLow(q?.lateDeliveryPct, 20, 35)}
                          />
                        </td>
                      </>
                    );
                  })()}
                  <td className="border-l border-outline-variant/40 px-sm py-xs">
                    <div className="flex flex-col items-end gap-xs">
                      <div className="flex items-center justify-end gap-xs">
                        <Sparkline points={account.sparkline} colorClass="text-won" />
                        <span
                          className="w-16 text-right text-[13px] font-semibold text-on-surface"
                          title={formatEur(account.totalGmv)}
                        >
                          {eurShort(account.totalGmv)}
                        </span>
                      </div>
                      {(() => {
                        const cells = launchMonths(account, dataMonthMax);
                        if (!cells) return null;
                        return (
                          <div className="flex justify-end gap-base">
                            {cells.map((cell) => (
                              <div
                                key={cell.label}
                                className="flex min-w-[52px] flex-col items-end rounded border border-outline-variant/60 bg-surface-container-low px-xs py-[2px] text-right"
                                title={`${cell.label} · ${monthLabel(cell.month)} · ${
                                  cell.gmv != null
                                    ? formatEur(cell.gmv)
                                    : cell.pending
                                      ? "pending"
                                      : "no GMV"
                                }`}
                              >
                                <span className="text-[9px] font-bold uppercase tracking-wide text-on-surface-variant">
                                  {cell.label}
                                </span>
                                <span
                                  className={`text-[12px] font-semibold ${
                                    cell.gmv != null ? "text-on-surface" : "text-on-surface-variant"
                                  }`}
                                >
                                  {cell.gmv != null
                                    ? eurShort(cell.gmv)
                                    : cell.pending
                                      ? "·"
                                      : "—"}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
