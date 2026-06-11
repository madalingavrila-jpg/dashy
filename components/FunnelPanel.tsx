import type { FunnelStageView } from "@/types/dashboard";

type DualFunnelProps = {
  title: string;
  subtitle: string;
  stages?: FunnelStageView[];
  loading?: boolean;
  accent?: "won" | "activated" | "primary";
};

const accentBar: Record<string, string> = {
  won: "bg-won",
  activated: "bg-activated",
  primary: "bg-primary",
};

export function FunnelPanel({
  title,
  subtitle,
  stages,
  loading,
  accent = "primary",
}: DualFunnelProps) {
  return (
    <div className="glass-card rounded-xl p-lg">
      <div className="mb-lg">
        <h3 className="text-title-lg font-title-lg font-bold text-on-background">{title}</h3>
        <p className="text-body-md font-body-md text-on-surface-variant">{subtitle}</p>
      </div>
      {loading && !stages?.length ? (
        <p className="text-on-surface-variant">Loading funnel…</p>
      ) : (
        <div className="space-y-sm">
          {stages?.map((stage, index) => (
            <div key={stage.stage} className="flex items-center gap-md">
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-label-md font-label-md font-bold text-on-primary ${
                  accent === "won"
                    ? "bg-won"
                    : accent === "activated"
                      ? "bg-activated"
                      : "bg-primary"
                }`}
              >
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="mb-xs flex items-center justify-between gap-sm">
                  <span className="text-body-md font-body-md font-semibold">{stage.stage}</span>
                  <div className="flex items-center gap-sm">
                    <span className="text-data-mono font-data-mono font-bold">{stage.count}</span>
                    <span
                      className={`rounded-full px-xs py-[2px] text-[10px] font-bold ${
                        stage.trend === "up"
                          ? "trend-up"
                          : stage.trend === "down"
                            ? "trend-down"
                            : "trend-neutral"
                      }`}
                    >
                      {stage.change}
                    </span>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-container">
                  <div
                    className={`funnel-bar h-full rounded-full ${accentBar[accent]}`}
                    style={{ width: stage.barWidth }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type DualFunnelGridProps = {
  sales?: FunnelStageView[];
  onboarding?: FunnelStageView[];
  loading?: boolean;
};

export function DualFunnelGrid({ sales, onboarding, loading }: DualFunnelGridProps) {
  return (
    <div className="grid grid-cols-1 gap-md xl:grid-cols-2">
      <FunnelPanel
        title="Sales Pipeline"
        subtitle="URads funnel — Salesforce + Hitlist through Won"
        stages={sales}
        loading={loading}
        accent="won"
      />
      <FunnelPanel
        title="Onboarding Pipeline"
        subtitle="Post-sale activation — separate from Won count"
        stages={onboarding}
        loading={loading}
        accent="activated"
      />
    </div>
  );
}
