"use client";

import { useState } from "react";
import type { AccountViewRow } from "@/types/dashboard";

type AccountsTableProps = {
  won?: AccountViewRow[];
  activated?: AccountViewRow[];
  backlog?: AccountViewRow[];
  filtered?: AccountViewRow[];
  filterMode?: boolean;
  loading?: boolean;
};

type Tab = "won" | "activated" | "backlog";

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "won", label: "Won", icon: "emoji_events" },
  { id: "activated", label: "Activated", icon: "rocket_launch" },
  { id: "backlog", label: "Backlog", icon: "pending_actions" },
];

function AccountRows({ data, loading }: { data?: AccountViewRow[]; loading?: boolean }) {
  return (
    <>
      {loading && !data?.length ? (
        <tr>
          <td colSpan={7} className="px-lg py-xl text-center text-on-surface-variant">
            Loading accounts…
          </td>
        </tr>
      ) : !data?.length ? (
        <tr>
          <td colSpan={7} className="px-lg py-xl text-center text-on-surface-variant">
            No accounts match this filter.
          </td>
        </tr>
      ) : (
        data.map((account) => (
          <tr key={account.id} className="hover:bg-surface-container-low">
            <td className="px-lg py-md">
              <div className="font-semibold">{account.name}</div>
              <span
                className={`rounded-full px-xs py-[2px] text-[10px] font-bold ${account.statusColor}`}
              >
                {account.statusLabel}
              </span>
            </td>
            <td className="px-lg py-md">{account.city}</td>
            <td className="px-lg py-md text-on-surface-variant">{account.owner}</td>
            <td className="px-lg py-md">{account.tier}</td>
            <td className="px-lg py-md">{account.stage}</td>
            <td className="px-lg py-md">
              <span className="text-label-md text-on-surface-variant">{account.dateLabel}: </span>
              {account.dateValue}
            </td>
            <td className="px-lg py-md">
              {account.sfAccountUrl ? (
                <a
                  href={account.sfAccountUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-xs rounded-lg bg-primary px-sm py-xs text-label-md font-semibold text-on-primary transition hover:opacity-90"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  Salesforce
                </a>
              ) : (
                <span className="text-on-surface-variant">—</span>
              )}
            </td>
          </tr>
        ))
      )}
    </>
  );
}

export function AccountsTable({
  won,
  activated,
  backlog,
  filtered,
  filterMode,
  loading,
}: AccountsTableProps) {
  const [tab, setTab] = useState<Tab>("won");

  const data = filterMode
    ? filtered
    : tab === "won"
      ? won
      : tab === "activated"
        ? activated
        : backlog;

  return (
    <div className="glass-card overflow-hidden rounded-xl">
      <div className="flex flex-wrap items-center justify-between gap-sm border-b border-outline-variant p-lg">
        <div>
          <h3 className="text-title-lg font-title-lg font-bold">Accounts Management</h3>
          <p className="text-body-md text-on-surface-variant">
            {filterMode
              ? "Drill-down view — open each account in Salesforce"
              : "Won, Activated, and onboarding backlog — never merged"}
          </p>
        </div>
        {!filterMode && (
          <div className="flex gap-1 rounded-lg bg-surface-container-low p-1">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={
                  tab === item.id
                    ? "flex items-center gap-xs rounded-md bg-white px-sm py-xs text-label-md font-bold text-primary shadow-sm"
                    : "flex items-center gap-xs rounded-md px-sm py-xs text-label-md text-on-surface-variant hover:bg-white/50"
                }
              >
                <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                {item.label}
                <span className="rounded-full bg-surface-container px-1 text-[10px]">
                  {item.id === "won"
                    ? (won?.length ?? 0)
                    : item.id === "activated"
                      ? (activated?.length ?? 0)
                      : (backlog?.length ?? 0)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                Account
              </th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                City
              </th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                Owner
              </th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                Tier
              </th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                Stage
              </th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                Date
              </th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                SF Link
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            <AccountRows data={data} loading={loading} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
