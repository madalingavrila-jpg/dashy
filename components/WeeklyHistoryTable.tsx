import type { WeeklyHistoryView } from "@/types/dashboard";

type WeeklyHistoryTableProps = {
  history?: WeeklyHistoryView[];
  currentWeek?: string;
  selectedWeek?: string | null;
  onWeekSelect?: (week: string) => void;
  loading?: boolean;
};

export function WeeklyHistoryTable({
  history,
  currentWeek,
  selectedWeek,
  onWeekSelect,
  loading,
}: WeeklyHistoryTableProps) {
  if (loading && !history?.length) {
    return <div className="glass-card animate-pulse rounded-xl p-lg h-96" />;
  }

  const normalizedCurrent = currentWeek?.replace(/^W0?/, "W") ?? "W24";

  return (
    <div className="glass-card overflow-hidden rounded-xl">
      <div className="border-b border-outline-variant p-lg">
        <h3 className="text-title-lg font-title-lg font-bold">2026 Weekly Performance</h3>
        <p className="text-body-md text-on-surface-variant">
          ISO weeks W01–W24 · click a row for team status drill-down
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="px-md py-sm text-label-md font-semibold uppercase text-on-surface-variant">
                Week
              </th>
              <th className="px-md py-sm text-label-md font-semibold uppercase text-on-surface-variant">
                Leads
              </th>
              <th className="px-md py-sm text-label-md font-semibold uppercase text-on-surface-variant">
                Qualified
              </th>
              <th className="px-md py-sm text-label-md font-semibold uppercase text-on-surface-variant">
                Contract Sent
              </th>
              <th className="px-md py-sm text-label-md font-semibold uppercase text-won">
                Won
              </th>
              <th className="px-md py-sm text-label-md font-semibold uppercase text-activated">
                Activated
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {history?.map((row) => {
              const weekNum = row.week.replace(/^W0?/, "");
              const isCurrent =
                row.week === currentWeek ||
                row.week === normalizedCurrent ||
                row.week === `W${Number(weekNum)}` ||
                `W${weekNum.padStart(2, "0")}` === normalizedCurrent;
              const isSelected = selectedWeek === row.week;
              return (
                <tr
                  key={row.week}
                  role={onWeekSelect ? "button" : undefined}
                  tabIndex={onWeekSelect ? 0 : undefined}
                  onClick={() => onWeekSelect?.(row.week)}
                  onKeyDown={(event) => {
                    if (onWeekSelect && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      onWeekSelect(row.week);
                    }
                  }}
                  className={
                    isSelected
                      ? "cursor-pointer bg-primary-container/30 ring-2 ring-inset ring-primary/40"
                      : isCurrent
                        ? "cursor-pointer bg-primary-container/20 ring-1 ring-inset ring-primary/30"
                        : "cursor-pointer hover:bg-surface-container-low"
                  }
                >
                  <td className="px-md py-sm font-semibold">
                    {row.week}
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
                  <td className="px-md py-sm text-data-mono">{row.contractSent}</td>
                  <td className="px-md py-sm font-semibold text-won">{row.won}</td>
                  <td className="px-md py-sm font-semibold text-activated">{row.activated}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
