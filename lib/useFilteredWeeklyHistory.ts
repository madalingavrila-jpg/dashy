"use client";

import { useMemo } from "react";
import type { WeeklyBreakdownRow, WeeklyHistoryView } from "@/types/dashboard";
import {
  ensureCurrentWeekInHistory,
  filterWeeklyHistory,
  formatVisibleWeekRange,
} from "@/lib/weekQuarterFilter";

type WeeklySlice = {
  history?: WeeklyHistoryView[];
  statusBreakdown?: WeeklyBreakdownRow[];
  currentWeek?: string;
  metrics?: Array<{ label: string; value: string }>;
};

export function useFilteredWeeklyHistory(weekly: WeeklySlice | undefined) {
  return useMemo(() => {
    const historyWithCurrent = ensureCurrentWeekInHistory(
      weekly?.history,
      weekly?.currentWeek,
      weekly?.metrics,
    );
    const history = filterWeeklyHistory(historyWithCurrent);
    const statusBreakdown = filterWeeklyHistory(weekly?.statusBreakdown);
    return {
      history,
      statusBreakdown,
      visibleWeekRange: formatVisibleWeekRange(history.map((row) => row.week)),
    };
  }, [weekly?.history, weekly?.statusBreakdown, weekly?.currentWeek, weekly?.metrics]);
}
