import type { ReactNode } from "react";

export function DashyPage({ children }: { children: ReactNode }) {
  return <div className="dashy-page">{children}</div>;
}

export function StatusPill({
  progress,
  paused,
}: {
  progress: number;
  paused?: boolean;
}) {
  if (paused) {
    return (
      <span className="inline-flex rounded-full bg-surface-container-high px-xs py-[2px] text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
        On pause
      </span>
    );
  }
  if (progress >= 100) {
    return (
      <span className="inline-flex rounded-full status-on-track px-xs py-[2px] text-[10px] font-bold uppercase tracking-wide">
        Exceeding
      </span>
    );
  }
  if (progress >= 80) {
    return (
      <span className="inline-flex rounded-full status-on-track px-xs py-[2px] text-[10px] font-bold uppercase tracking-wide">
        On Track
      </span>
    );
  }
  if (progress >= 60) {
    return (
      <span className="inline-flex rounded-full status-average px-xs py-[2px] text-[10px] font-bold uppercase tracking-wide">
        Average
      </span>
    );
  }
  if (progress >= 40) {
    return (
      <span className="inline-flex rounded-full status-lagging px-xs py-[2px] text-[10px] font-bold uppercase tracking-wide">
        Lagging
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full status-behind px-xs py-[2px] text-[10px] font-bold uppercase tracking-wide">
      Behind
    </span>
  );
}

export function SoftTip({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-sm rounded-xl border border-brand/20 bg-brand-container/50 px-md py-sm">
      <span className="material-symbols-outlined mt-[1px] text-[18px] text-brand">info</span>
      <div className="text-[13px] leading-5 text-on-surface">{children}</div>
    </div>
  );
}
