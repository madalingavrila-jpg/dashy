"use client";

import Link from "next/link";
import type { AgentViewRow } from "@/types/dashboard";

type AgentsTableProps = {
  agents?: AgentViewRow[];
  loading?: boolean;
};

function progressBar(progress: number, accent: "won" | "activated") {
  const barColor = accent === "won" ? "bg-won" : "bg-activated";
  return (
    <div className="flex items-center gap-sm">
      <div className="h-2 w-16 overflow-hidden rounded-full bg-surface-container">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${progress}%` }} />
      </div>
      <span className="text-label-md text-on-surface-variant">{progress}%</span>
    </div>
  );
}

export function AgentsTable({ agents, loading }: AgentsTableProps) {
  return (
    <div className="glass-card overflow-hidden rounded-xl">
      <div className="border-b border-outline-variant p-lg">
        <h3 className="text-title-lg font-title-lg font-bold">Sales Agents</h3>
        <p className="text-body-md text-on-surface-variant">
          Romania URads owners — Won target Complex 10/rep, Density 30/rep · Activated target Complex 8/rep, Density 25/rep
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
                Won target
              </th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                Pipeline
              </th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                By stage
              </th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                Won MTD
              </th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                Activated MTD
              </th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {loading && !agents?.length ? (
              <tr>
                <td colSpan={8} className="px-lg py-xl text-center text-on-surface-variant">
                  Loading agents…
                </td>
              </tr>
            ) : !agents?.length ? (
              <tr>
                <td colSpan={8} className="px-lg py-xl text-center text-on-surface-variant">
                  No agents found.
                </td>
              </tr>
            ) : (
              agents.map((agent) => (
                <tr key={agent.ownerId} className="hover:bg-surface-container-low">
                  <td className="px-lg py-md">
                    <Link
                      href={agent.accountsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary hover:underline"
                    >
                      {agent.name}
                    </Link>
                  </td>
                  <td className="px-lg py-md">
                    <span
                      className={`rounded-full px-xs py-[2px] text-[11px] font-bold ${agent.segmentColor}`}
                    >
                      {agent.segment}
                    </span>
                  </td>
                  <td className="px-lg py-md text-data-mono font-data-mono font-bold">
                    {agent.mtdTarget}
                  </td>
                  <td className="px-lg py-md text-data-mono font-data-mono font-bold">
                    {agent.pipelineCount}
                  </td>
                  <td className="max-w-xs px-lg py-md text-label-md text-on-surface-variant">
                    {agent.stageSummary}
                  </td>
                  <td className="px-lg py-md">
                    <div className="space-y-xs">
                      <span className="rounded-full badge-won px-xs py-[2px] text-label-md font-bold">
                        {agent.wonMtd} / {agent.mtdTarget}
                      </span>
                      {progressBar(agent.wonMtdProgress, "won")}
                    </div>
                  </td>
                  <td className="px-lg py-md">
                    <div className="space-y-xs">
                      <span className="rounded-full badge-activated px-xs py-[2px] text-label-md font-bold">
                        {agent.activatedMtd} / {agent.activatedMtdTarget}
                      </span>
                      {progressBar(agent.activatedMtdProgress, "activated")}
                    </div>
                  </td>
                  <td className="px-lg py-md">
                    <Link
                      href={agent.accountsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-xs rounded-lg border border-outline-variant bg-white px-sm py-xs text-label-md font-semibold text-primary transition hover:bg-primary-container/20"
                    >
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      Accounts
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
