# Dashy: Salesforce caches via Databricks + automated refresh

**Handoff / ops runbook** for the nightly path: **n8n schedule → GitHub Action → Databricks SQL → rebuild → push → Slack Bianca**.

Related: `AGENTS.md`, `.github/workflows/dashy-data-refresh.yml`, `scripts/pull-all-caches-databricks.mjs`, `n8n/*.json`.

---

## Architecture

```text
n8n (14:00 Europe/Bucharest)
  └─ workflow_dispatch ──► GitHub Action dashy-data-refresh.yml
                              ├─ npm run data:pull-databricks
                              │    ├─ main.fivetran_salesforcefood  (CRM caches)
                              │    └─ main.ng_delivery              (accounts-perf)
                              ├─ fetch-sf-stage-history --kind=all
                              ├─ npm run refresh-all && npm run build
                              ├─ commit + push main  → Paketo
                              └─ Slack DM Bianca U01AHG4UAPR
```

n8n stays thin (schedule + dispatch + failure alert). Heavy work is in Actions so we avoid the Bolt Databricks n8n node **1000-row cap**.

---

## Sources

| Source | Use |
|--------|-----|
| `main.fivetran_salesforcefood` | Food Salesforce CRM (Won, Activated, history, MOPS, MyPipeline, inbound, commission/segment/status) |
| `main.ng_delivery` | accounts-perf universe / monthly / quality |
| Looker curated | Not used for CRM |
| Salesforce MCP | Optional parity / emergency only — **not** required for nightly |

Accuracy spot-check (2026-08-06): July Won / Activated / stage-history **exact** vs live SF; same-day Won MTD can lag a few hours behind Fivetran.

---

## Scripts

```bash
# Requires DATABRICKS_HOST, DATABRICKS_TOKEN, DATABRICKS_WAREHOUSE_ID
npm run data:pull-databricks
node scripts/fetch-sf-stage-history.mjs --kind=all
npm run refresh-all && npm run build

# Or one-shot local deploy helper:
./scripts/refresh-and-deploy.sh
```

Freshness gate: fails if `MAX(opportunity._fivetran_synced)` is older than `DASHY_MAX_SYNC_AGE_HOURS` (default **12**). Override with `DASHY_SKIP_FRESHNESS=1`.

---

## GitHub Action setup

Workflow: [`.github/workflows/dashy-data-refresh.yml`](../.github/workflows/dashy-data-refresh.yml)

1. **Enable Actions** on the deploy repo (`boltable/dashy` for Paketo). Personal fork Actions may also be used for testing.
2. Add repository secrets:

| Secret | Example |
|--------|---------|
| `DATABRICKS_HOST` | `https://bolt-common.cloud.databricks.com` |
| `DATABRICKS_TOKEN` | PAT / service principal token |
| `DATABRICKS_WAREHOUSE_ID` | SQL warehouse id |
| `SLACK_BOT_TOKEN` | Bot token with `chat:write` (DM Bianca) |

3. Run once: **Actions → Dashy data refresh → Run workflow** (leave `skip_freshness=false`).
4. Confirm: new commit on `main`, dashy.boltable.eu `updatedAt`, Bianca Slack DM.

Do **not** put tokens in git. Reuse the same Databricks host/warehouse as Cursor MCP.

---

## n8n setup (Sales Internal project)

Importable workflows (this repo cannot call Bolt n8n MCP from cloud agents):

| File | Purpose |
|------|---------|
| [`n8n/dashy-daily-refresh.json`](../n8n/dashy-daily-refresh.json) | Schedule 14:00 Bucharest → `workflow_dispatch` |
| [`n8n/dashy-refresh-failure-alert.json`](../n8n/dashy-refresh-failure-alert.json) | Error Trigger → Slack DM Madalin |

Steps:

1. In n8n (`n8n.automation.boltint.net`), project **DELIVERY-FOOD-SALES-OPS - Sales Internal**.
2. Import both JSON files (**Workflows → Import from File**).
3. Create **HTTP Header Auth** credentials:
   - GitHub: header `Authorization` = `Bearer <PAT>` with `repo` + `actions:write` on `boltable/dashy`.
   - Slack (failure alert): header `Authorization` = `Bearer <bot token>`.
4. Attach credentials on the HTTP Request nodes.
5. Set the daily workflow **timezone** to `Europe/Bucharest`.
6. Set the daily workflow’s **Error Workflow** to the failure-alert workflow.
7. If the Action lives on a fork, set env `DASHY_GH_DISPATCH_URL` to that repo’s dispatch URL.
8. **Do not activate** until a manual Actions run is green. Then publish the daily schedule.

Success Slack to Bianca is sent by the **GitHub Action** (has post-build `updatedAt`), not n8n.

---

## Owner IDs (never invent)

12 team + 2 inbound from `lib/agent-segments.mjs` (`TEAM_ROSTER`, `INBOUND_OWNER_IDS`). Pull script imports them.

---

## Critical business rules

- Won ≠ Activated (`Won_Date__c` vs `Account.provider_first_active_date__c` + reactivation path).
- `validate-caches.mjs` + `verify-build.mjs` must pass.
- After successful refresh+deploy: Slack DM Bianca `U01AHG4UAPR` only (no email).

---

## Definition of done

- [ ] Manual `workflow_dispatch` green on deploy repo
- [ ] Bianca DM with correct `updatedAt`
- [ ] n8n schedule published 14:00 Bucharest
- [ ] Failure path DMs Madalin
- [ ] No Salesforce MCP required for nightly
