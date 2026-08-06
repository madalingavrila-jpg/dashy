import Link from "next/link";
import type { DashboardModel } from "@/types/dashboard";
import { formatWeekLabel } from "@/lib/weekDateRange";

type CurrentWeekStatusProps = {
  weekly?: DashboardModel["weeklyPerformance"];
  loading?: boolean;
};

export function CurrentWeekStatus({ weekly, loading }: CurrentWeekStatusProps) {
  const weekLabel =
    weekly?.currentWeek && weekly.currentWeek !== "—"
      ? formatWeekLabel(weekly.currentWeek)
      : "Current week";

  return (
    <section className="dashboard-card flex min-h-[58px] items-center gap-sm px-sm py-xs">
      <div className="hidden min-w-[136px] border-r border-outline-variant/70 pr-sm xl:block">
        <p className="eyebrow text-brand">{weekLabel}</p>
        <p className="mt-0.5 truncate text-[11px] text-on-surface-variant">{weekly?.dateRange ?? "—"}</p>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-xs overflow-x-auto no-scrollbar">
        {loading && !weekly?.metrics?.length
          ? Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-8 min-w-28 animate-pulse rounded-full bg-surface-container" />
            ))
          : weekly?.metrics.map((metric, index) => {
              const labelLower = metric.label.toLowerCase();
              const isClosedWon = labelLower === "closed won";
              const isActive = labelLower === "active";
              return (
                <div key={metric.label} className="flex min-w-0 flex-1 items-center">
                  <div
                    className={`flex min-w-[116px] flex-1 items-center justify-between gap-xs rounded-full px-sm py-xs ${
                      isClosedWon
                        ? "bg-won-container text-won"
                        : isActive
                          ? "bg-activated-container text-activated"
                          : "bg-surface-container-low text-on-surface"
                    }`}
                  >
                    <span className="truncate text-[11px] font-semibold">{metric.label}</span>
                    <span className="text-[12px] font-extrabold tabular-nums">{metric.value}</span>
                  </div>
                  {index < weekly.metrics.length - 1 ? (
                    <span className="material-symbols-outlined mx-1 text-[15px] text-outline-variant">
                      chevron_right
                    </span>
                  ) : null}
                </div>
              );
            })}
      </div>

      <Link
        href="/weekly"
        className="inline-flex h-8 shrink-0 items-center rounded-lg px-xs text-[11px] font-bold text-brand hover:bg-brand-container"
      >
        View week
      </Link>
    </section>
  );
}
