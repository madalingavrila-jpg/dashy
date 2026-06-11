import type { DashboardModel } from "@/types/dashboard";

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
