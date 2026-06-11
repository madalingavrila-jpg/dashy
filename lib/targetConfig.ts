/** MTD target configuration — persisted in localStorage per browser. */

import type { DashboardModel, MetricCard, TeamProgressView } from "@/types/dashboard";
import {
  COMPLEX_ACTIVATED_MTD_TARGET,
  COMPLEX_MTD_TARGET,
  DENSITY_ACTIVATED_MTD_TARGET,
  DENSITY_MTD_TARGET,
} from "@/lib/agent-segments";
import {
  COMPLEX_WEEKLY_TARGETS,
  DENSITY_WEEKLY_TARGETS,
  type WeeklyStatusCounts,
  type WeeklyStatusKey,
} from "@/lib/weekly-stages";
import { formatInteger, trendDirection } from "@/lib/format";

export const TARGET_CONFIG_STORAGE_KEY = "dashy-target-config";
export const TARGET_UNLOCK_SESSION_KEY = "dashy-targets-unlocked";
export const TARGET_SETTINGS_PASSWORD = "madalinnr1";

export type SegmentTargets = {
  won: number;
  activated: number;
};

export type WeeklyStatusTargets = WeeklyStatusCounts;

export type TargetConfig = {
  segment: {
    complex: SegmentTargets;
    density: SegmentTargets;
  };
  weekly: {
    complex: WeeklyStatusTargets;
    density: WeeklyStatusTargets;
  };
  perRep: Record<string, { won?: number; activated?: number }>;
  weeklyPerRep: Record<string, Partial<WeeklyStatusTargets>>;
  /** Reps excluded from team target math (still shown with actuals). */
  pausedAgentIds: string[];
};

export function defaultTargetConfig(): TargetConfig {
  return {
    segment: {
      complex: { won: COMPLEX_MTD_TARGET, activated: COMPLEX_ACTIVATED_MTD_TARGET },
      density: { won: DENSITY_MTD_TARGET, activated: DENSITY_ACTIVATED_MTD_TARGET },
    },
    weekly: {
      complex: { ...COMPLEX_WEEKLY_TARGETS },
      density: { ...DENSITY_WEEKLY_TARGETS },
    },
    perRep: {},
    weeklyPerRep: {},
    pausedAgentIds: [],
  };
}

export function isPausedAgent(ownerId: string, config: TargetConfig): boolean {
  return config.pausedAgentIds.includes(ownerId);
}

function parseFormattedInt(value: string): number {
  const n = Number.parseInt(value.replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function progressPercent(actual: number, target: number): number {
  if (target <= 0) return actual > 0 ? 100 : 0;
  return Math.min(100, Math.round((actual / target) * 100));
}

export function formatTargetSummary(config: TargetConfig): string {
  const { complex, density } = config.segment;
  const wc = config.weekly.complex;
  const wd = config.weekly.density;
  return `Won target Complex ${complex.won}/rep, Density ${density.won}/rep · Activated target Complex ${complex.activated}/rep, Density ${density.activated}/rep · Weekly Complex Q${wc.qualified}/N${wc.negotiations}/W${wc.closedWon}/A${wc.active} · Density Q${wd.qualified}/N${wd.negotiations}/W${wd.closedWon}/A${wd.active}`;
}

export function loadTargetConfig(): TargetConfig {
  if (typeof window === "undefined") return defaultTargetConfig();
  try {
    const raw = localStorage.getItem(TARGET_CONFIG_STORAGE_KEY);
    if (!raw) return defaultTargetConfig();
    const parsed = JSON.parse(raw) as Partial<TargetConfig>;
    const defaults = defaultTargetConfig();
    return {
      segment: {
        complex: { ...defaults.segment.complex, ...parsed.segment?.complex },
        density: { ...defaults.segment.density, ...parsed.segment?.density },
      },
      weekly: {
        complex: { ...defaults.weekly.complex, ...parsed.weekly?.complex },
        density: { ...defaults.weekly.density, ...parsed.weekly?.density },
      },
      perRep: parsed.perRep ?? {},
      weeklyPerRep: parsed.weeklyPerRep ?? {},
      pausedAgentIds: Array.isArray(parsed.pausedAgentIds) ? parsed.pausedAgentIds : [],
    };
  } catch {
    return defaultTargetConfig();
  }
}

export function saveTargetConfig(config: TargetConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TARGET_CONFIG_STORAGE_KEY, JSON.stringify(config));
  dispatchTargetConfigUpdated();
}

export function clearTargetConfig(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TARGET_CONFIG_STORAGE_KEY);
  dispatchTargetConfigUpdated();
}

export function isTargetSettingsUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(TARGET_UNLOCK_SESSION_KEY) === "1";
}

export function setTargetSettingsUnlocked(unlocked: boolean): void {
  if (typeof window === "undefined") return;
  if (unlocked) {
    sessionStorage.setItem(TARGET_UNLOCK_SESSION_KEY, "1");
  } else {
    sessionStorage.removeItem(TARGET_UNLOCK_SESSION_KEY);
  }
}

export function dispatchTargetConfigUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("dashy-targets-updated"));
  }
}

function wonTargetFor(config: TargetConfig, ownerId: string, segment: "complex" | "density"): number {
  return config.perRep[ownerId]?.won ?? config.segment[segment].won;
}

function activatedTargetFor(
  config: TargetConfig,
  ownerId: string,
  segment: "complex" | "density",
): number {
  return config.perRep[ownerId]?.activated ?? config.segment[segment].activated;
}

/** Per-rep weekly status target; blank override → segment default. */
export function getRepWeeklyStatusTarget(
  config: TargetConfig,
  ownerId: string,
  segment: "complex" | "density",
  status: WeeklyStatusKey,
): number {
  return config.weeklyPerRep[ownerId]?.[status] ?? config.weekly[segment][status];
}

/** Sum weekly status targets for active reps (respects per-rep overrides). */
export function teamWeeklyStatusTarget(
  config: TargetConfig,
  agents: Array<{ ownerId: string }>,
  segment: "complex" | "density",
  status: WeeklyStatusKey,
): number {
  return agents
    .filter((agent) => !isPausedAgent(agent.ownerId, config))
    .reduce((sum, agent) => sum + getRepWeeklyStatusTarget(config, agent.ownerId, segment, status), 0);
}

function updateOverviewMetrics(
  metrics: MetricCard[],
  month: string,
  targetWon: string,
  actualWon: string,
  targetActivated: string,
  actualActivated: string,
  wonProgress: number,
  activatedProgress: number,
): MetricCard[] {
  return metrics.map((metric) => {
    if (metric.label === "Won MTD") {
      return { ...metric, subtitle: `Target ${targetWon} · ${month}` };
    }
    if (metric.label === "Activated MTD") {
      return { ...metric, subtitle: `Target ${targetActivated} · ${month}` };
    }
    if (metric.label === "Won Achievement") {
      return {
        ...metric,
        trend: trendDirection(wonProgress - 100),
        trendIcon: wonProgress >= 100 ? "check_circle" : "pending",
        trendValue: `${wonProgress}%`,
        value: `${wonProgress}% of target`,
        subtitle: `${actualWon} / ${targetWon} · ${month}`,
      };
    }
    if (metric.label === "Activated Achievement") {
      return {
        ...metric,
        trend: trendDirection(activatedProgress - 100),
        trendIcon: activatedProgress >= 100 ? "check_circle" : "pending",
        trendValue: `${activatedProgress}%`,
        value: `${activatedProgress}% of target`,
        subtitle: `${actualActivated} / ${targetActivated} · ${month}`,
      };
    }
    return metric;
  });
}

export function applyTargetConfig(model: DashboardModel, config: TargetConfig): DashboardModel {
  const teamProgress = model.teamProgress ?? [];
  const overviewMetrics = model.overviewMetrics ?? [];

  const updatedTeams: TeamProgressView[] = teamProgress.map((team) => {
    const segment = team.segment;
    const defaultWon = config.segment[segment].won;
    const defaultActivated = config.segment[segment].activated;

    const agents = team.agents
      .map((agent) => {
        const paused = isPausedAgent(agent.ownerId, config);
        const wonTarget = wonTargetFor(config, agent.ownerId, segment);
        const activatedTarget = activatedTargetFor(config, agent.ownerId, segment);
        const wonActual = parseFormattedInt(agent.mtdActual);
        const activatedActual = parseFormattedInt(agent.activatedActual);

        return {
          ...agent,
          targetPaused: paused,
          mtdTarget: formatInteger(wonTarget),
          activatedTarget: formatInteger(activatedTarget),
          progress: paused ? 0 : progressPercent(wonActual, wonTarget),
          activatedProgress: paused ? 0 : progressPercent(activatedActual, activatedTarget),
        };
      })
      .sort(
        (a, b) =>
          b.progress - a.progress ||
          parseFormattedInt(b.mtdActual) - parseFormattedInt(a.mtdActual) ||
          a.name.localeCompare(b.name),
      );

    const activeAgents = agents.filter((agent) => !agent.targetPaused);
    const wonActual = agents.reduce((sum, agent) => sum + parseFormattedInt(agent.mtdActual), 0);
    const wonTarget = activeAgents.reduce(
      (sum, agent) => sum + parseFormattedInt(agent.mtdTarget),
      0,
    );
    const activatedActual = agents.reduce(
      (sum, agent) => sum + parseFormattedInt(agent.activatedActual),
      0,
    );
    const activatedTarget = activeAgents.reduce(
      (sum, agent) => sum + parseFormattedInt(agent.activatedTarget),
      0,
    );

    return {
      ...team,
      repCount: activeAgents.length,
      targetPerRep: defaultWon,
      activatedTargetPerRep: defaultActivated,
      target: formatInteger(wonTarget),
      actual: formatInteger(wonActual),
      progress: progressPercent(wonActual, wonTarget),
      activatedTarget: formatInteger(activatedTarget),
      activatedActual: formatInteger(activatedActual),
      activatedProgress: progressPercent(activatedActual, activatedTarget),
      agents,
    };
  });

  const complexTeam = updatedTeams.find((team) => team.segment === "complex");
  const densityTeam = updatedTeams.find((team) => team.segment === "density");

  const targetWonNum =
    parseFormattedInt(complexTeam?.target ?? "0") + parseFormattedInt(densityTeam?.target ?? "0");
  const targetActivatedNum =
    parseFormattedInt(complexTeam?.activatedTarget ?? "0") +
    parseFormattedInt(densityTeam?.activatedTarget ?? "0");
  const actualWonNum =
    parseFormattedInt(complexTeam?.actual ?? "0") + parseFormattedInt(densityTeam?.actual ?? "0");
  const actualActivatedNum =
    parseFormattedInt(complexTeam?.activatedActual ?? "0") +
    parseFormattedInt(densityTeam?.activatedActual ?? "0");

  const wonProgress = progressPercent(actualWonNum, targetWonNum);
  const activatedProgress = progressPercent(actualActivatedNum, targetActivatedNum);

  const targetWon = formatInteger(targetWonNum);
  const targetActivated = formatInteger(targetActivatedNum);
  const actualWon = formatInteger(actualWonNum);
  const actualActivated = formatInteger(actualActivatedNum);
  const month = model.mtdAchievement.month;

  const ownerSegment = new Map<string, "complex" | "density">();
  for (const team of updatedTeams) {
    for (const agent of team.agents) {
      ownerSegment.set(agent.ownerId, team.segment);
    }
  }

  const agents = (model.agents ?? []).map((agent) => {
    const segment =
      ownerSegment.get(agent.ownerId) ??
      (agent.segment === "Complex" ? "complex" : "density");
    const paused = isPausedAgent(agent.ownerId, config);
    const wonTarget = wonTargetFor(config, agent.ownerId, segment);
    const activatedTarget = activatedTargetFor(config, agent.ownerId, segment);
    const wonActual = parseFormattedInt(agent.wonMtd);
    const activatedActual = parseFormattedInt(agent.activatedMtd);

    return {
      ...agent,
      targetPaused: paused,
      mtdTarget: formatInteger(wonTarget),
      activatedMtdTarget: formatInteger(activatedTarget),
      wonMtdProgress: paused ? 0 : progressPercent(wonActual, wonTarget),
      activatedMtdProgress: paused ? 0 : progressPercent(activatedActual, activatedTarget),
    };
  });

  return {
    ...model,
    overviewMetrics: updateOverviewMetrics(
      overviewMetrics,
      month,
      targetWon,
      actualWon,
      targetActivated,
      actualActivated,
      wonProgress,
      activatedProgress,
    ),
    teamProgress: updatedTeams,
    weeklyPerformance: model.weeklyPerformance,
    mtdAchievement: {
      ...model.mtdAchievement,
      wonProgress,
      activatedProgress,
      targetWon,
      actualWon,
      targetActivated,
      actualActivated,
      tiers: [
        {
          name: "Complex",
          target: complexTeam?.target ?? "0",
          actual: complexTeam?.actual ?? "0",
          progress: complexTeam?.progress ?? 0,
          type: "won",
          typeLabel: "Won",
        },
        {
          name: "Density",
          target: densityTeam?.target ?? "0",
          actual: densityTeam?.actual ?? "0",
          progress: densityTeam?.progress ?? 0,
          type: "won",
          typeLabel: "Won",
        },
        {
          name: "Complex",
          target: complexTeam?.activatedTarget ?? "0",
          actual: complexTeam?.activatedActual ?? "0",
          progress: complexTeam?.activatedProgress ?? 0,
          type: "activated",
          typeLabel: "Activated",
        },
        {
          name: "Density",
          target: densityTeam?.activatedTarget ?? "0",
          actual: densityTeam?.activatedActual ?? "0",
          progress: densityTeam?.activatedProgress ?? 0,
          type: "activated",
          typeLabel: "Activated",
        },
      ],
    },
    agents,
  };
}
