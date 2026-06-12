"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DashboardModel } from "@/types/dashboard";
import {
  fetchDashboard,
  fetchDashboardSections,
  type DashboardSection,
} from "@/lib/api";
import {
  applyTargetConfig,
  fetchTargetConfig,
  loadTargetConfig,
  type TargetConfig,
} from "@/lib/targetConfig";

const EMPTY_MODEL: DashboardModel = {
  updatedAt: "",
  salesforceInstanceUrl: "https://bolt-eu.lightning.force.com",
  sources: { source: "json" },
  mtdMonthLabel: "",
  mtdMonthKey: "",
  mtdHistory: [],
  overviewMetrics: [],
  teamProgress: [],
  totals: {
    won: {
      icon: "",
      iconBg: "",
      iconColor: "",
      trend: "neutral",
      trendIcon: "",
      trendValue: "",
      label: "",
      value: "",
      subtitle: "",
    },
    activated: {
      icon: "",
      iconBg: "",
      iconColor: "",
      trend: "neutral",
      trendIcon: "",
      trendValue: "",
      label: "",
      value: "",
      subtitle: "",
    },
  },
  snapshot: { sales: [], onboarding: [] },
  mtdAchievement: {
    month: "",
    wonProgress: 0,
    activatedProgress: 0,
    targetWon: "",
    actualWon: "",
    targetActivated: "",
    actualActivated: "",
    leadsMtd: "",
    qualifiedMtd: "",
    tiers: [],
  },
  weeklyPerformance: {
    weekLabel: "",
    weekTitle: "",
    dateRange: "",
    currentWeek: "",
    priorWeek: "",
    metrics: [],
    history: [],
    statusBreakdown: [],
    dataAvailable: false,
  },
  agents: [],
  wowReports: [],
  accounts: { won: [], activated: [], backlog: [] },
  hitlist: [],
  settings: { timezone: "Europe/Bucharest", locale: "en-GB", integrations: [] },
};

function mergePartialModel(
  base: DashboardModel,
  partial: Partial<DashboardModel>,
): DashboardModel {
  return {
    ...base,
    ...partial,
    totals: partial.totals ?? base.totals,
    snapshot: partial.snapshot ?? base.snapshot,
    mtdAchievement: partial.mtdAchievement ?? base.mtdAchievement,
    weeklyPerformance: partial.weeklyPerformance ?? base.weeklyPerformance,
    accounts: partial.accounts ?? base.accounts,
    settings: partial.settings ?? base.settings,
    teamProgress: partial.teamProgress ?? base.teamProgress,
    overviewMetrics: partial.overviewMetrics ?? base.overviewMetrics,
    mtdHistory: partial.mtdHistory ?? base.mtdHistory,
    agents: partial.agents ?? base.agents,
    wowReports: partial.wowReports ?? base.wowReports,
    hitlist: partial.hitlist ?? base.hitlist,
    mops: partial.mops ?? base.mops,
  };
}

export type UseDashboardOptions = {
  sections?: DashboardSection[];
};

export function useDashboard(options: UseDashboardOptions = {}) {
  const sections = options.sections ?? ["overview"];
  const [baseModel, setBaseModel] = useState<DashboardModel | null>(null);
  const [targetConfig, setTargetConfig] = useState<TargetConfig>(() => loadTargetConfig());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sectionsKey = sections.join(",");

  const refreshTargetConfig = useCallback(async () => {
    try {
      const config = await fetchTargetConfig();
      setTargetConfig(config);
    } catch {
      setTargetConfig(loadTargetConfig());
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [partial, config] = await Promise.all([
          fetchDashboardSections(sections, controller.signal),
          fetchTargetConfig(controller.signal),
        ]);
        if (!controller.signal.aborted) {
          setBaseModel(mergePartialModel(EMPTY_MODEL, partial));
          setTargetConfig(config);
        }
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return;
        }
        try {
          const [payload, config] = await Promise.all([
            fetchDashboard(controller.signal),
            fetchTargetConfig(controller.signal),
          ]);
          if (!controller.signal.aborted) {
            setBaseModel(payload);
            setTargetConfig(config);
          }
        } catch (fallbackError) {
          if (controller.signal.aborted) {
            return;
          }
          setError(
            fallbackError instanceof Error
              ? fallbackError.message
              : fetchError instanceof Error
                ? fetchError.message
                : "Failed to load dashboard data",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      controller.abort();
    };
  }, [sectionsKey]);

  useEffect(() => {
    const onUpdated = () => {
      void refreshTargetConfig();
    };
    window.addEventListener("dashy-targets-updated", onUpdated);
    return () => window.removeEventListener("dashy-targets-updated", onUpdated);
  }, [refreshTargetConfig]);

  const model = useMemo(() => {
    if (!baseModel) return null;
    try {
      return applyTargetConfig(baseModel, targetConfig);
    } catch {
      return baseModel;
    }
  }, [baseModel, targetConfig]);

  const sourceHint =
    model?.sources.source === "error"
      ? (model.sources.message ?? "Dashboard data could not be loaded.")
      : null;

  return { model, baseModel, error, loading, sourceHint, targetConfig };
}
