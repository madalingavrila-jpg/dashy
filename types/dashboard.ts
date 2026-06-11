export type TrendDirection = "up" | "down" | "neutral";

export type DataSourceStatus = {
  source: "json" | "sheet" | "error";
  path?: string;
  message?: string;
};

export type PipelineStage = {
  stage: string;
  count: number;
  changePercent?: number;
};

export type PipelineTotal = {
  value: number;
  previousValue?: number;
  changePercent: number;
  period: string;
};

export type WeeklyMetric = {
  label: string;
  value: number;
  previousValue?: number;
  changePercent?: number;
};

export type WeeklyHistoryRow = {
  week: string;
  leads: number;
  qualified: number;
  contractSent: number;
  won: number;
  activated: number;
};

export type TierRow = {
  name: string;
  target: number;
  actual: number;
  type: "won" | "activated";
};

export type WowReportRow = {
  metric: string;
  current: number;
  prior: number;
  changePercent: number;
};

export type WowReport = {
  id: string;
  title: string;
  description?: string;
  currentWeek: string;
  priorWeek: string;
  rows: WowReportRow[];
};

export type AccountRow = {
  id: string;
  name: string;
  city: string;
  owner: string;
  tier: string;
  stage: string;
  status: "won" | "activated" | "backlog";
  closedDate?: string;
  activatedDate?: string;
  sfAccountId?: string;
  sfOpportunityId?: string;
};

export type HitlistRow = {
  id: string;
  priority: number;
  company: string;
  city: string;
  segment: "complex" | "density";
  owner: string;
  stage: string;
  sfOpportunityId?: string;
  notes?: string;
};

export type IntegrationSetting = {
  name: string;
  status: "connected" | "warning" | "disconnected";
  lastSync: string;
  icon: string;
};

export type DashboardRawData = {
  updatedAt: string;
  salesPipeline: {
    totals: {
      won: PipelineTotal;
      activated: PipelineTotal;
    };
    snapshot: {
      sales: PipelineStage[];
      onboarding: PipelineStage[];
    };
    mtdAchievement: {
      month: string;
      targetWon: number;
      actualWon: number;
      targetActivated: number;
      actualActivated: number;
      tiers: TierRow[];
    };
    weeklyPerformance: {
      weekLabel: string;
      metrics: WeeklyMetric[];
      history: WeeklyHistoryRow[];
    };
    wowReports: WowReport[];
    accounts: {
      won: AccountRow[];
      activated: AccountRow[];
      backlog: AccountRow[];
    };
    hitlist: HitlistRow[];
  };
  settings?: {
    timezone: string;
    locale: string;
    integrations: IntegrationSetting[];
  };
};

export type MetricCard = {
  icon: string;
  iconBg: string;
  iconColor: string;
  trend: TrendDirection;
  trendIcon: string;
  trendValue: string;
  label: string;
  value: string;
  subtitle: string;
  variant?: "won" | "activated" | "default";
};

export type FunnelStageView = {
  stage: string;
  count: string;
  change: string;
  trend: TrendDirection;
  barWidth: string;
};

export type WeeklyMetricView = {
  label: string;
  value: string;
  change: string;
  trend: TrendDirection;
};

export type WeeklyHistoryView = WeeklyHistoryRow;

export type TierView = {
  name: string;
  target: string;
  actual: string;
  progress: number;
  type: "won" | "activated";
  typeLabel: string;
};

export type WowReportView = {
  id: string;
  title: string;
  description?: string;
  currentWeek: string;
  priorWeek: string;
  rows: Array<{
    metric: string;
    current: string;
    prior: string;
    change: string;
    trend: TrendDirection;
  }>;
};

export type AccountViewRow = {
  id: string;
  name: string;
  city: string;
  owner: string;
  tier: string;
  stage: string;
  statusLabel: string;
  statusColor: string;
  dateLabel: string;
  dateValue: string;
};

export type HitlistViewRow = {
  id: string;
  priority: number;
  company: string;
  city: string;
  segment: string;
  segmentColor: string;
  owner: string;
  stage: string;
  notes?: string;
};

export type DashboardModel = {
  updatedAt: string;
  sources: DataSourceStatus;
  overviewMetrics: MetricCard[];
  totals: {
    won: MetricCard;
    activated: MetricCard;
  };
  snapshot: {
    sales: FunnelStageView[];
    onboarding: FunnelStageView[];
  };
  mtdAchievement: {
    month: string;
    wonProgress: number;
    activatedProgress: number;
    targetWon: string;
    actualWon: string;
    targetActivated: string;
    actualActivated: string;
    tiers: TierView[];
  };
  weeklyPerformance: {
    weekLabel: string;
    metrics: WeeklyMetricView[];
    history: WeeklyHistoryView[];
  };
  wowReports: WowReportView[];
  accounts: {
    won: AccountViewRow[];
    activated: AccountViewRow[];
    backlog: AccountViewRow[];
  };
  hitlist: HitlistViewRow[];
  settings: {
    timezone: string;
    locale: string;
    integrations: IntegrationSetting[];
  };
};
