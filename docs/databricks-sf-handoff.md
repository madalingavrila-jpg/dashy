# Dashy: Salesforce caches via Databricks (Food SF Fivetran)

**Handoff for Claude / Cursor agents** — automate Batch A/B Salesforce cache pulls using Databricks instead of (or as fallback beside) Salesforce MCP.

**Repo:** `boltable/dashy` (local: dashy workspace)  
**Validated:** 2026-08-06  
**Related docs:** `AGENTS.md`, `.cursor/rules/slack-notifications.mdc`, `scripts/gen-all-cache-queries.mjs`, `lib/agent-segments.mjs`

---

## 1. Goal

Replace Salesforce MCP SOQL pulls for dashy CRM caches with **Databricks SQL** against the Food Salesforce Fivetran mirror, then keep the existing build/deploy pipeline unchanged:

```bash
# after caches are written:
node scripts/fetch-sf-stage-history.mjs --kind=all   # if still using monthly chunks
npm run refresh-all                                  # rebuild all dashboard sections
npm run build                                        # verify + precompute API
# commit + push boltable/main
# Slack DM Bianca U01AHG4UAPR (standing exception — see AGENTS.md)
```

**Why:** SF MCP has a ~2,000-row SOQL cap (silent truncation risk) and needs interactive OAuth. Databricks already has a full Fivetran sync and can return full-year Won / stage-history without chunking (subject to Databricks MCP row caps ~10k — chunk if needed).

---

## 2. Sources — what to use / ignore

| Source | Path | Use for dashy? |
|--------|------|----------------|
| **Databricks Food SF** | `main.fivetran_salesforcefood` | **YES — primary for CRM caches** |
| Databricks Delivery | `main.ng_delivery` | Already used for accounts-performance (Batch C). Keep as-is. |
| Databricks Rides SF | `main.salesforce`, `main.ng_fivetran_salesforce_rides` | **NO** — wrong Salesforce org |
| Looker `curated` model | Looker MCP | **NO** — rides/delivery marts only; no Food Opportunity/Account explores |
| Salesforce MCP | `user-Salesforce` → `soqlQuery` | Parity checks + optional same-day fallback |
| Databricks MCP | `user-mcp-databricks-bolt` → `execute_query` / `execute_sql` | Pull Food SF + ng_delivery |

### Key tables in `main.fivetran_salesforcefood`

| Table | Dashy use |
|-------|-----------|
| `opportunity` | Won, pipeline, MyPipeline, weekly opps |
| `account` | `provider_first_active_date_c`, `reactivated_date_c`, billing city |
| `opportunity_field_history` | Stage transitions (Qualified / Negotiations / Activated dating) |
| `user` | Owner names |
| `record_type` | `Sales Opportunity`, `Reactivation`, etc. |
| `case` | MOPS cases |

Always filter: `COALESCE(_fivetran_deleted, false) = false`. Prefer also `COALESCE(is_deleted, false) = false` on Opportunity/Account.

---

## 3. Accuracy test results (2026-08-06)

Compared live Salesforce MCP vs Databricks `main.fivetran_salesforcefood` for the **12 Romania team reps**.

### Exact matches (closed / stable)

| Metric | Salesforce | Databricks | Diff |
|--------|----------:|-----------:|-----:|
| Won July (Sales Opportunity, `Won_Date__c`) | 171 | 171 | 0 |
| Activated July (opp-rows with account first-active in July) | 176 | 176 | 0 |
| Activated Aug opp-rows | 12 | 12 | 0 |
| StageName field-history July (team owners) | 1,248 | 1,248 | 0 |

### Same-day lag (current month Won MTD)

| Source | Count |
|--------|------:|
| Salesforce | **18** |
| Databricks | **17** |

**Only missing ID:** `006Qs00000l42rOIAQ` — Albert Doner (Georgian), `Won_Date__c = 2026-08-06`.  
SF last modified ~**12:10 UTC**; Fivetran opportunity sync last at ~**08:43 UTC**. Other 17 Won MTD IDs matched 1:1.

Per-rep Won MTD: only Georgian differed (SF 5 vs DB 4).

### Team open-pipeline stages (close, not exact)

| Stage | SF | DB | Δ |
|-------|---:|---:|--:|
| Activated | 4094 | 4095 | +1 |
| New Opportunity | 1847 | 1854 | +7 |
| Negotiations | 392 | 395 | +3 |
| Contract sent | 217 | 215 | −2 |
| Closed Won | 24 | 25 | +1 |
| Ready to Activate | 26 | 24 | −2 |
| First Pitch | 11 | 9 | −2 |
| Closed Lost | 9304 | 11377 | +2073 |

Open-stage deltas are small. Closed Lost gap is larger (likely SF MCP sharing limits vs full Fivetran dump). Org-wide unscoped stage counts: SF MCP undercounts heavily vs lake — for dashy snapshot, either keep SF MCP semantics or accept Databricks as more complete.

### Freshness snapshot that day

| Table | `MAX(_fivetran_synced)` |
|-------|-------------------------|
| opportunity | 2026-08-06T08:43:36Z |
| account | 2026-08-06T08:48:02Z |
| opportunity_field_history | 2026-08-06T08:43:35Z |

**Rule of thumb:**
- Closed months / stable fields → Databricks is **exact**.
- Same-day current month → expect **hours of lag**.
- Optional hybrid: if sync older than N hours, fall back to SF MCP for `sf-won-mtd` + current-month stage-history only.

---

## 4. Field / object mapping (SOQL → Databricks)

Custom fields `__c` → snake_case `_c`.

| Salesforce | Databricks |
|------------|------------|
| `Opportunity` | `main.fivetran_salesforcefood.opportunity` `o` |
| `Account` | `main.fivetran_salesforcefood.account` `a` |
| `OpportunityFieldHistory` | `main.fivetran_salesforcefood.opportunity_field_history` `ofh` |
| `User` | `main.fivetran_salesforcefood.user` `u` |
| `RecordType` | `main.fivetran_salesforcefood.record_type` `rt` |
| `Case` | `main.fivetran_salesforcefood.case` |
| `Won_Date__c` | `o.won_date_c` |
| `Account.provider_first_active_date__c` | `a.provider_first_active_date_c` |
| `Account.Reactivated_Date__c` | `a.reactivated_date_c` |
| `Account.BillingCity` | `a.billing_city` |
| `OwnerId` / `Owner.Name` | `o.owner_id` / `u.name` |
| `RecordType.Name` | `rt.name` (join on `o.record_type_id = rt.id`) |
| `StageName` | `o.stage_name` |
| `IsWon` / `IsClosed` | `o.is_won` / `o.is_closed` |
| `Id` | `id` (same SF 15/18-char IDs) |
| `Field` / `OldValue` / `NewValue` / `CreatedDate` (history) | `ofh.field`, `ofh.old_value`, `ofh.new_value`, `ofh.created_date` |

Nested SOQL relationship fields (`Owner.Name`, `Account.Name`, `RecordType.Name`) must be JOINed in SQL, then **reshaped into SF MCP-like JSON** so existing `build-*.mjs` readers stay unchanged. Inspect files under `scripts/.cache/` for exact shapes.

---

## 5. Owner ID constants (never invent)

From `lib/agent-segments.mjs`.

### 12 team reps (`TEAM_IDS`)

```
'005Ts0000060ICnIAM',  -- Madalin (Ionut-Mădălin Gavrilă) — Complex
'005Qs00000Mxc6EIAR',  -- Paul (Paul-Daniel Rîngheanu) — Complex
'005Ts000005c4hFIAQ',  -- Corne (Corneliu-Ștefan Radu) — Complex
'005Qs00000Pr1HKIAZ',  -- Vlad Popa (Vlad-Bogdan Popa) — Complex
'005Qs00000N2Hh3IAF',  -- Andrei Patru (Andrei-Georgian Pătru) — Complex
'005Ts000002AX4nIAG',  -- Ciprian (Ciprian Teodorescu) — Density
'005Ts00000BtGPDIA3',  -- Daniel Boboc (Daniel-Alexandru Boboc) — Density
'005Ts00000BtX53IAF',  -- Daniel Toltică (Daniel-Marian Toltică) — Density
'005Ts000002AWIQIA4',  -- Eusebiu (Eusebiu Hanganu) — Density
'005Ts00000BtZV3IAN',  -- Georgian (Borcaeas Georgian) — Density
'005Ts000001Ak10IAC',  -- Mihnea (Silviu-Mihnea Voicu) — Density
'005Ts000006V3vpIAC'   -- Oroles (Oroles Roșu) — Density
```

### Inbound (2 reps — never mix into team caches)

```
'005Ts00000BtHpvIAF',  -- Ana-Maria Preda
'005Qs00000OLyBRIA1'   -- Catalin Corbeanu
```

### Excluded (do not show in team roster)

```
'005Ts000005XKgEIAW',  -- Andrei-Sebastian Caba
'005Ts00000FjJkDIAV',  -- Teodor Domnica
'0057Q000004SL7qQAG'   -- Cezar-Mihai Voicu
```

Tracking year is dynamic (Europe/Bucharest) — currently **2026**. Derive from today; override with `WEEKLY_TRACKING_YEAR` only for backfills.

---

## 6. Critical business rules (do not break)

1. **Won ≠ Activated** — never merge. `verify-build.mjs` asserts totals differ.
2. **Won** = `won_date_c` on RecordType `Sales Opportunity` — **no StageName filter**.
3. **Activated** = `Account.provider_first_active_date_c` (account-level), attributed via primary won Sales Opp owner; plus reactivation path for accounts first-active **before** tracking year with a tracking-year won Sales Opp **or** RecordType `Reactivation`. See `AGENTS.md` / `lib/mtd-history.mjs`.
4. Do **not** use `Account.Activation_Date__c` as primary Activated signal.
5. Cache JSON must pass `scripts/validate-caches.mjs` and `npm run build`.
6. After successful refresh + deploy: Slack DM Bianca `U01AHG4UAPR` only (no email for recurring notify). Template in `.cursor/rules/slack-notifications.mdc`.

---

## 7. Cache inventory — what to move to Databricks

Canonical manifest:

```bash
node scripts/gen-all-cache-queries.mjs          # human-readable
node scripts/gen-all-cache-queries.mjs --json   # machine-readable
```

### Prefer Databricks (Batch A — team)

| Cache file | Purpose |
|------------|---------|
| `sf-won-mtd.json` | Won MTD per-rep |
| `sf-won-ytd-bydate.json` | Full-year Won_Date (no SF 2k cap in DB) |
| `sf-won-recent.json` | Recent Activated (LIMIT 100) |
| `sf-pipeline-open.json` | Open pipeline sample (LIMIT 500) |
| `sf-pipeline-stage-counts.json` | Overview funnel GROUP BY StageName |
| `sf-account-activation-YYYY.json` | Activated universe |
| `sf-reactivation-YYYY.json` | Reactivation candidates |
| `sf-stage-history-YYYY-MM.json` | Monthly stage history (or full-year then merge) |
| `sf-weekly-YYYY-MM.json` | Weekly opp export chunks |

### Prefer Databricks (Batch B — inbound / MOPS / MyPipeline)

| Cache file | Purpose |
|------------|---------|
| `sf-inbound-won-mtd.json` | Inbound Won MTD |
| `sf-inbound-won-ytd-bydate.json` | Inbound Won YTD |
| `sf-inbound-weekly-YYYY.json` | Inbound weekly |
| `sf-inbound-account-activation-YYYY.json` | Inbound Activated |
| `sf-inbound-reactivation-YYYY.json` | Inbound reactivation |
| `sf-inbound-stage-history-YYYY-MM.json` | Inbound stage history |
| `mp-opps-working.json`, `mp-opps-newopp.json`, `mp-leads.json` | MyPipeline |
| `sf-mops-cases.json`, `sf-mops-onboarding.json` | MOPS |

### Keep as-is (already Databricks)

| Cache file | Source |
|------------|--------|
| `accounts-perf-accounts.json` | `main.ng_delivery.dim_provider_*` |
| `accounts-perf-prov-opp.json` | same |
| `accounts-perf-monthly.json` / `quality.json` | same (C2 after C1) |

Commission/segment SF pulls that today use SOQL IN-lists of opp IDs can also move to Food SF once Batch A lands.

---

## 8. Example SQL + JSON reshape

### 8.1 Won MTD

```sql
SELECT
  o.id,
  o.name,
  o.stage_name,
  o.is_won,
  CAST(o.close_date AS STRING) AS close_date,
  CAST(o.won_date_c AS STRING) AS won_date_c,
  o.owner_id,
  u.name AS owner_name,
  rt.name AS record_type_name,
  o.account_id,
  a.name AS account_name,
  a.billing_city
FROM main.fivetran_salesforcefood.opportunity o
JOIN main.fivetran_salesforcefood.record_type rt ON o.record_type_id = rt.id
LEFT JOIN main.fivetran_salesforcefood.user u ON o.owner_id = u.id
LEFT JOIN main.fivetran_salesforcefood.account a ON o.account_id = a.id
WHERE COALESCE(o._fivetran_deleted, false) = false
  AND COALESCE(o.is_deleted, false) = false
  AND rt.name = 'Sales Opportunity'
  AND o.won_date_c >= date_trunc('month', current_date())
  AND o.won_date_c <  date_trunc('month', current_date()) + INTERVAL 1 MONTH
  AND o.owner_id IN (
    '005Ts0000060ICnIAM','005Qs00000Mxc6EIAR','005Ts000005c4hFIAQ',
    '005Qs00000Pr1HKIAZ','005Qs00000N2Hh3IAF','005Ts000002AX4nIAG',
    '005Ts00000BtGPDIA3','005Ts00000BtX53IAF','005Ts000002AWIQIA4',
    '005Ts00000BtZV3IAN','005Ts000001Ak10IAC','005Ts000006V3vpIAC'
  )
ORDER BY o.won_date_c DESC, o.id
```

### 8.2 Target JSON shape (match SF MCP caches)

```json
{
  "totalSize": 17,
  "done": true,
  "records": [
    {
      "attributes": { "type": "Opportunity" },
      "Id": "006Qs00000krRu2IAE",
      "Name": "La Campionu Fast Food",
      "StageName": "...",
      "IsWon": true,
      "CloseDate": "2026-08-06",
      "Won_Date__c": "2026-08-06",
      "OwnerId": "005Ts00000BtZV3IAN",
      "Owner": { "Name": "Borcaeas Georgian" },
      "RecordType": { "Name": "Sales Opportunity" },
      "AccountId": "...",
      "Account": { "Name": "...", "BillingCity": "..." }
    }
  ]
}
```

Some caches also store `_query` / `_note` header fields — preserve if present in existing files.

### 8.3 Stage history (full year — no SF 2k cap)

```sql
SELECT
  ofh.opportunity_id,
  ofh.field,
  ofh.old_value,
  ofh.new_value,
  ofh.created_date,
  o.owner_id,
  u.name AS owner_name,
  rt.name AS record_type_name,
  o.account_id,
  a.name AS account_name,
  a.billing_city,
  o.name AS opportunity_name,
  o.stage_name
FROM main.fivetran_salesforcefood.opportunity_field_history ofh
JOIN main.fivetran_salesforcefood.opportunity o ON ofh.opportunity_id = o.id
JOIN main.fivetran_salesforcefood.record_type rt ON o.record_type_id = rt.id
LEFT JOIN main.fivetran_salesforcefood.user u ON o.owner_id = u.id
LEFT JOIN main.fivetran_salesforcefood.account a ON o.account_id = a.id
WHERE COALESCE(ofh._fivetran_deleted, false) = false
  AND ofh.field = 'StageName'
  AND ofh.created_date >= '2026-01-01'
  AND ofh.created_date <  '2027-01-01'
  AND o.owner_id IN ( /* TEAM_IDS — see section 5 */ )
ORDER BY ofh.created_date ASC
```

If Databricks MCP returns a row cap (~10k), chunk by month (same as today's SF incremental flow), write `sf-stage-history-YYYY-MM.json`, then:

```bash
node scripts/fetch-sf-stage-history.mjs --kind=all
```

### 8.4 Activated export (team)

Pattern: join Opportunity ↔ Account ↔ RecordType; filter `rt.name = 'Sales Opportunity'`, `a.provider_first_active_date_c >= '{year}-01-01'`, team `owner_id IN (...)`. Exact SOQL lives in:

```bash
node scripts/gen-activation-queries.mjs --kind=team
node scripts/gen-activation-queries.mjs --kind=team-reactivation
node scripts/gen-activation-queries.mjs --kind=inbound
node scripts/gen-activation-queries.mjs --kind=inbound-reactivation
```

Translate those SOQL fields 1:1 via the mapping table in §4.

---

## 9. Implementation status (shipped)

Automated path is implemented:

| Artifact | Role |
|----------|------|
| `lib/databricks-sql.mjs` | Databricks SQL Statement API client (paginated) |
| `scripts/pull-all-caches-databricks.mjs` | Pulls Batch A/B/C into `scripts/.cache/` |
| `npm run data:pull-databricks` | npm alias for the pull script |
| `.github/workflows/dashy-data-refresh.yml` | GH Action worker (pull → build → push → Slack Bianca) |
| `docs/n8n-dashy-refresh.workflow.json` | n8n schedule + GitHub dispatch (import) |
| `docs/n8n-dashy-refresh-error.workflow.json` | n8n error → DM Madalin |
| `scripts/refresh-and-deploy.sh` | Local/manual Databricks refresh + push |

### Connectors

- **Nightly:** Databricks SQL API (token in GH secrets) — no MCP
- **Ad-hoc / parity:** Cursor `user-mcp-databricks-bolt` + `user-Salesforce`
- Looker MCP → not for this CRM path

---

## 10. End-to-end refresh after caches land

```bash
npm run data:pull-databricks
node scripts/fetch-sf-stage-history.mjs --kind=all
npm run refresh-all
npm run build
# commit data/dashboard.json + data/mtd-details.json and push boltable/main
```

Then Slack DM Bianca (`U01AHG4UAPR`):

> Hi Bianca — dashy data refresh is done ✅ Latest SF + Databricks data is live on dashy.boltable.eu (updated `<updatedAt>`). Please check the data when you get a chance.

Replace `<updatedAt>` with `data/dashboard.json` → `updatedAt`.

---

## 11. Definition of done

- [x] Batch A/B/C regenerable from Databricks without SF MCP (`data:pull-databricks`)
- [x] GH Action workflow committed
- [x] n8n import JSON committed (activate after secrets + manual dispatch)
- [ ] Manual `workflow_dispatch` green on `boltable/dashy` (requires Actions enabled + secrets)
- [ ] n8n schedule published for 14:00 Bucharest
- [ ] Bianca receives Slack DM with correct `updatedAt`

---

## 12. Ops runbook (n8n + GitHub Actions)

### One-time setup

1. **Enable GitHub Actions** on `boltable/dashy` (currently disabled at org/repo level).
2. Add **repo secrets** on `boltable/dashy`:
   - `DATABRICKS_HOST` — e.g. `https://bolt-common.cloud.databricks.com`
   - `DATABRICKS_TOKEN` — Databricks PAT / SP token (never commit)
   - `DATABRICKS_WAREHOUSE_ID` — SQL warehouse id
   - `SLACK_BOT_TOKEN` — bot with `chat:write` that can DM Bianca (`U01AHG4UAPR`)
3. Merge this branch so `.github/workflows/dashy-data-refresh.yml` is on `main`.
4. Run a **manual** Actions dispatch of `Dashy data refresh` and confirm:
   - job green
   - `data/dashboard.json` updated on `main`
   - Bianca Slack DM received
5. In n8n (**DELIVERY-FOOD-SALES-OPS - Sales Internal**):
   - Create GitHub credential (`actions:write` + `repo` on `boltable/dashy`)
   - Create Slack credential for failure DMs to Madalin (`U07M4KBEUES`)
   - Import `docs/n8n-dashy-refresh.workflow.json` + `docs/n8n-dashy-refresh-error.workflow.json`
   - Attach credentials; set error workflow on the nightly schedule workflow
   - Timezone `Europe/Bucharest`; cron `0 14 * * *`
   - **Publish / activate only after step 4 succeeds**

### Day-2 operations

- Success path: check Actions run + dashy.boltable.eu `updatedAt`
- Failure path: n8n error workflow DMs Madalin; also check Actions logs
- Same-day live parity (optional): compare Won MTD ID set via Salesforce MCP vs Databricks
- Fivetran lag: pull aborts if opportunity `_fivetran_synced` older than 12h (`DATABRICKS_MAX_SYNC_AGE_HOURS`)

### Manual local run

```bash
export DATABRICKS_HOST=... DATABRICKS_TOKEN=... DATABRICKS_WAREHOUSE_ID=...
export SLACK_BOT_TOKEN=...   # optional
DASHY_FORCE_REFRESH=1 bash scripts/refresh-and-deploy.sh
```
