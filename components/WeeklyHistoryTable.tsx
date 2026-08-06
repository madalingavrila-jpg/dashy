"use client";

import type { ReactNode } from "react";
import type { WeeklyHistoryView } from "@/types/dashboard";
import { DASHBOARD_WEEK_YEAR, formatWeekLabel } from "@/lib/weekDateRange";

type WeeklyHistoryTableProps = {
  history?: WeeklyHistoryView[];
  currentWeek?: string;
  selectedWeek?: string | null;
  onWeekSelect?: (week: string) => void;
  loading?: boolean;
  visibleWeekRange?: string;
  expandedContent?: ReactNode;
  detailRef?: React.RefObject<HTMLDivElement | null>;
};

export function WeeklyHistoryTable({
  history,
  currentWeek,
  selectedWeek,
  onWeekSelect,
  loading,
  visibleWeekRange,
  expandedContent,
  detailRef,
}: WeeklyHistoryTableProps) {
  if (loading && !history?.length) {
    return <div className="dashboard-card h-96 animate-pulse p-lg" />;
  }

  const normalizedCurrent = currentWeek?.replace(/^W0?/, "W") ?? "W24";

  return (
    <div className="dashboard-card overflow-hidden">
      <div className="border-b border-outline-variant/60 p-lg">
        <p className="eyebrow text-brand">History</p>
        <h3 className="mt-1 text-title-lg font-title-lg font-bold">{DASHBOARD_WEEK_YEAR} Weekly Performance</h3>
        <p className="text-body-md text-on-surface-variant">
          Q2+ weeks {visibleWeekRange ?? "—"} · click any row to expand team drill-down inline
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead className="bg-surface-container-low/50">
            <tr>
              <th className="w-10 px-sm py-sm" aria-hidden="true" />
              <th className="px-md py-sm text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Week
              </th>
              <th className="px-md py-sm text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Leads
              </th>
              <th className="px-md py-sm text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Qualified
              </th>
              <th className="px-md py-sm text-[10px] font-bold uppercase tracking-wider text-secondary">
                Negotiations
              </th>
              <th className="px-md py-sm text-[10px] font-bold uppercase tracking-wider text-won">
                Closed Won
              </th>
              <th className="px-md py-sm text-[10px] font-bold uppercase tracking-wider text-activated">
                Active
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/45">
            {history?.map((row) => {
              const weekNum = row.week.replace(/^W0?/, "");
              const isCurrent =
                row.week === currentWeek ||
                row.week === normalizedCurrent ||
                row.week === `W${Number(weekNum)}` ||
                `W${weekNum.padStart(2, "0")}` === normalizedCurrent;
              const isSelected = selectedWeek === row.week;
              return (
                <WeekRowGroup
                  key={row.week}
                  row={row}
                  isCurrent={isCurrent}
                  isSelected={isSelected}
                  onWeekSelect={onWeekSelect}
                  expandedContent={isSelected ? expandedContent : undefined}
                  detailRef={isSelected ? detailRef : undefined}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WeekRowGroup({
  row,
  isCurrent,
  isSelected,
  onWeekSelect,
  expandedContent,
  detailRef,
}: {
  row: WeeklyHistoryView;
  isCurrent: boolean;
  isSelected: boolean;
  onWeekSelect?: (week: string) => void;
  expandedContent?: ReactNode;
  detailRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const handleActivate = () => {
    onWeekSelect?.(row.week);
  };

  return (
    <>
      <tr
        id={`week-row-${row.week}`}
        role={onWeekSelect ? "button" : undefined}
        tabIndex={onWeekSelect ? 0 : undefined}
        aria-expanded={isSelected}
        aria-controls={isSelected ? "weekly-detail" : undefined}
        onClick={handleActivate}
        onKeyDown={(event) => {
          if (onWeekSelect && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            handleActivate();
          }
        }}
        className={
          isSelected
              ? "cursor-pointer bg-brand-container/60 ring-1 ring-inset ring-brand/35"
            : isCurrent
              ? "cursor-pointer bg-brand-container/35 ring-1 ring-inset ring-brand/20"
              : "cursor-pointer transition-colors hover:bg-surface-container-low/60"
        }
      >
        <td className="px-sm py-sm text-center">
          <span
            className={`material-symbols-outlined text-[20px] transition-transform ${
              isSelected ? "rotate-0 text-primary" : "text-on-surface-variant"
            }`}
            aria-hidden="true"
          >
            {isSelected ? "expand_less" : "chevron_right"}
          </span>
        </td>
        <td className="px-md py-sm font-semibold">
          {formatWeekLabel(row.week)}
          {isCurrent && (
            <span className="ml-xs rounded-full bg-primary px-xs py-[1px] text-[10px] font-bold text-on-primary">
              NOW
            </span>
          )}
          {isSelected && (
            <span className="ml-xs rounded-full bg-secondary px-xs py-[1px] text-[10px] font-bold text-on-secondary">
              OPEN
            </span>
          )}
        </td>
        <td className="px-md py-sm text-data-mono">{row.leads}</td>
        <td className="px-md py-sm text-data-mono">{row.qualified}</td>
        <td className="px-md py-sm text-data-mono">{row.negotiations}</td>
        <td className="px-md py-sm font-semibold text-won">{row.closedWon}</td>
        <td className="px-md py-sm font-semibold text-activated">{row.active}</td>
      </tr>
      {isSelected && (
        <tr className="bg-surface-container-low/25">
          <td colSpan={7} className="border-l-4 border-l-brand p-0">
            <div
              ref={detailRef}
              id="weekly-detail"
              className="border-t border-outline-variant/50 p-lg"
            >
              {expandedContent ?? (
                <p className="rounded-lg bg-surface-container-low px-md py-sm text-body-md text-on-surface-variant">
                  Loading drill-down for {formatWeekLabel(row.week)}…
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
