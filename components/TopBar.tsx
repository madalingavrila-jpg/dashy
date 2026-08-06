"use client";

import { useEffect, useMemo, useState } from "react";
import { apiBase } from "@/lib/api";
import { AgentAvatar } from "@/components/AgentAvatar";

type TopBarProps = {
  onMenuClick?: () => void;
};

const BUCHAREST = "Europe/Bucharest";

function formatAbsolute(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat("ro-RO", {
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
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase()}/api/dashboard/overview`, { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { updatedAt?: string } | null) => {
        if (data?.updatedAt) {
          setUpdatedAt(data.updatedAt);
        } else {
          setFailed(true);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFailed(true);
        }
      });
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
  const reportingPeriod = useMemo(
    () =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone: BUCHAREST,
        month: "short",
        year: "numeric",
      }).format(new Date(now)),
    [now],
  );

  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex h-[72px] items-center justify-between border-b border-outline-variant/80 bg-white/95 px-md backdrop-blur-lg lg:left-[232px] lg:px-md">
      <div className="flex min-w-0 flex-1 items-center gap-md">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low lg:hidden"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        {absolute ? (
          <div
            className="flex min-w-0 items-center gap-xs text-[11px] text-on-surface-variant"
            title={`Last updated: ${absolute} (Europe/Bucharest)`}
          >
            <span className="material-symbols-outlined text-[16px] text-brand">schedule</span>
            <span className="hidden font-medium sm:inline">Last updated:</span>
            <span className="truncate font-bold text-on-surface">{absolute}</span>
            {relative ? <span className="hidden text-on-surface-variant/65 xl:inline">· {relative}</span> : null}
          </div>
        ) : failed ? (
          <div className="flex items-center gap-xs text-[11px] font-medium text-amber-700">
            <span className="material-symbols-outlined text-[16px]">update_disabled</span>
            Data freshness unknown
          </div>
        ) : (
          <div className="h-4 w-44 animate-pulse rounded bg-surface-container" />
        )}
      </div>

      <div className="flex items-center gap-xs">
        <div className="hidden items-center gap-xs rounded-full border border-outline-variant/80 bg-surface-container-lowest px-sm py-xs text-[11px] lg:flex">
          <span className="text-on-surface-variant">Reporting period</span>
          <span className="font-bold text-on-surface">{reportingPeriod}</span>
        </div>
        <LinkIcon icon="notifications" label="Notifications" />
        <LinkIcon icon="help_outline" label="Help" />
        <AgentAvatar name="Ionut-Mădălin Gavrilă" size={32} className="ml-xs" />
      </div>
    </header>
  );
}

function LinkIcon({ icon, label }: { icon: string; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-brand"
    >
      <span className="material-symbols-outlined text-[19px]">{icon}</span>
    </button>
  );
}
