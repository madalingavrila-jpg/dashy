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

## MTD targets (Romania reps)

Per-rep monthly targets apply to **both Won MTD and Activated MTD** separately.

| Segment | Reps | Target / rep / month |
|---------|------|----------------------|
| **Complex** | 5 named reps | **8** |
| **Density** | 7 named reps | **25** |

**Complex reps only** (match by Salesforce Owner ID or fuzzy name):

| Alias | Salesforce name | Owner ID |
|-------|-----------------|----------|
| Madalin | Ionut-Mădălin Gavrilă | `005Ts0000060ICnIAM` |
| Paul | Paul-Daniel Rîngheanu | `005Qs00000Mxc6EIAR` |
| Corne | Corneliu-Ștefan Radu | `005Ts000005c4hFIAQ` |
| Vlad Popa | Vlad-Bogdan Popa | `005Qs00000Pr1HKIAZ` |
| Andrei Patru | Andrei-Georgian Pătru | `005Qs00000N2Hh3IAF` |

**Density reps only** (from RO-Sales Planning sheet tab *Sales Individual Performance - All*):

| Alias | Salesforce name | Owner ID |
|-------|-----------------|----------|
| Ciprian | Ciprian Teodorescu | `005Ts000002AX4nIAG` |
| Daniel Boboc | Daniel-Alexandru Boboc | `005Ts00000BtGPDIA3` |
| Daniel Toltică | Daniel-Marian Toltică | `005Ts00000BtX53IAF` |
| Eusebiu | Eusebiu Hanganu | `005Ts000002AWIQIA4` |
| Georgian | Borcaeas Georgian | `005Ts00000BtZV3IAN` |
| Mihnea | Silviu-Mihnea Voicu | `005Ts000001Ak10IAC` |
| Oroles | Oroles Roșu | `005Ts000006V3vpIAC` |

**Excluded from team roster** (do not show in agents/MTD; same as `Administrator`):

| Alias | Salesforce name | Owner ID |
|-------|-----------------|----------|
| Sebastian | Andrei-Sebastian Caba | `005Ts000005XKgEIAW` |
| Teodor | Teodor Domnica | `005Ts00000FjJkDIAV` |

Only these 12 reps appear in `agents`, MTD targets, and Team Progress panels. Exclude `Administrator`, excluded reps above, and any other SF owners.

**Global MTD targets** (sum of individual per-rep targets):

```
targetWon       = complexReps × 10 + densityReps × 30
targetActivated = complexReps × 8 + densityReps × 25
```

**Segment breakdown** in `mtdAchievement.tiers` (replaces old tier targets):

- Complex / Won — target `complexReps × 10`, actual = sum of complex reps' `wonMtd`
- Density / Won — target `densityReps × 30`, actual = sum of density reps' `wonMtd`
- Complex / Activated — target `complexReps × 8`, actual = sum of `activatedMtd`
- Density / Activated — target `densityReps × 25`, actual = sum of `activatedMtd`

Each agent row must include `segment` (`complex` | `density`) and `mtdTarget` (Won per-rep: `10` or `30`).

Logic lives in `lib/agent-segments.mjs` (used by `scripts/build-dashboard-data.mjs` and `scripts/patch-mtd-targets.mjs`). Excluded reps are defined in `EXCLUDED_OWNER_IDS`.

### Won MTD per owner (Sales Opportunity)

```sql
SELECT OwnerId, Owner.Name, COUNT(Id) cnt
FROM Opportunity
WHERE RecordType.Name = 'Sales Opportunity'
  AND CloseDate = THIS_MONTH
  AND StageName IN (
    'Contract sent', 'Ready to Activate', 'Onboarding',
    'Onboarding Checklist', 'Closed Won', 'Activated'
  )
GROUP BY OwnerId, Owner.Name
ORDER BY COUNT(Id) DESC
```

### Activated MTD per owner

```sql
SELECT OwnerId, Owner.Name, COUNT(Id) cnt
FROM Opportunity
WHERE RecordType.Name = 'Sales Opportunity'
  AND CloseDate = THIS_MONTH
  AND StageName = 'Activated'
GROUP BY OwnerId, Owner.Name
ORDER BY COUNT(Id) DESC
```

Exclude `Administrator` from the agents list. Map each owner to segment, set `mtdTarget`, then call `buildMtdAchievement(agents, month, { leadsMtd, qualifiedMtd })`.

**MCP export for MTD counts** — save full query results to `scripts/.cache/sf-won-mtd.json` (all THIS_MONTH rows; do **not** use a recent-N sample):

```sql
SELECT Id, Name, StageName, CloseDate, OwnerId, Owner.Name, AccountId, Account.Name, Account.BillingCity
FROM Opportunity
WHERE RecordType.Name = 'Sales Opportunity'
  AND CloseDate = THIS_MONTH
  AND StageName IN (
    'Contract sent', 'Ready to Activate', 'Onboarding',
    'Onboarding Checklist', 'Closed Won', 'Activated'
  )
ORDER BY CloseDate DESC
```

`scripts/build-dashboard-data.mjs` reads this file for per-rep `wonMtd` / `activatedMtd` and global `mtdAchievement`.

### Weekly production (stage transition dates)

Weekly counts use **OpportunityFieldHistory** (StageName changes), not CloseDate or LastModifiedDate.

| Bucket | SF stages | Record type | Week from |
|--------|-----------|-------------|-----------|
| Qualified | New Opportunity, Contacting DCM, First Pitch | Sales + Parent Opp | first transition INTO stage |
| Negotiations | Negotiations | Sales Opportunity | first transition |
| Closed Won | Closed Won | **Parent Opportunity** | first transition |
| Active | Activated | Sales Opportunity | first transition |

Cache: `scripts/.cache/sf-stage-history-2026.json` (merge monthly exports via `scripts/fetch-sf-stage-history.mjs`).

Team owner IDs only (12 reps; excludes Teodor Domnica, Andrei-Sebastian Caba):

```sql
SELECT OpportunityId, Field, OldValue, NewValue, CreatedDate,
  Opportunity.OwnerId, Opportunity.Owner.Name, Opportunity.RecordType.Name,
  Opportunity.AccountId, Opportunity.Account.Name, Opportunity.Account.BillingCity,
  Opportunity.Name, Opportunity.StageName
FROM OpportunityFieldHistory
WHERE Field = 'StageName'
  AND CreatedDate >= 2026-01-01T00:00:00Z
  AND CreatedDate < 2026-07-01T00:00:00Z
  AND Opportunity.OwnerId IN (
    '005Ts000002AX4nIAG','005Ts00000BtGPDIA3','005Ts00000BtX53IAF',
    '005Ts000002AWIQIA4','005Ts00000BtZV3IAN','005Ts000001Ak10IAC',
    '005Ts000006V3vpIAC','005Ts0000060ICnIAM','005Qs00000Mxc6EIAR',
    '005Ts000005c4hFIAQ','005Qs00000Pr1HKIAZ','005Qs00000N2Hh3IAF'
  )
ORDER BY CreatedDate ASC
```

New Opportunity fallback: opps still in `New Opportunity` use `CreatedDate` (field history omits initial stage).

Weekly opps export (`scripts/.cache/sf-weekly-2026.json`):

```sql
SELECT Id, Name, StageName, CreatedDate, LastModifiedDate, CloseDate,
  OwnerId, Owner.Name, AccountId, Account.Name, Account.BillingCity
FROM Opportunity
WHERE RecordType.Name = 'Sales Opportunity'
  AND StageName IN ('New Opportunity','Contacting DCM','First Pitch','Negotiations','Closed Won','Activated')
  AND CreatedDate >= 2026-01-01T00:00:00Z
  AND OwnerId IN ( /* same 12 rep IDs */ )
ORDER BY CreatedDate DESC
```

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
