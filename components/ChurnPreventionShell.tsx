"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { useDashboard } from "@/lib/useDashboard";
import { formatInteger } from "@/lib/format";
import type { ChurnPreventionAccount } from "@/types/dashboard";

type ViewMode = "all" | "archived" | "active" | "never-ordered";
type AgentFilter = "all" | "seg:complex" | "seg:density" | `agent:${string}`;
type OrderFilter = "all" | "yes" | "no";
type StatusFilter = "all" | "inactive" | "hidden" | "deleted" | "active" | "onboarding" | "unknown";
type DbStatusFilter = "all" | "active" | "hidden" | "deleted" | "onboarding" | "unknown";
type ActivationSort = "desc" | "asc";

function applyChurnFilters(
  rows: ChurnPreventionAccount[],
  opts: {
    view: ViewMode;
    agentFilter: AgentFilter;
    statusFilter: StatusFilter;
    dbStatusFilter: DbStatusFilter;
    orderFilter: OrderFilter;
    search: string;
    includeAgentPick: boolean;
  },
): ChurnPreventionAccount[] {
  let out = rows;

  // Quick views: Archived (SF inactive) and Active are separate — not lumped with hidden/deleted.
  if (opts.view === "archived") out = out.filter((a) => a.sfStatus === "inactive");
  else if (opts.view === "active") out = out.filter((a) => a.sfStatus === "active");
  else if (opts.view === "never-ordered") out = out.filter((a) => a.neverOrdered);

  if (opts.agentFilter === "seg:complex") out = out.filter((a) => a.segment === "complex");
  else if (opts.agentFilter === "seg:density") out = out.filter((a) => a.segment === "density");
  else if (opts.includeAgentPick && opts.agentFilter.startsWith("agent:")) {
    const id = opts.agentFilter.slice("agent:".length);
    out = out.filter((a) => a.agentId === id);
  }

  if (opts.statusFilter === "unknown") out = out.filter((a) => !a.sfStatus);
  else if (opts.statusFilter !== "all") out = out.filter((a) => a.sfStatus === opts.statusFilter);

  if (opts.dbStatusFilter === "unknown") out = out.filter((a) => !a.dbStatus);
  else if (opts.dbStatusFilter !== "all") {
    out = out.filter((a) => a.dbStatus === opts.dbStatusFilter);
  }

  if (opts.orderFilter === "yes") out = out.filter((a) => a.hasOrder);
  else if (opts.orderFilter === "no") out = out.filter((a) => a.neverOrdered);

  const q = opts.search.trim().toLowerCase();
  if (q) {
    out = out.filter(
      (a) =>
        a.accountName.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.agentName.toLowerCase().includes(q) ||
        a.id.includes(q),
    );
  }
  return out;
}

function statusLabel(status: string | null): string {
  if (!status) return "Unknown";
  if (status === "inactive") return "Archived";
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
  const [dbStatusFilter, setDbStatusFilter] = useState<DbStatusFilter>("all");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [search, setSearch] = useState("");
  const [activationSort, setActivationSort] = useState<ActivationSort>("desc");

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
    const rows = applyChurnFilters(cp?.accounts ?? [], {
      view,
      agentFilter,
      statusFilter,
      dbStatusFilter,
      orderFilter,
      search,
      includeAgentPick: true,
    });
    const dir = activationSort === "desc" ? -1 : 1;
    return [...rows].sort((a, b) => {
      const aDate = a.activatedDate ?? "";
      const bDate = b.activatedDate ?? "";
      if (aDate === bDate) return a.accountName.localeCompare(b.accountName);
      // Missing dates sink to the end regardless of direction.
      if (!aDate) return 1;
      if (!bDate) return -1;
      return aDate < bDate ? -dir : dir;
    });
  }, [cp, view, agentFilter, statusFilter, dbStatusFilter, orderFilter, search, activationSort]);

  /**
   * Per-agent counts from the current filters, excluding an individual-agent pick
   * so bars stay navigable when a rep is selected. View / segment / status / order /
   * search still apply so the chart stays coherent with the table.
   */
  const agentBars = useMemo(() => {
    const rows = applyChurnFilters(cp?.accounts ?? [], {
      view,
      agentFilter,
      statusFilter,
      dbStatusFilter,
      orderFilter,
      search,
      includeAgentPick: false,
    });
    const byAgent = new Map<
      string,
      { agentId: string; name: string; segment: "complex" | "density"; count: number }
    >();
    for (const a of rows) {
      const existing = byAgent.get(a.agentId);
      if (existing) {
        existing.count += 1;
      } else {
        byAgent.set(a.agentId, {
          agentId: a.agentId,
          name: a.agentName,
          segment: a.segment,
          count: 1,
        });
      }
    }
    return [...byAgent.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    );
  }, [cp, view, agentFilter, statusFilter, dbStatusFilter, orderFilter, search]);

  const maxAgentCount = Math.max(...agentBars.map((a) => a.count), 1);

  const viewCounts = useMemo(() => {
    const accounts = cp?.accounts ?? [];
    return {
      all: accounts.length,
      archived: accounts.filter((a) => a.sfStatus === "inactive").length,
      active: accounts.filter((a) => a.sfStatus === "active").length,
      neverOrdered: accounts.filter((a) => a.neverOrdered).length,
    };
  }, [cp]);

  const sfStatusCounts = cp?.totals.bySfStatus ?? {};
  const dbStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of cp?.accounts ?? []) {
      const key = a.dbStatus ?? "unknown";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [cp]);

  const cards = [
    {
      label: "Activated YTD",
      value: formatInteger(cp?.totals.accounts ?? 0),
      icon: "storefront",
      hint: "Complex + Density Romania activations this year",
    },
    {
      label: "Archived (SF)",
      value: formatInteger(sfStatusCounts.inactive ?? 0),
      icon: "inventory_2",
      hint: "Salesforce Status__c = inactive (archived)",
    },
    {
      label: "Active (SF)",
      value: formatInteger(sfStatusCounts.active ?? 0),
      icon: "check_circle",
      hint: "Salesforce Status__c = active",
    },
    {
      label: "Never ordered",
      value: formatInteger(cp?.totals.neverOrdered ?? 0),
      icon: "receipt_long",
      hint: "No delivered order on/after activation date",
    },
  ];

  const viewButtons: { id: ViewMode; label: string; count: number }[] = [
    { id: "all", label: "All", count: viewCounts.all },
    { id: "archived", label: "Archived", count: viewCounts.archived },
    { id: "active", label: "Active", count: viewCounts.active },
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
            <option value="all">All SF statuses</option>
            <option value="inactive">Archived ({sfStatusCounts.inactive ?? 0})</option>
            <option value="active">Active ({sfStatusCounts.active ?? 0})</option>
            <option value="hidden">Hidden ({sfStatusCounts.hidden ?? 0})</option>
            <option value="deleted">Deleted ({sfStatusCounts.deleted ?? 0})</option>
            <option value="onboarding">Onboarding ({sfStatusCounts.onboarding ?? 0})</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
            DB status
          </label>
          <select
            value={dbStatusFilter}
            onChange={(e) => setDbStatusFilter(e.target.value as DbStatusFilter)}
            className="min-w-[180px] rounded-lg border border-outline-variant bg-surface-container px-md py-sm text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">All DB statuses</option>
            <option value="active">Active ({dbStatusCounts.active ?? 0})</option>
            <option value="hidden">Hidden ({dbStatusCounts.hidden ?? 0})</option>
            <option value="deleted">Deleted ({dbStatusCounts.deleted ?? 0})</option>
            <option value="onboarding">Onboarding ({dbStatusCounts.onboarding ?? 0})</option>
            <option value="unknown">Unknown ({dbStatusCounts.unknown ?? 0})</option>
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

        <div className="flex flex-col gap-1">
          <label className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
            Activation date
          </label>
          <select
            value={activationSort}
            onChange={(e) => setActivationSort(e.target.value as ActivationSort)}
            className="min-w-[180px] rounded-lg border border-outline-variant bg-surface-container px-md py-sm text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>

        <p className="text-body-md text-on-surface-variant lg:ml-auto">
          Showing <span className="font-semibold text-on-surface">{formatInteger(filtered.length)}</span>
        </p>
      </section>

      <section className="glass-card rounded-xl p-lg">
        <h3 className="mb-xs text-title-md font-bold text-on-surface">
          Accounts by agent{" "}
          <span className="text-label-md font-normal text-on-surface-variant">
            (current filters · click a bar to filter by rep)
          </span>
        </h3>
        <div className="mb-md flex flex-wrap gap-md text-label-md text-on-surface-variant">
          <span className="flex items-center gap-xs">
            <span className="h-3 w-3 rounded bg-primary" /> Complex
          </span>
          <span className="flex items-center gap-xs">
            <span className="h-3 w-3 rounded bg-tertiary" /> Density
          </span>
        </div>
        {loading && !cp ? (
          <div className="animate-pulse h-40" />
        ) : agentBars.length === 0 ? (
          <p className="py-md text-center text-body-md text-on-surface-variant">
            No agents in the current filter set.
          </p>
        ) : (
          <div className="overflow-x-auto pb-sm">
            <div
              className="flex items-end justify-between gap-sm"
              style={{ minHeight: 180, minWidth: Math.max(480, agentBars.length * 72) }}
            >
              {agentBars.map((bar) => {
                const selected = agentFilter === `agent:${bar.agentId}`;
                const barColor =
                  bar.segment === "complex"
                    ? selected
                      ? "bg-primary"
                      : "bg-primary/55"
                    : selected
                      ? "bg-tertiary"
                      : "bg-tertiary/55";
                return (
                  <button
                    key={bar.agentId}
                    type="button"
                    onClick={() =>
                      setAgentFilter(selected ? "all" : (`agent:${bar.agentId}` as AgentFilter))
                    }
                    className={
                      "flex min-w-[56px] flex-1 flex-col items-center gap-xs rounded-lg p-xs transition-colors hover:bg-surface-container-low " +
                      (selected ? "ring-2 ring-primary/50" : "")
                    }
                    title={`${bar.name} · ${bar.count} · ${bar.segment}`}
                  >
                    <span className="text-label-md font-semibold text-on-surface">
                      {formatInteger(bar.count)}
                    </span>
                    <div className="flex w-full items-end justify-center" style={{ height: 110 }}>
                      <div
                        className={`w-8 rounded-t ${barColor}`}
                        style={{
                          height: `${Math.max(6, (bar.count / maxAgentCount) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="max-w-[72px] truncate text-center text-[11px] font-semibold leading-tight text-on-surface-variant">
                      {bar.name.split(" ").slice(-1)[0] || bar.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
                  <th className="px-md py-sm text-label-md font-bold text-on-surface-variant">
                    <button
                      type="button"
                      onClick={() =>
                        setActivationSort((prev) => (prev === "desc" ? "asc" : "desc"))
                      }
                      className="inline-flex items-center gap-1 hover:text-on-surface"
                      title={
                        activationSort === "desc"
                          ? "Sorted newest first — click for oldest first"
                          : "Sorted oldest first — click for newest first"
                      }
                    >
                      Activated
                      <span className="material-symbols-outlined text-[14px]" aria-hidden>
                        {activationSort === "desc" ? "arrow_downward" : "arrow_upward"}
                      </span>
                    </button>
                  </th>
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
                        <span
                          className="text-on-surface"
                          title={
                            a.ordersAfterActivation != null && a.ordersAfterActivation > 0
                              ? `${a.ordersAfterActivation} delivered orders in activation month and later`
                              : "Has delivered orders in the current query month"
                          }
                        >
                          {formatDate(a.firstOrderDate) || "Ordered after act."}
                        </span>
                      ) : a.firstOrderDate ? (
                        <span
                          className="font-semibold text-error"
                          title={`No delivered orders in activation month or later (lifetime first order ${a.firstOrderDate} is display-only)`}
                        >
                          No order after act.
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
