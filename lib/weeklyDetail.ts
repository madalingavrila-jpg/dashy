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
  emptyWeeklyStatusCounts,
  WEEKLY_STATUS_KEYS,
  WEEKLY_STATUS_LABELS,
  weeklyStatusAccent,
  COMPLEX_WEEKLY_TARGETS,
  DENSITY_WEEKLY_TARGETS,
} from "@/lib/weekly-stages";

type WeeklyTargetConfig = {
  weekly: {
    complex: typeof COMPLEX_WEEKLY_TARGETS;
    density: typeof DENSITY_WEEKLY_TARGETS;
  };
  weeklyPerRep: Record<string, Partial<typeof COMPLEX_WEEKLY_TARGETS>>;
  pausedAgentIds?: string[];
};

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

function progressPercent(actual: number, target: number): number {
  if (target <= 0) return actual > 0 ? 100 : 0;
  return Math.min(100, Math.round((actual / target) * 100));
}

function weeklyTargetForRep(
  config: WeeklyTargetConfig,
  ownerId: string,
  segment: "complex" | "density",
  key: WeeklyStatusKey,
): number {
  return config.weeklyPerRep[ownerId]?.[key] ?? config.weekly[segment][key];
}

function buildStatusViews(
  counts: Record<WeeklyStatusKey, number>,
  segment: "complex" | "density",
  repCount: number,
  config: WeeklyTargetConfig,
  ownerId?: string,
): WeeklyStatusProgressView[] {
  return WEEKLY_STATUS_KEYS.map((key) => {
    const perRepTarget = ownerId
      ? weeklyTargetForRep(config, ownerId, segment, key)
      : config.weekly[segment][key];
    const target = ownerId ? perRepTarget : perRepTarget * Math.max(repCount, 1);
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
      statuses: buildStatusViews(counts, segment, 1, config, agent.ownerId),
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
        statuses: buildStatusViews(
          row.teams.complex,
          "complex",
          activeComplex.length,
          config,
        ),
        agents: complexAgents,
      },
      {
        segment: "density",
        segmentLabel: "Density",
        name: "Density Team",
        repCount: activeDensity.length,
        statuses: buildStatusViews(
          row.teams.density,
          "density",
          activeDensity.length,
          config,
        ),
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
  return breakdown.map((row) => ({
    week: row.week,
    teams: row.teams.map((team) => ({
      ...team,
      statuses: team.statuses.map((status) => {
        const perRep = config.weekly[team.segment][status.key];
        const target = perRep * Math.max(team.repCount, 1);
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
            const target = weeklyTargetForRep(config, agent.ownerId, segment, status.key);
            return {
              ...status,
              target,
              progress: progressPercent(status.actual, target),
            };
          }),
        };
      }),
    })),
    agents: row.agents.map((agent) => {
      const segment = agent.segment === "Complex" ? "complex" : "density";
      return {
        ...agent,
        statuses: agent.statuses.map((status) => {
          const target = weeklyTargetForRep(config, agent.ownerId, segment, status.key);
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
