import type { WowReportView } from "@/types/dashboard";

type WowReportsListProps = {
  reports?: WowReportView[];
  loading?: boolean;
};

export function WowReportsList({ reports, loading }: WowReportsListProps) {
  if (loading && !reports?.length) {
    return (
      <div className="space-y-md">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="dashboard-card h-48 animate-pulse p-lg" />
        ))}
      </div>
    );
  }

  if (!reports?.length) {
    return (
      <div className="dashboard-card p-lg text-on-surface-variant">
        No pre-configured WoW reports in dashboard data.
      </div>
    );
  }

  return (
    <div className="space-y-md">
      {reports.map((report) => (
        <div key={report.id} className="dashboard-card overflow-hidden">
          <div className="border-b border-outline-variant/60 bg-surface-container-low/35 p-lg">
            <div className="flex flex-wrap items-start justify-between gap-sm">
              <div>
                <p className="eyebrow text-brand">Saved comparison</p>
                <h3 className="mt-1 text-title-lg font-title-lg font-bold">{report.title}</h3>
                {report.description && (
                  <p className="text-body-md text-on-surface-variant">{report.description}</p>
                )}
              </div>
              <div className="flex gap-xs rounded-lg bg-white px-sm py-xs text-label-md">
                <span className="font-bold text-primary">{report.currentWeek}</span>
                <span className="text-on-surface-variant">vs</span>
                <span className="text-on-surface-variant">{report.priorWeek}</span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low/35">
                <tr>
                  <th className="px-lg py-md text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    Metric
                  </th>
                  <th className="px-lg py-md text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    {report.currentWeek}
                  </th>
                  <th className="px-lg py-md text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    {report.priorWeek}
                  </th>
                  <th className="px-lg py-md text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    Change
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/45">
                {report.rows.map((row) => (
                  <tr key={row.metric} className="transition-colors hover:bg-surface-container-low/60">
                    <td className="px-lg py-md font-semibold">{row.metric}</td>
                    <td className="px-lg py-md text-data-mono font-data-mono">{row.current}</td>
                    <td className="px-lg py-md text-data-mono font-data-mono text-on-surface-variant">
                      {row.prior}
                    </td>
                    <td className="px-lg py-md">
                      <span
                        className={`rounded-full px-xs py-[2px] text-[11px] font-bold ${
                          row.trend === "up"
                            ? "trend-up"
                            : row.trend === "down"
                              ? "trend-down"
                              : "trend-neutral"
                        }`}
                      >
                        {row.change}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
