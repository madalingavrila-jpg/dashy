"use client";

import type { WeeklyHistoryView, WeeklyMetricView } from "@/types/dashboard";
import { formatWeekDateRange, formatWeekLabel } from "@/lib/weekDateRange";

type WeeklyMetricsGridProps = {
  metrics?: WeeklyMetricView[];
  weekLabel?: string;
  loading?: boolean;
};

export function WeeklyMetricsGrid({ metrics, weekLabel, loading }: WeeklyMetricsGridProps) {
  if (loading && !metrics?.length) {
    return (
      <div className="grid grid-cols-2 gap-md md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="glass-card animate-pulse rounded-xl p-md h-28" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {weekLabel && (
        <p className="mb-sm text-label-md font-label-md font-semibold text-on-surface-variant">
          {weekLabel}
        </p>
      )}
      <div className="grid grid-cols-2 gap-md md:grid-cols-5">
        {metrics?.map((metric) => {
          const isClosedWon = metric.label.toLowerCase() === "closed won";
          const isActive = metric.label.toLowerCase() === "active";
          return (
            <div
              key={metric.label}
              className={`glass-card rounded-xl p-md ${
                isClosedWon ? "border-t-4 border-t-won" : isActive ? "border-t-4 border-t-activated" : ""
              }`}
            >
              <p className="text-label-md font-label-md text-on-surface-variant">{metric.label}</p>
              <h3 className="mt-xs text-headline-md font-headline-md font-extrabold">{metric.value}</h3>
              <span
                className={`mt-xs inline-flex rounded-full px-xs py-[2px] text-[10px] font-bold ${
                  metric.trend === "up"
                    ? "trend-up"
                    : metric.trend === "down"
                      ? "trend-down"
                      : "trend-neutral"
                }`}
              >
                {metric.change}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type WeeklyHistoryChartProps = {
  history?: WeeklyHistoryView[];
  loading?: boolean;
  selectedWeek?: string | null;
  onWeekSelect?: (week: string) => void;
};

export function WeeklyHistoryChart({
  history,
  loading,
  selectedWeek,
  onWeekSelect,
}: WeeklyHistoryChartProps) {
  if (loading && !history?.length) {
    return <div className="glass-card animate-pulse rounded-xl p-lg h-64" />;
  }

  const maxClosedWon = Math.max(...(history ?? []).map((h) => h.closedWon), 1);
  const maxActive = Math.max(...(history ?? []).map((h) => h.active), 1);

  return (
    <div className="glass-card rounded-xl p-lg">
      <h3 className="mb-lg text-title-lg font-title-lg font-bold">2026 Trend (Closed Won vs Active)</h3>
      <div className="overflow-x-auto pb-sm">
      <div className="flex items-end justify-between gap-sm min-w-[960px]" style={{ minHeight: 180 }}>
        {history?.map((row) => {
          const isMany = (history?.length ?? 0) > 8;
          const weekMatch = /^W(\d{1,2})$/i.exec(row.week);
          const weekNum = weekMatch ? Number(weekMatch[1]) : null;
          const dateRange = weekNum != null ? formatWeekDateRange(weekNum) : "";
          const barTitle = (metric: string, value: number) =>
            dateRange ? `${formatWeekLabel(row.week)} · ${metric}: ${value}` : `${metric}: ${value}`;
          return (
          <div
            key={row.week}
            role={onWeekSelect ? "button" : undefined}
            tabIndex={onWeekSelect ? 0 : undefined}
            onClick={() => onWeekSelect?.(row.week)}
            onKeyDown={(event) => {
              if (onWeekSelect && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                onWeekSelect(row.week);
              }
            }}
            className={`flex flex-col items-center gap-xs ${isMany ? "min-w-[36px] flex-1" : "flex-1"} ${
              onWeekSelect ? "cursor-pointer rounded-lg p-xs transition-colors hover:bg-surface-container-low" : ""
            } ${selectedWeek === row.week ? "ring-2 ring-primary/50" : ""}`}
          >
            <div className="flex w-full items-end justify-center gap-1" style={{ height: 140 }}>
              <div
                className="w-4 rounded-t bg-won"
                style={{ height: `${Math.max(8, (row.closedWon / maxClosedWon) * 100)}%` }}
                title={barTitle("Closed Won", row.closedWon)}
              />
              <div
                className="w-4 rounded-t bg-activated"
                style={{ height: `${Math.max(8, (row.active / maxActive) * 100)}%` }}
                title={barTitle("Active", row.active)}
              />
            </div>
            <span className="text-center text-label-md font-label-md font-semibold leading-tight">
              {row.week}
            </span>
            {dateRange ? (
              <span className="text-center text-[9px] leading-tight text-on-surface-variant">{dateRange}</span>
            ) : null}
            <span className="text-[10px] text-on-surface-variant">
              L{row.leads} · CW{row.closedWon} · A{row.active}
            </span>
          </div>
          );
        })}
      </div>
      </div>
      <div className="mt-md flex gap-md text-label-md">
        <span className="flex items-center gap-xs">
          <span className="h-3 w-3 rounded bg-won" /> Closed Won
        </span>
        <span className="flex items-center gap-xs">
          <span className="h-3 w-3 rounded bg-activated" /> Active
        </span>
      </div>
    </div>
  );
}
