"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { useDashboard } from "@/lib/useDashboard";
import { formatInteger } from "@/lib/format";
import type { ChurnPreventionAccount } from "@/types/dashboard";

type ViewMode = "all" | "inactive" | "never-ordered";
type AgentFilter = "all" | "seg:complex" | "seg:density" | `agent:${string}`;
type OrderFilter = "all" | "yes" | "no";
type StatusFilter = "all" | "inactive" | "hidden" | "deleted" | "active" | "onboarding" | "unknown";

function statusLabel(status: string | null): string {
  if (!status) return "Unknown";
  if (status === "inactive") return "Archived/Inactive";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusBadgeClass(status: string | null): string {
  switch (status) {
    case "active":
      return "bg-won/15 text-won";
    case "onboarding":
      return "bg-primary-container/40 text-on-primary-container";
    case "inactive":
      return "bg-amber-500/15 text-amber-700";
    case "hidden":
      return "bg-secondary-container/50 text-on-secondary-container";
    case "deleted":
      return "bg-error/15 text-error";
    default:
      return "bg-surface-container text-on-surface-variant";
  }
}

function segmentBadge(segment: "complex" | "density") {
  return segment === "complex"
    ? "bg-primary-container/40 text-on-primary-container"
    : "bg-tertiary-container/40 text-on-tertiary-container";
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function ChurnPreventionShell() {
  const { model, error, loading, sourceHint } = useDashboard({
    sections: ["churn-prevention"],
  });
  const cp = model?.churnPrevention;

  const [view, setView] = useState<ViewMode>("all");
  const [agentFilter, setAgentFilter] = useState<AgentFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [search, setSearch] = useState("");

  const agents = cp?.agents ?? [];
  const complexCount = useMemo(
    () => (cp?.accounts ?? []).filter((a) => a.segment === "complex").length,
    [cp],
  );
  const densityCount = useMemo(
    () => (cp?.accounts ?? []).filter((a) => a.segment === "density").length,
    [cp],
  );

  const filtered = useMemo<ChurnPreventionAccount[]>(() => {
    let rows = cp?.accounts ?? [];

    if (view === "inactive") rows = rows.filter((a) => a.problemStatus);
    else if (view === "never-ordered") rows = rows.filter((a) => a.neverOrdered);

    if (agentFilter === "seg:complex") rows = rows.filter((a) => a.segment === "complex");
    else if (agentFilter === "seg:density") rows = rows.filter((a) => a.segment === "density");
    else if (agentFilter.startsWith("agent:")) {
      const id = agentFilter.slice("agent:".length);
      rows = rows.filter((a) => a.agentId === id);
    }

    if (statusFilter === "unknown") rows = rows.filter((a) => !a.sfStatus);
    else if (statusFilter !== "all") rows = rows.filter((a) => a.sfStatus === statusFilter);

    if (orderFilter === "yes") rows = rows.filter((a) => a.hasOrder);
    else if (orderFilter === "no") rows = rows.filter((a) => a.neverOrdered);

    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (a) =>
          a.accountName.toLowerCase().includes(q) ||
          a.city.toLowerCase().includes(q) ||
          a.agentName.toLowerCase().includes(q) ||
          a.id.includes(q),
      );
    }

    return rows;
  }, [cp, view, agentFilter, statusFilter, orderFilter, search]);

  const viewCounts = useMemo(() => {
    const accounts = cp?.accounts ?? [];
    return {
      all: accounts.length,
      inactive: accounts.filter((a) => a.problemStatus).length,
      neverOrdered: accounts.filter((a) => a.neverOrdered).length,
    };
  }, [cp]);

  const cards = [
    {
      label: "Activated YTD",
      value: formatInteger(cp?.totals.accounts ?? 0),
      icon: "storefront",
      hint: "Complex + Density Romania activations this year",
    },
    {
      label: "Went inactive",
      value: formatInteger(cp?.totals.problemStatus ?? 0),
      icon: "heart_broken",
      hint: "SF Status__c in inactive / hidden / deleted (or IsDeleted)",
    },
    {
      label: "Never ordered",
      value: formatInteger(cp?.totals.neverOrdered ?? 0),
      icon: "receipt_long",
      hint: "No delivered order on/after activation date",
    },
    {
      label: "Inactive + no order",
      value: formatInteger(cp?.totals.both ?? 0),
      icon: "priority_high",
      hint: "Problem SF status and never ordered since activation",
    },
  ];

  const viewButtons: { id: ViewMode; label: string; count: number }[] = [
    { id: "all", label: "All", count: viewCounts.all },
    { id: "inactive", label: "Went inactive", count: viewCounts.inactive },
    { id: "never-ordered", label: "Never ordered", count: viewCounts.neverOrdered },
  ];

  const subtitle = cp
    ? `${cp.year} YTD · ${cp.country} · Complex + Density activations with SF status & order flags`
    : "YTD Complex + Density activations — SF status (inactive/hidden/deleted) and no-order flags.";

  return (
    <div className="mx-auto max-w-[1500px] space-y-md">
      <PageHeader
        title="Churn prevention"
        subtitle={subtitle}
        updatedAt={cp?.generatedAt ?? model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} updatedAt={model?.updatedAt} />

      <section className="grid grid-cols-2 gap-md md:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="glass-card rounded-xl p-md" title={card.hint}>
            <div className="flex items-center gap-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">{card.icon}</span>
              <p className="text-label-md font-label-md">{card.label}</p>
            </div>
            <h3 className="mt-xs text-headline-md font-headline-md font-extrabold text-on-surface">
              {loading && !cp ? "…" : card.value}
            </h3>
          </div>
        ))}
      </section>

      <section className="flex flex-wrap gap-xs">
        {viewButtons.map((btn) => {
          const active = view === btn.id;
          return (
            <button
              key={btn.id}
              type="button"
              onClick={() => setView(btn.id)}
              className={
                "rounded-lg border px-md py-sm text-body-md transition-colors " +
                (active
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container")
              }
            >
              {btn.label}{" "}
              <span className="text-on-surface-variant">({formatInteger(btn.count)})</span>
            </button>
          );
        })}
      </section>

      <section className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-low p-md lg:flex-row lg:flex-wrap lg:items-end">
        <div className="flex flex-col gap-1">
          <label className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
            Agent
          </label>
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value as AgentFilter)}
            className="min-w-[220px] rounded-lg border border-outline-variant bg-surface-container px-md py-sm text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">All agents ({cp?.totals.accounts ?? 0})</option>
            <option value="seg:complex">Complex team ({complexCount})</option>
            <option value="seg:density">Density team ({densityCount})</option>
            <optgroup label="Individual agents">
              {agents.map((agent) => (
                <option key={agent.agentId} value={`agent:${agent.agentId}`}>
                  {agent.name} ({agent.accounts})
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
            SF status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="min-w-[180px] rounded-lg border border-outline-variant bg-surface-container px-md py-sm text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">All statuses</option>
            <option value="inactive">Archived/Inactive</option>
            <option value="hidden">Hidden</option>
            <option value="deleted">Deleted</option>
            <option value="active">Active</option>
            <option value="onboarding">Onboarding</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
            Ordered since activation
          </label>
          <select
            value={orderFilter}
            onChange={(e) => setOrderFilter(e.target.value as OrderFilter)}
            className="min-w-[160px] rounded-lg border border-outline-variant bg-surface-container px-md py-sm text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">All</option>
            <option value="yes">Has order</option>
            <option value="no">No order</option>
          </select>
        </div>

        <div className="flex min-w-[220px] flex-1 flex-col gap-1">
          <label className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
            Search
          </label>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Account, city, rep, provider id…"
            className="rounded-lg border border-outline-variant bg-surface-container px-md py-sm text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <p className="text-body-md text-on-surface-variant lg:ml-auto">
          Showing <span className="font-semibold text-on-surface">{formatInteger(filtered.length)}</span>
        </p>
      </section>

      <div className="glass-card overflow-hidden rounded-xl">
        {loading && !cp ? (
          <div className="animate-pulse p-lg h-96" />
        ) : filtered.length === 0 ? (
          <div className="p-lg text-center text-body-md text-on-surface-variant">
            No accounts match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low">
                  <th className="px-md py-sm text-label-md font-bold text-on-surface-variant">Account</th>
                  <th className="px-md py-sm text-label-md font-bold text-on-surface-variant">City</th>
                  <th className="px-md py-sm text-label-md font-bold text-on-surface-variant">Rep</th>
                  <th className="px-md py-sm text-label-md font-bold text-on-surface-variant">Activated</th>
                  <th className="px-md py-sm text-label-md font-bold text-on-surface-variant">SF status</th>
                  <th className="px-md py-sm text-label-md font-bold text-on-surface-variant">DB status</th>
                  <th className="px-md py-sm text-label-md font-bold text-on-surface-variant">First order</th>
                  <th className="px-md py-sm text-label-md font-bold text-on-surface-variant">Links</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-outline-variant/50 transition-colors hover:bg-surface-container-low"
                  >
                    <td className="px-md py-sm">
                      <div className="font-semibold text-on-surface">{a.accountName}</div>
                      <div className="text-[11px] text-on-surface-variant">#{a.id}</div>
                    </td>
                    <td className="px-md py-sm text-body-md text-on-surface">{a.city || "—"}</td>
                    <td className="px-md py-sm">
                      <div className="text-body-md text-on-surface">{a.agentName}</div>
                      <span
                        className={
                          "mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase " +
                          segmentBadge(a.segment)
                        }
                      >
                        {a.segment}
                      </span>
                    </td>
                    <td className="px-md py-sm text-body-md text-on-surface">
                      {formatDate(a.activatedDate)}
                    </td>
                    <td className="px-md py-sm">
                      <span
                        className={
                          "inline-block rounded px-2 py-0.5 text-[11px] font-semibold " +
                          statusBadgeClass(a.sfStatus)
                        }
                      >
                        {statusLabel(a.sfStatus)}
                      </span>
                      {a.inactive30Days ? (
                        <div className="mt-0.5 text-[10px] text-amber-700">Inactive &gt;30d</div>
                      ) : null}
                    </td>
                    <td className="px-md py-sm text-body-md">
                      {a.dbStatus ? (
                        <span className={a.statusMismatch ? "text-amber-700" : "text-on-surface-variant"}>
                          {a.dbStatus}
                          {a.statusMismatch ? " ≠" : ""}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-md py-sm text-body-md">
                      {a.hasOrder ? (
                        <span className="text-on-surface">{formatDate(a.firstOrderDate)}</span>
                      ) : a.firstOrderDate ? (
                        <span className="font-semibold text-error" title={`First order ${a.firstOrderDate} was before activation`}>
                          No order since act.
                        </span>
                      ) : (
                        <span className="font-semibold text-error">No order</span>
                      )}
                    </td>
                    <td className="px-md py-sm text-body-md">
                      <div className="flex flex-wrap gap-2">
                        {a.accountUrl ? (
                          <a
                            href={a.accountUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline"
                          >
                            Account
                          </a>
                        ) : null}
                        {a.opportunityUrl ? (
                          <a
                            href={a.opportunityUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline"
                          >
                            Opp
                          </a>
                        ) : null}
                        {!a.accountUrl && !a.opportunityUrl ? "—" : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {cp?.metricsNote ? (
        <p className="px-xs text-[11px] text-on-surface-variant">{cp.metricsNote}</p>
      ) : null}
    </div>
  );
}
