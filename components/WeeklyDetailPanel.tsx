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

function StatusDonut({ status }: { status: WeeklyStatusProgressView }) {
  const pct = Math.min(100, status.progress);
  const color = accentColor(status.accent);

  return (
    <div className="relative mx-auto h-16 w-16 shrink-0">
      <div
        className="h-full w-full rounded-full"
        style={{
          background: `conic-gradient(${color} ${pct * 3.6}deg, rgb(var(--surface-container) / 1) 0deg)`,
        }}
      />
      <div className="absolute inset-[5px] flex flex-col items-center justify-center rounded-full bg-white/90 text-center">
        <span className="text-[11px] font-extrabold tabular-nums text-on-surface">{status.actual}</span>
        <span className="text-[9px] text-on-surface-variant">/{status.target}</span>
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
                status.progress >= 100 ? `${accentBarClass(status.accent)} text-white` : "bg-surface-container text-on-surface-variant"
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

function TeamWeeklyCard({ team }: { team: WeeklyTeamStatusView }) {
  const accent = team.segment === "complex" ? "complex" : "density";
  const borderColor = accent === "complex" ? "border-l-primary" : "border-l-tertiary";
  const cardAccent = accent === "complex" ? "team-card--complex" : "team-card--density";
  const badgeColor =
    accent === "complex"
      ? "bg-primary-container/50 text-on-primary-container"
      : "bg-tertiary-container/50 text-on-tertiary-container";

  return (
    <div
      className={`team-card ${cardAccent} glass-card flex h-full min-w-0 flex-col rounded-xl border-l-4 ${borderColor} p-lg`}
    >
      <header className="mb-md space-y-xs">
        <span
          className={`inline-flex rounded-full px-sm py-[2px] text-[11px] font-bold uppercase tracking-wide ${badgeColor}`}
        >
          {team.segmentLabel}
        </span>
        <h3 className="text-headline-md font-extrabold text-on-background">{team.name}</h3>
        <p className="text-body-md text-on-surface-variant">{team.repCount} reps · weekly status targets</p>
      </header>
      <div className="grid grid-cols-1 gap-md xl:grid-cols-2">
        {team.statuses.map((status) => (
          <StatusCard key={status.key} status={status} />
        ))}
      </div>
    </div>
  );
}

function AgentWeeklyCard({ agent }: { agent: WeeklyAgentStatusView }) {
  return (
    <div className="glass-card rounded-xl border border-outline-variant/60 p-md">
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

export function WeeklyDetailPanel({ detail, filter, loading, onClose }: WeeklyDetailPanelProps) {
  const content = useMemo(() => {
    if (!detail) return null;

    if (filter === "all") {
      return (
        <div className="team-progress-grid grid grid-cols-1 gap-lg md:grid-cols-2 md:items-stretch">
          {detail.teams.map((team) => (
            <TeamWeeklyCard key={team.segment} team={team} />
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
    return <div className="glass-card animate-pulse rounded-xl p-lg h-96" />;
  }

  if (!detail) return null;

  return (
    <section className="space-y-md">
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div>
          <p className="text-label-md font-semibold uppercase tracking-wide text-primary">
            Week drill-down
          </p>
          <h2 className="text-headline-md font-extrabold text-on-surface">{detail.week} · account statuses</h2>
          <p className="text-body-md text-on-surface-variant">
            Qualified · Negotiations · Closed Won · Active — actual vs weekly targets
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-xs rounded-lg bg-surface-container px-md py-sm text-label-md font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
            Close
          </button>
        )}
      </div>
      {content}
    </section>
  );
}

export function WeeklyFilterSelect({
  value,
  onChange,
  agents,
}: {
  value: WeeklyFilter;
  onChange: (value: WeeklyFilter) => void;
  agents?: Array<{ ownerId: string; name: string; segment: string }>;
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
    <label className="inline-flex flex-col gap-xs">
      <span className="text-label-md font-semibold text-on-surface-variant">View</span>
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
        className="min-w-[220px] rounded-lg border-none bg-surface-container px-md py-2 text-body-md focus:ring-2 focus:ring-primary"
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
