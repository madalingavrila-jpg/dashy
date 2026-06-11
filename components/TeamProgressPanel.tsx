import Link from "next/link";
import type { TeamProgressView } from "@/types/dashboard";

type TeamProgressPanelProps = {
  team: TeamProgressView;
  loading?: boolean;
};

function progressBar(progress: number, accent: "complex" | "density", size: "sm" | "md" = "md") {
  const barColor = accent === "complex" ? "bg-primary" : "bg-tertiary";
  const height = size === "md" ? "h-3" : "h-2";
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

export function TeamProgressPanel({ team, loading }: TeamProgressPanelProps) {
  const accent = team.segment === "complex" ? "complex" : "density";
  const borderColor = accent === "complex" ? "border-l-primary" : "border-l-tertiary";

  return (
    <div className={`glass-card rounded-xl border-l-4 ${borderColor} p-lg`}>
      <div className="mb-lg space-y-sm">
        <div className="flex flex-wrap items-start justify-between gap-sm">
          <div>
            <p className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
              {team.segmentLabel} team
            </p>
            <h3 className="text-title-lg font-bold text-on-background">{team.name}</h3>
            <p className="text-body-md text-on-surface-variant">
              {team.repCount} reps · {team.targetPerRep}/rep Won MTD target
            </p>
          </div>
          <div className="text-right">
            <p className="text-headline-sm font-extrabold text-on-surface">
              {team.actual}{" "}
              <span className="text-body-md font-normal text-on-surface-variant">/ {team.target}</span>
            </p>
            <p className="text-label-md font-semibold text-on-surface-variant">Won MTD</p>
          </div>
        </div>

        {loading && !team.agents.length ? (
          <div className="h-3 animate-pulse rounded-full bg-surface-container" />
        ) : (
          <>
            {progressBar(team.progress, accent, "md")}
            <p className="text-label-md font-semibold text-on-surface-variant">
              {team.progress}% of team target
            </p>
          </>
        )}
      </div>

      <div className="space-y-md">
        {loading && !team.agents.length ? (
          <p className="text-on-surface-variant">Loading agents…</p>
        ) : (
          team.agents.map((agent) => (
            <div key={agent.ownerId} className="space-y-xs">
              <div className="flex items-center justify-between gap-sm">
                <Link
                  href={agent.accountsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-body-md font-semibold text-primary hover:underline"
                >
                  {agent.name}
                </Link>
                <div className="flex shrink-0 items-center gap-sm">
                  <span className="text-data-mono text-label-md font-bold">
                    {agent.mtdActual} / {agent.mtdTarget}
                  </span>
                  <span className="min-w-[3ch] text-right text-label-md font-semibold text-on-surface-variant">
                    {agent.progress}%
                  </span>
                </div>
              </div>
              {progressBar(agent.progress, accent, "sm")}
            </div>
          ))
        )}
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
        <p className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
          Team targets · MTD
        </p>
        <h2 className="text-title-lg font-bold text-on-surface">
          Complex & Density — Won MTD progress
        </h2>
        {month ? (
          <p className="text-body-md text-on-surface-variant">{month} · 10/rep Complex, 30/rep Density (Won MTD)</p>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-md xl:grid-cols-2">
        {loading && !teams?.length ? (
          <>
            <div className="glass-card h-96 animate-pulse rounded-xl" />
            <div className="glass-card h-96 animate-pulse rounded-xl" />
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
