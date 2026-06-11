"use client";

import Link from "next/link";
import type { TeamProgressView } from "@/types/dashboard";

type TeamProgressPanelProps = {
  team: TeamProgressView;
  loading?: boolean;
  variant?: "overview" | "detailed";
  /** Side-by-side column layout — tighter padding and compact agent table */
  parallel?: boolean;
};

function progressBar(
  progress: number,
  accent: "won" | "activated" | "complex" | "density",
  size: "xs" | "sm" | "md" = "md",
) {
  const barColor =
    accent === "won"
      ? "bg-won"
      : accent === "activated"
        ? "bg-activated"
        : accent === "complex"
          ? "bg-primary"
          : "bg-tertiary";
  const height = size === "md" ? "h-3" : size === "sm" ? "h-2" : "h-1.5";
  const width = Math.min(100, Math.max(progress > 0 ? 4 : 0, progress));

  return (
    <div className={`${height} overflow-hidden rounded-full bg-surface-container`}>
      <div
        className={`progress-bar h-full rounded-full ${barColor}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function progressBadge(progress: number, tone: "won" | "activated") {
  const reached = progress >= 100;
  const base =
    tone === "won"
      ? reached
        ? "bg-won text-white"
        : "bg-won-container text-won"
      : reached
        ? "bg-activated text-white"
        : "bg-activated-container text-activated";

  return (
    <span className={`rounded-full px-sm py-[2px] text-label-md font-bold tabular-nums ${base}`}>
      {progress}%
    </span>
  );
}

function MtdStatChip({
  label,
  actual,
  target,
  progress,
  tone,
}: {
  label: string;
  actual: string;
  target: string;
  progress: number;
  tone: "won" | "activated";
}) {
  const labelColor = tone === "won" ? "text-won" : "text-activated";

  return (
    <div className="min-w-0 flex-1 rounded-lg border border-outline-variant/60 bg-white/60 p-md">
      <p className={`text-label-md font-semibold uppercase tracking-wide ${labelColor}`}>{label}</p>
      <div className="mt-xs flex flex-wrap items-end justify-between gap-xs">
        <p className="text-headline-sm font-extrabold tabular-nums text-on-surface">
          {actual}{" "}
          <span className="text-body-md font-normal text-on-surface-variant">/ {target}</span>
        </p>
        {progressBadge(progress, tone)}
      </div>
      <div className="mt-sm">
        {progressBar(progress, tone, tone === "won" ? "sm" : "xs")}
      </div>
    </div>
  );
}

function AgentMtdCell({
  actual,
  target,
  progress,
  tone,
  compact,
}: {
  actual: string;
  target: string;
  progress: number;
  tone: "won" | "activated";
  compact?: boolean;
}) {
  const chipClass = tone === "won" ? "badge-won" : "badge-activated";
  const barSize = compact ? "xs" : "sm";

  return (
    <div className="space-y-xs">
      <div className="flex flex-wrap items-center gap-xs">
        <span className={`rounded-full px-xs py-[2px] text-label-md font-bold tabular-nums ${chipClass}`}>
          {tone === "won" ? "Won" : "Act"} {actual}/{target}
        </span>
        <span
          className={`text-label-md font-bold tabular-nums ${tone === "won" ? "text-won" : "text-activated"}`}
        >
          {progress}%
        </span>
      </div>
      {progressBar(progress, tone, barSize)}
    </div>
  );
}

function AgentRowsTable({
  team,
  loading,
  detailed,
  parallel,
}: {
  team: TeamProgressView;
  loading?: boolean;
  detailed?: boolean;
  parallel?: boolean;
}) {
  if (loading && !team.agents.length) {
    return <p className="px-sm py-md text-on-surface-variant">Loading agents…</p>;
  }

  if (detailed && !parallel) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b border-outline-variant/60 bg-surface-container-low/50">
              <th className="px-md py-sm text-label-md font-semibold uppercase text-on-surface-variant">
                Agent
              </th>
              <th className="px-md py-sm text-label-md font-semibold uppercase text-on-surface-variant">
                Segment
              </th>
              <th className="px-md py-sm text-label-md font-semibold uppercase text-won">Won MTD</th>
              <th className="px-md py-sm text-label-md font-semibold uppercase text-activated">
                Activated MTD
              </th>
              <th className="px-md py-sm text-label-md font-semibold uppercase text-on-surface-variant">
                Accounts
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {team.agents.map((agent) => (
              <tr key={agent.ownerId} className="hover:bg-surface-container-low/40">
                <td className="px-md py-sm">
                  <Link
                    href={agent.accountsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary hover:underline"
                  >
                    {agent.name}
                  </Link>
                </td>
                <td className="px-md py-sm">
                  <span
                    className={`rounded-full px-xs py-[2px] text-[11px] font-bold ${agent.segmentColor}`}
                  >
                    {agent.segment}
                  </span>
                </td>
                <td className="px-md py-sm">
                  <AgentMtdCell
                    actual={agent.mtdActual}
                    target={agent.mtdTarget}
                    progress={agent.progress}
                    tone="won"
                  />
                </td>
                <td className="px-md py-sm">
                  <AgentMtdCell
                    actual={agent.activatedActual}
                    target={agent.activatedTarget}
                    progress={agent.activatedProgress}
                    tone="activated"
                  />
                </td>
                <td className="px-md py-sm">
                  <Link
                    href={agent.accountsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-xs text-label-md font-semibold text-primary hover:underline"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const tableMinWidth = parallel ? "min-w-[240px]" : "min-w-[520px]";
  const cellPad = parallel ? "px-xs py-xs" : "px-sm py-sm";
  const headPad = parallel ? "px-xs py-[2px]" : "px-sm py-xs";

  return (
    <div className={parallel ? "max-h-[28rem] overflow-auto" : "overflow-x-auto"}>
      <table className={`w-full ${tableMinWidth} text-left ${parallel ? "text-[11px]" : ""}`}>
        <thead className={parallel ? "sticky top-0 z-10 bg-white/95 backdrop-blur-sm" : undefined}>
          <tr className="border-b border-outline-variant/60">
            <th
              className={`${headPad} text-label-md font-semibold uppercase text-on-surface-variant`}
            >
              Agent
            </th>
            <th className={`${headPad} text-label-md font-semibold uppercase text-won`}>Won MTD</th>
            <th
              className={`${headPad} text-label-md font-semibold uppercase text-activated`}
            >
              Activated MTD
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/30">
          {team.agents.map((agent, index) => (
            <tr
              key={agent.ownerId}
              className={index % 2 === 0 ? "bg-surface-container-low/30" : undefined}
            >
              <td className={cellPad}>
                <div className="flex flex-wrap items-center gap-xs">
                  <Link
                    href={agent.accountsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary hover:underline"
                  >
                    {agent.name}
                  </Link>
                  <span
                    className={`rounded-full px-xs py-[2px] text-[10px] font-bold uppercase ${agent.segmentColor}`}
                  >
                    {agent.segment}
                  </span>
                </div>
              </td>
              <td className={cellPad}>
                <AgentMtdCell
                  actual={agent.mtdActual}
                  target={agent.mtdTarget}
                  progress={agent.progress}
                  tone="won"
                  compact
                />
              </td>
              <td className={cellPad}>
                <AgentMtdCell
                  actual={agent.activatedActual}
                  target={agent.activatedTarget}
                  progress={agent.activatedProgress}
                  tone="activated"
                  compact
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TeamProgressPanel({
  team,
  loading,
  variant = "overview",
  parallel = false,
}: TeamProgressPanelProps) {
  const accent = team.segment === "complex" ? "complex" : "density";
  const borderColor = accent === "complex" ? "border-l-primary" : "border-l-tertiary";
  const cardAccent = accent === "complex" ? "team-card--complex" : "team-card--density";
  const badgeColor =
    accent === "complex"
      ? "bg-primary-container/50 text-on-primary-container"
      : "bg-tertiary-container/50 text-on-tertiary-container";
  const detailed = variant === "detailed";

  return (
    <div
      className={`team-card ${cardAccent} glass-card min-w-0 rounded-xl border-l-4 ${borderColor} ${parallel ? "p-md" : "p-lg"}`}
      id={team.segment === "complex" ? "complex-team" : "density-team"}
    >
      <header className={`space-y-md ${parallel ? "mb-md" : "mb-lg"}`}>
        <div className="flex flex-wrap items-start justify-between gap-sm">
          <div className="min-w-0 space-y-xs">
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
              {team.repCount} reps · Won target {team.targetPerRep}/rep · Activated target{" "}
              {team.activatedTargetPerRep}/rep
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-xs">
            {progressBadge(team.progress, "won")}
            <p className="text-label-md font-semibold text-on-surface-variant">Team Won MTD</p>
          </div>
        </div>

        <div className={`flex flex-col gap-sm ${parallel ? "" : "sm:flex-row"}`}>
          <MtdStatChip
            label="Won MTD"
            actual={team.actual}
            target={team.target}
            progress={team.progress}
            tone="won"
          />
          <MtdStatChip
            label="Activated MTD"
            actual={team.activatedActual}
            target={team.activatedTarget}
            progress={team.activatedProgress}
            tone="activated"
          />
        </div>

        <div className="rounded-lg border border-outline-variant/50 bg-surface-container-low/40 p-sm">
          <div className="mb-xs flex flex-wrap items-center justify-between gap-xs">
            <p className="text-label-md font-semibold text-on-surface-variant">
              Team Won target progress
            </p>
            <p className="text-label-md font-bold tabular-nums text-won">
              {team.actual} / {team.target} · {team.progress}%
            </p>
          </div>
          {loading && !team.agents.length ? (
            <div className="h-3 animate-pulse rounded-full bg-surface-container" />
          ) : (
            progressBar(team.progress, accent, "md")
          )}
        </div>
      </header>

      <div className="border-t border-outline-variant/60 pt-md">
        <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
          <p className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
            Agents · MTD status
          </p>
          <p className="text-label-md text-on-surface-variant">Sorted by Won MTD %</p>
        </div>
        <AgentRowsTable
          team={team}
          loading={loading}
          detailed={detailed}
          parallel={parallel}
        />
      </div>
    </div>
  );
}

type TeamProgressGridProps = {
  id?: string;
  teams?: TeamProgressView[];
  month?: string;
  loading?: boolean;
  variant?: "overview" | "detailed";
  hero?: boolean;
};

export function TeamProgressGrid({
  id,
  teams,
  month,
  loading,
  variant = "overview",
  hero = false,
}: TeamProgressGridProps) {
  const detailed = variant === "detailed";

  return (
    <section id={id} className="space-y-sm scroll-mt-md">
      <div>
        <p className="text-label-md font-semibold uppercase tracking-wide text-primary">
          {hero ? "Teams · MTD hero" : "Teams · MTD progress"}
        </p>
        <h2 className="text-headline-md font-extrabold text-on-surface">
          {hero
            ? "Complex Team & Density Team"
            : detailed
              ? "Complex Team & Density Team — full agent breakdown"
              : "Complex Team & Density Team"}
        </h2>
        {month ? (
          <p className="text-body-md text-on-surface-variant">
            {month} · team totals and per-agent Won & Activated MTD (Complex Won 10 / Act 8 ·
            Density Won 30 / Act 25)
          </p>
        ) : null}
      </div>
      <div className="team-progress-grid grid grid-cols-1 gap-lg lg:grid-cols-2 lg:items-start lg:gap-md">
        {loading && !teams?.length ? (
          <>
            <div className="glass-card h-[32rem] min-w-0 animate-pulse rounded-xl" />
            <div className="glass-card h-[32rem] min-w-0 animate-pulse rounded-xl" />
          </>
        ) : (
          teams?.map((team) => (
            <TeamProgressPanel
              key={team.segment}
              team={team}
              loading={loading}
              variant={variant}
              parallel
            />
          ))
        )}
      </div>
    </section>
  );
}
