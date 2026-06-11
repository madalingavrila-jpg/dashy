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
      <div className="grid grid-cols-1 gap-md md:grid-cols-2">
        <div className="glass-card animate-pulse rounded-xl p-lg h-28" />
        <div className="glass-card animate-pulse rounded-xl p-lg h-28" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-md md:grid-cols-2">
      <div className="glass-card rounded-xl border-l-4 border-l-primary p-lg">
        <p className="text-label-md text-on-surface-variant">{month} · MTD only</p>
        <h3 className="text-title-lg font-bold">Leads MTD</h3>
        <p className="mt-sm text-headline-md font-extrabold">{leadsMtd}</p>
      </div>
      <div className="glass-card rounded-xl border-l-4 border-l-secondary p-lg">
        <p className="text-label-md text-on-surface-variant">{month} · MTD only</p>
        <h3 className="text-title-lg font-bold">Qualified MTD</h3>
        <p className="mt-sm text-headline-md font-extrabold">{qualifiedMtd}</p>
      </div>
    </div>
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
      <div className="grid grid-cols-1 gap-md md:grid-cols-2">
        <div className="glass-card animate-pulse rounded-xl p-lg h-40" />
        <div className="glass-card animate-pulse rounded-xl p-lg h-40" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-md md:grid-cols-2">
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
    </div>
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
  return (
    <div className={`glass-card rounded-xl p-lg border-l-4 ${accent === "won" ? "border-l-won" : "border-l-activated"}`}>
      <p className="text-label-md font-label-md text-on-surface-variant">{month} · June MTD only</p>
      <h3 className="text-title-lg font-title-lg font-bold">{title}</h3>
      <p className="mt-sm text-headline-md font-headline-md font-extrabold">
        {actual} <span className="text-body-md font-normal text-on-surface-variant">/ {target}</span>
      </p>
      <div className="mt-md h-3 overflow-hidden rounded-full bg-surface-container">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-xs text-label-md font-label-md text-on-surface-variant">{progress}% of target</p>
    </div>
  );
}

type TierTableProps = {
  tiers?: TierView[];
  loading?: boolean;
};

export function TierTrackingTable({ tiers, loading }: TierTableProps) {
  return (
    <div className="glass-card overflow-hidden rounded-xl">
      <div className="border-b border-outline-variant p-lg">
        <h3 className="text-title-lg font-title-lg font-bold">Tier Breakdown</h3>
        <p className="text-body-md text-on-surface-variant">MTD achievement by tier — Won and Activated tracked separately</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">Tier</th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">Type</th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">Actual</th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">Target</th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {loading && !tiers?.length ? (
              <tr>
                <td colSpan={5} className="px-lg py-xl text-center text-on-surface-variant">
                  Loading tiers…
                </td>
              </tr>
            ) : (
              tiers?.map((tier) => (
                <tr key={`${tier.name}-${tier.type}`} className="hover:bg-surface-container-low">
                  <td className="px-lg py-md font-semibold">{tier.name}</td>
                  <td className="px-lg py-md">
                    <span
                      className={`rounded-full px-xs py-[2px] text-[11px] font-bold ${
                        tier.type === "won" ? "badge-won" : "badge-activated"
                      }`}
                    >
                      {tier.typeLabel}
                    </span>
                  </td>
                  <td className="px-lg py-md text-data-mono font-data-mono">{tier.actual}</td>
                  <td className="px-lg py-md text-data-mono font-data-mono">{tier.target}</td>
                  <td className="px-lg py-md">
                    <div className="flex items-center gap-sm">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-container">
                        <div
                          className={`h-full rounded-full ${tier.type === "won" ? "bg-won" : "bg-activated"}`}
                          style={{ width: `${tier.progress}%` }}
                        />
                      </div>
                      <span className="text-label-md">{tier.progress}%</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
