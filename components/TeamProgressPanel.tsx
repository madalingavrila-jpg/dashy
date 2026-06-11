"use client";

import Link from "next/link";
import type { TeamProgressView } from "@/types/dashboard";

type TeamProgressPanelProps = {
  team: TeamProgressView;
  loading?: boolean;
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

export function TeamProgressPanel({ team, loading }: TeamProgressPanelProps) {
  const accent = team.segment === "complex" ? "complex" : "density";
  const borderColor = accent === "complex" ? "border-l-primary" : "border-l-tertiary";
  const badgeColor =
    accent === "complex"
      ? "bg-primary-container/50 text-on-primary-container"
      : "bg-tertiary-container/50 text-on-tertiary-container";

  return (
    <div className={`team-card glass-card rounded-xl border-l-4 ${borderColor} p-lg`}>
      <div className="mb-lg space-y-md">
        <div className="flex flex-wrap items-start justify-between gap-sm">
          <div className="space-y-xs">
            <span
              className={`inline-flex rounded-full px-sm py-[2px] text-[11px] font-bold uppercase tracking-wide ${badgeColor}`}
            >
              {team.segmentLabel} team
            </span>
            <h3 className="text-headline-md font-extrabold text-on-background">{team.name}</h3>
            <p className="text-body-md text-on-surface-variant">
              {team.repCount} reps · Won {team.targetPerRep}/rep · Activated{" "}
              {team.activatedTargetPerRep}/rep
            </p>
          </div>
          <div className="flex flex-col items-end gap-xs">
            {progressBadge(team.progress, "won")}
            <p className="text-label-md font-semibold text-on-surface-variant">Team Won MTD</p>
          </div>
        </div>

        <div className="rounded-lg border border-outline-variant/70 bg-surface-container-low/60 p-md">
          <div className="mb-sm flex flex-wrap items-end justify-between gap-sm">
            <div>
              <p className="text-label-md font-semibold uppercase tracking-wide text-won">Won MTD</p>
              <p className="text-headline-sm font-extrabold tabular-nums text-on-surface">
                {team.actual}{" "}
                <span className="text-body-md font-normal text-on-surface-variant">/ {team.target}</span>
              </p>
            </div>
            <p className="text-label-md font-semibold text-on-surface-variant">
              {team.progress}% of team target
            </p>
          </div>
          {loading && !team.agents.length ? (
            <div className="h-3 animate-pulse rounded-full bg-surface-container" />
          ) : (
            progressBar(team.progress, "won", "md")
          )}
        </div>

        <div className="rounded-lg border border-outline-variant/50 bg-white/50 p-md">
          <div className="mb-xs flex flex-wrap items-end justify-between gap-sm">
            <div>
              <p className="text-label-md font-semibold uppercase tracking-wide text-activated">
                Activated MTD
              </p>
              <p className="text-body-md font-bold tabular-nums text-on-surface">
                {team.activatedActual}{" "}
                <span className="font-normal text-on-surface-variant">/ {team.activatedTarget}</span>
              </p>
            </div>
            <p className="text-label-md font-semibold text-on-surface-variant">
              {team.activatedProgress}%
            </p>
          </div>
          {loading && !team.agents.length ? (
            <div className="h-1.5 animate-pulse rounded-full bg-surface-container" />
          ) : (
            progressBar(team.activatedProgress, "activated", "xs")
          )}
        </div>
      </div>

      <div className="border-t border-outline-variant/60 pt-md">
        <p className="mb-md text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
          Agents · sorted by Won %
        </p>
        <div className="space-y-md">
          {loading && !team.agents.length ? (
            <p className="text-on-surface-variant">Loading agents…</p>
          ) : (
            team.agents.map((agent, index) => (
              <div
                key={agent.ownerId}
                className={`rounded-lg px-sm py-sm ${index % 2 === 0 ? "bg-surface-container-low/40" : ""}`}
              >
                <div className="mb-xs flex items-center justify-between gap-sm">
                  <Link
                    href={agent.accountsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-body-md font-semibold text-primary hover:underline"
                  >
                    {agent.name}
                  </Link>
                  <div className="flex shrink-0 items-center gap-sm">
                    <span className="rounded-full badge-won px-xs py-[2px] text-label-md font-bold tabular-nums">
                      {agent.mtdActual} / {agent.mtdTarget}
                    </span>
                    <span className="min-w-[3ch] text-right text-label-md font-bold tabular-nums text-won">
                      {agent.progress}%
                    </span>
                  </div>
                </div>
                {progressBar(agent.progress, "won", "sm")}
                <div className="mt-xs flex items-center justify-between gap-sm">
                  <span className="text-[11px] font-semibold text-activated">
                    Activated {agent.activatedActual}/{agent.activatedTarget}
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums text-on-surface-variant">
                    {agent.activatedProgress}%
                  </span>
                </div>
                {progressBar(agent.activatedProgress, "activated", "xs")}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

type TeamProgressGridProps = {
  teams?: TeamProgressView[];
  month?: string;
  loading?: boolean;
};

export function TeamProgressGrid({ teams, month, loading }: TeamProgressGridProps) {
  return (
    <section className="space-y-sm">
      <div>
        <p className="text-label-md font-semibold uppercase tracking-wide text-primary">
          Team targets · MTD
        </p>
        <h2 className="text-headline-md font-extrabold text-on-surface">
          Complex & Density — agent progress
        </h2>
        {month ? (
          <p className="text-body-md text-on-surface-variant">
            {month} · Won 10/rep Complex, 30/rep Density · Activated 8/rep Complex, 25/rep Density
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-md xl:grid-cols-2">
        {loading && !teams?.length ? (
          <>
            <div className="glass-card h-[28rem] animate-pulse rounded-xl" />
            <div className="glass-card h-[28rem] animate-pulse rounded-xl" />
          </>
        ) : (
          teams?.map((team) => (
            <TeamProgressPanel key={team.segment} team={team} loading={loading} />
          ))
        )}
      </div>
    </section>
  );
}
