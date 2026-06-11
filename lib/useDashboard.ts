"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DashboardModel } from "@/types/dashboard";
import { fetchDashboard } from "@/lib/api";
import {
  applyTargetConfig,
  fetchTargetConfig,
  loadTargetConfig,
  type TargetConfig,
} from "@/lib/targetConfig";

export function useDashboard() {
  const [baseModel, setBaseModel] = useState<DashboardModel | null>(null);
  const [targetConfig, setTargetConfig] = useState<TargetConfig>(() => loadTargetConfig());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        const [payload, config] = await Promise.all([
          fetchDashboard(controller.signal),
          fetchTargetConfig(controller.signal),
        ]);
        if (!controller.signal.aborted) {
          setBaseModel(payload);
          setTargetConfig(config);
        }
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return;
        }
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load dashboard data",
        );
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
  }, []);

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
