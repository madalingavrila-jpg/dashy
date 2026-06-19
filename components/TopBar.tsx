"use client";

import { useEffect, useState } from "react";
import { apiBase } from "@/lib/api";

type TopBarProps = {
  onMenuClick?: () => void;
};

export function TopBar({ onMenuClick }: TopBarProps) {
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
    <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-outline-variant bg-surface px-md lg:left-[280px] lg:px-lg">
      <div className="flex flex-1 items-center gap-md">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low lg:hidden"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        {freshnessLabel && (
          <p className="truncate text-label-md text-on-surface-variant" title={updatedAt ?? undefined}>
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
      </div>
    </header>
  );
}
