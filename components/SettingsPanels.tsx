"use client";

import { useEffect, useState } from "react";
import type { IntegrationSetting } from "@/types/dashboard";
import { fetchHealth } from "@/lib/api";

type SettingsPanelsProps = {
  timezone?: string;
  locale?: string;
  integrations?: IntegrationSetting[];
  sources?: { source: string; path?: string };
  updatedAt?: string;
  loading?: boolean;
};

function statusColor(status: IntegrationSetting["status"]): string {
  if (status === "connected") return "text-won";
  if (status === "warning") return "text-amber-600";
  return "text-error";
}

export function SettingsPanels({
  timezone,
  locale,
  integrations,
  sources,
  updatedAt,
  loading,
}: SettingsPanelsProps) {
  const [gitSha, setGitSha] = useState<string | null>(null);
  const [builtAt, setBuiltAt] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchHealth(controller.signal)
      .then((health) => {
        setGitSha(health.gitSha);
        setBuiltAt(health.builtAt);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return (
    <>
      <div className="glass-card rounded-xl p-lg">
        <h3 className="text-title-lg font-title-lg font-bold">Data Source</h3>
        <p className="mb-md text-body-md text-on-surface-variant">
          Read-only status — no auth or runtime Salesforce sync on Boltable
        </p>
        {loading ? (
          <p className="text-on-surface-variant">Loading…</p>
        ) : (
          <dl className="space-y-sm text-body-md">
            {updatedAt && (
              <div className="flex justify-between border-b border-outline-variant py-sm">
                <dt className="text-on-surface-variant">Date actualizate</dt>
                <dd className="font-semibold">{new Date(updatedAt).toLocaleString("ro-RO")}</dd>
              </div>
            )}
            <div className="flex justify-between border-b border-outline-variant py-sm">
              <dt className="text-on-surface-variant">Source</dt>
              <dd className="font-semibold">{sources?.source ?? "json"}</dd>
            </div>
            <div className="flex justify-between border-b border-outline-variant py-sm">
              <dt className="text-on-surface-variant">Path</dt>
              <dd className="font-mono text-sm">{sources?.path ?? "data/dashboard.json"}</dd>
            </div>
            <div className="flex justify-between border-b border-outline-variant py-sm">
              <dt className="text-on-surface-variant">Deploy (git SHA)</dt>
              <dd className="font-mono text-sm">{gitSha ?? "—"}</dd>
            </div>
            {builtAt && (
              <div className="flex justify-between border-b border-outline-variant py-sm">
                <dt className="text-on-surface-variant">Built at</dt>
                <dd>{new Date(builtAt).toLocaleString("ro-RO")}</dd>
              </div>
            )}
            <div className="flex justify-between border-b border-outline-variant py-sm">
              <dt className="text-on-surface-variant">Target overrides</dt>
              <dd className="max-w-[60%] text-right text-sm">
                With GITHUB_TOKEN: saved to git (all browsers). Without: localStorage fallback until
                redeploy.
              </dd>
            </div>
            <div className="flex justify-between border-b border-outline-variant py-sm">
              <dt className="text-on-surface-variant">Timezone</dt>
              <dd>{timezone}</dd>
            </div>
            <div className="flex justify-between py-sm">
              <dt className="text-on-surface-variant">Locale</dt>
              <dd>{locale}</dd>
            </div>
          </dl>
        )}
      </div>

      <div className="glass-card rounded-xl p-lg">
        <h3 className="text-title-lg font-title-lg font-bold">Integrations</h3>
        <p className="mb-md text-body-md text-on-surface-variant">
          Refreshed via Cursor MCP — not called at runtime
        </p>
        <div className="space-y-sm">
          {loading && !integrations?.length ? (
            <p className="text-on-surface-variant">Loading…</p>
          ) : (
            integrations?.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-lg bg-surface-container-low px-md py-sm"
              >
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-primary">{item.icon}</span>
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-label-md text-on-surface-variant">
                      Last sync {new Date(item.lastSync).toLocaleString("en-GB")}
                    </p>
                  </div>
                </div>
                <span className={`text-label-md font-bold capitalize ${statusColor(item.status)}`}>
                  {item.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
