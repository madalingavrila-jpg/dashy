"use client";

import Link from "next/link";
import { DataAlert } from "@/components/DataAlert";
import { MetricCards } from "@/components/MetricCards";
import { CurrentWeekStatus } from "@/components/CurrentWeekStatus";
import { AgentAvatar } from "@/components/AgentAvatar";
import { useDashboard } from "@/lib/useDashboard";
import type { TeamProgressView } from "@/types/dashboard";

export function OverviewShell() {
  const { model, error, loading, sourceHint } = useDashboard({ sections: ["overview"] });
  const monthLabel = model?.mtdMonthLabel ?? "Current month";
  const wonProgress = model?.mtdAchievement.wonProgress ?? 0;
  const activatedProgress = model?.mtdAchievement.activatedProgress ?? 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto max-w-[1440px] space-y-sm">
      <header className="flex items-end justify-between gap-md">
        <div>
          <h1 className="text-[28px] font-bold leading-9 tracking-[-0.025em] text-on-background">
            {greeting}, Mădălin
          </h1>
          <p className="mt-1 text-[13px] text-on-surface-variant">
            {loading ? (
              "Loading the latest team performance…"
            ) : (
              <>
                Won is at <strong className="text-won">{wonProgress}%</strong> and Activated at{" "}
                <strong className="text-activated">{activatedProgress}%</strong> of the {monthLabel} target.
              </>
            )}
          </p>
        </div>
        <Link
          href="/mtd"
          className="hidden h-9 items-center gap-xs rounded-lg border border-outline-variant bg-white px-sm text-[11px] font-bold text-brand transition-colors hover:bg-brand-container xl:inline-flex"
        >
          Open full MTD
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </header>

      <DataAlert error={error} sourceHint={sourceHint} updatedAt={model?.updatedAt} />

      <CurrentWeekStatus weekly={model?.weeklyPerformance} loading={loading} />

      <MetricCards metrics={model?.overviewMetrics?.slice(0, 4)} loading={loading} columns={4} />

      <section className="grid items-start gap-sm xl:grid-cols-[300px_minmax(0,1fr)]">
        <MonthlyProgress
          month={monthLabel}
          wonActual={model?.mtdAchievement.actualWon ?? "—"}
          wonTarget={model?.mtdAchievement.targetWon ?? "—"}
          wonProgress={wonProgress}
          activatedActual={model?.mtdAchievement.actualActivated ?? "—"}
          activatedTarget={model?.mtdAchievement.targetActivated ?? "—"}
          activatedProgress={activatedProgress}
          loading={loading}
        />
        <div className="space-y-sm">
          {loading && !model?.teamProgress?.length ? (
            <>
              <div className="dashboard-card h-64 animate-pulse" />
              <div className="dashboard-card h-64 animate-pulse" />
            </>
          ) : (
            model?.teamProgress.map((team) => <OverviewTeamTable key={team.segment} team={team} />)
          )}
        </div>
      </section>
    </div>
  );
}

function ProgressLine({
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
  const color = tone === "won" ? "bg-won" : "bg-activated";
  const text = tone === "won" ? "text-won" : "text-activated";
  return (
    <div>
      <div className="mb-xs flex items-end justify-between gap-xs">
        <div>
          <p className="eyebrow">{label}</p>
          <p className="mt-0.5 text-[18px] font-extrabold tabular-nums text-on-surface">
            {actual}
            <span className="ml-1 text-[11px] font-medium text-on-surface-variant">/ {target}</span>
          </p>
        </div>
        <span className={`text-[18px] font-extrabold tabular-nums ${text}`}>{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-container">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, progress)}%` }} />
      </div>
    </div>
  );
}

function MonthlyProgress({
  month,
  wonActual,
  wonTarget,
  wonProgress,
  activatedActual,
  activatedTarget,
  activatedProgress,
  loading,
}: {
  month: string;
  wonActual: string;
  wonTarget: string;
  wonProgress: number;
  activatedActual: string;
  activatedTarget: string;
  activatedProgress: number;
  loading: boolean;
}) {
  return (
    <div className="dashboard-card overflow-hidden">
      <div className="border-b border-outline-variant/60 px-sm py-sm">
        <p className="eyebrow text-brand">{month}</p>
        <h2 className="mt-1 text-[18px] font-bold text-on-surface">Monthly progress</h2>
      </div>
      <div className={`space-y-lg p-sm ${loading ? "animate-pulse opacity-60" : ""}`}>
        <ProgressLine label="Won target" actual={wonActual} target={wonTarget} progress={wonProgress} tone="won" />
        <ProgressLine
          label="Activated target"
          actual={activatedActual}
          target={activatedTarget}
          progress={activatedProgress}
          tone="activated"
        />
        <div className="rounded-lg bg-surface-container-low p-sm">
          <div className="flex items-start gap-xs">
            <span className="material-symbols-outlined text-[18px] text-brand">info</span>
            <p className="text-[11px] leading-[17px] text-on-surface-variant">
              Won tracks commercial closes. Activated tracks accounts live on the platform. They are measured separately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewTeamTable({ team }: { team: TeamProgressView }) {
  const complex = team.segment === "complex";
  const accent = complex ? "bg-complex" : "bg-density";
  const progressAccent = complex ? "bg-complex" : "bg-density";

  return (
    <article className="dashboard-card overflow-hidden">
      <header className="flex items-center justify-between gap-sm border-b border-outline-variant/60 bg-surface-container-low/40 px-sm py-xs">
        <div className="flex items-center gap-xs">
          <span className={`h-6 w-1.5 rounded-full ${accent}`} />
          <div>
            <h2 className="text-[16px] font-bold text-on-surface">{team.name}</h2>
            <p className="text-[10px] text-on-surface-variant">
              {team.repCount} reps · <span className="font-bold text-won">{team.progress}% Won</span> ·{" "}
              <span className="font-bold text-activated">{team.activatedProgress}% Activated</span>
            </p>
          </div>
        </div>
        <Link
          href={`/mtd#${team.segment}-team`}
          className="rounded-lg border border-outline-variant bg-white px-xs py-1.5 text-[10px] font-bold text-brand hover:bg-brand-container"
        >
          View details
        </Link>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-outline-variant/60 bg-surface-container-low/30">
              <th className="px-sm py-xs text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Rep</th>
              <th className="px-sm py-xs text-[10px] font-bold uppercase tracking-wider text-won">Won</th>
              <th className="px-sm py-xs text-[10px] font-bold uppercase tracking-wider text-activated">Activated</th>
              <th className="w-[34%] px-sm py-xs text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Target progress
              </th>
              <th className="px-sm py-xs text-right text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Accounts
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/45">
            {team.agents.map((agent) => (
              <tr key={agent.ownerId} className="group hover:bg-surface-container-low/45">
                <td className="px-sm py-xs">
                  <div className="flex items-center gap-xs">
                    <AgentAvatar name={agent.name} size={30} />
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-on-surface">{agent.name}</p>
                      {agent.targetPaused ? <p className="text-[9px] font-bold uppercase text-on-surface-variant">On pause</p> : null}
                    </div>
                  </div>
                </td>
                <td className="px-sm py-xs text-[12px] font-bold tabular-nums text-on-surface">
                  {agent.mtdActual}
                  <span className="font-normal text-on-surface-variant"> / {agent.mtdTarget}</span>
                </td>
                <td className="px-sm py-xs text-[12px] font-bold tabular-nums text-on-surface">
                  {agent.activatedActual}
                  <span className="font-normal text-on-surface-variant"> / {agent.activatedTarget}</span>
                </td>
                <td className="px-sm py-xs">
                  <div className="grid grid-cols-[20px_minmax(0,1fr)_32px] items-center gap-xs">
                    <span className="text-[9px] font-bold text-won">W</span>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-container">
                      <div className={`h-full rounded-full ${progressAccent}`} style={{ width: `${Math.min(100, agent.progress)}%` }} />
                    </div>
                    <span className="text-right text-[10px] font-semibold tabular-nums text-on-surface-variant">{agent.progress}%</span>
                    <span className="text-[9px] font-bold text-activated">A</span>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-container">
                      <div className="h-full rounded-full bg-activated" style={{ width: `${Math.min(100, agent.activatedProgress)}%` }} />
                    </div>
                    <span className="text-right text-[10px] font-semibold tabular-nums text-on-surface-variant">{agent.activatedProgress}%</span>
                  </div>
                </td>
                <td className="px-sm py-xs text-right">
                  <Link
                    href={agent.accountsUrl}
                    target="_blank"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant hover:bg-brand-container hover:text-brand"
                    aria-label={`Open ${agent.name} accounts`}
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
