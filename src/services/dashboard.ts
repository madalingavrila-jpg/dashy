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
  TrendDirection,
} from "../../types/dashboard.js";
import {
  formatInteger,
  formatSignedPct,
  pctChange,
  trendDirection,
} from "../../lib/format.js";
import { accountsFilterUrl, salesforceAccountUrl } from "../../lib/salesforce.js";

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

function buildOverviewMetrics(data: DashboardRawData): MetricCard[] {
  const { totals, weeklyPerformance, mtdAchievement } = data.salesPipeline;
  const week = weeklyPerformance.metrics;

  const leads = week.find((m) => m.label.toLowerCase().includes("lead"));
  const qualified = week.find((m) => m.label.toLowerCase().includes("qualif"));

  const wonPct = mtdAchievement.targetWon
    ? pctChange(mtdAchievement.actualWon, mtdAchievement.targetWon)
    : 0;
  const activatedPct = mtdAchievement.targetActivated
    ? pctChange(mtdAchievement.actualActivated, mtdAchievement.targetActivated)
    : 0;

  return [
    buildTotalMetric("Total Won", totals.won, "emoji_events", "won"),
    buildTotalMetric("Total Activated", totals.activated, "rocket_launch", "activated"),
    {
      icon: "person_add",
      iconBg: "bg-primary-container/30",
      iconColor: "text-primary",
      trend: trendDirection(leads?.changePercent ?? 0),
      trendIcon: "trending_up",
      trendValue: formatSignedPct(leads?.changePercent ?? 0),
      label: "Leads (This Week)",
      value: formatInteger(leads?.value ?? 0),
      subtitle: weeklyPerformance.weekLabel,
    },
    {
      icon: "flag",
      iconBg: "bg-secondary-container/30",
      iconColor: "text-secondary",
      trend: trendDirection(wonPct),
      trendIcon: wonPct >= 0 ? "trending_up" : "trending_down",
      trendValue: formatSignedPct(wonPct),
      label: "MTD Won vs Target",
      value: `${formatInteger(mtdAchievement.actualWon)} / ${formatInteger(mtdAchievement.targetWon)}`,
      subtitle: mtdAchievement.month,
    },
    {
      icon: "verified",
      iconBg: "bg-activated-container",
      iconColor: "text-activated",
      trend: trendDirection(qualified?.changePercent ?? 0),
      trendIcon: "trending_up",
      trendValue: formatSignedPct(qualified?.changePercent ?? 0),
      label: "Qualified (This Week)",
      value: formatInteger(qualified?.value ?? 0),
      subtitle: "Sales production",
    },
    {
      icon: "speed",
      iconBg: "bg-surface-container-high",
      iconColor: "text-on-surface",
      trend: trendDirection(activatedPct),
      trendIcon: activatedPct >= 0 ? "trending_up" : "trending_down",
      trendValue: formatSignedPct(activatedPct),
      label: "MTD Activated vs Target",
      value: `${formatInteger(mtdAchievement.actualActivated)} / ${formatInteger(mtdAchievement.targetActivated)}`,
      subtitle: mtdAchievement.month,
    },
  ];
}

function accountStatusStyle(status: AccountRow["status"]): { label: string; color: string } {
  if (status === "won") return { label: "Won", color: "badge-won" };
  if (status === "activated") return { label: "Activated", color: "badge-activated" };
  return { label: "Backlog", color: "trend-neutral" };
}

function segmentStyle(segment: HitlistRow["segment"]): { label: string; color: string } {
  if (segment === "complex") {
    return { label: "Complex", color: "bg-primary-container/30 text-on-primary-container" };
  }
  return { label: "Density", color: "bg-tertiary-container/40 text-on-tertiary-container" };
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
  return (agents ?? []).map((agent) => {
    const topStages = Object.entries(agent.stageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([stage, count]) => `${stage} ${count}`)
      .join(" · ");
    return {
      ownerId: agent.ownerId,
      name: agent.name,
      pipelineCount: formatInteger(agent.pipelineCount),
      stageSummary: topStages || "—",
      wonMtd: formatInteger(agent.wonMtd),
      activatedMtd: formatInteger(agent.activatedMtd),
      accountsUrl: accountsFilterUrl({ ownerId: agent.ownerId }),
    };
  });
}

function defaultSettings(): DashboardModel["settings"] {
  return {
    timezone: "Europe/Bucharest",
    locale: "en-GB",
    integrations: [],
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
    overviewMetrics: [
      emptyMetric("Total Won"),
      emptyMetric("Total Activated"),
      emptyMetric("Leads (This Week)"),
      emptyMetric("MTD Won vs Target"),
    ],
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
    weeklyPerformance: { weekLabel: "—", currentWeek: "—", metrics: [], history: [] },
    agents: [],
    accountsByStage: {},
    wowReports: [],
    accounts: { won: [], activated: [], backlog: [], all: [] },
    hitlist: [],
    settings: defaultSettings(),
  };
}

function toDashboardModel(
  data: DashboardRawData,
  source: DataSourceStatus,
): DashboardModel {
  const { salesPipeline } = data;
  const instanceUrl = data.salesforceInstanceUrl ?? "https://bolt-eu.lightning.force.com";
  const { mtdAchievement, weeklyPerformance, wowReports, accounts, hitlist, agents, accountsByStage } =
    salesPipeline;

  const allAccounts =
    accounts.all ??
    [...accounts.won, ...accounts.activated, ...accounts.backlog];

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
    overviewMetrics: buildOverviewMetrics(data),
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
    weeklyPerformance: {
      weekLabel: weeklyPerformance.weekLabel,
      currentWeek: weeklyPerformance.currentWeek ?? weeklyPerformance.weekLabel.split("·")[0]?.trim() ?? "—",
      metrics: weeklyPerformance.metrics.map((metric) => ({
        label: metric.label,
        value: formatInteger(metric.value),
        change: formatSignedPct(metric.changePercent ?? 0),
        trend: trendDirection(metric.changePercent ?? 0),
      })),
      history: weeklyPerformance.history,
    },
    agents: buildAgentViews(agents),
    accountsByStage: Object.fromEntries(
      Object.entries(accountsByStage ?? {}).map(([stage, rows]) => [
        stage,
        buildAccountViews(rows, instanceUrl),
      ]),
    ),
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
      all: buildAccountViews(allAccounts, instanceUrl),
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
    settings: data.settings ?? defaultSettings(),
  };
}

let cachedModel: { expiresAt: number; value: DashboardModel } | null = null;

export async function loadDashboardModel(): Promise<DashboardModel> {
  const now = Date.now();
  if (cachedModel && cachedModel.expiresAt > now) {
    return cachedModel.value;
  }

  try {
    const { data, source } = await loadRawData();
    const model = toDashboardModel(data, source);
    cachedModel = { value: model, expiresAt: now + config.cacheTtlMs };
    return model;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dashboard load failed";
    const model = placeholderModel({ source: "error", message }, message);
    cachedModel = { value: model, expiresAt: now + 15_000 };
    return model;
  }
}
