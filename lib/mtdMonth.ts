import type {
  DashboardModel,
  MtdHistoryMonth,
  MtdItem,
  TeamAgentProgressView,
  TeamProgressView,
} from "@/types/dashboard";
import {
  COMPLEX_ACTIVATED_MTD_TARGET,
  COMPLEX_MTD_TARGET,
  DENSITY_ACTIVATED_MTD_TARGET,
  DENSITY_MTD_TARGET,
} from "@/lib/agent-segments";
import { formatInteger } from "@/lib/format";
import { accountsFilterUrl } from "@/lib/salesforce";

const BUCHAREST = "Europe/Bucharest";

function agentSegmentStyle(segment: "complex" | "density"): { label: string; color: string } {
  if (segment === "complex") {
    return { label: "Complex", color: "bg-primary-container/30 text-on-primary-container" };
  }
  return { label: "Density", color: "bg-tertiary-container/40 text-on-tertiary-container" };
}

type MtdAgentInput = MtdHistoryMonth["agents"][number];

export function currentMonthKey(ref = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUCHAREST,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(ref);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  return year && month ? `${year}-${month}` : "";
}

export function mtdMonthOptions(history: MtdHistoryMonth[] | undefined, ref = new Date()) {
  const currentKey = currentMonthKey(ref);
  return (history ?? [])
    .filter((entry) => !currentKey || entry.monthKey <= currentKey)
    .map((entry) => ({ value: entry.monthKey, label: entry.monthLabel }));
}

export function resolveDefaultMonthKey(model: DashboardModel | null): string {
  if (!model?.mtdHistory?.length) return currentMonthKey();
  const currentKey = currentMonthKey();
  const exact = model.mtdHistory.find((entry) => entry.monthKey === currentKey);
  if (exact) return exact.monthKey;
  const byLabel = model.mtdHistory.find((entry) => entry.monthLabel === model.mtdMonthLabel);
  if (byLabel) return byLabel.monthKey;
  return model.mtdHistory[0]?.monthKey ?? currentKey;
}

export function buildTeamProgressFromMtdAgents(agents: MtdAgentInput[]): TeamProgressView[] {
  const enriched = agents.map((agent) => {
    const mtdTarget = agent.segment === "complex" ? COMPLEX_MTD_TARGET : DENSITY_MTD_TARGET;
    const activatedTarget =
      agent.segment === "complex" ? COMPLEX_ACTIVATED_MTD_TARGET : DENSITY_ACTIVATED_MTD_TARGET;
    const progress = mtdTarget ? Math.min(100, Math.round((agent.wonMtd / mtdTarget) * 100)) : 0;
    const activatedProgress = activatedTarget
      ? Math.min(100, Math.round((agent.activatedMtd / activatedTarget) * 100))
      : 0;

    return {
      ownerId: agent.ownerId,
      name: agent.name,
      segment: agent.segment,
      mtdTarget,
      mtdActual: agent.wonMtd,
      progress,
      activatedTarget,
      activatedActual: agent.activatedMtd,
      activatedProgress,
      wonItems: agent.wonItems,
      activatedItems: agent.activatedItems,
      accountsUrl: accountsFilterUrl({ ownerId: agent.ownerId }),
    };
  });

  const buildTeam = (
    segment: "complex" | "density",
    label: string,
    name: string,
    targetPerRep: number,
    activatedTargetPerRep: number,
  ): TeamProgressView => {
    const members = enriched
      .filter((agent) => agent.segment === segment)
      .sort(
        (a, b) =>
          b.progress - a.progress || b.mtdActual - a.mtdActual || a.name.localeCompare(b.name),
      );
    const actual = members.reduce((sum, agent) => sum + agent.mtdActual, 0);
    const target = members.length * targetPerRep;
    const progress = target ? Math.min(100, Math.round((actual / target) * 100)) : 0;
    const activatedActual = members.reduce((sum, agent) => sum + agent.activatedActual, 0);
    const activatedTarget = members.length * activatedTargetPerRep;
    const activatedProgress = activatedTarget
      ? Math.min(100, Math.round((activatedActual / activatedTarget) * 100))
      : 0;

    return {
      segment,
      segmentLabel: label,
      name,
      repCount: members.length,
      targetPerRep,
      activatedTargetPerRep,
      target: formatInteger(target),
      actual: formatInteger(actual),
      progress,
      activatedTarget: formatInteger(activatedTarget),
      activatedActual: formatInteger(activatedActual),
      activatedProgress,
      agents: members.map((agent) => {
        const style = agentSegmentStyle(agent.segment);
        return {
          ownerId: agent.ownerId,
          name: agent.name,
          segment: style.label,
          segmentColor: style.color,
          mtdTarget: formatInteger(agent.mtdTarget),
          mtdActual: formatInteger(agent.mtdActual),
          progress: agent.progress,
          activatedTarget: formatInteger(agent.activatedTarget),
          activatedActual: formatInteger(agent.activatedActual),
          activatedProgress: agent.activatedProgress,
          accountsUrl: agent.accountsUrl,
          wonItems: agent.wonItems,
          activatedItems: agent.activatedItems,
        } satisfies TeamAgentProgressView;
      }),
    };
  };

  return [
    buildTeam("complex", "Complex", "Complex Team", COMPLEX_MTD_TARGET, COMPLEX_ACTIVATED_MTD_TARGET),
    buildTeam("density", "Density", "Density Team", DENSITY_MTD_TARGET, DENSITY_ACTIVATED_MTD_TARGET),
  ];
}

export function applyMtdMonthToModel(model: DashboardModel, monthKey: string): DashboardModel {
  const entry = model.mtdHistory?.find((month) => month.monthKey === monthKey);
  if (!entry) return model;

  const achievement = entry.mtdAchievement;
  const wonProgress = achievement.targetWon
    ? Math.min(100, Math.round((achievement.actualWon / achievement.targetWon) * 100))
    : 0;
  const activatedProgress = achievement.targetActivated
    ? Math.min(
        100,
        Math.round((achievement.actualActivated / achievement.targetActivated) * 100),
      )
    : 0;

  return {
    ...model,
    mtdMonthLabel: entry.monthLabel,
    mtdMonthKey: entry.monthKey,
    teamProgress: buildTeamProgressFromMtdAgents(entry.agents),
    mtdAchievement: {
      ...model.mtdAchievement,
      month: entry.monthLabel,
      wonProgress,
      activatedProgress,
      targetWon: formatInteger(achievement.targetWon),
      actualWon: formatInteger(achievement.actualWon),
      targetActivated: formatInteger(achievement.targetActivated),
      actualActivated: formatInteger(achievement.actualActivated),
      leadsMtd: formatInteger(achievement.leadsMtd ?? 0),
      qualifiedMtd: formatInteger(achievement.qualifiedMtd ?? 0),
      tiers: achievement.tiers.map((tier) => ({
        name: tier.name,
        target: formatInteger(tier.target),
        actual: formatInteger(tier.actual),
        progress: tier.target ? Math.min(100, Math.round((tier.actual / tier.target) * 100)) : 0,
        type: tier.type,
        typeLabel: tier.type === "won" ? "Won" : "Activated",
      })),
    },
  };
}

export type { MtdItem };
