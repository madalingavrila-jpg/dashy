import Link from "next/link";
import type { DashboardModel } from "@/types/dashboard";

type CurrentWeekStatusProps = {
  weekly?: DashboardModel["weeklyPerformance"];
  loading?: boolean;
};

function MetricSkeleton() {
  return (
    <div className="glass-card animate-pulse rounded-xl p-md h-36" />
  );
}

export function CurrentWeekStatus({ weekly, loading }: CurrentWeekStatusProps) {
  const priorLabel = weekly?.priorWeek && weekly.priorWeek !== "—" ? weekly.priorWeek : "prior week";

  return (
    <section className="space-y-sm">
      <div className="flex flex-wrap items-end justify-between gap-sm">
        <div>
          <p className="text-label-md font-semibold uppercase tracking-wide text-primary">
            Current week · ISO status
          </p>
          <h2 className="text-title-lg font-bold text-on-surface">
            {loading && !weekly?.weekTitle ? "Loading…" : weekly?.weekTitle ?? "—"}
          </h2>
          <p className="text-body-md text-on-surface-variant">
            {weekly?.dateRange ?? "—"}
            {weekly?.priorWeek && weekly.priorWeek !== "—" && (
              <> · vs {weekly.priorWeek}</>
            )}
          </p>
        </div>
        <Link
          href="/weekly"
          className="text-label-md font-medium text-primary hover:underline"
        >
          Full weekly history →
        </Link>
      </div>

      {weekly?.fallbackMessage && (
        <p className="rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm text-body-md text-on-surface-variant">
          {weekly.fallbackMessage}
        </p>
      )}

      {loading && !weekly?.metrics?.length ? (
        <div className="grid grid-cols-2 gap-md md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <MetricSkeleton key={index} />
          ))}
        </div>
      ) : !weekly?.dataAvailable || !weekly.metrics.length ? (
        <div className="glass-card rounded-xl p-lg text-body-md text-on-surface-variant">
          Weekly metrics for the current ISO week are not available yet. Check back after the next
          Salesforce sync.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-md md:grid-cols-5">
          {weekly.metrics.map((metric) => {
            const labelLower = metric.label.toLowerCase();
            const isClosedWon = labelLower === "closed won";
            const isActive = labelLower === "active";
            const trendIcon =
              metric.trend === "up" ? "arrow_upward" : metric.trend === "down" ? "arrow_downward" : "remove";

            return (
              <div
                key={metric.label}
                className={`glass-card rounded-xl p-md ${
                  isClosedWon
                    ? "border-t-4 border-t-won"
                    : isActive
                      ? "border-t-4 border-t-activated"
                      : ""
                }`}
              >
                <p className="text-label-md font-label-md text-on-surface-variant">{metric.label}</p>
                <h3 className="mt-xs text-headline-md font-headline-md font-extrabold text-on-surface">
                  {metric.value}
                </h3>
                <p className="mt-xs text-[11px] text-on-surface-variant">
                  {priorLabel}: {metric.priorValue}
                </p>
                <div className="mt-sm flex flex-wrap items-center gap-xs">
                  <span
                    className={`inline-flex items-center gap-[2px] rounded-full px-xs py-[2px] text-[10px] font-bold ${
                      metric.trend === "up"
                        ? "trend-up"
                        : metric.trend === "down"
                          ? "trend-down"
                          : "trend-neutral"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[12px]">{trendIcon}</span>
                    {metric.delta}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-xs py-[2px] text-[10px] font-bold ${
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
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
