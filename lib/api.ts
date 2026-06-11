import type { DashboardModel } from "@/types/dashboard";
import type { TargetConfig } from "@/lib/targetConfig";

export function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ?? "";
}

export async function fetchDashboard(
  signal?: AbortSignal,
): Promise<DashboardModel> {
  const response = await fetch(`${apiBase()}/api/dashboard`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    if (response.status === 503) {
      throw new Error(
        "Dashboard is starting or redeploying. Wait a moment and refresh once.",
      );
    }
    throw new Error(`Dashboard API returned ${response.status}`);
  }
  return (await response.json()) as DashboardModel;
}

export async function fetchTargetConfigFromApi(
  signal?: AbortSignal,
): Promise<Partial<TargetConfig>> {
  const response = await fetch(`${apiBase()}/api/target-config`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new Error(`Target config API returned ${response.status}`);
  }
  return (await response.json()) as Partial<TargetConfig>;
}

export async function saveTargetConfigToApi(config: TargetConfig): Promise<void> {
  const response = await fetch(`${apiBase()}/api/target-config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Target config save returned ${response.status}`);
  }
}
