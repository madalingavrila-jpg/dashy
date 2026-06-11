"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DashboardModel } from "@/types/dashboard";
import { fetchDashboard } from "@/lib/api";
import {
  applyTargetConfig,
  loadTargetConfig,
  type TargetConfig,
} from "@/lib/targetConfig";

export function useDashboard() {
  const [baseModel, setBaseModel] = useState<DashboardModel | null>(null);
  const [targetConfig, setTargetConfig] = useState<TargetConfig>(() => loadTargetConfig());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshTargetConfig = useCallback(() => {
    setTargetConfig(loadTargetConfig());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const payload = await fetchDashboard();
        if (!cancelled) {
          setBaseModel(payload);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load dashboard data",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    refreshTargetConfig();
    const onUpdated = () => refreshTargetConfig();
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

  return { model, error, loading, sourceHint, targetConfig };
}
