"use client";

import { useEffect, useState } from "react";
import type { DashboardModel } from "@/types/dashboard";
import { fetchDashboard } from "@/lib/api";

export function useDashboard() {
  const [model, setModel] = useState<DashboardModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const payload = await fetchDashboard();
        if (!cancelled) {
          setModel(payload);
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

  const sourceHint =
    model?.sources.source === "error"
      ? (model.sources.message ?? "Dashboard data could not be loaded.")
      : null;

  return { model, error, loading, sourceHint };
}
