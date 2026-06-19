"use client";

import { Fragment, useState } from "react";
import type { ReactNode } from "react";
import type { MopsOnboardingAgentViewRow } from "@/types/dashboard";

type MopsOnboardingTableProps = {
  agents?: MopsOnboardingAgentViewRow[];
  total?: string;
  loading?: boolean;
  title?: string;
  description?: ReactNode;
  totalSuffix?: string;
  countColLabel?: string;
  emptyLabel?: string;
  loadingLabel?: string;
};

function segmentBadge(color: string, label: string) {
  return (
    <span className={`rounded-full px-sm py-[2px] text-[11px] font-bold uppercase ${color}`}>
      {label}
    </span>
  );
}

export function MopsOnboardingTable({
  agents,
  total,
  loading,
  title = "Onboarding by agent",
  description,
  totalSuffix = "accounts in onboarding",
  countColLabel = "In onboarding",
  emptyLabel = "No accounts in onboarding for team reps.",
  loadingLabel = "Loading onboarding data…",
}: MopsOnboardingTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const defaultDescription = (
    <>
      Sales opportunities (not cases) — team reps only, every onboarding stage not yet ready to
      activate (Onboarding Checklist → Onboarding → Escalation). Excludes Contract sent, Ready to
      Activate, Activated, and closed deals. Click a row to see that agent&apos;s accounts.
    </>
  );

  return (
    <div className="glass-card overflow-hidden rounded-xl">
      <div className="border-b border-outline-variant p-lg">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <h3 className="text-title-lg font-title-lg font-bold">{title}</h3>
          {total ? (
            <span className="rounded-lg bg-primary-container/30 px-md py-xs text-label-md font-semibold text-primary">
              {total} {totalSuffix}
            </span>
          ) : null}
        </div>
        <p className="text-body-md text-on-surface-variant">
          {description ?? defaultDescription}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                Agent
              </th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                Segment
              </th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                {countColLabel}
              </th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                By stage
              </th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                Accounts
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {loading && !agents?.length ? (
              <tr>
                <td colSpan={5} className="px-lg py-xl text-center text-on-surface-variant">
                  {loadingLabel}
                </td>
              </tr>
            ) : !agents?.length ? (
              <tr>
                <td colSpan={5} className="px-lg py-xl text-center text-on-surface-variant">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              agents.map((agent) => {
                const isOpen = expanded === agent.ownerId;
                const hasAccounts = agent.accounts.length > 0;
                const toggle = () => {
                  if (!hasAccounts) return;
                  setExpanded(isOpen ? null : agent.ownerId);
                };
                return (
                  <Fragment key={agent.ownerId}>
                    <tr
                      role={hasAccounts ? "button" : undefined}
                      tabIndex={hasAccounts ? 0 : undefined}
                      aria-expanded={hasAccounts ? isOpen : undefined}
                      onClick={toggle}
                      onKeyDown={(event) => {
                        if (!hasAccounts) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          toggle();
                        }
                      }}
                      className={`transition-colors ${
                        hasAccounts ? "cursor-pointer hover:bg-primary-container/15" : ""
                      } ${isOpen ? "bg-primary-container/10" : ""}`}
                    >
                      <td className="px-lg py-md font-semibold text-on-surface">
                        <div className="flex items-center gap-sm">
                          {hasAccounts ? (
                            <span
                              className={`material-symbols-outlined text-[20px] text-primary transition-transform ${
                                isOpen ? "rotate-90" : ""
                              }`}
                              aria-hidden="true"
                            >
                              chevron_right
                            </span>
                          ) : (
                            <span className="inline-block w-[20px]" aria-hidden="true" />
                          )}
                          {agent.name}
                        </div>
                      </td>
                      <td className="px-lg py-md">
                        {segmentBadge(agent.segmentColor, agent.segment)}
                      </td>
                      <td className="px-lg py-md">
                        <span className="text-title-md font-bold text-primary">{agent.count}</span>
                      </td>
                      <td className="px-lg py-md text-body-md text-on-surface-variant">
                        {agent.stageSummary || "—"}
                      </td>
                      <td className="px-lg py-md">
                        {hasAccounts ? (
                          <span className="inline-flex items-center gap-xs rounded-lg px-sm py-xs text-label-md font-medium text-primary">
                            <span className="material-symbols-outlined text-[18px]">
                              {isOpen ? "expand_less" : "expand_more"}
                            </span>
                            {isOpen ? "Hide" : "View"} accounts
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                    {isOpen && agent.accounts.length > 0 ? (
                      <tr key={`${agent.ownerId}-detail`} className="bg-surface-container-low/50">
                        <td colSpan={5} className="px-lg py-md">
                          <ul className="grid gap-xs sm:grid-cols-2 lg:grid-cols-3">
                            {agent.accounts.map((account) => (
                              <li
                                key={account.id}
                                className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-sm py-xs"
                              >
                                <div className="flex flex-wrap items-center gap-xs">
                                  {account.sfAccountUrl ? (
                                    <a
                                      href={account.sfAccountUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-medium text-primary hover:underline"
                                    >
                                      {account.name}
                                    </a>
                                  ) : (
                                    <span className="font-medium">{account.name}</span>
                                  )}
                                  {account.city && account.city !== "—" ? (
                                    <span className="text-[11px] text-on-surface-variant">
                                      · {account.city}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-[2px] flex flex-wrap items-center gap-xs text-[11px] text-on-surface-variant">
                                  <span>{account.stage}</span>
                                  {account.sfOpportunityUrl ? (
                                    <a
                                      href={account.sfOpportunityUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline"
                                    >
                                      Opp ↗
                                    </a>
                                  ) : null}
                                </div>
                              </li>
                            ))}
                          </ul>
                          {agent.moreCount > 0 ? (
                            <p className="mt-sm text-[11px] text-on-surface-variant">
                              + {agent.moreCount} more in Salesforce
                            </p>
                          ) : null}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
