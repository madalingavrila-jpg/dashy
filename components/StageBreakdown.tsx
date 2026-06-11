import Link from "next/link";
import type { FunnelStageView } from "@/types/dashboard";
import { accountsFilterUrl } from "@/lib/salesforce";

type StageBreakdownProps = {
  sales?: FunnelStageView[];
  loading?: boolean;
};

export function StageBreakdown({ sales, loading }: StageBreakdownProps) {
  if (loading && !sales?.length) {
    return <div className="glass-card animate-pulse rounded-xl p-lg h-48" />;
  }

  return (
    <div className="glass-card rounded-xl p-lg">
      <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
        <div>
          <h3 className="text-title-lg font-title-lg font-bold">Stage Breakdown</h3>
          <p className="text-body-md text-on-surface-variant">
            Click a stage to open filtered accounts in a new tab
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-sm">
        {sales?.map((stage) => (
          <Link
            key={stage.stage}
            href={accountsFilterUrl({ stage: stage.stage })}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex min-w-[140px] flex-col rounded-lg border border-outline-variant bg-white px-md py-sm transition hover:border-primary hover:shadow-sm"
          >
            <span className="text-label-md text-on-surface-variant group-hover:text-primary">
              {stage.stage}
            </span>
            <span className="text-headline-md font-headline-md font-extrabold text-on-surface">
              {stage.count}
            </span>
            <span className="mt-xs inline-flex items-center gap-xs text-[11px] font-semibold text-primary opacity-0 transition group-hover:opacity-100">
              View accounts
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
