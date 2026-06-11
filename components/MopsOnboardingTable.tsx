"use client";

import { Fragment, useState } from "react";
import type { MopsAgentViewRow } from "@/types/dashboard";

type MopsOnboardingTableProps = {
  agents?: MopsAgentViewRow[];
  loading?: boolean;
};

function segmentBadge(color: string, label: string) {
  return (
    <span className={`rounded-full px-sm py-[2px] text-[11px] font-bold uppercase ${color}`}>
      {label}
    </span>
  );
}

export function MopsOnboardingTable({ agents, loading }: MopsOnboardingTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="glass-card overflow-hidden rounded-xl">
      <div className="border-b border-outline-variant p-lg">
        <h3 className="text-title-lg font-title-lg font-bold">Live onboarding by agent</h3>
        <p className="text-body-md text-on-surface-variant">
          Sales opportunities (not cases) — Romania team reps only, Contract sent through Ready to
          Activate (excludes Activated). Teodor Domnica & Andrei-Sebastian Caba excluded.
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
                Live count
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
                  Loading onboarding data…
                </td>
              </tr>
            ) : !agents?.length ? (
              <tr>
                <td colSpan={5} className="px-lg py-xl text-center text-on-surface-variant">
                  No live onboarding accounts for team reps.
                </td>
              </tr>
            ) : (
              agents.map((agent) => {
                const isOpen = expanded === agent.ownerId;
                return (
                  <Fragment key={agent.ownerId}>
                    <tr className="hover:bg-surface-container-low">
                      <td className="px-lg py-md font-semibold text-on-surface">{agent.name}</td>
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
                        {agent.accounts.length > 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded(isOpen ? null : agent.ownerId)
                            }
                            className="flex items-center gap-xs rounded-lg px-sm py-xs text-label-md font-medium text-primary hover:bg-primary-container/20"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {isOpen ? "expand_less" : "expand_more"}
                            </span>
                            {agent.accounts.length} account{agent.accounts.length === 1 ? "" : "s"}
                          </button>
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
                                  <span className="text-[11px] text-on-surface-variant">
                                    · {account.city}
                                  </span>
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
