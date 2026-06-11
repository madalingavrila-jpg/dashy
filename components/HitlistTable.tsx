import type { HitlistViewRow } from "@/types/dashboard";

type HitlistTableProps = {
  rows?: HitlistViewRow[];
  loading?: boolean;
};

export function HitlistTable({ rows, loading }: HitlistTableProps) {
  return (
    <div className="glass-card overflow-hidden rounded-xl">
      <div className="border-b border-outline-variant p-lg">
        <h3 className="text-title-lg font-title-lg font-bold">Hitlist Priority List</h3>
        <p className="text-body-md text-on-surface-variant">
          Complex and Density segments — synced from Google Sheet + Salesforce cross-check
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                #
              </th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                Company
              </th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                City
              </th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                Segment
              </th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                Stage
              </th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                Owner
              </th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {loading && !rows?.length ? (
              <tr>
                <td colSpan={7} className="px-lg py-xl text-center text-on-surface-variant">
                  Loading hitlist…
                </td>
              </tr>
            ) : (
              rows?.map((row) => (
                <tr key={row.id} className="hover:bg-surface-container-low">
                  <td className="px-lg py-md">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-label-md font-bold text-on-primary">
                      {row.priority}
                    </span>
                  </td>
                  <td className="px-lg py-md font-semibold">{row.company}</td>
                  <td className="px-lg py-md">{row.city}</td>
                  <td className="px-lg py-md">
                    <span
                      className={`rounded-full px-xs py-[2px] text-[11px] font-bold ${row.segmentColor}`}
                    >
                      {row.segment}
                    </span>
                  </td>
                  <td className="px-lg py-md">{row.stage}</td>
                  <td className="px-lg py-md text-on-surface-variant">{row.owner}</td>
                  <td className="px-lg py-md text-body-md text-on-surface-variant">
                    {row.notes ?? "—"}
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
