"use client";

import type { AccountsPerformanceAccount } from "@/types/dashboard";
import { Sparkline } from "@/components/Sparkline";

type AccountsPerformanceTableProps = {
  accounts: AccountsPerformanceAccount[];
  selectedMonth: string;
  monthLabel: (month: string) => string;
  formatEur: (value: number) => string;
  formatInt: (value: number) => string;
  loading?: boolean;
};

function segmentBadge(segment: "complex" | "density") {
  return segment === "complex"
    ? "bg-primary-container/40 text-on-primary-container"
    : "bg-tertiary-container/40 text-on-tertiary-container";
}

function formatLaunch(date: string | null): string {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function AccountsPerformanceTable({
  accounts,
  selectedMonth,
  monthLabel,
  formatEur,
  formatInt,
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
        <table className="w-full min-w-[920px] border-collapse text-left">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low">
              <th className="px-md py-sm text-label-md font-bold text-on-surface-variant">
                Account
              </th>
              <th className="px-md py-sm text-label-md font-bold text-on-surface-variant">City</th>
              <th className="px-md py-sm text-label-md font-bold text-on-surface-variant">Agent</th>
              <th className="px-md py-sm text-label-md font-bold text-on-surface-variant">Launch</th>
              <th
                className="px-md py-sm text-right text-label-md font-bold text-on-surface-variant"
                colSpan={4}
              >
                {monthLabel(selectedMonth)}
              </th>
              <th className="px-md py-sm text-right text-label-md font-bold text-on-surface-variant">
                Launch → date
              </th>
            </tr>
            <tr className="border-b border-outline-variant text-[11px] uppercase tracking-wide text-on-surface-variant">
              <th className="px-md pb-xs" />
              <th className="px-md pb-xs" />
              <th className="px-md pb-xs" />
              <th className="px-md pb-xs" />
              <th className="px-md pb-xs text-right font-semibold">GMV</th>
              <th className="px-md pb-xs text-right font-semibold">Orders</th>
              <th className="px-md pb-xs text-right font-semibold">AOV</th>
              <th className="px-md pb-xs text-right font-semibold">Commission</th>
              <th className="px-md pb-xs text-right font-semibold">GMV trend · total</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => {
              const month = account.monthly.find((m) => m.month === selectedMonth);
              const hasMonth = Boolean(month);
              return (
                <tr
                  key={account.id}
                  className="border-b border-outline-variant/50 transition-colors hover:bg-surface-container-low"
                >
                  <td className="px-md py-sm">
                    <p className="text-body-md font-semibold text-on-surface">
                      {account.accountName}
                    </p>
                    {account.businessSegment ? (
                      <p className="text-[11px] text-on-surface-variant">{account.businessSegment}</p>
                    ) : null}
                  </td>
                  <td className="px-md py-sm text-body-md text-on-surface-variant">
                    {account.city}
                  </td>
                  <td className="px-md py-sm">
                    <span className="text-body-md text-on-surface">{account.agentName}</span>
                    <span
                      className={`ml-xs inline-flex rounded-full px-xs py-[1px] text-[10px] font-bold ${segmentBadge(
                        account.segment,
                      )}`}
                    >
                      {account.segment === "complex" ? "Complex" : "Density"}
                    </span>
                  </td>
                  <td className="px-md py-sm text-body-md text-on-surface-variant">
                    {formatLaunch(account.launchDate)}
                  </td>
                  <td className="px-md py-sm text-right text-body-md font-semibold text-on-surface">
                    {hasMonth ? formatEur(month!.gmv) : "—"}
                  </td>
                  <td className="px-md py-sm text-right text-body-md text-on-surface">
                    {hasMonth ? formatInt(month!.orders) : "—"}
                  </td>
                  <td className="px-md py-sm text-right text-body-md text-on-surface">
                    {hasMonth && month!.orders > 0 ? formatEur(month!.aov) : "—"}
                  </td>
                  <td className="px-md py-sm text-right text-body-md text-on-surface">
                    {hasMonth ? formatEur(month!.commission) : "—"}
                  </td>
                  <td className="px-md py-sm">
                    <div className="flex items-center justify-end gap-sm">
                      <Sparkline points={account.sparkline} />
                      <span className="w-20 text-right text-body-md font-semibold text-on-surface">
                        {formatEur(account.totalGmv)}
                      </span>
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
