# Friday gaps: Account Management and My Pipeline architecture

Status: architecture only. This document covers Friday items 1.2 and 1.3. It does not implement a Salesforce write path or duplicate the performance-management work in Dashy SPM.

## Decision

Classic Dashy is the home for:

- 1.2 Account Management merchant outlier scatter.
- 1.3 A My Pipeline AOS column, after the Salesforce field is confirmed.
- 1.3 B team/individual pipeline funnel.
- 1.3 C starred deals, as a separate authenticated Salesforce integration project.

Dashy SPM remains country-scoped performance management. Its slim `scoreboard.json` must not gain account or opportunity dumps.

## Existing system and reusable fields

Classic Dashy is a cache-built application, not a live Salesforce client:

```text
Salesforce + Databricks MCP pulls
  -> scripts/.cache/*.json
  -> build scripts
  -> data/dashboard.json
  -> precomputed /api/dashboard/* assets
  -> Next.js UI
```

The relevant boundaries are:

- `lib/accounts-performance-build.mjs`: assembles one provider row from the YTD activation universe, monthly Databricks facts, quality facts, and Salesforce commission/segment caches.
- `scripts/build-accounts-performance.mjs`: writes `accountsPerformance`, including the per-account array used by the Account Management UI.
- `components/AccountsPerformanceShell.tsx` and `AccountsPerformanceTable.tsx`: apply the existing trailing-window, month, segment, and rep filters and render the account row.
- `scripts/build-my-pipeline.mjs`: builds open leads, opportunities, and distinct accounts. Working opportunities are complete; New Opportunity and Lead lists are capped, while `mp-totals.json` carries exact counts.
- `components/MyPipelineShell.tsx`: renders the current stage/list filters and Salesforce links.
- `scripts/build-dashboard-data.mjs`: maps `sf-pipeline-stage-counts.json` into the aggregate sales/onboarding snapshot.

Existing metric and stage fields:

| Concept | Existing contract | Source and meaning |
| --- | --- | --- |
| Orders | `account.monthly[].orders`, `account.totalOrders` | Databricks `fact_provider_monthly.delivered_orders_count`; monthly or launch-to-date sum |
| AOV | `account.monthly[].aov`, `account.aov` | Gross GMV before discounts divided by delivered orders; not AOS |
| Commission % | `account.commissionPct` | `Opportunity.Commission__c` when present, otherwise Databricks actual commission / gross GMV; `commissionSource` preserves provenance |
| Open opportunity stage | `myPipeline.items[].rawStage` / `stage` | Salesforce `Opportunity.StageName` for the included pre-win stages |
| Exact per-rep stage inventory | `scripts/.cache/mp-totals.json` | Salesforce `GROUP BY OwnerId, StageName`; currently consumed for totals but the per-stage map is not emitted |
| Aggregate all-RO stage inventory | `salesPipeline.snapshot` | `sf-pipeline-stage-counts.json`, grouped only by `StageName`; includes sales and onboarding stages |

All proposed contracts keep nulls as nulls. Builders must not synthesize merchant metrics.

## 1.2 Account Management merchant scatter

### Metric window

The scatter belongs on the existing Account Management / Accounts performance page and follows its filters. To avoid tenure bias, its default comparison is the selected calendar month, initially `accountsPerformance.dataMonthMax`, not launch-to-date:

- X: `account.monthly[month].orders`.
- Y: `account.monthly[month].aov`.
- Size: `account.commissionPct`.

An account without a row for the selected month is omitted with an `excluded.missingMonth` count. An account with zero delivered orders may be shown at `orders=0`, `aov=null`; the builder must not convert missing AOV to zero. An account with `commissionPct=null` uses a fixed “commission unavailable” marker in the UI and remains null in the API.

If product later asks for launch-to-date, expose it as an explicit `period=launch_to_date` option using `totalOrders` and `aov`; never silently mix the two windows.

### Read contract

Prefer a dedicated authenticated route so server-side scope can be added without exposing the full account array:

```ts
type AccountScatterResponse = {
  generatedAt: string;
  countryCode: "RO";
  period: { kind: "month"; month: string };
  filters: {
    ownerId: string | null;
    segment: "complex" | "density" | null;
  };
  points: Array<{
    accountKey: string; // existing provider id
    accountName: string;
    ownerId: string;
    ownerName: string;
    segment: "complex" | "density";
    city: string | null;
    orders: number;
    aovEur: number | null;
    commissionPct: number | null;
    commissionSource: "salesforce" | "databricks" | null;
    rowHref: string;
  }>;
  excluded: {
    missingMonth: number;
    missingAov: number;
    missingCommission: number;
  };
};
```

Route shape:

```text
GET /api/account-management/scatter?country=RO&month=YYYY-MM&ownerId=<sf-owner-id>&segment=complex|density
```

Implementation source is the existing assembled `accountsPerformance.accounts`; no new merchant query is required. Validate `month` against available months and `ownerId` against the viewer’s allowed owner IDs. Return `400` for invalid filters and an empty scoped result, not a broader fallback, for an allowed viewer with no matching rows.

### UI contract

- Reuse the existing month and rep/segment controls; country is fixed to RO until another country has a confirmed account-performance cache.
- Render an accessible SVG/canvas scatter with tooltip: merchant, owner, city, orders, gross AOV, commission %, and source.
- Use a bounded visual radius (for example a square-root scale) while the tooltip displays the exact percentage. The radius scale is presentation only; it must not alter the returned metric.
- Include legends for gross AOV and commission provenance. A null commission marker must be visually distinct from 0%.
- Clicking a point navigates to `rowHref`, defined as `/accounts-performance?account=<provider-id>&month=<YYYY-MM>`.
- The existing table reads those query parameters, applies the same month/rep scope, expands the matching existing row, and scrolls/focuses it. The provider id is already the stable `account.id`; no fuzzy name matching is allowed.

### RBAC

Classic Dashy currently has no viewer identity or row-level authorization. Before exposing this account-level route beyond the current trusted audience:

1. Add an Express identity middleware that accepts only Boltable’s authenticated `X-User-Email` header in production.
2. Generate a versioned local owner-scope artifact during refresh from confirmed Salesforce/Workday identity data; do not invent email-to-owner mappings.
3. Enforce scopes server-side: IC = own owner id; TL = confirmed report owner ids; country leadership = RO roster; central/admin = configured scope.
4. Use `Cache-Control: private, no-store` for scoped responses. Do not serve scoped account arrays as public precomputed static assets.

UI filters are not authorization. A disallowed `ownerId` must return `403`, even if the browser manually supplies it.

## 1.3 A: AOS column

### Field finding

No AOS-like Salesforce field is named in the repository’s existing SOQL, cache manifests, builders, or cached contracts. The existing `aov` is a post-activation Databricks metric and must not be relabelled as pre-sale AOS.

**Status: blocked on field confirmation.** Salesforce schema discovery was attempted during this architecture pass but did not return a usable schema response. A Salesforce admin/data owner must confirm:

- object (`Opportunity` preferred if the value is deal-specific, otherwise the documented relationship);
- exact API field name;
- label and business definition;
- numeric unit and currency behavior;
- whether the field is populated for all My Pipeline record types/stages.

### Placeholder column contract

Until the field is named, the contract is deliberately nullable and carries provenance:

```ts
type PipelineAos = {
  value: number | null;
  currency: string | null;
  sourceField: string | null;
  status: "available" | "blocked_on_field_confirmation" | "not_applicable";
};
```

Add `aos: PipelineAos` to opportunity items only. Leads and synthetic distinct-account rows use `status: "not_applicable"` unless the confirmed schema defines otherwise.

After confirmation:

1. Add the exact field to `MP_OPP_FIELDS` in `scripts/gen-all-cache-queries.mjs` for both `mp-opps-working.json` and `mp-opps-newopp.json`.
2. Refresh those caches, map the value without coercing missing values to zero in `scripts/build-my-pipeline.mjs`, and add the typed view field.
3. Render a sortable “AOS” column with currency and an em dash for null.
4. Add a fixture/test proving null preservation and the confirmed source field.

## 1.3 B: team versus individual funnel

The existing `sf-pipeline-stage-counts.json` and `salesPipeline.snapshot` are enough for the current all-RO aggregate funnel only. They cannot power an individual view because they have no `OwnerId`; they may also include owners outside the 12-rep My Pipeline roster.

No new Salesforce query is required for the requested My Pipeline funnel. `mp-totals.json` already contains authoritative `OwnerId + StageName` counts. The build currently discards those per-stage values when it emits each agent summary, so add one small derived JSON block:

```ts
type MyPipelineFunnel = {
  basis: "open_inventory";
  stageOrder: [
    "New Opportunity",
    "Reachout",
    "Contacting DCM",
    "First Pitch",
    "Negotiations",
    "Contract sent",
  ];
  team: Array<{ stage: string; count: number }>;
  agents: Record<string, Array<{ stage: string; count: number }>>;
};
```

Attach it as `salesPipeline.myPipeline.funnel`. Build `team` by summing the allowed roster agents from `mp-totals.opps`; build `agents` directly from each exact stage map. Emit explicit zeroes for stages absent from an otherwise present owner map so the ordered funnel is stable. Do not derive this from capped `myPipeline.items` or the `sf-pipeline-open.json LIMIT 500` sample.

The UI reuses the existing agent selector:

- All team / segment filter: sum only owners in the selected scope.
- Individual filter: use that owner’s exact stage array.
- Label the visual “Open pipeline inventory by current stage,” not conversion funnel. These are current stock counts, not a cohort conversion rate.
- Keep open Lead count as a separate top-of-funnel badge unless a future confirmed lead-to-opportunity cohort contract is built. Do not imply conversion by placing unrelated Lead inventory in the opportunity funnel.

If product accepts the existing aggregate snapshot as sufficient after review, stop there and do not add duplicate funnel UI.

## 1.3 C: starred deals written to Salesforce

This is a separate security/integration project. Do not implement it as a mutation of `data/dashboard.json`, S3 dashboard assets, runtime prefs, or Dashy SPM.

### Required platform decisions

- **Authentication:** Boltable SSO identity from `X-User-Email`; never a query parameter.
- **Salesforce credential:** a dedicated least-privilege integration user and OAuth client using a server-side refresh-token/JWT flow and managed secret storage. Never put tokens in the repo, browser, JSON payload, or S3 dashboard bucket.
- **Write target:** a Salesforce admin must confirm/create the deal-level Opportunity field or related priority object. Architecture placeholder: `Opportunity.<confirmed_priority_field>`. Do not guess an API name and do not write Account-level state for a deal-specific star.
- **Permissions:** integration user can read owner/field and update only the confirmed priority field on allowed Opportunity record types.
- **Audit:** immutable event with request id, actor email, actor role/scope, opportunity id, previous value, requested value, Salesforce result id/timestamp, and failure reason. Enable Salesforce field history on the confirmed field where available; retain an application audit copy in a dedicated durable store, not dashboard JSON.

### Write contract and sequence

```text
Browser star click
  -> PUT /api/pipeline/opportunities/:id/star { starred: boolean, requestId: UUID }
  -> SSO identity + CSRF/origin validation
  -> server checks IC owns opportunity OR TL/leader scope includes owner
  -> server verifies current Salesforce owner/record type and updates only confirmed field
  -> append audit event
  -> 200 { accepted: true, salesforceUpdatedAt }
  -> next normal cache refresh reads confirmed field into mp-opps-* caches
  -> rebuilt My Pipeline JSON becomes the read source of truth
```

Use `If-Match`/last-modified conflict protection if supported by the selected Salesforce API. The API is idempotent by `requestId`. A failed Salesforce write must return failure and must not make the dashboard JSON appear starred. The browser may show a short-lived “pending refresh” state after success, but the next cache refresh is authoritative.

RBAC rules:

- IC may star only an opportunity currently owned by that IC.
- TL may star only opportunities owned by confirmed reports.
- Country leadership/central/admin follow their confirmed server-side scope.
- Unknown identities, stale ownership mismatches, Leads, and synthetic account rows are rejected.

### Why this cannot use the current JSON runtime

The current runtime is designed for read-only, cache-built Salesforce data. Precomputed JSON has no safe credential boundary, no current ownership check, no row-level write authorization, no concurrency control, and no durable write audit. S3 dashboard publishing updates snapshots; it does not update Salesforce. Adding a token or direct browser call would expose privileged credentials and allow forged writes.

## Module boundaries for later implementation

Keep source, contract, authorization, and presentation separate:

```text
lib/account-scatter.(mjs|ts)
  pure mapping/filtering from assembled account rows; no I/O

lib/pipeline-funnel.(mjs|ts)
  pure ordered aggregation from exact mp-totals stage maps; no I/O

scripts/build-accounts-performance.mjs
scripts/build-my-pipeline.mjs
  cache ingestion and durable read-model assembly

src/auth/viewer-scope.ts
  production identity and owner/country authorization

src/routes/accountManagement.ts
  scoped read route; private/no-store

src/integrations/salesforcePriority.ts
  future OAuth write adapter only; no UI or dashboard JSON concerns

components/AccountScatter.tsx
components/MyPipelineFunnel.tsx
  presentation and navigation only
```

Pure helpers should receive explicit data and return deterministic values. Add unit tests for null metric preservation, exact stage summing, stage order/zero fill, disallowed owner scope, and account-row deep links.

## Delivery sequence and gates

1. **1.2 scatter:** add pure mapper/tests, scoped read contract, scatter UI, and existing-row deep link. Gate on confirmed viewer scope before broad account-level release.
2. **1.3 A AOS:** only after the exact Salesforce field and semantics are named. Refresh caches and preserve null/provenance.
3. **1.3 B funnel:** review the existing aggregate snapshot first. If an individual view is still needed, emit the small exact `myPipeline.funnel` block from `mp-totals`; no new pull.
4. **1.3 C star-to-Salesforce:** run as a separate security project with OAuth, least privilege, server-side RBAC, conflict handling, and audit.

## Explicit non-goals

- No Salesforce write-back in this architecture task.
- No AOS values or field names inferred from AOV, Amount, or other similarly named fields.
- No invented merchant metrics, people, owner mappings, or missing zeroes.
- No raw account/opportunity payloads in Dashy SPM `scoreboard.json`.
- No global/multi-country account view until each country has confirmed sources and identity scope.
- No conversion-rate claims from current stage inventory.
- No browser-held Salesforce token, query-parameter identity, or UI-only authorization.
