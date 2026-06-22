"use client";

import { useEffect, useMemo, useState } from "react";
import { apiBase } from "@/lib/api";

type TopBarProps = {
  onMenuClick?: () => void;
};

const BUCHAREST = "Europe/Bucharest";

function formatAbsolute(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: BUCHAREST,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatRelative(iso: string, now: number): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const diffMs = now - date.getTime();
  if (diffMs < 0) {
    return "acum";
  }
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) {
    return "acum câteva secunde";
  }
  if (mins < 60) {
    return `acum ${mins}m`;
  }
  const hours = Math.round(mins / 60);
  if (hours < 24) {
    return `acum ${hours}h`;
  }
  const days = Math.round(hours / 24);
  return `acum ${days}z`;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

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

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const absolute = useMemo(() => (updatedAt ? formatAbsolute(updatedAt) : null), [updatedAt]);
  const relative = useMemo(
    () => (updatedAt ? formatRelative(updatedAt, now) : null),
    [updatedAt, now],
  );

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
      </div>

      <div className="flex items-center gap-sm md:gap-md">
        {absolute && (
          <div
            className="flex items-center gap-xs rounded-lg bg-surface-container-low px-sm py-1 text-on-surface-variant"
            title={`Ultima actualizare: ${absolute} (Europe/Bucharest)`}
          >
            <span className="material-symbols-outlined text-[16px] leading-none text-primary">
              update
            </span>
            <span className="hidden text-label-md sm:inline">Ultima actualizare:</span>
            <span className="text-label-md font-medium text-on-surface">{absolute}</span>
            {relative && (
              <span className="hidden text-label-sm text-on-surface-variant lg:inline">
                · {relative}
              </span>
            )}
          </div>
        )}
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
