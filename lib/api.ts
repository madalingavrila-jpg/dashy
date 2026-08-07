import type { DashboardModel, MtdDetails } from "@/types/dashboard";
import type { TargetConfig } from "@/lib/targetConfig";

export type TargetConfigPersistence = {
  mode: "s3" | "filesystem";
  committed?: boolean;
  warning?: string;
};

export type DashboardSection =
  | "overview"
  | "mtd"
  | "weekly"
  | "accounts"
  | "accounts-performance"
  | "churn-prevention"
  | "mops"
  | "agents"
  | "my-pipeline"
  | "inbound";

export type HealthInfo = {
  ok: boolean;
  gitSha: string | null;
  builtAt: string | null;
  cacheTtlMs?: number;
};

export function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ?? "";
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 503) {
      throw new Error(
        "Dashboard is starting or redeploying. Wait a moment and refresh once.",
      );
    }
    throw new Error(`Dashboard API returned ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchDashboard(
  signal?: AbortSignal,
): Promise<DashboardModel> {
  const response = await fetch(`${apiBase()}/api/dashboard`, {
    cache: "no-store",
    signal,
  });
  return parseJsonResponse<DashboardModel>(response);
}

export async function fetchDashboardSection(
  section: DashboardSection,
  signal?: AbortSignal,
): Promise<Partial<DashboardModel>> {
  const response = await fetch(`${apiBase()}/api/dashboard/${section}`, {
    cache: "no-store",
    signal,
  });
  return parseJsonResponse<Partial<DashboardModel>>(response);
}

export async function fetchDashboardSections(
  sections: DashboardSection[],
  signal?: AbortSignal,
): Promise<Partial<DashboardModel>> {
  const unique = [...new Set(sections)];
  try {
    const parts = await Promise.all(
      unique.map((section) => fetchDashboardSection(section, signal)),
    );
    return Object.assign({}, ...parts) as Partial<DashboardModel>;
  } catch {
    return fetchDashboard(signal);
  }
}

/**
 * Full-year per-month per-agent Won/Activated drill-down lists. Served as its
 * own precompressed section and fetched lazily by the Monthly Overview tab —
 * NOT part of DashboardModel (prior months are slimmed out of mtdHistory).
 */
export async function fetchMtdDetails(signal?: AbortSignal): Promise<MtdDetails> {
  const response = await fetch(`${apiBase()}/api/dashboard/mtd-details`, {
    cache: "no-store",
    signal,
  });
  return parseJsonResponse<MtdDetails>(response);
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthInfo> {
  const response = await fetch(`${apiBase()}/api/health`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new Error(`Health API returned ${response.status}`);
  }
  return (await response.json()) as HealthInfo;
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

export async function saveTargetConfigToApi(
  config: TargetConfig,
): Promise<TargetConfigPersistence | undefined> {
  const response = await fetch(`${apiBase()}/api/target-config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Target config save returned ${response.status}`);
  }
  const body = (await response.json()) as Partial<TargetConfig> & {
    _persistence?: TargetConfigPersistence;
  };
  return body._persistence;
}
