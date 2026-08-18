"use client";

import type { MtdItem } from "@/types/dashboard";
import { salesforceOpportunityUrl } from "@/lib/salesforce";

export function MtdItemList({
  items,
  tone,
  salesforceUrl,
}: {
  items: MtdItem[];
  tone: "won" | "activated";
  salesforceUrl?: string;
}) {
  const labelColor = tone === "won" ? "text-won" : "text-activated";

  return (
    <ul className="max-h-56 divide-y divide-outline-variant/30 overflow-y-auto">
      {items.map((item) => {
        const href = salesforceOpportunityUrl(item.sfOpportunityId, salesforceUrl);
        return (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-sm px-sm py-xs text-[11px]">
            <div className="min-w-0">
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:underline"
                >
                  {item.name}
                </a>
              ) : (
                <span className="font-semibold text-on-surface">{item.name}</span>
              )}
              {item.reactivated ? (
                <span className="ml-xs rounded-sm bg-tertiary-container px-xs text-[9px] font-bold uppercase text-on-tertiary-container">
                  reactivated
                </span>
              ) : null}
              <p className="text-on-surface-variant">
                {item.city} · {item.closeDate}
              </p>
            </div>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-xs text-primary hover:underline"
              >
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                SF
              </a>
            ) : null}
          </li>
        );
      })}
      <li className={`px-sm py-xs text-[10px] font-bold uppercase ${labelColor}`}>
        {items.length} {tone === "won" ? "won" : "activated"}
      </li>
    </ul>
  );
}
