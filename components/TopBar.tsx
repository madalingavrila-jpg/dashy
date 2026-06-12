"use client";

import { useEffect, useState } from "react";
import { apiBase } from "@/lib/api";

export function TopBar() {
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase()}/api/dashboard/overview`, { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { updatedAt?: string } | null) => {
        if (data?.updatedAt) {
          setUpdatedAt(data.updatedAt);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const freshnessLabel = updatedAt
    ? `Date actualizate: ${new Date(updatedAt).toLocaleString("ro-RO")}`
    : null;

  return (
    <header className="fixed left-[280px] right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-outline-variant bg-surface px-lg">
      <div className="flex flex-1 items-center gap-md">
        <div className="relative w-full max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60">
            search
          </span>
          <input
            type="text"
            placeholder="Search accounts, owners, cities…"
            className="w-full rounded-lg border-none bg-surface-container py-2 pl-10 pr-4 text-body-md font-body-md focus:ring-2 focus:ring-primary"
          />
        </div>
        {freshnessLabel && (
          <p className="hidden text-label-md text-on-surface-variant lg:block" title={updatedAt ?? undefined}>
            {freshnessLabel}
          </p>
        )}
      </div>

      <div className="flex items-center gap-md">
        <div className="hidden items-center gap-xs rounded-lg bg-surface-container-low px-sm py-1 md:flex">
          <span className="rounded-full px-xs py-[2px] text-[10px] font-bold badge-won">Won</span>
          <span className="text-label-md text-on-surface-variant">vs</span>
          <span className="rounded-full px-xs py-[2px] text-[10px] font-bold badge-activated">
            Activated
          </span>
        </div>
        <button
          type="button"
          className="relative rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low"
        >
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <div className="mx-xs h-8 w-px bg-outline-variant" />
        <div className="flex items-center gap-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
            <span className="material-symbols-outlined">person</span>
          </div>
          <div className="hidden xl:block">
            <p className="text-label-md font-label-md font-bold leading-none">
              Sales Manager
            </p>
            <p className="text-label-md font-label-md text-on-surface-variant opacity-60">
              Romania
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
