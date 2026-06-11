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
  negotiations: number;
  closedWon: number;
  active: number;
};

export type WeeklyAccountEvent = {
  id: string;
  name: string;
  city: string;
  stage: string;
  date: string;
  sfOpportunityId?: string;
  sfAccountId?: string;
};

export type WeeklyAgentBreakdown = WeeklyStatusCounts & {
  accounts?: Partial<Record<WeeklyStatusKey, WeeklyAccountEvent[]>>;
};

export type WeeklyStatusKey = "qualified" | "negotiations" | "closedWon" | "active";

export type WeeklyStatusCounts = Record<WeeklyStatusKey, number>;

export type WeeklyBreakdownRow = {
  week: string;
  teams: {
    complex: WeeklyStatusCounts;
    density: WeeklyStatusCounts;
  };
  agents: Record<string, WeeklyAgentBreakdown>;
};

export type WeeklyStatusProgressView = {
  key: WeeklyStatusKey;
  label: string;
  actual: number;
  target: number;
  progress: number;
  accent: "primary" | "secondary" | "won" | "activated";
};

export type WeeklyTeamStatusView = {
  segment: "complex" | "density";
  segmentLabel: string;
  name: string;
  repCount: number;
  statuses: WeeklyStatusProgressView[];
  agents: WeeklyAgentStatusView[];
};

export type WeeklyAgentStatusView = {
  ownerId: string;
  name: string;
  segment: string;
  segmentColor: string;
  statuses: WeeklyStatusProgressView[];
  accounts?: Partial<Record<WeeklyStatusKey, WeeklyAccountEvent[]>>;
  /** Excluded from team weekly target math when true. */
  targetPaused?: boolean;
};

export type WeeklyDetailView = {
  week: string;
  teams: WeeklyTeamStatusView[];
  agents: WeeklyAgentStatusView[];
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
  ownerId?: string;
  tier: string;
  stage: string;
  segment?: "complex" | "density";
  status: "won" | "activated" | "backlog";
  closedDate?: string;
  activatedDate?: string;
  sfAccountId?: string;
  sfOpportunityId?: string;
};

export type AgentRow = {
  ownerId: string;
  name: string;
  segment: "complex" | "density";
  mtdTarget: number;
  pipelineCount: number;
  stageCounts: Record<string, number>;
  wonMtd: number;
  activatedMtd: number;
  wonYtd?: number;
};

export type AgentViewRow = {
  ownerId: string;
  name: string;
  segment: string;
  segmentColor: string;
  mtdTarget: string;
  activatedMtdTarget: string;
  pipelineCount: string;
  stageSummary: string;
  wonMtd: string;
  activatedMtd: string;
  wonMtdProgress: number;
  activatedMtdProgress: number;
  accountsUrl: string;
  /** Excluded from team target math when true. */
  targetPaused?: boolean;
};

export type MtdItem = {
  id: string;
  name: string;
  city: string;
  closeDate: string;
  sfOpportunityId?: string;
  sfAccountId?: string;
};

export type MtdAgentHistoryRow = {
  ownerId: string;
  name: string;
  segment: "complex" | "density";
  wonMtd: number;
  activatedMtd: number;
  wonItems: MtdItem[];
  activatedItems: MtdItem[];
};

export type MtdHistoryMonth = {
  monthKey: string;
  monthLabel: string;
  agents: MtdAgentHistoryRow[];
  mtdAchievement: DashboardRawData["salesPipeline"]["mtdAchievement"];
};

export type TeamAgentProgressView = {
  ownerId: string;
  name: string;
  segment: string;
  segmentColor: string;
  mtdTarget: string;
  mtdActual: string;
  progress: number;
  activatedTarget: string;
  activatedActual: string;
  activatedProgress: number;
  accountsUrl: string;
  wonItems?: MtdItem[];
  activatedItems?: MtdItem[];
  /** Excluded from team target math when true. */
  targetPaused?: boolean;
};

export type TeamProgressView = {
  segment: "complex" | "density";
  segmentLabel: string;
  name: string;
  repCount: number;
  targetPerRep: number;
  activatedTargetPerRep: number;
  target: string;
  actual: string;
  progress: number;
  activatedTarget: string;
  activatedActual: string;
  activatedProgress: number;
  agents: TeamAgentProgressView[];
};

export type MopsCaseRow = {
  id: string;
  caseNumber: string;
  subject: string;
  status: string;
  ownerId: string;
  ownerName: string;
  recordType: string;
};

export type MopsOwnerRow = {
  ownerId: string;
  name: string;
  count: number;
};

export type MopsMetric = {
  id: string;
  label: string;
  value: number;
  previousValue?: number;
  changePercent?: number;
  subtitle?: string;
  icon?: string;
};

export type MopsData = {
  dashboardId: string;
  dashboardTitle: string;
  dashboardUrl: string;
  salesforceInstanceUrl?: string;
  metrics: MopsMetric[];
  openCaseStatuses?: Array<{ status: string; count: number }>;
  openCaseRecordTypes?: Array<{ recordType: string; count: number }>;
  openByOwner?: MopsOwnerRow[];
  openCasesList?: MopsCaseRow[];
};

export type MopsCaseViewRow = MopsCaseRow & {
  sfCaseUrl?: string | null;
};

export type MopsOwnerViewRow = {
  ownerId: string;
  name: string;
  count: string;
};

export type MopsView = {
  dashboardTitle: string;
  dashboardUrl: string;
  metrics: MetricCard[];
  openCaseStatuses: Array<{ status: string; count: string }>;
  openCaseRecordTypes: Array<{ recordType: string; count: string }>;
  openByOwner: MopsOwnerViewRow[];
  openCasesList: MopsCaseViewRow[];
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
  salesforceInstanceUrl?: string;
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
      leadsMtd?: number;
      qualifiedMtd?: number;
      complexRepCount?: number;
      densityRepCount?: number;
      tiers: TierRow[];
    };
    weeklyPerformance: {
      weekLabel: string;
      currentWeek?: string;
      metrics: WeeklyMetric[];
      history: WeeklyHistoryRow[];
      breakdown?: WeeklyBreakdownRow[];
    };
    agents?: AgentRow[];
    accountsByStage?: Record<string, AccountRow[]>;
    wowReports: WowReport[];
    accounts: {
      won: AccountRow[];
      activated: AccountRow[];
      backlog: AccountRow[];
      all?: AccountRow[];
    };
    hitlist: HitlistRow[];
    mtdHistory?: MtdHistoryMonth[];
  };
  settings?: {
    timezone: string;
    locale: string;
    integrations: IntegrationSetting[];
  };
  mops?: MopsData;
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
  priorValue: string;
  delta: string;
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
  ownerId?: string;
  tier: string;
  stage: string;
  statusLabel: string;
  statusColor: string;
  dateLabel: string;
  dateValue: string;
  sfAccountId?: string;
  sfAccountUrl?: string | null;
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
  salesforceInstanceUrl: string;
  sources: DataSourceStatus;
  mtdMonthLabel: string;
  /** ISO month key (YYYY-MM) for the MTD slice shown in team progress. */
  mtdMonthKey?: string;
  mtdHistory: MtdHistoryMonth[];
  overviewMetrics: MetricCard[];
  teamProgress: TeamProgressView[];
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
    leadsMtd: string;
    qualifiedMtd: string;
    tiers: TierView[];
  };
  weeklyPerformance: {
    weekLabel: string;
    weekTitle: string;
    dateRange: string;
    currentWeek: string;
    priorWeek: string;
    metrics: WeeklyMetricView[];
    history: WeeklyHistoryView[];
    statusBreakdown: WeeklyBreakdownRow[];
    dataAvailable: boolean;
    fallbackMessage?: string;
  };
  agents: AgentViewRow[];
  accountsByStage?: Record<string, AccountViewRow[]>;
  wowReports: WowReportView[];
  accounts: {
    won: AccountViewRow[];
    activated: AccountViewRow[];
    backlog: AccountViewRow[];
    all?: AccountViewRow[];
  };
  hitlist: HitlistViewRow[];
  mops?: MopsView;
  settings: {
    timezone: string;
    locale: string;
    integrations: IntegrationSetting[];
  };
};
