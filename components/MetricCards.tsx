import type { MetricCard } from "@/types/dashboard";

type MetricCardsProps = {
  metrics?: MetricCard[];
  loading?: boolean;
  columns?: 2 | 3 | 4 | 6;
  compact?: boolean;
};

function SkeletonCard() {
  return (
    <div className="dashboard-card animate-pulse p-sm">
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
          className={`dashboard-card cursor-default ${cardPadding} transition-all hover:-translate-y-0.5 hover:shadow-md ${
            compact ? "opacity-90" : ""
          }`}
        >
          <div className="flex items-start justify-between gap-xs">
            <p className="eyebrow">{metric.label}</p>
            <div className={`${compact ? "" : "mt-[-2px]"}`}>
              <span className={`material-symbols-outlined ${metric.iconColor} ${compact ? "text-[17px]" : "text-[20px]"}`}>
                {metric.icon}
              </span>
            </div>
          </div>
          <h3 className={valueClass}>{metric.value}</h3>
          <div className="mt-sm flex items-center justify-between gap-xs border-t border-outline-variant/55 pt-xs">
            <span
              className={`flex items-center gap-[2px] text-[11px] font-bold ${
                metric.trend === "up"
                  ? "text-won"
                  : metric.trend === "down"
                    ? "text-error"
                    : "text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">{metric.trendIcon}</span>
              {metric.trendValue}
            </span>
            <p className="truncate text-right text-[10px] text-on-surface-variant">{metric.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
