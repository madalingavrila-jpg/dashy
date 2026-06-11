"use client";

import { PageHeader } from "@/components/PageHeader";
import { DataAlert } from "@/components/DataAlert";
import { AccountsTable } from "@/components/AccountsTable";
import { useDashboard } from "@/lib/useDashboard";

export function AccountsShell() {
  const { model, error, loading, sourceHint } = useDashboard();

  return (
    <div className="mx-auto max-w-[1400px] space-y-md">
      <PageHeader
        title="Accounts Management"
        subtitle="Browse Won, Activated, and onboarding backlog accounts."
        updatedAt={model?.updatedAt}
        loading={loading}
      />

      <DataAlert error={error} sourceHint={sourceHint} />

      <AccountsTable
        won={model?.accounts.won}
        activated={model?.accounts.activated}
        backlog={model?.accounts.backlog}
        loading={loading}
      />
    </div>
  );
}
