import type { TierView } from "@/types/dashboard";

type MtdSummaryProps = {
  month?: string;
  leadsMtd?: string;
  qualifiedMtd?: string;
  loading?: boolean;
};

export function MtdSummaryCards({ month, leadsMtd, qualifiedMtd, loading }: MtdSummaryProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-sm md:grid-cols-2">
        <div className="dashboard-card h-28 animate-pulse" />
        <div className="dashboard-card h-28 animate-pulse" />
      </div>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-sm md:grid-cols-2" aria-label="MTD funnel summary">
      <div className="dashboard-card border-l-4 border-l-brand p-md">
        <p className="eyebrow text-brand">Leads · {month}</p>
        <div className="mt-xs flex items-end justify-between gap-sm">
          <h3 className="text-[15px] font-bold text-on-surface">Leads MTD</h3>
          <p className="text-[28px] font-extrabold leading-none tabular-nums text-on-surface">{leadsMtd}</p>
        </div>
      </div>
      <div className="dashboard-card border-l-4 border-l-secondary p-md">
        <p className="eyebrow text-secondary">Qualified · {month}</p>
        <div className="mt-xs flex items-end justify-between gap-sm">
          <h3 className="text-[15px] font-bold text-on-surface">Qualified MTD</h3>
          <p className="text-[28px] font-extrabold leading-none tabular-nums text-on-surface">{qualifiedMtd}</p>
        </div>
      </div>
    </section>
  );
}

type MtdProgressProps = {
  month?: string;
  wonProgress?: number;
  activatedProgress?: number;
  targetWon?: string;
  actualWon?: string;
  targetActivated?: string;
  actualActivated?: string;
  loading?: boolean;
};

export function MtdProgressCards({
  month,
  wonProgress = 0,
  activatedProgress = 0,
  targetWon,
  actualWon,
  targetActivated,
  actualActivated,
  loading,
}: MtdProgressProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-sm md:grid-cols-2">
        <div className="dashboard-card h-40 animate-pulse" />
        <div className="dashboard-card h-40 animate-pulse" />
      </div>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-sm md:grid-cols-2" aria-label="Monthly target progress">
      <ProgressCard
        title="MTD Won"
        month={month}
        actual={actualWon}
        target={targetWon}
        progress={wonProgress}
        accent="won"
      />
      <ProgressCard
        title="MTD Activated"
        month={month}
        actual={actualActivated}
        target={targetActivated}
        progress={activatedProgress}
        accent="activated"
      />
    </section>
  );
}

function ProgressCard({
  title,
  month,
  actual,
  target,
  progress,
  accent,
}: {
  title: string;
  month?: string;
  actual?: string;
  target?: string;
  progress: number;
  accent: "won" | "activated";
}) {
  const barColor = accent === "won" ? "bg-won" : "bg-activated";
  const textColor = accent === "won" ? "text-won" : "text-activated";
  const badgeColor = accent === "won" ? "badge-won" : "badge-activated";
  const over = progress > 100;
  const width = Math.min(100, progress);
  return (
    <article className={`dashboard-card border-l-4 p-md ${accent === "won" ? "border-l-won" : "border-l-activated"}`}>
      <div className="flex items-start justify-between gap-sm">
        <div>
          <p className={`eyebrow ${textColor}`}>{month} · MTD only</p>
          <h3 className="mt-1 text-[16px] font-bold text-on-surface">{title}</h3>
        </div>
        <span className={`rounded-full px-sm py-1 text-[11px] font-bold tabular-nums ${over ? "badge-over" : badgeColor}`}>
          {over ? "▲ " : ""}{progress}%
        </span>
      </div>
      <p className="mt-md text-[30px] font-extrabold leading-none tabular-nums text-on-surface">
        {actual} <span className="text-[13px] font-medium text-on-surface-variant">/ {target} target</span>
      </p>
      <div className="mt-md h-2.5 overflow-hidden rounded-full bg-surface-container">
        <div
          className={`h-full rounded-full ${barColor} ${over ? "bar-over" : ""}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="mt-xs text-[11px] text-on-surface-variant">{progress}% of monthly target</p>
    </article>
  );
}

type TierTableProps = {
  tiers?: TierView[];
  loading?: boolean;
};

export function TierTrackingTable({ tiers, loading }: TierTableProps) {
  return (
    <section className="dashboard-card overflow-hidden">
      <div className="border-b border-outline-variant/60 px-md py-sm">
        <p className="eyebrow text-brand">MTD targets</p>
        <h3 className="mt-1 text-[17px] font-bold text-on-surface">Segment breakdown</h3>
        <p className="mt-0.5 text-[12px] text-on-surface-variant">
          MTD achievement by segment — Won: Complex 10/rep, Density 30/rep · Activated: Complex 8/rep, Density 25/rep
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-surface-container-low/60">
            <tr>
              <th className="px-md py-xs text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Segment</th>
              <th className="px-md py-xs text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Type</th>
              <th className="px-md py-xs text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Actual</th>
              <th className="px-md py-xs text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Target</th>
              <th className="px-md py-xs text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {loading && !tiers?.length ? (
              <tr>
                  <td colSpan={5} className="px-md py-xl text-center text-on-surface-variant">
                  Loading tiers…
                </td>
              </tr>
            ) : (
              tiers?.map((tier) => (
                <tr key={`${tier.name}-${tier.type}`} className="hover:bg-surface-container-low/45">
                  <td className="px-md py-sm text-[13px] font-semibold">{tier.name}</td>
                  <td className="px-md py-sm">
                    <span
                      className={`rounded-full px-xs py-[2px] text-[11px] font-bold ${
                        tier.type === "won" ? "badge-won" : "badge-activated"
                      }`}
                    >
                      {tier.typeLabel}
                    </span>
                  </td>
                  <td className="px-md py-sm text-data-mono font-data-mono">{tier.actual}</td>
                  <td className="px-md py-sm text-data-mono font-data-mono">{tier.target}</td>
                  <td className="px-md py-sm">
                    <div className="flex items-center gap-sm">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-container">
                        <div
                          className={`h-full rounded-full ${tier.type === "won" ? "bg-won" : "bg-activated"} ${
                            tier.progress > 100 ? "bar-over" : ""
                          }`}
                          style={{ width: `${Math.min(100, tier.progress)}%` }}
                        />
                      </div>
                      <span
                        className={`text-label-md tabular-nums ${
                          tier.progress > 100 ? "rounded-full badge-over px-xs font-bold" : ""
                        }`}
                      >
                        {tier.progress > 100 ? "▲ " : ""}
                        {tier.progress}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
