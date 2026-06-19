"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { useDashboard } from "@/lib/useDashboard";
import { formatInteger } from "@/lib/format";
import type { MyPipelineItemView } from "@/types/dashboard";

type AgentFilter = "all" | "seg:complex" | "seg:density" | `agent:${string}`;
type TypeFilter = "all" | "opportunity" | "lead" | "account";

const VISIBLE_CAP = 500;

const TYPE_BADGE: Record<MyPipelineItemView["type"], string> = {
  opportunity: "bg-primary-container/40 text-on-primary-container",
  lead: "bg-secondary-container/40 text-on-secondary-container",
  account: "bg-tertiary-container/40 text-on-tertiary-container",
};

const TYPE_OPTIONS: { id: TypeFilter; label: string; icon: string }[] = [
  { id: "all", label: "All", icon: "list" },
  { id: "opportunity", label: "Opportunities", icon: "trending_up" },
  { id: "lead", label: "Leads", icon: "person_add" },
  { id: "account", label: "Accounts", icon: "storefront" },
];

function SummaryCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="glass-card flex items-center gap-md rounded-xl p-md">
      <span className={`material-symbols-outlined rounded-lg p-sm text-[22px] ${accent}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
          {label}
        </p>
        <p className="text-headline-sm font-extrabold tabular-nums text-on-background">{value}</p>
        {sub ? <p className="text-[11px] text-on-surface-variant">{sub}</p> : null}
      </div>
    </div>
  );
}

export function MyPipelineShell() {
  const { model, error, loading, sourceHint } = useDashboard({ sections: ["my-pipeline"] });
  const mp = model?.myPipeline;

  const [agentFilter, setAgentFilter] = useState<AgentFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  const agents = mp?.agents ?? [];
  const complexAgents = agents.filter((a) => a.segment === "complex");
  const densityAgents = agents.filter((a) => a.segment === "density");

  const filtered = useMemo<MyPipelineItemView[]>(() => {
    let items = mp?.items ?? [];
    if (agentFilter === "seg:complex") items = items.filter((i) => i.segment === "complex");
    else if (agentFilter === "seg:density") items = items.filter((i) => i.segment === "density");
    else if (agentFilter.startsWith("agent:")) {
      const id = agentFilter.slice("agent:".length);
      items = items.filter((i) => i.ownerId === id);
    }
    if (typeFilter !== "all") items = items.filter((i) => i.type === typeFilter);
    if (stageFilter !== "all") items = items.filter((i) => i.stage === stageFilter);
    if (cityFilter !== "all") items = items.filter((i) => i.city === cityFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.account ?? "").toLowerCase().includes(q) ||
          i.ownerName.toLowerCase().includes(q),
      );
    }
    const order = { opportunity: 0, account: 1, lead: 2 } as Record<string, number>;
    return items
      .slice()
      .sort((a, b) => order[a.type] - order[b.type] || a.name.localeCompare(b.name));
  }, [mp, agentFilter, typeFilter, stageFilter, cityFilter, search]);

  const counts = useMemo(() => {
    return {
      opportunity: filtered.filter((i) => i.type === "opportunity").length,
      lead: filtered.filter((i) => i.type === "lead").length,
      account: filtered.filter((i) => i.type === "account").length,
    };
  }, [filtered]);

  const visible = filtered.slice(0, VISIBLE_CAP);

  const selectClass =
    "w-full rounded-lg border-2 border-primary/30 bg-white px-md py-2.5 text-body-md font-medium text-on-surface shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60";

  return (
    <div className="mx-auto max-w-[1400px] space-y-md">
      <PageHeader
        title="MyPipeline"
        subtitle="Open pipeline per rep — Leads, Accounts & Opportunities assigned to you (before win, onboarding & activation)."
        updatedAt={mp?.generatedAt ?? model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
        <SummaryCard
          icon="trending_up"
          label="Open opportunities"
          value={formatInteger(mp?.totals.opportunities ?? 0)}
          sub={
            mp && mp.totals.opportunitiesShown < mp.totals.opportunities
              ? `${formatInteger(mp.totals.opportunitiesShown)} listed · rest via Salesforce`
              : "all listed"
          }
          accent="bg-primary-container/40 text-primary"
        />
        <SummaryCard
          icon="person_add"
          label="Open leads"
          value={formatInteger(mp?.totals.leads ?? 0)}
          sub={
            mp && mp.totals.leadsShown < mp.totals.leads
              ? `${formatInteger(mp.totals.leadsShown)} most-recent listed · rest via Salesforce`
              : "all listed"
          }
          accent="bg-secondary-container/40 text-secondary"
        />
        <SummaryCard
          icon="storefront"
          label="Accounts in pipeline"
          value={formatInteger(mp?.totals.accounts ?? 0)}
          sub="distinct accounts with an open opp"
          accent="bg-tertiary-container/40 text-tertiary"
        />
      </div>

      <div className="glass-card space-y-md rounded-xl p-lg">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-surface-container-low p-1">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTypeFilter(opt.id)}
              className={
                typeFilter === opt.id
                  ? "flex items-center gap-xs rounded-md bg-white px-md py-xs text-label-md font-bold text-primary shadow-sm"
                  : "flex items-center gap-xs rounded-md px-md py-xs text-label-md text-on-surface-variant hover:bg-white/50"
              }
            >
              <span className="material-symbols-outlined text-[16px]">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-xs">
            <span className="text-label-md font-semibold uppercase tracking-wide text-primary">
              Agent
            </span>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value as AgentFilter)}
              disabled={loading || !agents.length}
              className={selectClass}
            >
              <option value="all">All team ({agents.length})</option>
              <option value="seg:complex">— Complex team —</option>
              {complexAgents.map((a) => (
                <option key={a.ownerId} value={`agent:${a.ownerId}`}>
                  {a.name}
                </option>
              ))}
              <option value="seg:density">— Density team —</option>
              {densityAgents.map((a) => (
                <option key={a.ownerId} value={`agent:${a.ownerId}`}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-xs">
            <span className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
              Opportunity stage
            </span>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              disabled={loading || !mp?.stages.length}
              className={selectClass}
            >
              <option value="all">All stages</option>
              {(mp?.stages ?? []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-xs">
            <span className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
              City
            </span>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              disabled={loading || !mp?.cities.length}
              className={selectClass}
            >
              <option value="all">All cities</option>
              {(mp?.cities ?? []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-xs">
            <span className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
              Search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, account or rep…"
              className={selectClass}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-sm text-label-md text-on-surface-variant">
          <span className="rounded-full bg-primary-container/30 px-md py-xs font-semibold text-primary">
            {formatInteger(counts.opportunity)} opps
          </span>
          <span className="rounded-full bg-secondary-container/30 px-md py-xs font-semibold text-secondary">
            {formatInteger(counts.lead)} leads
          </span>
          <span className="rounded-full bg-tertiary-container/30 px-md py-xs font-semibold text-tertiary">
            {formatInteger(counts.account)} accounts
          </span>
          {(stageFilter !== "all" || cityFilter !== "all" || typeFilter !== "all" || search) && (
            <button
              type="button"
              onClick={() => {
                setTypeFilter("all");
                setStageFilter("all");
                setCityFilter("all");
                setSearch("");
              }}
              className="inline-flex items-center gap-xs text-primary hover:underline"
            >
              <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="glass-card overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr>
                {["Type", "Name", "Stage / Status", "Account", "City", "Agent", "SF Link"].map((h) => (
                  <th
                    key={h}
                    className="px-lg py-md text-label-md font-semibold uppercase text-on-surface-variant"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading && !mp ? (
                <tr>
                  <td colSpan={7} className="px-lg py-xl text-center text-on-surface-variant">
                    Loading pipeline…
                  </td>
                </tr>
              ) : !visible.length ? (
                <tr>
                  <td colSpan={7} className="px-lg py-xl text-center text-on-surface-variant">
                    No records match these filters.
                  </td>
                </tr>
              ) : (
                visible.map((item) => (
                  <tr key={`${item.type}-${item.id}`} className="hover:bg-surface-container-low">
                    <td className="px-lg py-md">
                      <span
                        className={`rounded-full px-sm py-[2px] text-[10px] font-bold uppercase ${TYPE_BADGE[item.type]}`}
                      >
                        {item.typeLabel}
                      </span>
                    </td>
                    <td className="px-lg py-md">
                      <div className="font-semibold text-on-surface">{item.name}</div>
                      {item.type === "account" && item.openOpps ? (
                        <span className="text-[11px] text-on-surface-variant">
                          {item.openOpps} open opp{item.openOpps > 1 ? "s" : ""}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-lg py-md">{item.stage}</td>
                    <td className="px-lg py-md text-on-surface-variant">{item.account ?? "—"}</td>
                    <td className="px-lg py-md">{item.city}</td>
                    <td className="px-lg py-md">
                      <div className="text-on-surface-variant">{item.ownerName}</div>
                      <span className="text-[11px] text-on-surface-variant">{item.segmentLabel}</span>
                    </td>
                    <td className="px-lg py-md">
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-xs rounded-lg bg-primary px-sm py-xs text-label-md font-semibold text-on-primary transition hover:opacity-90"
                        >
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                          Open
                        </a>
                      ) : (
                        <span className="text-on-surface-variant">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > VISIBLE_CAP ? (
          <div className="flex flex-wrap items-center justify-between gap-sm border-t border-outline-variant px-lg py-md text-label-md text-on-surface-variant">
            <span>
              Showing first {formatInteger(VISIBLE_CAP)} of {formatInteger(filtered.length)} matching
              records — refine the filters to narrow down.
            </span>
            {mp?.opportunitiesListUrl ? (
              <a
                href={typeFilter === "lead" ? mp.leadsListUrl ?? "#" : mp.opportunitiesListUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-xs font-semibold text-primary hover:underline"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                Open list in Salesforce
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      {mp ? (
        <p className="px-xs text-[11px] text-on-surface-variant">
          Included opportunity stages: {mp.stagesIncluded.join(", ")}. Excluded:{" "}
          {mp.stagesExcluded.join(", ")}. Leads = open (not converted / disqualified). Accounts =
          distinct accounts with an open opportunity. Long cold lists (New Opportunity, Leads) are
          capped per rep in the payload — totals above are exact; open Salesforce for the full list.
        </p>
      ) : null}
    </div>
  );
}
