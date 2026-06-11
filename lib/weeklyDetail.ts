import type {
  AgentRow,
  WeeklyAgentStatusView,
  WeeklyBreakdownRow,
  WeeklyDetailView,
  WeeklyStatusKey,
  WeeklyStatusProgressView,
  WeeklyTeamStatusView,
} from "@/types/dashboard";
import {
  getRepWeeklyStatusTarget,
  teamWeeklyStatusTarget,
  type TargetConfig,
} from "@/lib/targetConfig";
import {
  emptyWeeklyStatusCounts,
  WEEKLY_STATUS_KEYS,
  WEEKLY_STATUS_LABELS,
  weeklyStatusAccent,
  COMPLEX_WEEKLY_TARGETS,
  DENSITY_WEEKLY_TARGETS,
} from "@/lib/weekly-stages";

type WeeklyTargetConfig = Pick<TargetConfig, "weekly" | "weeklyPerRep" | "pausedAgentIds">;

function isPausedAgent(ownerId: string, config: WeeklyTargetConfig): boolean {
  return config.pausedAgentIds?.includes(ownerId) ?? false;
}

function defaultWeeklyTargetConfig(): WeeklyTargetConfig {
  return {
    weekly: {
      complex: { ...COMPLEX_WEEKLY_TARGETS },
      density: { ...DENSITY_WEEKLY_TARGETS },
    },
    weeklyPerRep: {},
    pausedAgentIds: [],
  };
}

function asTargetConfig(config: WeeklyTargetConfig): TargetConfig {
  return {
    segment: {
      complex: { won: 0, activated: 0 },
      density: { won: 0, activated: 0 },
    },
    weekly: config.weekly,
    perRep: {},
    weeklyPerRep: config.weeklyPerRep,
    pausedAgentIds: config.pausedAgentIds ?? [],
  };
}

function progressPercent(actual: number, target: number): number {
  if (target <= 0) return actual > 0 ? 100 : 0;
  return Math.min(100, Math.round((actual / target) * 100));
}

function buildStatusViews(
  counts: Record<WeeklyStatusKey, number>,
  segment: "complex" | "density",
  config: WeeklyTargetConfig,
  options: { ownerId?: string; activeAgents?: AgentRow[]; week?: string },
): WeeklyStatusProgressView[] {
  const targetConfig = asTargetConfig(config);
  return WEEKLY_STATUS_KEYS.map((key) => {
    const target = options.ownerId
      ? getRepWeeklyStatusTarget(targetConfig, options.ownerId, segment, key, options.week)
      : teamWeeklyStatusTarget(
          targetConfig,
          options.activeAgents ?? [],
          segment,
          key,
          options.week,
        );
    const actual = counts[key] ?? 0;
    return {
      key,
      label: WEEKLY_STATUS_LABELS[key],
      actual,
      target,
      progress: progressPercent(actual, target),
      accent: weeklyStatusAccent(key),
    };
  });
}

export function buildWeeklyDetailViews(
  breakdown: WeeklyBreakdownRow[] | undefined,
  agents: AgentRow[],
  config: WeeklyTargetConfig = defaultWeeklyTargetConfig(),
): WeeklyDetailView[] {
  if (!breakdown?.length) return [];

  const teamAgents = {
    complex: agents.filter((agent) => agent.segment === "complex"),
    density: agents.filter((agent) => agent.segment === "density"),
  };

  function buildAgentView(
    agent: AgentRow,
    breakdownRow: WeeklyBreakdownRow,
  ): WeeklyAgentStatusView {
    const counts = breakdownRow.agents[agent.ownerId] ?? emptyWeeklyStatusCounts();
    const agentBreakdown = breakdownRow.agents[agent.ownerId];
    const segment = agent.segment;
    const paused = isPausedAgent(agent.ownerId, config);
    const style =
      segment === "complex"
        ? "bg-primary-container/50 text-on-primary-container"
        : "bg-tertiary-container/50 text-on-tertiary-container";
    return {
      ownerId: agent.ownerId,
      name: agent.name,
      segment: segment === "complex" ? "Complex" : "Density",
      segmentColor: style,
      targetPaused: paused,
      statuses: buildStatusViews(counts, segment, config, { ownerId: agent.ownerId, week: breakdownRow.week }),
      accounts: agentBreakdown?.accounts,
    };
  }

  function agentActivityTotal(view: WeeklyAgentStatusView): number {
    return view.statuses.reduce((sum, status) => sum + status.actual, 0);
  }

  function sortAgents(views: WeeklyAgentStatusView[]): WeeklyAgentStatusView[] {
    return [...views].sort(
      (a, b) =>
        agentActivityTotal(b) - agentActivityTotal(a) ||
        a.name.localeCompare(b.name),
    );
  }

  return breakdown.map((row) => {
    const agentViews = agents.map((agent) => buildAgentView(agent, row));
    const complexAgents = sortAgents(
      agentViews.filter((agent) => agent.segment === "Complex"),
    );
    const densityAgents = sortAgents(
      agentViews.filter((agent) => agent.segment === "Density"),
    );

    const activeComplex = teamAgents.complex.filter((agent) => !isPausedAgent(agent.ownerId, config));
    const activeDensity = teamAgents.density.filter((agent) => !isPausedAgent(agent.ownerId, config));

    const teams: WeeklyTeamStatusView[] = [
      {
        segment: "complex",
        segmentLabel: "Complex",
        name: "Complex Team",
        repCount: activeComplex.length,
        statuses: buildStatusViews(row.teams.complex, "complex", config, {
          activeAgents: activeComplex,
          week: row.week,
        }),
        agents: complexAgents,
      },
      {
        segment: "density",
        segmentLabel: "Density",
        name: "Density Team",
        repCount: activeDensity.length,
        statuses: buildStatusViews(row.teams.density, "density", config, {
          activeAgents: activeDensity,
          week: row.week,
        }),
        agents: densityAgents,
      },
    ];

    return { week: row.week, teams, agents: agentViews };
  });
}

export function applyWeeklyTargetsToBreakdown(
  breakdown: WeeklyDetailView[],
  config: WeeklyTargetConfig,
): WeeklyDetailView[] {
  const targetConfig = asTargetConfig(config);
  return breakdown.map((row) => ({
    week: row.week,
    teams: row.teams.map((team) => {
      const activeAgents = team.agents
        .filter((agent) => !agent.targetPaused)
        .map((agent) => ({
          ownerId: agent.ownerId,
          name: agent.name,
          segment: team.segment,
          mtdTarget: 0,
          pipelineCount: 0,
          stageCounts: {},
          wonMtd: 0,
          activatedMtd: 0,
        }));
      return {
        ...team,
        statuses: team.statuses.map((status) => {
          const target = teamWeeklyStatusTarget(
            targetConfig,
            activeAgents,
            team.segment,
            status.key,
            row.week,
          );
          return {
            ...status,
            target,
            progress: progressPercent(status.actual, target),
          };
        }),
        agents: team.agents.map((agent) => {
          const segment = agent.segment === "Complex" ? "complex" : "density";
          return {
            ...agent,
            statuses: agent.statuses.map((status) => {
              const target = getRepWeeklyStatusTarget(
                targetConfig,
                agent.ownerId,
                segment,
                status.key,
                row.week,
              );
              return {
                ...status,
                target,
                progress: progressPercent(status.actual, target),
              };
            }),
          };
        }),
      };
    }),
    agents: row.agents.map((agent) => {
      const segment = agent.segment === "Complex" ? "complex" : "density";
      return {
        ...agent,
        statuses: agent.statuses.map((status) => {
          const target = getRepWeeklyStatusTarget(
            targetConfig,
            agent.ownerId,
            segment,
            status.key,
            row.week,
          );
          return {
            ...status,
            target,
            progress: progressPercent(status.actual, target),
          };
        }),
      };
    }),
  }));
}
