"use client";

import { useState } from "react";
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

type SegmentKey = "complex" | "density";

const SEGMENT_META: Record<
  SegmentKey,
  { label: string; teamName: string; badge: string; border: string; card: string }
> = {
  complex: {
    label: "Complex",
    teamName: "Complex Team",
    badge: "bg-primary-container/50 text-on-primary-container",
    border: "border-l-primary",
    card: "team-card--complex",
  },
  density: {
    label: "Density",
    teamName: "Density Team",
    badge: "bg-tertiary-container/50 text-on-tertiary-container",
    border: "border-l-tertiary",
    card: "team-card--density",
  },
};

function segmentKey(segment: string): SegmentKey {
  return segment.toLowerCase().includes("density") ? "density" : "complex";
}

function parseCount(value: string): number {
  return Number.parseInt(value.replace(/[^\d-]/g, ""), 10) || 0;
}

function AccountList({ agent }: { agent: MopsOnboardingAgentViewRow }) {
  return (
    <div className="mt-xs rounded-lg border border-outline-variant/50 bg-surface-container-lowest/70 p-sm">
      <ul className="grid gap-xs sm:grid-cols-2">
        {agent.accounts.map((account) => (
          <li
            key={account.id}
            className="rounded-lg border border-outline-variant/60 bg-white/70 px-sm py-xs"
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
                <span className="text-[11px] text-on-surface-variant">· {account.city}</span>
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
    </div>
  );
}

function SegmentCard({
  segment,
  agents,
  countColLabel,
}: {
  segment: SegmentKey;
  agents: MopsOnboardingAgentViewRow[];
  countColLabel: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const meta = SEGMENT_META[segment];
  const segmentTotal = agents.reduce((sum, agent) => sum + parseCount(agent.count), 0);

  return (
    <div
      className={`team-card ${meta.card} glass-card flex h-full min-w-0 flex-col rounded-xl border-l-4 ${meta.border} p-md`}
    >
      <header className="mb-md flex items-start justify-between gap-sm">
        <div className="min-w-0 space-y-xs">
          <span
            className={`inline-flex rounded-full px-sm py-[2px] text-[11px] font-bold uppercase tracking-wide ${meta.badge}`}
          >
            {meta.label}
          </span>
          <h3 className="text-title-lg font-extrabold text-on-background">{meta.teamName}</h3>
          <p className="text-label-md text-on-surface-variant">
            {agents.length} {agents.length === 1 ? "rep" : "reps"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-xs">
          <span className="text-headline-sm font-extrabold tabular-nums text-primary">
            {segmentTotal}
          </span>
          <p className="text-label-md font-semibold text-on-surface-variant">{countColLabel}</p>
        </div>
      </header>

      <div className="border-t border-outline-variant/60 pt-md">
        {agents.length ? (
          <ul className="divide-y divide-outline-variant/30">
            {agents.map((agent) => {
              const isOpen = expanded === agent.ownerId;
              const hasAccounts = agent.accounts.length > 0;
              const toggle = () => {
                if (!hasAccounts) return;
                setExpanded(isOpen ? null : agent.ownerId);
              };
              return (
                <li key={agent.ownerId}>
                  <div
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
                    className={`flex items-center justify-between gap-sm rounded-lg px-sm py-sm transition-colors ${
                      hasAccounts ? "cursor-pointer hover:bg-primary-container/15" : ""
                    } ${isOpen ? "bg-primary-container/10" : ""}`}
                  >
                    <div className="flex min-w-0 items-center gap-sm">
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
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-on-surface">{agent.name}</p>
                        {agent.stageSummary && agent.stageSummary !== "—" ? (
                          <p className="truncate text-[11px] text-on-surface-variant">
                            {agent.stageSummary}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <span className="shrink-0 text-title-md font-extrabold tabular-nums text-primary">
                      {agent.count}
                    </span>
                  </div>
                  {isOpen && hasAccounts ? <AccountList agent={agent} /> : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-sm py-md text-body-md text-on-surface-variant">
            No accounts for this segment.
          </p>
        )}
      </div>
    </div>
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
  const defaultDescription = (
    <>
      Sales opportunities (not cases) — team reps only, every onboarding stage not yet ready to
      activate (Onboarding Checklist → Onboarding → Escalation). Excludes Contract sent, Ready to
      Activate, Activated, and closed deals. Click an agent to see that agent&apos;s accounts.
    </>
  );

  const complexAgents = (agents ?? []).filter((agent) => segmentKey(agent.segment) === "complex");
  const densityAgents = (agents ?? []).filter((agent) => segmentKey(agent.segment) === "density");

  return (
    <div className="space-y-md">
      <div className="glass-card rounded-xl p-lg">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <h3 className="text-title-lg font-title-lg font-bold">{title}</h3>
          {total ? (
            <span className="rounded-lg bg-primary-container/30 px-md py-xs text-label-md font-semibold text-primary">
              {total} {totalSuffix}
            </span>
          ) : null}
        </div>
        <p className="text-body-md text-on-surface-variant">{description ?? defaultDescription}</p>
      </div>

      {loading && !agents?.length ? (
        <div className="glass-card rounded-xl p-xl text-center text-on-surface-variant">
          {loadingLabel}
        </div>
      ) : !agents?.length ? (
        <div className="glass-card rounded-xl p-xl text-center text-on-surface-variant">
          {emptyLabel}
        </div>
      ) : (
        <div className="team-progress-grid grid grid-cols-1 gap-lg md:grid-cols-2 md:items-stretch md:gap-md">
          <SegmentCard segment="complex" agents={complexAgents} countColLabel={countColLabel} />
          <SegmentCard segment="density" agents={densityAgents} countColLabel={countColLabel} />
        </div>
      )}
    </div>
  );
}
