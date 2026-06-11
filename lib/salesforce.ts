const DEFAULT_INSTANCE = "https://bolt-eu.lightning.force.com";

export function salesforceAccountUrl(
  accountId: string | undefined,
  instanceUrl = DEFAULT_INSTANCE,
): string | null {
  if (!accountId) return null;
  const base = instanceUrl.replace(/\/$/, "");
  return `${base}/lightning/r/Account/${accountId}/view`;
}

export function salesforceOpportunityUrl(
  opportunityId: string | undefined,
  instanceUrl = DEFAULT_INSTANCE,
): string | null {
  if (!opportunityId) return null;
  const base = instanceUrl.replace(/\/$/, "");
  return `${base}/lightning/r/Opportunity/${opportunityId}/view`;
}

export function salesforceCaseUrl(
  caseId: string | undefined,
  instanceUrl = DEFAULT_INSTANCE,
): string | null {
  if (!caseId) return null;
  const base = instanceUrl.replace(/\/$/, "");
  return `${base}/lightning/r/Case/${caseId}/view`;
}

export function accountsFilterUrl(params: {
  stage?: string;
  owner?: string;
  ownerId?: string;
}): string {
  const search = new URLSearchParams();
  if (params.stage) search.set("stage", params.stage);
  if (params.ownerId) search.set("owner", params.ownerId);
  else if (params.owner) search.set("ownerName", params.owner);
  const q = search.toString();
  return q ? `/accounts?${q}` : "/accounts";
}
