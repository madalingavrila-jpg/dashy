"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { AccountsTable } from "@/components/AccountsTable";
import { useDashboard } from "@/lib/useDashboard";
import type { AccountViewRow } from "@/types/dashboard";

function AccountsContent() {
  const { model, error, loading, sourceHint } = useDashboard();
  const searchParams = useSearchParams();

  const stageFilter = searchParams.get("stage") ?? undefined;
  const ownerFilter = searchParams.get("owner") ?? undefined;
  const ownerNameFilter = searchParams.get("ownerName") ?? undefined;

  const filtered = useMemo(() => {
    const pool = model?.accounts.all ?? [
      ...(model?.accounts.won ?? []),
      ...(model?.accounts.activated ?? []),
      ...(model?.accounts.backlog ?? []),
    ];
    let rows: AccountViewRow[] = pool;

    if (stageFilter) {
      const needle = stageFilter.toLowerCase();
      rows = rows.filter((r) => r.stage.toLowerCase().includes(needle));
    }
    if (ownerFilter) {
      rows = rows.filter((r) => r.ownerId === ownerFilter);
    }
    if (ownerNameFilter) {
      rows = rows.filter((r) => r.owner.toLowerCase().includes(ownerNameFilter.toLowerCase()));
    }
    return rows;
  }, [model, stageFilter, ownerFilter, ownerNameFilter]);

  const filterLabel = [
    stageFilter ? `Stage: ${stageFilter}` : null,
    ownerFilter || ownerNameFilter ? "Owner filter active" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-[1400px] space-y-md">
      <PageHeader
        title="Accounts Management"
        subtitle={
          filterLabel
            ? `Filtered view — ${filterLabel}`
            : "Browse Won, Activated, and pipeline accounts with Salesforce links."
        }
        updatedAt={model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      {filterLabel ? (
        <AccountsTable
          filtered={filtered}
          filterMode
          loading={loading}
        />
      ) : (
        <AccountsTable
          won={model?.accounts.won}
          activated={model?.accounts.activated}
          backlog={model?.accounts.backlog}
          loading={loading}
        />
      )}
    </div>
  );
}

export function AccountsShell() {
  return (
    <Suspense fallback={<div className="p-lg text-on-surface-variant">Loading accounts…</div>}>
      <AccountsContent />
    </Suspense>
  );
}
