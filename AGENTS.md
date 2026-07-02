# AGENTS.md — dashy data refresh

This app does **not** call Salesforce or Looker at runtime. You (the Cursor agent) fetch live data via MCP, optionally upload to Google Sheet via Bolt MCP, and write `data/dashboard.json`.

## Refresh all data — one command

**`npm run refresh-all`** (aliases: `npm run data:build`, `npm run data:refresh`) is THE single
"refresh all data" task. It runs `scripts/build-all-data.mjs`, the orchestrator that rebuilds
**every** section from the cached SF + Databricks exports, in dependency order:

1. `build-dashboard-data.mjs` → Overview/MTD, Weekly, WoW, MOPS, Accounts (writes the base
   `data/dashboard.json`; merge-preserves the sections below so a standalone run never wipes them)
2. `build-my-pipeline.mjs` → `salesPipeline.myPipeline`
3. `build-accounts-performance.mjs` → `accountsPerformance` (Databricks)
4. `build-inbound-team.mjs` → `inboundTeam`
5. `build-mtd-details.mjs` → `data/mtd-details.json` (full-year per-month per-agent
 Won/Activated drill-down lists; served as the lazy `/api/dashboard/mtd-details`
 section for the Monthly Overview tab — never merged into `dashboard.json`)

It is **idempotent**: re-running refreshes all sections in place and never leaves a partial/empty
tab. `npm run build` then regenerates the precomputed API and runs `verify-build.mjs`, which **fails
loudly** if `inboundTeam.reps`, `accountsPerformance.accounts`, or `salesPipeline.myPipeline.items`
is empty, or if `totals.won == totals.activated`.

**Step 0 of the orchestrator is the cache validation gate** — `scripts/validate-caches.mjs`
checks EVERY cache in the canonical manifest (exists, parses, row count within expected
bounds, no SOQL-2,000 / Databricks-10,000 truncation signatures, staleness warning for
files that should be re-pulled each run) and **fails fast** instead of building partial
data. Closed-month chunk files being *old* is fine (expected with the incremental
refresh); a *missing* closed-month chunk is a hard error.

The full **"refresh date"** flow (pull fresh from all sources, then rebuild + deploy) is:
**refresh the SF + Databricks caches via MCP → `npm run refresh-all` → `npm run build` → commit +
push `boltable/main`.** `scripts/refresh-and-deploy.sh` automates exactly this (launchd).

## Canonical query manifest + parallel pulls

**`node scripts/gen-all-cache-queries.mjs`** is the single source of truth for **every**
cache file under `scripts/.cache/` the build reads: for each file it prints the exact
SOQL/Databricks SQL (or the gen script that produces it), the expected row-count bounds
(enforced by `validate-caches.mjs`), the target filename, and the **parallel batch** it
belongs to. `--json` gives a machine-readable manifest; `--full` also prints the
closed-month chunk queries (backfills).

**Run independent MCP queries IN PARALLEL, not sequentially.** MCP pulls are executed by
the agent, so parallelism happens at the agent level — fire all queries of a batch in one
parallel burst (parallel tool calls), then write each result to its target file:

| Batch | Source | Contents | Depends on |
|-------|--------|----------|------------|
| **A** | Salesforce | current-month stage-history + weekly chunks, won-mtd, won-ytd, won-recent, pipeline-open, stage-counts | — |
| **B** | Salesforce | MyPipeline (mp-*), MOPS, inbound exports (incl. inbound stage-history chunk) | — |
| **C1** | Databricks | activation universe (`accounts-perf-accounts`) + provider→opp map | — |
| **C2** | Databricks + SF | monthly/quality (IN-list from universe), SF commission/segment (opp IDs from prov-opp) | **C1** |

A, B and C1 can all start simultaneously; C2 only after C1 lands. After all pulls:
`node scripts/fetch-sf-stage-history.mjs --kind=all` → `npm run refresh-all` → `npm run build`.

Two hard-won caveats baked into the manifest:

- **MOPS cases pull is UNSCOPED** — no `Account.BillingCountry` filter. Most open
  cases have NULL BillingCountry but are still RO (Romania queue / MOps owners);
  a country filter silently drops them (66 of 88 on 2026-07-02).
- **SF commission/segment pull is PRE-SPLIT** — `node scripts/gen-accounts-perf-queries.mjs
  --kind=sf-commission` emits the SOQL in batches of ≤300 opportunity IDs (~6 batches at
  current universe size). Larger IN-lists exceed the MCP URL/header limit → HTTP 431.

## Workflow

1. Query **Salesforce MCP** for pipeline, Won, Activated, accounts, opportunities.
   `node scripts/gen-all-cache-queries.mjs` lists the exact query for **every** cache
   file, grouped into parallel batches — fire each batch's queries together (see
   "Canonical query manifest + parallel pulls" above).
2. Read **Google Sheet** hitlist via Bolt MCP (`read_sheet_values`) — spreadsheet `1IW8IxEs-YCsYMlCeTfkIz-b51eStjR5uUIEpkV1akRE`.
3. Map results to `data/dashboard.json` using `data/dashboard.schema.json`.
4. Set `updatedAt` to the current ISO timestamp.
5. **Slim at source:** `build-dashboard-data.mjs` calls `lib/slim-dashboard-source.mjs` — keeps MTD/weekly **aggregates for all periods**, but drill-down lists only for the **current month** and **current ISO week**; caps account tabs at 28 with SF list URLs. Re-run `node scripts/slim-dashboard-json.mjs` after manual JSON edits.
6. Rebuild **all** sections with `npm run refresh-all` (orchestrator), not just `build-dashboard-data.mjs`. Then `npm run build`.
7. Commit `data/dashboard.json` and push — Paketo redeploys dashy on Boltable.
8. **After a successful data refresh + deploy, auto-notify Bianca Medrea** on
   **both** Slack (`U01AHG4UAPR`) and email (`bianca.medrea@bolt.eu`) that the
   refresh is complete and to check the data. This is **standing pre-authorized**
   — no per-message confirmation needed. Use the message template below. See
   `.cursor/rules/slack-notifications.mdc` for the full policy.

   - **Slack DM / email body:** `Hi Bianca — dashy data refresh is done ✅ Latest SF + Databricks data is live on dashy.boltable.eu (updated <updatedAt>). Please check the data when you get a chance.`
   - **Email subject:** `dashy — data refresh complete`

   Replace `<updatedAt>` with the refreshed `data/dashboard.json` `updatedAt`.

**Overview totals + snapshot are DERIVED, never hardcoded:**
- `salesPipeline.totals.won` / `totals.activated` (YTD) are computed in `build-dashboard-data.mjs`
  from the canonical MTD store — Won = Σ per-month `Won_Date__c` counts (team), Activated = Σ
  per-month field-history Activated counts (team). They **must differ** (Won ≠ Activated; verify-build
  asserts this). `previousValue` = cumulative through the end of the prior month.
- `salesPipeline.snapshot` funnel comes from `scripts/.cache/sf-pipeline-stage-counts.json`
  (SF `GROUP BY StageName`, RecordType `Sales Opportunity` == Romania). Refresh it every pull:
  `SELECT StageName, COUNT(Id) cnt FROM Opportunity WHERE RecordType.Name = 'Sales Opportunity' GROUP BY StageName`.
- `mtdAchievement.leadsMtd` / `qualifiedMtd` are derived (New Opportunity created MTD; first
  transitions INTO Contacting DCM / First Pitch MTD), not literals.

**Tracking year is dynamic:** `lib/weekly-stages-build.mjs` (`currentTrackingYear()`) and
`lib/weekDateRange.ts` (`DASHBOARD_WEEK_YEAR`) derive the year from the current Europe/Bucharest
date — no literal `2026` to break on 2027-01-01. Override with `WEEKLY_TRACKING_YEAR` for backfills.

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
| Cezar | Cezar-Mihai Voicu | `0057Q000004SL7qQAG` |

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

### MTD Won vs Activated (hybrid — aligned with SF dashboard)

**Won MTD** matches Salesforce dashboard `01ZTs000000L8AfMAK` (red “won” box, filter **Won Date = This Month**): custom field **`Won_Date__c = THIS_MONTH`**. **No StageName filter** — opps in Onboarding, Activated, etc. still count if `Won_Date__c` is in the current month. Do **not** use `CloseDate` or `StageName IN ('Contract sent', 'Ready to Activate')` for Won MTD.

| Metric | SF logic | Record type | Month from |
|--------|----------|-------------|------------|
| **Won MTD** | `Won_Date__c = THIS_MONTH` | **Sales Opportunity** only | `Won_Date__c` (Europe/Bucharest) |
| **Activated MTD** | first transition INTO `Activated` | Sales Opportunity only | `OpportunityFieldHistory.CreatedDate` |

Logic: `lib/mtd-history.mjs` → `buildHybridMtdStore()` — won from `accumulateMtdWonFromWonDate()`, activated from `accumulateMtdActivatedFromStageHistory()`. **ALL months** (current and prior) count Won from `Won_Date__c` via the full-year export (`sf-won-ytd-bydate.json`, merged with the THIS_MONTH export). There is **no** field-history "Closed Won" fallback — it double-counted bulk stage backfills (e.g. phantom January inflation for Mihnea) and broke the canonical-Won contract. `build-dashboard-data.mjs` therefore feeds the merged Won_Date records (YTD + THIS_MONTH) into `buildHybridMtdStore`.

Exclude Teodor Domnica and Andrei-Sebastian Caba (`EXCLUDED_OWNER_IDS`). 12 team reps only.

### Won export (MTD counts + account tabs)

`scripts/.cache/sf-won-mtd.json` drives **Won MTD per-rep** and recent won account tabs:

```sql
SELECT Id, Name, StageName, IsWon, CloseDate, Won_Date__c, OwnerId, Owner.Name, RecordType.Name,
  AccountId, Account.Name, Account.BillingCity
FROM Opportunity
WHERE Won_Date__c = THIS_MONTH
  AND RecordType.Name = 'Sales Opportunity'
  AND OwnerId IN ( /* 12 rep IDs — see weekly query */ )
ORDER BY Won_Date__c DESC
```

Reproduces **100** team total (June 2026) — includes all stages with Won Date set this month. Refresh this export before each deploy.

Activated field history cache: `scripts/.cache/sf-stage-history-2026.json` (weekly query below).

Exclude `Administrator` from the agents list. Map each owner to segment, set `mtdTarget`, then call `buildMtdAchievement(agents, month, { leadsMtd, qualifiedMtd })`.

### CRITICAL: chunked stage-history + weekly refresh (truncation-safe, INCREMENTAL)

The team **OpportunityFieldHistory** ("stage-history", ~8,000 rows/yr) and **weekly
Opportunity** exports exceed the Salesforce MCP **~2,000-row SOQL cap**. A naive
full-year `... CreatedDate >= Jan-01 ... ORDER BY CreatedDate` pull is **silently
truncated**, so DO NOT re-pull either in one shot, and **never reuse a stale copy**
on a refresh. Instead use the repeatable, **MONTHLY-chunked** pull. Three kinds:
`stage-history` (12 team reps), `weekly` (team Opportunity export), and
`inbound-stage-history` (2 inbound reps — same flow, migrated from the legacy
h1/h2 half-year files).

**INCREMENTAL is the default: closed months are NOT re-pulled.** SF field history
for a closed month is immutable, so the default emits ONLY the current month's
chunk (plus the previous month during the first 3 days of a new month, catching
late backfills across the boundary). Closed-month chunk files are read from disk
by the merge. Use `--full` to re-pull every month (backfills, missing chunks,
schema changes).

1. **Emit the per-month SOQL** (team owner IDs + exact SELECT fields, dynamic
   tracking year):

   ```bash
   node scripts/gen-sf-history-queries.mjs                 # INCREMENTAL: current month only, all kinds
   node scripts/gen-sf-history-queries.mjs --full          # every month Jan→current (backfills)
   node scripts/gen-sf-history-queries.mjs --kind=stage-history
   node scripts/gen-sf-history-queries.mjs --kind=weekly
   node scripts/gen-sf-history-queries.mjs --kind=inbound-stage-history
   ```

   Each chunk uses `CreatedDate >= monthStart AND CreatedDate < nextMonthStart`,
   so every month returns **< ~1,800 rows** (peak observed: May = 1,767) — a safe
   margin under 2,000. Each printed block names its target chunk file
   (e.g. `sf-stage-history-2026-07.json`).

2. **Run the printed queries IN PARALLEL** through the Salesforce MCP
   (`user-Salesforce` → `soqlQuery`) — they are independent, fire them in one
   batch. **Confirm `done: true` and `< 2000` records per chunk** (if any
   chunk hits 2,000 it was truncated — split that month further). Save each JSON
   to its `scripts/.cache/sf-stage-history-YYYY-MM.json` /
   `sf-weekly-YYYY-MM.json` / `sf-inbound-stage-history-YYYY-MM.json` chunk file.

3. **Merge + dedup** all chunks (fresh + closed-month from disk) into the
   full-year caches:

   ```bash
   node scripts/fetch-sf-stage-history.mjs --kind=all      # all three kinds
   node scripts/fetch-sf-stage-history.mjs --kind=stage-history
   node scripts/fetch-sf-stage-history.mjs --kind=weekly
   node scripts/fetch-sf-stage-history.mjs --kind=inbound-stage-history
   ```

   Stage-history dedups by `OpportunityId+Field+CreatedDate+OldValue+NewValue`;
   weekly dedups by `Id` (newest `LastModifiedDate` wins). The merge **warns** if
   any chunk has ≥ 2,000 rows (likely truncated) and **ERRORS LOUDLY if any
   closed-month chunk file is missing** (a missing month would silently vanish
   from the merged cache) — fix by re-pulling with
   `node scripts/gen-sf-history-queries.mjs --full`. On the first
   `inbound-stage-history` run it auto-migrates the legacy
   `sf-inbound-stage-history-YYYY-h1/h2.json` files into monthly chunks (never
   overwriting fresher monthly pulls).

This is **idempotent**: re-running with fresh chunk files refreshes
`sf-stage-history-YYYY.json` + `sf-weekly-YYYY.json` +
`sf-inbound-stage-history-YYYY.json` in place. Always re-pull the current-month
chunks on every "refresh all" so the Weekly tab + stage-history metrics are
current, not 1+ day stale — but do NOT waste MCP round-trips re-pulling closed
months.

### Weekly production

All weekly buckets use **OpportunityFieldHistory** (first transition INTO stage). **Closed Won** is strict **`Closed Won`** only — not Contract sent, not Ready to Activate. Opps now in Activated (or later) still count in the week when they first entered Closed Won.

| Bucket | SF stages | Record type | Week from |
|--------|-----------|-------------|-----------|
| Qualified | New Opportunity, Contacting DCM, First Pitch | Sales + Parent Opp | first transition INTO stage |
| Negotiations | Negotiations | Sales Opportunity | first transition |
| Closed Won | **Closed Won** only | Parent + Sales Opportunity | first transition INTO Closed Won (`CreatedDate`, Europe/Bucharest ISO week) |
| Active | Activated | Sales Opportunity | first transition INTO Activated |

Field history cache: `scripts/.cache/sf-stage-history-2026.json` — refresh via the
**incremental chunked** flow above (`gen-sf-history-queries.mjs --kind=stage-history` →
run the current-month chunk(s) via MCP → `fetch-sf-stage-history.mjs --kind=stage-history`,
which merges the closed-month chunks from disk). Never re-pull the full year in one
query (SOQL 2,000-row cap → silent truncation).

**MTD Won** (separate from weekly Closed Won) uses `Won_Date__c = THIS_MONTH` — see Won export above. Do not use `sf-won-ytd.json` for weekly Closed Won. Weekly **Closed Won** still uses field-history first transition INTO `Closed Won` only.

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

Weekly opps export (`scripts/.cache/sf-weekly-2026.json`) — refresh via the same
**incremental chunked** flow (`gen-sf-history-queries.mjs --kind=weekly` → run the
current-month chunk(s) via MCP → `fetch-sf-stage-history.mjs --kind=weekly`). The
per-month SOQL is (do not hand-run the unbounded full-year version — it risks the
2,000-row cap):

```sql
SELECT Id, Name, StageName, CreatedDate, LastModifiedDate, CloseDate,
  OwnerId, Owner.Name, AccountId, Account.Name, Account.BillingCity
FROM Opportunity
WHERE RecordType.Name = 'Sales Opportunity'
  AND StageName IN ('New Opportunity','Contacting DCM','First Pitch','Negotiations','Closed Won','Activated')
  AND CreatedDate >= 2026-MM-01T00:00:00Z
  AND CreatedDate < 2026-MM+1-01T00:00:00Z
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

## Inbound team tab

The **Inbound team** tab (`/inbound`, `dashboard.inboundTeam`) is scoped to two
inbound RO reps and is **deliberately isolated** from every other tab:

| Rep | Owner ID | Email |
|-----|----------|-------|
| Ana-Maria Preda | `005Ts00000BtHpvIAF` | ana.preda@bolt.eu |
| Catalin Corbeanu | `005Qs00000OLyBRIA1` | catalin.corbeanu@aceolution.com |

They live in `INBOUND_OWNER_IDS` (lib/agent-segments) — **not** in
`COMPLEX_OWNER_IDS`/`DENSITY_OWNER_IDS`. `isTeamAgent` and `agentSegment` return
false/null for them, so they never appear in Overview, MTD, Weekly, WoW,
Accounts, or MyPipeline. Keep it that way.

Build: `node scripts/build-inbound-team.mjs` (merge-only, mirrors
build-my-pipeline). Run after `build-dashboard-data.mjs`. Data is **actuals only**
(no targets). Per person it computes MTD won/activated (+ item lists), weekly
history/metrics/breakdown, WoW current-vs-prior rows, and accounts performance —
reusing the MTD/weekly accumulators (via an inbound classifier) and the EXACT
accounts-performance math.

### Inbound Salesforce exports (`scripts/.cache/`)

All scoped to `OwnerId IN ('005Ts00000BtHpvIAF','005Qs00000OLyBRIA1')` — the
team exports exclude these owners, so these are separate caches:

- `sf-inbound-won-mtd.json` — `Won_Date__c = THIS_MONTH`, RecordType `Sales Opportunity`.
- `sf-inbound-won-ytd-bydate.json` — `Won_Date__c = THIS_YEAR` (drives weekly Closed Won + YTD).
- `sf-inbound-stage-history-2026-MM.json` — `OpportunityFieldHistory` StageName transitions, **monthly chunks** (same incremental flow as the team export: `gen-sf-history-queries.mjs --kind=inbound-stage-history` → `fetch-sf-stage-history.mjs --kind=inbound-stage-history` merges into `sf-inbound-stage-history-2026.json`, which the build prefers). The legacy `-h1/-h2` half-year files are auto-migrated into monthly chunks on the first merge and kept only as a fallback.
- `sf-inbound-weekly-2026.json` — open + won/activated opps 2026 (New Opportunity leads by week).

Databricks: the inbound build **reuses** the team `accounts-perf-*.json` caches
(a full RO pull that already includes both inbound owners) and filters by
`opportunity_owner_email`. No separate Databricks export needed.

## Verify locally

```bash
npm run build:boltable
npm run start:server
curl http://localhost:8080/api/dashboard/overview | jq '.updatedAt'
curl http://localhost:8080/api/dashboard/mtd | jq '.mtdHistory | length'
curl http://localhost:8080/api/dashboard/weekly | jq '.weeklyPerformance.currentWeek'
curl http://localhost:8080/api/health | jq '.gitSha'
```

**Slim source checks:** prior months in `mtdHistory` must have empty `wonItems`/`activatedItems` but correct `wonMtd`/`activatedMtd` counts. Prior weeks in `weeklyPerformance.breakdown` must have status **counts** but no `accounts` arrays. Account tabs show max 28 rows; totals live in `accounts.meta`.

## Target overrides (`data/target-config.json`)

Settings → **Save targets** calls `PUT /api/target-config`. On Boltable the container filesystem is **ephemeral** — file-only saves are lost on Paketo redeploy.

**Production (Boltable):** set `GITHUB_TOKEN`, `GITHUB_REPO=boltable/dashy`, and optional `GITHUB_BRANCH=main`. Each save writes the file locally **and** commits it via the GitHub Contents API so the next deploy restores overrides from git.

**Cursor agents:** When updating target overrides via Settings or API, ensure `data/target-config.json` is committed to git before/after deploy. If `GITHUB_TOKEN` is configured on Boltable, Settings saves auto-commit; otherwise commit the file manually and push to `boltable/dashy`.

**Local dev:** without `GITHUB_TOKEN`, saves work for the current process only (filesystem mode).

## Do not

- Add login/logout or auth flows.
- Require `SALESFORCE_*` or `LOOKER_*` env vars on Boltable.
- Merge Won and Activated into a single metric.

## Slack

No blanket restriction on Slack/email. **Default:** ask the user for confirmation
before sending to anyone, OR send when the user explicitly tells you to.

**Standing exception — Bianca Medrea (recurring):** after **every** data refresh +
deploy completes, **auto-notify Bianca on both Slack (`U01AHG4UAPR`) and email
(`bianca.medrea@bolt.eu`)** that the refresh is done and to check the data — no
per-message confirmation. Bianca is otherwise pre-authorized (send directly when
the user asks to message her). Sends to other recipients still require asking
first. Full policy + message template: `.cursor/rules/slack-notifications.mdc`
(see also Workflow step 8).
