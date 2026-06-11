"use client";

import { useMemo } from "react";
import type {
  WeeklyAgentStatusView,
  WeeklyDetailView,
  WeeklyStatusProgressView,
  WeeklyTeamStatusView,
} from "@/types/dashboard";
import { WEEKLY_STAGE_MAP } from "@/lib/weekly-stages";

export type WeeklyFilter =
  | "all"
  | "complex"
  | "density"
  | { type: "agent"; ownerId: string };

type WeeklyDetailPanelProps = {
  detail?: WeeklyDetailView;
  filter: WeeklyFilter;
  onFilterChange: (value: WeeklyFilter) => void;
  agents?: Array<{ ownerId: string; name: string; segment: string }>;
  loading?: boolean;
  onClose?: () => void;
};

function accentColor(accent: WeeklyStatusProgressView["accent"]): string {
  switch (accent) {
    case "won":
      return "var(--color-won, #2e7d32)";
    case "activated":
      return "var(--color-activated, #1565c0)";
    case "secondary":
      return "var(--color-secondary, #7b1fa2)";
    default:
      return "var(--color-primary, #006494)";
  }
}

function accentBarClass(accent: WeeklyStatusProgressView["accent"]): string {
  switch (accent) {
    case "won":
      return "bg-won";
    case "activated":
      return "bg-activated";
    case "secondary":
      return "bg-secondary";
    default:
      return "bg-primary";
  }
}

function accentTextClass(accent: WeeklyStatusProgressView["accent"]): string {
  switch (accent) {
    case "won":
      return "text-won";
    case "activated":
      return "text-activated";
    case "secondary":
      return "text-secondary";
    default:
      return "text-primary";
  }
}

function StatusDonut({ status, size = "md" }: { status: WeeklyStatusProgressView; size?: "md" | "sm" }) {
  const pct = Math.min(100, status.progress);
  const color = accentColor(status.accent);
  const outer = size === "sm" ? "h-10 w-10" : "h-16 w-16";
  const inset = size === "sm" ? "inset-[3px]" : "inset-[5px]";
  const actualSize = size === "sm" ? "text-[9px]" : "text-[11px]";
  const targetSize = size === "sm" ? "text-[8px]" : "text-[9px]";

  return (
    <div className={`relative mx-auto ${outer} shrink-0`}>
      <div
        className="h-full w-full rounded-full"
        style={{
          background: `conic-gradient(${color} ${pct * 3.6}deg, rgb(var(--surface-container) / 1) 0deg)`,
        }}
      />
      <div
        className={`absolute ${inset} flex flex-col items-center justify-center rounded-full bg-white/90 text-center`}
      >
        <span className={`${actualSize} font-extrabold tabular-nums text-on-surface`}>{status.actual}</span>
        <span className={`${targetSize} text-on-surface-variant`}>/{status.target}</span>
      </div>
    </div>
  );
}

function StatusCard({ status }: { status: WeeklyStatusProgressView }) {
  const stages = WEEKLY_STAGE_MAP[status.key];
  const barWidth = Math.min(100, Math.max(status.progress > 0 ? 4 : 0, status.progress));

  return (
    <div className="min-w-0 flex-1 rounded-lg border border-outline-variant/60 bg-white/60 p-md">
      <div className="flex items-start gap-sm">
        <StatusDonut status={status} />
        <div className="min-w-0 flex-1">
          <p className={`text-label-md font-semibold uppercase tracking-wide ${accentTextClass(status.accent)}`}>
            {status.label}
          </p>
          <p className="mt-xs text-[10px] leading-snug text-on-surface-variant">
            SF: {stages.join(" · ")}
          </p>
          <div className="mt-sm flex flex-wrap items-end justify-between gap-xs">
            <p className="text-headline-sm font-extrabold tabular-nums text-on-surface">
              {status.actual}{" "}
              <span className="text-body-md font-normal text-on-surface-variant">/ {status.target}</span>
            </p>
            <span
              className={`rounded-full px-sm py-[2px] text-label-md font-bold tabular-nums ${
                status.progress >= 100
                  ? `${accentBarClass(status.accent)} text-white`
                  : "bg-surface-container text-on-surface-variant"
              }`}
            >
              {status.progress}%
            </span>
          </div>
          <div className="mt-sm h-2 overflow-hidden rounded-full bg-surface-container">
            <div
              className={`progress-bar h-full rounded-full ${accentBarClass(status.accent)}`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentStatusMiniCell({ status }: { status: WeeklyStatusProgressView }) {
  const barWidth = Math.min(100, Math.max(status.progress > 0 ? 4 : 0, status.progress));

  return (
    <div className="min-w-[88px] space-y-[2px]">
      <div className="flex items-center justify-between gap-xs">
        <span className={`text-[10px] font-bold uppercase ${accentTextClass(status.accent)}`}>
          {status.label.slice(0, 3)}
        </span>
        <span className="text-[10px] font-bold tabular-nums text-on-surface">
          {status.actual}/{status.target}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-container">
        <div
          className={`h-full rounded-full ${accentBarClass(status.accent)}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

function AgentWeeklyRows({ agents, compact }: { agents: WeeklyAgentStatusView[]; compact?: boolean }) {
  if (!agents.length) {
    return (
      <p className="px-sm py-md text-body-md text-on-surface-variant">No agents on this team roster.</p>
    );
  }

  if (compact) {
    return (
      <div className="max-h-[28rem] overflow-auto">
        <table className="w-full min-w-[520px] text-left text-[11px]">
          <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm">
            <tr className="border-b border-outline-variant/60">
              <th className="px-xs py-[2px] text-label-md font-semibold uppercase text-on-surface-variant">
                Agent
              </th>
              <th className="px-xs py-[2px] text-label-md font-semibold uppercase text-primary">Qual</th>
              <th className="px-xs py-[2px] text-label-md font-semibold uppercase text-secondary">Nego</th>
              <th className="px-xs py-[2px] text-label-md font-semibold uppercase text-won">Won</th>
              <th className="px-xs py-[2px] text-label-md font-semibold uppercase text-activated">Act</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {agents.map((agent, index) => (
              <tr
                key={agent.ownerId}
                className={index % 2 === 0 ? "bg-surface-container-low/30" : undefined}
              >
                <td className="px-xs py-xs">
                  <div className="flex flex-wrap items-center gap-xs">
                    <span className="font-semibold text-on-surface">{agent.name}</span>
                    <span
                      className={`rounded-full px-xs py-[2px] text-[10px] font-bold uppercase ${agent.segmentColor}`}
                    >
                      {agent.segment}
                    </span>
                  </div>
                </td>
                {agent.statuses.map((status) => (
                  <td key={status.key} className="px-xs py-xs">
                    <AgentStatusMiniCell status={status} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left">
        <thead>
          <tr className="border-b border-outline-variant/60 bg-surface-container-low/50">
            <th className="px-md py-sm text-label-md font-semibold uppercase text-on-surface-variant">Agent</th>
            <th className="px-md py-sm text-label-md font-semibold uppercase text-primary">Qualified</th>
            <th className="px-md py-sm text-label-md font-semibold uppercase text-secondary">Negotiations</th>
            <th className="px-md py-sm text-label-md font-semibold uppercase text-won">Closed Won</th>
            <th className="px-md py-sm text-label-md font-semibold uppercase text-activated">Active</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/40">
          {agents.map((agent) => (
            <tr key={agent.ownerId} className="hover:bg-surface-container-low/40">
              <td className="px-md py-sm">
                <div className="flex flex-wrap items-center gap-sm">
                  <span className="font-semibold text-on-surface">{agent.name}</span>
                  <span className={`rounded-full px-xs py-[2px] text-[11px] font-bold ${agent.segmentColor}`}>
                    {agent.segment}
                  </span>
                </div>
              </td>
              {agent.statuses.map((status) => (
                <td key={status.key} className="px-md py-sm">
                  <div className="flex items-center gap-sm">
                    <StatusDonut status={status} size="sm" />
                    <AgentStatusMiniCell status={status} />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamWeeklyCard({ team, parallel = false }: { team: WeeklyTeamStatusView; parallel?: boolean }) {
  const accent = team.segment === "complex" ? "complex" : "density";
  const borderColor = accent === "complex" ? "border-l-primary" : "border-l-tertiary";
  const cardAccent = accent === "complex" ? "team-card--complex" : "team-card--density";
  const badgeColor =
    accent === "complex"
      ? "bg-primary-container/50 text-on-primary-container"
      : "bg-tertiary-container/50 text-on-tertiary-container";

  return (
    <div
      className={`team-card ${cardAccent} glass-card flex h-full min-w-0 flex-col rounded-xl border-l-4 ${borderColor} ${parallel ? "p-md" : "p-lg"}`}
    >
      <header className={`space-y-md ${parallel ? "mb-md" : "mb-lg"}`}>
        <div className="space-y-xs">
          <span
            className={`inline-flex rounded-full px-sm py-[2px] text-[11px] font-bold uppercase tracking-wide ${badgeColor}`}
          >
            {team.segmentLabel}
          </span>
          <h3
            className={`font-extrabold text-on-background ${parallel ? "text-title-lg" : "text-headline-md"}`}
          >
            {team.name}
          </h3>
          <p className={`text-on-surface-variant ${parallel ? "text-label-md" : "text-body-md"}`}>
            {team.repCount} reps · Qualified · Negotiations · Closed Won · Active vs weekly targets
          </p>
        </div>
        <div className={`grid grid-cols-1 gap-md ${parallel ? "" : "xl:grid-cols-2"}`}>
          {team.statuses.map((status) => (
            <StatusCard key={status.key} status={status} />
          ))}
        </div>
      </header>

      <div className="border-t border-outline-variant/60 pt-md">
        <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
          <p className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
            Agents · weekly status
          </p>
          <p className="text-label-md text-on-surface-variant">Sorted by activity</p>
        </div>
        <AgentWeeklyRows agents={team.agents} compact={parallel} />
      </div>
    </div>
  );
}

function AgentWeeklyCard({ agent }: { agent: WeeklyAgentStatusView }) {
  return (
    <div className="glass-card rounded-xl border border-outline-variant/60 p-lg">
      <div className="mb-md flex flex-wrap items-center gap-sm">
        <h4 className="text-title-lg font-bold text-on-surface">{agent.name}</h4>
        <span className={`rounded-full px-xs py-[2px] text-[11px] font-bold ${agent.segmentColor}`}>
          {agent.segment}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
        {agent.statuses.map((status) => (
          <StatusCard key={status.key} status={status} />
        ))}
      </div>
    </div>
  );
}

export function WeeklyFilterSelect({
  value,
  onChange,
  agents,
  prominent,
}: {
  value: WeeklyFilter;
  onChange: (value: WeeklyFilter) => void;
  agents?: Array<{ ownerId: string; name: string; segment: string }>;
  prominent?: boolean;
}) {
  const selectValue =
    value === "all"
      ? "all"
      : value === "complex"
        ? "complex"
        : value === "density"
          ? "density"
          : `agent:${value.ownerId}`;

  return (
    <label
      className={`flex flex-col gap-xs ${prominent ? "min-w-[min(100%,280px)] flex-1 sm:max-w-xs" : ""}`}
    >
      <span
        className={`font-semibold uppercase tracking-wide ${
          prominent ? "text-label-md text-primary" : "text-label-md text-on-surface-variant"
        }`}
      >
        Filter view
      </span>
      <select
        value={selectValue}
        onChange={(event) => {
          const next = event.target.value;
          if (next === "all" || next === "complex" || next === "density") {
            onChange(next);
            return;
          }
          if (next.startsWith("agent:")) {
            onChange({ type: "agent", ownerId: next.slice(6) });
          }
        }}
        className={`w-full rounded-lg border-2 border-primary/30 bg-white px-md py-2.5 text-body-md font-medium text-on-surface shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/30 ${
          prominent ? "text-title-md" : ""
        }`}
      >
        <option value="all">All teams</option>
        <option value="complex">Complex team</option>
        <option value="density">Density team</option>
        <optgroup label="Individual agent">
          {(agents ?? []).map((agent) => (
            <option key={agent.ownerId} value={`agent:${agent.ownerId}`}>
              {agent.name} ({agent.segment})
            </option>
          ))}
        </optgroup>
      </select>
    </label>
  );
}

export function WeeklyDetailPanel({
  detail,
  filter,
  onFilterChange,
  agents,
  loading,
  onClose,
}: WeeklyDetailPanelProps) {
  const content = useMemo(() => {
    if (!detail) return null;

    if (filter === "all") {
      return (
        <div className="team-progress-grid grid grid-cols-1 gap-lg md:grid-cols-2 md:items-stretch md:gap-md">
          {detail.teams.map((team) => (
            <TeamWeeklyCard key={team.segment} team={team} parallel />
          ))}
        </div>
      );
    }

    if (filter === "complex" || filter === "density") {
      const team = detail.teams.find((entry) => entry.segment === filter);
      if (!team) return null;
      return <TeamWeeklyCard team={team} />;
    }

    if (filter.type === "agent") {
      const agent = detail.agents.find((entry) => entry.ownerId === filter.ownerId);
      if (!agent) {
        return (
          <p className="rounded-lg bg-surface-container-low px-md py-sm text-body-md text-on-surface-variant">
            No activity recorded for this agent in {detail.week}.
          </p>
        );
      }
      return <AgentWeeklyCard agent={agent} />;
    }

    return null;
  }, [detail, filter]);

  if (loading && !detail) {
    return <div className="glass-card h-96 animate-pulse rounded-xl p-lg" />;
  }

  if (!detail) return null;

  return (
    <section className="space-y-md">
      <div className="sticky top-0 z-30 -mx-lg -mt-lg mb-md border-b-2 border-primary/20 bg-white/95 px-lg py-md shadow-sm backdrop-blur-md">
        <div className="flex flex-wrap items-end justify-between gap-md">
          <div className="min-w-0 flex-1 space-y-xs">
            <p className="text-label-md font-semibold uppercase tracking-wide text-primary">
              Week drill-down · Overview style
            </p>
            <h2 className="text-headline-md font-extrabold text-on-surface">
              {detail.week} · account statuses
            </h2>
            <p className="text-body-md text-on-surface-variant">
              Complex &amp; Density teams with per-agent Qualified · Negotiations · Closed Won · Active
            </p>
          </div>
          <WeeklyFilterSelect
            value={filter}
            onChange={onFilterChange}
            agents={agents}
            prominent
          />
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex shrink-0 items-center gap-xs rounded-lg bg-surface-container px-md py-sm text-label-md font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
              Close
            </button>
          )}
        </div>
      </div>
      {content}
    </section>
  );
}
