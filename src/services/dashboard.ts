import fs from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import type {
  AccountRow,
  DashboardModel,
  DashboardRawData,
  DataSourceStatus,
  FunnelStageView,
  HitlistRow,
  MetricCard,
  MopsData,
  MopsView,
  TeamProgressView,
  TrendDirection,
  WeeklyMetric,
  WeeklyMetricView,
} from "../../types/dashboard.js";
import {
  formatInteger,
  formatSignedDelta,
  formatSignedPct,
  pctChange,
  trendDirection,
} from "../../lib/format.js";
import {
  formatIsoWeekDateRange,
  formatWeekCode,
  formatWeekTitle,
  getIsoWeek,
  priorWeekCode,
} from "../../lib/isoWeek.js";
import {
  accountsFilterUrl,
  salesforceAccountUrl,
  salesforceOpportunityUrl,
} from "../../lib/salesforce.js";
import {
  agentSegment,
  isTeamAgent,
  mtdTargetForSegment,
  activatedMtdTargetForSegment,
  COMPLEX_MTD_TARGET,
  DENSITY_MTD_TARGET,
  COMPLEX_ACTIVATED_MTD_TARGET,
  DENSITY_ACTIVATED_MTD_TARGET,
} from "../../lib/agent-segments.js";

function parseCsvRow(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current.trim());
  return values;
}

async function loadRawFromSheet(url: string): Promise<DashboardRawData> {
  const response = await fetch(url, {
    headers: { Accept: "text/csv, application/json" },
  });

  if (!response.ok) {
    throw new Error(`Sheet fetch failed (${response.status})`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as DashboardRawData;
  }

  throw new Error(
    "Published sheet CSV is not supported for full dashy payload — use JSON export or data/dashboard.json",
  );
}

async function loadRawData(): Promise<{ data: DashboardRawData; source: DataSourceStatus }> {
  if (config.dashboardSheetUrl) {
    try {
      const data = await loadRawFromSheet(config.dashboardSheetUrl);
      return {
        data,
        source: { source: "sheet", path: config.dashboardSheetUrl },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sheet load failed";
      throw new Error(message);
    }
  }

  const filePath = path.join(config.rootDir, "data", "dashboard.json");
  const raw = await readFile(filePath, "utf8");
  return {
    data: JSON.parse(raw) as DashboardRawData,
    source: { source: "json", path: "data/dashboard.json" },
  };
}

function buildTotalMetric(
  label: string,
  total: DashboardRawData["salesPipeline"]["totals"]["won"],
  icon: string,
  variant: "won" | "activated",
): MetricCard {
  const change = total.changePercent;
  const trend = trendDirection(change);
  const iconStyles =
    variant === "won"
      ? { iconBg: "bg-won-container", iconColor: "text-won" }
      : { iconBg: "bg-activated-container", iconColor: "text-activated" };

  return {
    ...iconStyles,
    icon,
    trend,
    trendIcon: trend === "up" ? "trending_up" : trend === "down" ? "trending_down" : "remove",
    trendValue: formatSignedPct(change),
    label,
    value: formatInteger(total.value),
    subtitle: total.previousValue
      ? `vs. ${formatInteger(total.previousValue)} prior ${total.period}`
      : `Cumulative ${total.period}`,
    variant,
  };
}

function buildFunnelStages(stages: DashboardRawData["salesPipeline"]["snapshot"]["sales"]): FunnelStageView[] {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);
  return stages.map((stage) => {
    const change = stage.changePercent ?? 0;
    return {
      stage: stage.stage,
      count: formatInteger(stage.count),
      change: formatSignedPct(change),
      trend: trendDirection(change),
      barWidth: `${Math.max(6, Math.round((stage.count / maxCount) * 100))}%`,
    };
  });
}

function mtdProgressPercent(actual: number, target: number): number {
  if (target <= 0) return actual > 0 ? 100 : 0;
  return Math.round((actual / target) * 100);
}

function buildMtdOverviewMetrics(data: DashboardRawData): MetricCard[] {
  const { mtdAchievement } = data.salesPipeline;
  const month = mtdAchievement.month;
  const wonProgress = mtdProgressPercent(mtdAchievement.actualWon, mtdAchievement.targetWon);
  const activatedProgress = mtdProgressPercent(
    mtdAchievement.actualActivated,
    mtdAchievement.targetActivated,
  );

  return [
    {
      icon: "emoji_events",
      iconBg: "bg-won-container",
      iconColor: "text-won",
      trend: trendDirection(wonProgress - 100),
      trendIcon: wonProgress >= 100 ? "trending_up" : "trending_down",
      trendValue: `${wonProgress}%`,
      label: "Won MTD",
      value: formatInteger(mtdAchievement.actualWon),
      subtitle: `Target ${formatInteger(mtdAchievement.targetWon)} · ${month}`,
      variant: "won",
    },
    {
      icon: "rocket_launch",
      iconBg: "bg-activated-container",
      iconColor: "text-activated",
      trend: trendDirection(activatedProgress - 100),
      trendIcon: activatedProgress >= 100 ? "trending_up" : "trending_down",
      trendValue: `${activatedProgress}%`,
      label: "Activated MTD",
      value: formatInteger(mtdAchievement.actualActivated),
      subtitle: `Target ${formatInteger(mtdAchievement.targetActivated)} · ${month}`,
      variant: "activated",
    },
    {
      icon: "person_add",
      iconBg: "bg-primary-container/30",
      iconColor: "text-primary",
      trend: "neutral",
      trendIcon: "calendar_month",
      trendValue: "MTD",
      label: "Leads MTD",
      value: formatInteger(mtdAchievement.leadsMtd ?? 0),
      subtitle: `${month} · month-to-date only`,
    },
    {
      icon: "verified",
      iconBg: "bg-secondary-container/30",
      iconColor: "text-secondary",
      trend: "neutral",
      trendIcon: "calendar_month",
      trendValue: "MTD",
      label: "Qualified MTD",
      value: formatInteger(mtdAchievement.qualifiedMtd ?? 0),
      subtitle: `${month} · month-to-date only`,
    },
    {
      icon: "flag",
      iconBg: "bg-won-container/60",
      iconColor: "text-won",
      trend: trendDirection(wonProgress - 100),
      trendIcon: wonProgress >= 100 ? "check_circle" : "pending",
      trendValue: `${wonProgress}%`,
      label: "Won Achievement",
      value: `${wonProgress}% of target`,
      subtitle: `${formatInteger(mtdAchievement.actualWon)} / ${formatInteger(mtdAchievement.targetWon)} · ${month}`,
      variant: "won",
    },
    {
      icon: "speed",
      iconBg: "bg-activated-container/60",
      iconColor: "text-activated",
      trend: trendDirection(activatedProgress - 100),
      trendIcon: activatedProgress >= 100 ? "check_circle" : "pending",
      trendValue: `${activatedProgress}%`,
      label: "Activated Achievement",
      value: `${activatedProgress}% of target`,
      subtitle: `${formatInteger(mtdAchievement.actualActivated)} / ${formatInteger(mtdAchievement.targetActivated)} · ${month}`,
      variant: "activated",
    },
  ];
}

function agentSegmentStyle(segment: "complex" | "density"): { label: string; color: string } {
  if (segment === "complex") {
    return { label: "Complex", color: "bg-primary-container/30 text-on-primary-container" };
  }
  return { label: "Density", color: "bg-tertiary-container/40 text-on-tertiary-container" };
}

function buildTeamProgress(
  agents: DashboardRawData["salesPipeline"]["agents"],
): TeamProgressView[] {
  const enriched = (agents ?? [])
    .filter((agent) => isTeamAgent(agent.name, agent.ownerId))
    .map((agent) => {
      const segment = agent.segment ?? agentSegment(agent.name, agent.ownerId);
      const mtdTarget = agent.mtdTarget ?? (segment ? mtdTargetForSegment(segment) : 0);
      const activatedTarget = segment ? activatedMtdTargetForSegment(segment) : 0;
      const mtdActual = agent.wonMtd ?? 0;
      const activatedActual = agent.activatedMtd ?? 0;
      const progress = mtdTarget
        ? Math.min(100, Math.round((mtdActual / mtdTarget) * 100))
        : 0;
      const activatedProgress = activatedTarget
        ? Math.min(100, Math.round((activatedActual / activatedTarget) * 100))
        : 0;
      return {
        ownerId: agent.ownerId,
        name: agent.name,
        segment,
        mtdTarget,
        mtdActual,
        progress,
        activatedTarget,
        activatedActual,
        activatedProgress,
        accountsUrl: accountsFilterUrl({ ownerId: agent.ownerId }),
      };
    })
    .filter((agent) => agent.segment);

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
          b.progress - a.progress ||
          b.mtdActual - a.mtdActual ||
          a.name.localeCompare(b.name),
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
        };
      }),
    };
  };

  return [
    buildTeam("complex", "Complex", "Complex Team", COMPLEX_MTD_TARGET, COMPLEX_ACTIVATED_MTD_TARGET),
    buildTeam("density", "Density", "Density Team", DENSITY_MTD_TARGET, DENSITY_ACTIVATED_MTD_TARGET),
  ];
}

function accountStatusStyle(status: AccountRow["status"]): { label: string; color: string } {
  if (status === "won") return { label: "Won", color: "badge-won" };
  if (status === "activated") return { label: "Activated", color: "badge-activated" };
  return { label: "Backlog", color: "trend-neutral" };
}

function segmentStyle(segment: HitlistRow["segment"]): { label: string; color: string } {
  return agentSegmentStyle(segment);
}

function buildAccountViews(accounts: AccountRow[], instanceUrl: string) {
  return accounts.map((account) => {
    const status = accountStatusStyle(account.status);
    const dateValue =
      account.status === "activated"
        ? (account.activatedDate ?? "—")
        : (account.closedDate ?? "—");
    const dateLabel = account.status === "activated" ? "Activated" : "Closed";

    return {
      id: account.id,
      name: account.name,
      city: account.city,
      owner: account.owner,
      ownerId: account.ownerId,
      tier: account.tier,
      stage: account.stage,
      statusLabel: status.label,
      statusColor: status.color,
      dateLabel,
      dateValue,
      sfAccountId: account.sfAccountId,
      sfAccountUrl: salesforceAccountUrl(account.sfAccountId, instanceUrl),
    };
  });
}

function buildAgentViews(
  agents: DashboardRawData["salesPipeline"]["agents"],
): DashboardModel["agents"] {
  return (agents ?? [])
    .filter((agent) => isTeamAgent(agent.name, agent.ownerId))
    .map((agent) => {
      const segment = agent.segment ?? agentSegment(agent.name, agent.ownerId);
      if (!segment) return null;
      const mtdTarget = agent.mtdTarget ?? mtdTargetForSegment(segment);
      const activatedMtdTarget = activatedMtdTargetForSegment(segment);
      const segmentMeta = segmentStyle(segment);
      const topStages = Object.entries(agent.stageCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([stage, count]) => `${stage} ${count}`)
        .join(" · ");
      const wonProgress = mtdTarget
        ? Math.min(100, Math.round((agent.wonMtd / mtdTarget) * 100))
        : 0;
      const activatedProgress = activatedMtdTarget
        ? Math.min(100, Math.round((agent.activatedMtd / activatedMtdTarget) * 100))
        : 0;
      return {
        ownerId: agent.ownerId,
        name: agent.name,
        segment: segmentMeta.label,
        segmentColor: segmentMeta.color,
        mtdTarget: formatInteger(mtdTarget),
        activatedMtdTarget: formatInteger(activatedMtdTarget),
        pipelineCount: formatInteger(agent.pipelineCount),
        stageSummary: topStages || "—",
        wonMtd: formatInteger(agent.wonMtd),
        activatedMtd: formatInteger(agent.activatedMtd),
        wonMtdProgress: wonProgress,
        activatedMtdProgress: activatedProgress,
        accountsUrl: accountsFilterUrl({ ownerId: agent.ownerId }),
      };
    })
    .filter(Boolean) as DashboardModel["agents"];
}

function defaultSettings(): DashboardModel["settings"] {
  return {
    timezone: "Europe/Bucharest",
    locale: "en-GB",
    integrations: [],
  };
}

function mapWeeklyMetricViews(metrics: WeeklyMetric[]): WeeklyMetricView[] {
  return metrics.map((metric) => {
    const changePercent = metric.changePercent ?? pctChange(metric.value, metric.previousValue ?? 0);
    return {
      label: metric.label,
      value: formatInteger(metric.value),
      priorValue: formatInteger(metric.previousValue ?? 0),
      delta: formatSignedDelta(metric.value, metric.previousValue ?? 0),
      change: formatSignedPct(changePercent),
      trend: trendDirection(changePercent),
    };
  });
}

const WEEKLY_METRIC_KEYS = [
  { label: "Leads", key: "leads" as const },
  { label: "Qualified", key: "qualified" as const },
  { label: "Negotiations", key: "negotiations" as const },
  { label: "Closed Won", key: "closedWon" as const },
  { label: "Active", key: "active" as const },
];

function buildWeeklyPerformanceView(
  weeklyPerformance: DashboardRawData["salesPipeline"]["weeklyPerformance"],
  updatedAt: string,
) {
  const refDate = new Date(updatedAt);
  const { year, week } = getIsoWeek(refDate);
  const currentWeek = formatWeekCode(week);
  const priorWeek = priorWeekCode(currentWeek) ?? "—";
  const weekTitle = formatWeekTitle(week, year);
  const dateRange = formatIsoWeekDateRange(year, week);
  const history = weeklyPerformance.history ?? [];

  const historyRow = history.find((row) => row.week === currentWeek);
  const historyIdx = history.findIndex((row) => row.week === currentWeek);
  const priorHistoryRow = historyIdx > 0 ? history[historyIdx - 1] : undefined;

  const storedMatchesCurrent =
    weeklyPerformance.currentWeek === currentWeek && weeklyPerformance.metrics.length > 0;

  const statusBreakdown = weeklyPerformance.breakdown ?? [];

  if (storedMatchesCurrent) {
    return {
      weekLabel: weeklyPerformance.weekLabel || `${currentWeek} · ${dateRange}`,
      weekTitle,
      dateRange,
      currentWeek,
      priorWeek: priorWeekCode(weeklyPerformance.currentWeek ?? currentWeek) ?? priorWeek,
      metrics: mapWeeklyMetricViews(weeklyPerformance.metrics),
      history,
      statusBreakdown,
      dataAvailable: true,
    };
  }

  if (historyRow) {
    const metrics: WeeklyMetric[] = WEEKLY_METRIC_KEYS.map(({ label, key }) => {
      const value = historyRow[key];
      const previousValue = priorHistoryRow?.[key] ?? 0;
      return {
        label,
        value,
        previousValue,
        changePercent: pctChange(value, previousValue),
      };
    });

    return {
      weekLabel: `${currentWeek} · ${dateRange}`,
      weekTitle,
      dateRange,
      currentWeek,
      priorWeek: priorHistoryRow?.week ?? priorWeek,
      metrics: mapWeeklyMetricViews(metrics),
      history,
      statusBreakdown,
      dataAvailable: true,
    };
  }

  if (weeklyPerformance.metrics.length > 0) {
    return {
      weekLabel: weeklyPerformance.weekLabel,
      weekTitle: weeklyPerformance.weekLabel.split("·")[0]?.trim() ?? weekTitle,
      dateRange: weeklyPerformance.weekLabel.includes("·")
        ? weeklyPerformance.weekLabel.split("·").slice(1).join("·").trim()
        : dateRange,
      currentWeek: weeklyPerformance.currentWeek ?? currentWeek,
      priorWeek,
      metrics: mapWeeklyMetricViews(weeklyPerformance.metrics),
      history,
      statusBreakdown,
      dataAvailable: true,
      fallbackMessage: `No history row for ${currentWeek}; showing last synced metrics.`,
    };
  }

  return {
    weekLabel: `${currentWeek} · ${dateRange}`,
    weekTitle,
    dateRange,
    currentWeek,
    priorWeek,
    metrics: [],
    history,
    statusBreakdown,
    dataAvailable: false,
    fallbackMessage: `No weekly data for ${currentWeek} yet. Run the Salesforce refresh workflow.`,
  };
}

function buildMopsView(mops: MopsData | undefined): MopsView | undefined {
  if (!mops) return undefined;

  const instanceUrl = mops.salesforceInstanceUrl ?? "https://boltfood.lightning.force.com";

  const metrics: MetricCard[] = (mops.metrics ?? []).map((metric) => {
    const change = metric.changePercent ?? 0;
    const trend = metric.changePercent !== undefined ? trendDirection(change) : "neutral";
    return {
      icon: metric.icon ?? "analytics",
      iconBg: "bg-primary-container/30",
      iconColor: "text-primary",
      trend,
      trendIcon:
        trend === "up" ? "trending_up" : trend === "down" ? "trending_down" : "remove",
      trendValue:
        metric.changePercent !== undefined
          ? formatSignedPct(metric.changePercent)
          : metric.subtitle?.includes("MTD")
            ? "MTD"
            : "Live",
      label: metric.label,
      value: formatInteger(metric.value),
      subtitle: metric.subtitle ?? "",
    };
  });

  const onboardingPipeline = buildFunnelStages(mops.onboardingPipeline ?? []);

  return {
    dashboardTitle: mops.dashboardTitle,
    dashboardUrl: mops.dashboardUrl,
    metrics,
    openCaseStatuses: (mops.openCaseStatuses ?? []).map((row) => ({
      status: row.status,
      count: formatInteger(row.count),
    })),
    onboardingPipeline,
    totalLiveOnboarding: formatInteger(mops.totalLiveOnboarding),
    onboardingByAgent: (mops.onboardingByAgent ?? []).map((agent) => {
      const segment = segmentStyle(agent.segment);
      const stageSummary = Object.entries(agent.stageCounts ?? {})
        .sort((a, b) => b[1] - a[1])
        .map(([stage, count]) => `${stage} (${count})`)
        .join(" · ");
      return {
        ownerId: agent.ownerId,
        name: agent.name,
        segment: segment.label,
        segmentColor: segment.color,
        count: formatInteger(agent.count),
        stageSummary,
        accounts: (agent.accounts ?? []).map((account) => ({
          ...account,
          sfAccountUrl: salesforceAccountUrl(account.sfAccountId, instanceUrl),
          sfOpportunityUrl: salesforceOpportunityUrl(account.sfOpportunityId, instanceUrl),
        })),
      };
    }),
  };
}

function placeholderModel(source: DataSourceStatus, error?: string): DashboardModel {
  const message =
    error ??
    "Update data/dashboard.json in the repo (via Cursor MCP workflow) and redeploy.";

  const emptyMetric = (label: string): MetricCard => ({
    icon: "info",
    iconBg: "bg-surface-container-high",
    iconColor: "text-on-surface-variant",
    trend: "neutral",
    trendIcon: "remove",
    trendValue: "—",
    label,
    value: "—",
    subtitle: message,
  });

  return {
    updatedAt: new Date().toISOString(),
    salesforceInstanceUrl: "https://bolt-eu.lightning.force.com",
    sources: source,
    mtdMonthLabel: "—",
    overviewMetrics: [
      emptyMetric("Won MTD"),
      emptyMetric("Activated MTD"),
      emptyMetric("Leads MTD"),
      emptyMetric("Qualified MTD"),
    ],
    teamProgress: [],
    totals: {
      won: emptyMetric("Total Won"),
      activated: emptyMetric("Total Activated"),
    },
    snapshot: { sales: [], onboarding: [] },
    mtdAchievement: {
      month: "—",
      wonProgress: 0,
      activatedProgress: 0,
      targetWon: "—",
      actualWon: "—",
      targetActivated: "—",
      actualActivated: "—",
      leadsMtd: "—",
      qualifiedMtd: "—",
      tiers: [],
    },
    weeklyPerformance: {
      weekLabel: "—",
      weekTitle: "—",
      dateRange: "—",
      currentWeek: "—",
      priorWeek: "—",
      metrics: [],
      history: [],
      statusBreakdown: [],
      dataAvailable: false,
      fallbackMessage: "Weekly data unavailable",
    },
    agents: [],
    wowReports: [],
    accounts: { won: [], activated: [], backlog: [] },
    hitlist: [],
    mops: emptyMopsView(),
    settings: defaultSettings(),
  };
}

function emptyMopsView(): MopsView {
  return {
    dashboardTitle: "MOps",
    dashboardUrl:
      "https://boltfood.lightning.force.com/lightning/r/Dashboard/01ZTs000000Bx9dMAC/view",
    metrics: [],
    openCaseStatuses: [],
    onboardingPipeline: [],
    totalLiveOnboarding: "—",
    onboardingByAgent: [],
  };
}

function toDashboardModel(
  data: DashboardRawData,
  source: DataSourceStatus,
): DashboardModel {
  const { salesPipeline } = data;
  const instanceUrl = data.salesforceInstanceUrl ?? "https://bolt-eu.lightning.force.com";
  const { mtdAchievement, weeklyPerformance, wowReports, accounts, hitlist, agents } =
    salesPipeline;

  const wonProgress = mtdAchievement.targetWon
    ? Math.min(100, Math.round((mtdAchievement.actualWon / mtdAchievement.targetWon) * 100))
    : 0;
  const activatedProgress = mtdAchievement.targetActivated
    ? Math.min(
        100,
        Math.round((mtdAchievement.actualActivated / mtdAchievement.targetActivated) * 100),
      )
    : 0;

  return {
    updatedAt: data.updatedAt,
    salesforceInstanceUrl: instanceUrl,
    sources: source,
    mtdMonthLabel: mtdAchievement.month,
    overviewMetrics: buildMtdOverviewMetrics(data),
    teamProgress: buildTeamProgress(agents),
    totals: {
      won: buildTotalMetric("Total Won", salesPipeline.totals.won, "emoji_events", "won"),
      activated: buildTotalMetric(
        "Total Activated",
        salesPipeline.totals.activated,
        "rocket_launch",
        "activated",
      ),
    },
    snapshot: {
      sales: buildFunnelStages(salesPipeline.snapshot.sales),
      onboarding: buildFunnelStages(salesPipeline.snapshot.onboarding),
    },
    mtdAchievement: {
      month: mtdAchievement.month,
      wonProgress,
      activatedProgress,
      targetWon: formatInteger(mtdAchievement.targetWon),
      actualWon: formatInteger(mtdAchievement.actualWon),
      targetActivated: formatInteger(mtdAchievement.targetActivated),
      actualActivated: formatInteger(mtdAchievement.actualActivated),
      leadsMtd: formatInteger(mtdAchievement.leadsMtd ?? 0),
      qualifiedMtd: formatInteger(mtdAchievement.qualifiedMtd ?? 0),
      tiers: mtdAchievement.tiers.map((tier) => ({
        name: tier.name,
        target: formatInteger(tier.target),
        actual: formatInteger(tier.actual),
        progress: tier.target ? Math.min(100, Math.round((tier.actual / tier.target) * 100)) : 0,
        type: tier.type,
        typeLabel: tier.type === "won" ? "Won" : "Activated",
      })),
    },
    weeklyPerformance: buildWeeklyPerformanceView(weeklyPerformance, data.updatedAt),
    agents: buildAgentViews(agents),
    wowReports: wowReports.map((report) => ({
      id: report.id,
      title: report.title,
      description: report.description,
      currentWeek: report.currentWeek,
      priorWeek: report.priorWeek,
      rows: report.rows.map((row) => ({
        metric: row.metric,
        current: formatInteger(row.current),
        prior: formatInteger(row.prior),
        change: formatSignedPct(row.changePercent),
        trend: trendDirection(row.changePercent),
      })),
    })),
    accounts: {
      won: buildAccountViews(accounts.won, instanceUrl),
      activated: buildAccountViews(accounts.activated, instanceUrl),
      backlog: buildAccountViews(accounts.backlog, instanceUrl),
    },
    hitlist: hitlist
      .slice()
      .sort((a, b) => a.priority - b.priority)
      .map((row) => {
        const segment = segmentStyle(row.segment);
        return {
          id: row.id,
          priority: row.priority,
          company: row.company,
          city: row.city,
          segment: segment.label,
          segmentColor: segment.color,
          owner: row.owner,
          stage: row.stage,
          notes: row.notes,
        };
      }),
    mops: buildMopsView(data.mops) ?? emptyMopsView(),
    settings: data.settings ?? defaultSettings(),
  };
}

type DashboardCacheEntry = {
  buffer: Buffer;
  sourcePath: string;
  sourceMtimeMs: number;
};

let cachedPayload: DashboardCacheEntry | null = null;
let loadingPromise: Promise<DashboardCacheEntry> | null = null;

export function getPrecomputedApiPath(): string {
  return path.join(config.staticDir, "api", "dashboard.json");
}

function rawDataPath(): string {
  return path.join(config.rootDir, "data", "dashboard.json");
}

function resolveCacheSource(): { path: string; mtimeMs: number } | null {
  const precomputed = getPrecomputedApiPath();
  if (fs.existsSync(precomputed)) {
    const stat = fs.statSync(precomputed);
    return { path: precomputed, mtimeMs: stat.mtimeMs };
  }

  if (config.dashboardSheetUrl) {
    return { path: config.dashboardSheetUrl, mtimeMs: 0 };
  }

  const raw = rawDataPath();
  if (fs.existsSync(raw)) {
    const stat = fs.statSync(raw);
    return { path: raw, mtimeMs: stat.mtimeMs };
  }

  return null;
}

function cacheIsFresh(source: { path: string; mtimeMs: number }): boolean {
  return (
    cachedPayload !== null &&
    cachedPayload.sourcePath === source.path &&
    cachedPayload.sourceMtimeMs === source.mtimeMs
  );
}

export async function serializeDashboardApi(): Promise<string> {
  try {
    const { data, source } = await loadRawData();
    return JSON.stringify(toDashboardModel(data, source));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dashboard load failed";
    return JSON.stringify(
      placeholderModel({ source: "error", message }, message),
    );
  }
}

async function readOrBuildPayload(
  source: { path: string; mtimeMs: number },
): Promise<DashboardCacheEntry> {
  const precomputed = getPrecomputedApiPath();
  if (source.path === precomputed) {
    const buffer = await readFile(precomputed);
    return { buffer, sourcePath: precomputed, sourceMtimeMs: source.mtimeMs };
  }

  const json = await serializeDashboardApi();
  return {
    buffer: Buffer.from(json, "utf8"),
    sourcePath: source.path,
    sourceMtimeMs: source.mtimeMs,
  };
}

export async function ensureDashboardCache(): Promise<DashboardCacheEntry> {
  const source = resolveCacheSource();
  if (!source) {
    throw new Error("Dashboard data file missing");
  }

  if (cacheIsFresh(source)) {
    return cachedPayload as DashboardCacheEntry;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = readOrBuildPayload(source)
    .then((entry) => {
      cachedPayload = entry;
      return entry;
    })
    .finally(() => {
      loadingPromise = null;
    });

  return loadingPromise;
}

export function getCachedDashboardBuffer(): Buffer | null {
  const source = resolveCacheSource();
  if (!source || !cachedPayload || !cacheIsFresh(source)) {
    return null;
  }
  return cachedPayload.buffer;
}

export function preloadDashboardModel(): void {
  void ensureDashboardCache().catch((error) => {
    const message = error instanceof Error ? error.message : "Dashboard preload failed";
    console.error("[dashy] dashboard preload failed:", message);
  });
}
