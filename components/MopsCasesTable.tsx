"use client";

import type { MopsCaseViewRow } from "@/types/dashboard";

type MopsCasesTableProps = {
  cases?: MopsCaseViewRow[];
  loading?: boolean;
};

export function MopsCasesTable({ cases, loading }: MopsCasesTableProps) {
  return (
    <div className="glass-card overflow-hidden rounded-xl">
      <div className="border-b border-outline-variant p-lg">
        <h3 className="text-title-lg font-title-lg font-bold">Open cases</h3>
        <p className="text-body-md text-on-surface-variant">
          All non-closed MOps cases — newest first. Click case number to open in Salesforce.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                Case #
              </th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                Subject
              </th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                Status
              </th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                Owner
              </th>
              <th className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant">
                Record type
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {loading && !cases?.length ? (
              <tr>
                <td colSpan={5} className="px-lg py-xl text-center text-on-surface-variant">
                  Loading open cases…
                </td>
              </tr>
            ) : !cases?.length ? (
              <tr>
                <td colSpan={5} className="px-lg py-xl text-center text-on-surface-variant">
                  No open cases.
                </td>
              </tr>
            ) : (
              cases.map((row) => (
                <tr key={row.id} className="hover:bg-surface-container-low">
                  <td className="px-lg py-md font-mono text-label-md">
                    {row.sfCaseUrl ? (
                      <a
                        href={row.sfCaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-primary hover:underline"
                      >
                        {row.caseNumber}
                      </a>
                    ) : (
                      row.caseNumber
                    )}
                  </td>
                  <td className="max-w-xs truncate px-lg py-md text-on-surface" title={row.subject}>
                    {row.subject}
                  </td>
                  <td className="px-lg py-md text-body-md text-on-surface-variant">{row.status}</td>
                  <td className="px-lg py-md text-body-md">{row.ownerName}</td>
                  <td className="px-lg py-md text-body-md text-on-surface-variant">
                    {row.recordType}
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
