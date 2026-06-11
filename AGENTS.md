# AGENTS.md — dashy data refresh

This app does **not** call Salesforce or Looker at runtime. You (the Cursor agent) fetch live data via MCP, optionally upload to Google Sheet via Bolt MCP, and write `data/dashboard.json`.

## Workflow

1. Query **Salesforce MCP** for pipeline, Won, Activated, accounts, opportunities.
2. Read **Google Sheet** hitlist via Bolt MCP (`read_sheet_values`) — spreadsheet `1IW8IxEs-YCsYMlCeTfkIz-b51eStjR5uUIEpkV1akRE`.
3. Map results to `data/dashboard.json` using `data/dashboard.schema.json`.
4. Set `updatedAt` to the current ISO timestamp.
5. Commit `data/dashboard.json` and push — Paketo redeploys dashy on Boltable.

Optional: publish full JSON to Google Sheet and set `DASHBOARD_SHEET_URL` on Boltable instead of repo file.

## CRITICAL: Won ≠ Activated

- **Won** = commercial deal closed (Closed Won in Salesforce)
- **Activated** = account live on platform (post-onboarding)

Never merge these metrics. Every section must keep them separate.

## Google Sheet reference

Spreadsheet: `1IW8IxEs-YCsYMlCeTfkIz-b51eStjR5uUIEpkV1akRE`

| Tab | gid | Use |
|-----|-----|-----|
| Complex | 0 | Main hitlist + SF Account ID matching |
| Complex Weekly Tracker | 1867642108 | Complex weekly production |
| Density Weekly Tracker | 1176091036 | Density weekly targets |

## Salesforce queries (examples)

### Pipeline stage counts

```sql
SELECT StageName, COUNT(Id) cnt
FROM Opportunity
WHERE RecordType.Name LIKE '%URads%'
GROUP BY StageName
```

Map to `salesPipeline.snapshot.sales` stages:

New opp → Contacting → 1st pitch → Nego → Contract sent → Signed/onb checklist → Won

### Won YTD total

```sql
SELECT COUNT(Id) FROM Opportunity
WHERE IsWon = true AND CloseDate = THIS_YEAR
```

### Activated accounts (adjust to your SF field)

```sql
SELECT COUNT(Id) FROM Account
WHERE Activated__c = true AND Activation_Date__c = THIS_YEAR
```

### Recent Won accounts

```sql
SELECT Id, Name, BillingCity, Owner.Name, CloseDate
FROM Opportunity
WHERE IsWon = true
ORDER BY CloseDate DESC LIMIT 20
```

Map to `salesPipeline.accounts.won`.

### Hitlist cross-check

1. Read Complex tab via Bolt MCP.
2. Match rows to SF opportunities by Account ID or company name.
3. Write to `salesPipeline.hitlist` with `segment: "complex"` or `"density"`.

## JSON sections

| Path | Description |
|------|-------------|
| `salesPipeline.totals.won` | Cumulative Won count + change |
| `salesPipeline.totals.activated` | Cumulative Activated count + change |
| `salesPipeline.snapshot.sales` | Sales funnel stage counts |
| `salesPipeline.snapshot.onboarding` | Onb → Ready TA → Activated |
| `salesPipeline.mtdAchievement` | MTD targets vs actuals + tier breakdown |
| `salesPipeline.weeklyPerformance` | Current week metrics + 5-week history |
| `salesPipeline.wowReports` | Pre-configured WoW comparison tables |
| `salesPipeline.accounts` | won / activated / backlog tabs |
| `salesPipeline.hitlist` | Priority list from sheet + SF |

## Verify locally

```bash
npm run build:boltable
npm run start:server
curl http://localhost:8080/api/dashboard | jq '.totals.won.value'
```

## Do not

- Add login/logout or auth flows.
- Require `SALESFORCE_*` or `LOOKER_*` env vars on Boltable.
- Merge Won and Activated into a single metric.
