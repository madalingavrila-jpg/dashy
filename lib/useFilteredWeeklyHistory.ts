"use client";

import { useMemo } from "react";
import type { WeeklyBreakdownRow, WeeklyHistoryView } from "@/types/dashboard";
import {
  filterWeeklyHistory,
  formatVisibleWeekRange,
} from "@/lib/weekQuarterFilter";

type WeeklySlice = {
  history?: WeeklyHistoryView[];
  statusBreakdown?: WeeklyBreakdownRow[];
};

export function useFilteredWeeklyHistory(weekly: WeeklySlice | undefined) {
  return useMemo(() => {
    const history = filterWeeklyHistory(weekly?.history);
    const statusBreakdown = filterWeeklyHistory(weekly?.statusBreakdown);
    return {
      history,
      statusBreakdown,
      visibleWeekRange: formatVisibleWeekRange(history.map((row) => row.week)),
    };
  }, [weekly?.history, weekly?.statusBreakdown]);
}
