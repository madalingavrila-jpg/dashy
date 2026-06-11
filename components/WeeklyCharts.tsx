import type { WeeklyHistoryView, WeeklyMetricView } from "@/types/dashboard";

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
          const isWon = metric.label.toLowerCase() === "won";
          const isActivated = metric.label.toLowerCase() === "activated";
          return (
            <div
              key={metric.label}
              className={`glass-card rounded-xl p-md ${
                isWon ? "border-t-4 border-t-won" : isActivated ? "border-t-4 border-t-activated" : ""
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

  const maxWon = Math.max(...(history ?? []).map((h) => h.won), 1);
  const maxActivated = Math.max(...(history ?? []).map((h) => h.activated), 1);

  return (
    <div className="glass-card rounded-xl p-lg">
      <h3 className="mb-lg text-title-lg font-title-lg font-bold">2026 Trend (Won vs Activated)</h3>
      <div className="overflow-x-auto pb-sm">
      <div className="flex items-end justify-between gap-sm min-w-[960px]" style={{ minHeight: 180 }}>
        {history?.map((row) => {
          const isMany = (history?.length ?? 0) > 8;
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
                style={{ height: `${Math.max(8, (row.won / maxWon) * 100)}%` }}
                title={`Won: ${row.won}`}
              />
              <div
                className="w-4 rounded-t bg-activated"
                style={{ height: `${Math.max(8, (row.activated / maxActivated) * 100)}%` }}
                title={`Activated: ${row.activated}`}
              />
            </div>
            <span className="text-label-md font-label-md font-semibold">{row.week}</span>
            <span className="text-[10px] text-on-surface-variant">
              L{row.leads} · W{row.won} · A{row.activated}
            </span>
          </div>
          );
        })}
      </div>
      </div>
      <div className="mt-md flex gap-md text-label-md">
        <span className="flex items-center gap-xs">
          <span className="h-3 w-3 rounded bg-won" /> Won
        </span>
        <span className="flex items-center gap-xs">
          <span className="h-3 w-3 rounded bg-activated" /> Activated
        </span>
      </div>
    </div>
  );
}
