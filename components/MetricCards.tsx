import type { MetricCard } from "@/types/dashboard";

type MetricCardsProps = {
  metrics?: MetricCard[];
  loading?: boolean;
  columns?: 2 | 3 | 4 | 6;
  compact?: boolean;
};

function SkeletonCard() {
  return (
    <div className="glass-card animate-pulse rounded-xl p-md">
      <div className="mb-sm h-8 w-8 rounded-lg bg-surface-container-high" />
      <div className="mb-xs h-4 w-24 rounded bg-surface-container-high" />
      <div className="mb-xs h-8 w-32 rounded bg-surface-container-high" />
      <div className="h-3 w-40 rounded bg-surface-container-high" />
    </div>
  );
}

const columnClass: Record<number, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 xl:grid-cols-3",
  4: "md:grid-cols-2 xl:grid-cols-4",
  6: "md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6",
};

export function MetricCards({ metrics, loading, columns = 4, compact = false }: MetricCardsProps) {
  if (loading && !metrics?.length) {
    return (
      <div className={`grid grid-cols-1 gap-md ${columnClass[columns]}`}>
        {Array.from({ length: columns }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  if (!metrics?.length) {
    return null;
  }

  const cardPadding = compact ? "p-sm" : "p-md";
  const valueClass = compact
    ? "mt-xs text-title-lg font-bold text-on-surface"
    : "mt-xs text-headline-md font-headline-md font-extrabold text-on-surface";

  return (
    <div className={`grid grid-cols-1 gap-md ${columnClass[columns]}`}>
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className={`glass-card cursor-default rounded-xl ${cardPadding} transition-colors hover:bg-surface-container-low ${
            compact ? "opacity-90" : ""
          } ${
            metric.variant === "won"
              ? "border-l-4 border-l-won"
              : metric.variant === "activated"
                ? "border-l-4 border-l-activated"
                : compact
                  ? "border-l-2 border-l-outline-variant"
                  : ""
          }`}
        >
          <div className={`mb-sm flex items-start justify-between ${compact ? "mb-xs" : ""}`}>
            <div className={`rounded-lg p-xs ${metric.iconBg} ${compact ? "scale-90" : ""}`}>
              <span className={`material-symbols-outlined ${metric.iconColor} ${compact ? "text-[18px]" : ""}`}>
                {metric.icon}
              </span>
            </div>
            <span
              className={`flex items-center gap-[2px] rounded-full px-xs py-[2px] text-[10px] font-bold ${
                metric.trend === "up"
                  ? "trend-up"
                  : metric.trend === "down"
                    ? "trend-down"
                    : "trend-neutral"
              }`}
            >
              <span className="material-symbols-outlined text-[12px]">
                {metric.trendIcon}
              </span>
              {metric.trendValue}
            </span>
          </div>
          <p className="text-label-md font-label-md font-medium text-on-surface-variant">
            {metric.label}
          </p>
          <h3 className={valueClass}>{metric.value}</h3>
          <p className="mt-xs text-label-md font-label-md text-on-surface-variant opacity-60">
            {metric.subtitle}
          </p>
        </div>
      ))}
    </div>
  );
}
