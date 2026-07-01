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

/**
 * Lazily-fetched /api/dashboard/mtd-details payload — per-month per-agent
 * Won/Activated drill-down lists for every month (prior months are slimmed out
 * of mtdHistory in the main payload).
 */
export type MtdDetailsMonth = {
  monthKey: string;
  agents: Array<{
    ownerId: string;
    wonItems: MtdItem[];
    activatedItems: MtdItem[];
  }>;
};

export type MtdDetails = {
  updatedAt: string;
  months: MtdDetailsMonth[];
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

export type MopsOnboardingAccountRow = {
  id: string;
  name: string;
  city: string;
  stage: string;
  sfOpportunityId?: string;
  sfAccountId?: string;
};

export type MopsOnboardingAgentRow = {
  ownerId: string;
  name: string;
  segment: "complex" | "density";
  count: number;
  stageCounts?: Record<string, number>;
  accounts?: MopsOnboardingAccountRow[];
  /** Accounts beyond the per-agent payload cap (true total stays in `count`). */
  moreCount?: number;
};

export type MopsData = {
  dashboardId: string;
  dashboardTitle: string;
  dashboardUrl: string;
  salesforceInstanceUrl?: string;
  metrics: MopsMetric[];
  totalLiveOnboarding?: number;
  onboardingByAgent?: MopsOnboardingAgentRow[];
  totalReadyToActivate?: number;
  readyToActivateByAgent?: MopsOnboardingAgentRow[];
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

export type MopsOnboardingAccountViewRow = MopsOnboardingAccountRow & {
  sfAccountUrl?: string | null;
  sfOpportunityUrl?: string | null;
};

export type MopsOnboardingAgentViewRow = {
  ownerId: string;
  name: string;
  segment: string;
  segmentColor: string;
  count: string;
  stageSummary: string;
  moreCount: number;
  accounts: MopsOnboardingAccountViewRow[];
};

export type MopsView = {
  dashboardTitle: string;
  dashboardUrl: string;
  metrics: MetricCard[];
  totalLiveOnboarding: string;
  onboardingByAgent: MopsOnboardingAgentViewRow[];
  totalReadyToActivate: string;
  readyToActivateByAgent: MopsOnboardingAgentViewRow[];
  openCaseStatuses: Array<{ status: string; count: string }>;
  openCaseRecordTypes: Array<{ recordType: string; count: string }>;
  openByOwner: MopsOwnerViewRow[];
  openCasesList: MopsCaseViewRow[];
};

export type IntegrationSetting = {
  name: string;
  status: "connected" | "warning" | "disconnected";
  lastSync: string;
  icon: string;
};

export type AccountsPerformanceMonth = {
  month: string;
  /** GROSS GMV before discounts (Databricks total_gmv_before_discounts_eur). */
  gmv: number;
  orders: number;
  /** Gross AOV = gross GMV ÷ delivered orders. */
  aov: number;
  /** Commission € — SF rate × gross GMV, or the Databricks actual commission as
   * fallback; null only when neither source has a value. */
  commission: number | null;
  /** NET GMV after discounts — context only, never used for headline figures. */
  gmvNet?: number | null;
  /** Campaign discount (EUR) = gross − net — context only. */
  discount?: number | null;
};

export type AccountsPerformanceSparkPoint = { month: string; value: number };

/**
 * Operational availability & performance metrics for an account, pulled from
 * Databricks `ng_delivery.fact_provider_monthly` and aggregated as an
 * order/weight-weighted average over the same launch→date months as GMV.
 * Percentages are stored 0–100; `rating` is 0–5; null means no signal in period.
 */
export type AccountsPerformanceQuality = {
  availabilityPct: number | null;
  acceptancePct: number | null;
  rejectionPct: number | null;
  prepMinutes: number | null;
  rating: number | null;
  lateDeliveryPct: number | null;
  /** Delivered orders summed over the reference months — weight for team roll-ups. */
  refOrders: number;
  /** Number of months with any quality signal in the reference window. */
  monthsCovered: number;
};

export type AccountsPerformanceAccount = {
  id: string;
  accountName: string;
  city: string;
  agentId: string;
  agentName: string;
  segment: "complex" | "density" | "inbound";
  /** Per-account business segment shown under the name. Sourced from Salesforce
   * Account_Management_Segment__c (SMB / Mid-market / Enterprise / Others), falling
   * back to the Databricks business_segment_v2 only when SF has no segment. */
  businessSegment?: string;
  /** Where businessSegment came from: "salesforce" | "databricks" | null. */
  businessSegmentSource?: "salesforce" | "databricks" | null;
  launchDate: string | null;
  monthly: AccountsPerformanceMonth[];
  sparkline: AccountsPerformanceSparkPoint[];
  /** GROSS GMV (before discounts), launch → date. */
  totalGmv: number;
  totalOrders: number;
  /** Commission € (launch → date) — SF rate × gross GMV, or the Databricks actual
   * commission as fallback; null only when neither source has a value. */
  totalCommission: number | null;
  /** NET GMV (after discounts), launch → date — context only. */
  totalGmvNet?: number;
  /** Campaign discount (EUR), launch → date — context only. */
  totalDiscount?: number;
  /** Salesforce negotiated commission rate (Opportunity.Commission__c, %); null if unset. */
  commissionRatePct?: number | null;
  /** Effective commission % for display/sort: the SF rate when present, else the
   * Databricks-derived rate (actual commission ÷ gross GMV). Null when neither. */
  commissionPct?: number | null;
  /** Source of the commission figure: SF negotiated rate vs Databricks actual. */
  commissionSource?: "salesforce" | "databricks" | null;
  aov: number;
  quality?: AccountsPerformanceQuality;
};

export type AccountsPerformanceAgentSummary = {
  agentId: string;
  name: string;
  segment: "complex" | "density";
  accounts: number;
  gmv: number;
  orders: number;
  commission: number;
};

export type AccountsPerformanceByMonth = {
  month: string;
  gmv: number;
  gmvNet?: number;
  discount?: number;
  orders: number;
  commission: number;
  aov: number;
  accounts: number;
};

/** Per-month commission here is the SF-rate-derived € summed across accounts. */

export type AccountsPerformanceQualityTotals = {
  availabilityPct: number | null;
  acceptancePct: number | null;
  rejectionPct: number | null;
  prepMinutes: number | null;
  rating: number | null;
  lateDeliveryPct: number | null;
  accountsWithSignal: number;
};

export type AccountsPerformance = {
  generatedAt: string;
  windowDays: number;
  country: string;
  currency: string;
  dataMonthMax: string | null;
  metricsNote: string;
  /** Human-readable reference period for the availability/performance block. */
  qualityPeriod?: string;
  qualityNote?: string;
  totals: {
    accounts: number;
    gmv: number;
    gmvNet?: number;
    discount?: number;
    orders: number;
    commission: number;
    /** Number of accounts with any commission value (SF rate or Databricks fallback). */
    accountsWithCommission?: number;
    /** Accounts whose commission comes from the Salesforce rate (Commission__c). */
    accountsWithSfRate?: number;
    /** Accounts that fell back to the Databricks actual commission (no SF rate). */
    accountsWithDbFallback?: number;
    /** Accounts with no commission from either source (show “—”). */
    accountsWithoutCommission?: number;
    aov: number;
    quality?: AccountsPerformanceQualityTotals;
  };
  byMonth: AccountsPerformanceByMonth[];
  agents: AccountsPerformanceAgentSummary[];
  accounts: AccountsPerformanceAccount[];
};

/** Per-week status counts for one inbound rep (drill-down accounts on current week only). */
export type InboundWeeklyBreakdownRow = WeeklyStatusCounts & {
  week: string;
  accounts?: Partial<Record<WeeklyStatusKey, WeeklyAccountEvent[]>>;
};

export type InboundRepAccountsPerformance = {
  totals: {
    accounts: number;
    gmv: number;
    gmvNet?: number;
    discount?: number;
    orders: number;
    commission: number;
    aov: number;
    quality?: AccountsPerformanceQualityTotals;
  };
  byMonth: AccountsPerformanceByMonth[];
  dataMonthMax: string | null;
  accounts: AccountsPerformanceAccount[];
};

/** One inbound rep — actuals only (no predefined targets). */
export type InboundRep = {
  ownerId: string;
  name: string;
  email: string;
  mtd: {
    won: number;
    activated: number;
    wonItems: MtdItem[];
    activatedItems: MtdItem[];
  };
  weekly: {
    metrics: WeeklyMetric[];
    history: WeeklyHistoryRow[];
    breakdown: InboundWeeklyBreakdownRow[];
  };
  wow: {
    currentWeek: string;
    priorWeek: string;
    rows: WowReportRow[];
  };
  accountsPerformance: InboundRepAccountsPerformance;
};

/** Inbound team tab — two reps, broken down per person; actuals only. */
export type InboundTeam = {
  generatedAt: string;
  monthKey: string;
  monthLabel: string;
  currentWeek: string;
  windowDays: number;
  country: string;
  currency: string;
  dataMonthMax: string | null;
  reps: InboundRep[];
  totals: {
    reps: number;
    wonMtd: number;
    activatedMtd: number;
    accounts90d: number;
    gmv: number;
    orders: number;
    commission: number;
  };
};

export type MyPipelineItemType = "opportunity" | "lead" | "account";

/** A single open-pipeline record (raw, as stored in data/dashboard.json). */
export type MyPipelineRawItem = {
  type: MyPipelineItemType;
  id: string;
  name: string;
  /** Opportunity stage, Lead status, or representative account stage (display form). */
  stage: string;
  rawStage?: string | null;
  account?: string | null;
  accountId?: string | null;
  city?: string | null;
  date?: string | null;
  ownerId: string;
  ownerName: string;
  segment: "complex" | "density";
  /** Accounts only: number of open opportunities on this account. */
  openOpps?: number;
};

export type MyPipelineAgentSummaryRaw = {
  ownerId: string;
  name: string;
  segment: "complex" | "density";
  /** Authoritative open counts from Salesforce (may exceed embedded `shown`). */
  totals: { opportunities: number; leads: number; accounts: number };
  /** Records actually embedded in the payload (capped). */
  shown: { opportunities: number; leads: number; accounts: number };
};

export type MyPipelineRaw = {
  generatedAt: string;
  stagesIncluded: string[];
  stagesExcluded: string[];
  caps: { newOpportunityPerAgent: number; leadsPerAgent: number };
  totals: {
    opportunities: number;
    leads: number;
    accounts: number;
    opportunitiesShown: number;
    leadsShown: number;
  };
  agents: MyPipelineAgentSummaryRaw[];
  items: MyPipelineRawItem[];
};

export type DashboardRawData = {
  updatedAt: string;
  salesforceInstanceUrl?: string;
  accountsPerformance?: AccountsPerformance;
  inboundTeam?: InboundTeam;
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
      meta?: {
        won: { total: number; listUrl: string };
        activated: { total: number; listUrl: string };
        backlog: { total: number; listUrl: string };
      };
    };
    mtdHistory?: MtdHistoryMonth[];
    myPipeline?: MyPipelineRaw;
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

export type MyPipelineItemView = {
  type: MyPipelineItemType;
  typeLabel: string;
  id: string;
  name: string;
  stage: string;
  account: string | null;
  city: string;
  date: string | null;
  ownerId: string;
  ownerName: string;
  segment: "complex" | "density";
  segmentLabel: string;
  openOpps?: number;
  url: string | null;
};

export type MyPipelineAgentSummaryView = {
  ownerId: string;
  name: string;
  segment: "complex" | "density";
  segmentLabel: string;
  opportunities: number;
  leads: number;
  accounts: number;
  opportunitiesShown: number;
  leadsShown: number;
};

export type MyPipelineView = {
  generatedAt: string;
  stagesIncluded: string[];
  stagesExcluded: string[];
  caps: { newOpportunityPerAgent: number; leadsPerAgent: number };
  totals: {
    opportunities: number;
    leads: number;
    accounts: number;
    opportunitiesShown: number;
    leadsShown: number;
  };
  agents: MyPipelineAgentSummaryView[];
  items: MyPipelineItemView[];
  cities: string[];
  stages: string[];
  leadsListUrl: string | null;
  opportunitiesListUrl: string | null;
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
    totals?: { won: number; activated: number; backlog: number };
    listUrls?: { won: string; activated: string; backlog: string };
  };
  mops?: MopsView;
  accountsPerformance?: AccountsPerformance;
  inboundTeam?: InboundTeam;
  myPipeline?: MyPipelineView;
  settings: {
    timezone: string;
    locale: string;
    integrations: IntegrationSetting[];
  };
};
