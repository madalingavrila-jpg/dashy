#!/usr/bin/env node
/**
 * CANONICAL QUERY MANIFEST — the single source of truth for every cache file
 * under scripts/.cache/ that the dashboard build reads. For each cache it emits:
 *
 *   - the exact SOQL / Databricks SQL (or the gen script that produces it),
 *   - the expected row-count bounds (validate-caches.mjs enforces them),
 *   - the target filename, and
 *   - the PARALLEL BATCH it belongs to.
 *
 * ## Parallel batches (fire each batch's queries TOGETHER via MCP)
 * MCP pulls are executed by the refreshing agent, so parallelism happens at the
 * agent level: every query inside a batch is independent — run them in one
 * parallel burst instead of sequentially. Batches:
 *
 *   A   Salesforce — team core (current-month history/weekly chunks, won-mtd,
 *       won-ytd, won-recent, pipeline-open, stage-counts)
 *   B   Salesforce — MyPipeline + MOPS + inbound
 *   C1  Databricks — activation universe + provider→opp map
 *   C2  DEPENDS ON C1 — monthly/quality (IN-list from the universe) and the
 *       SF commission/segment pull (opportunity IDs from prov-opp)
 *
 * A and B and C1 can all start at the same time; C2 only after C1 has landed.
 *
 * ## Incremental history chunks
 * The stage-history / weekly / inbound-stage-history chunks are INCREMENTAL by
 * default (closed months are immutable — their chunk files are read from disk;
 * see gen-sf-history-queries.mjs). Pass --full to also emit the closed-month
 * queries for a backfill.
 *
 * ## Usage
 *   node scripts/gen-all-cache-queries.mjs            # human-readable, grouped by batch
 *   node scripts/gen-all-cache-queries.mjs --full     # include closed-month chunk queries
 *   node scripts/gen-all-cache-queries.mjs --json     # machine-readable manifest
 *   node scripts/gen-all-cache-queries.mjs --batch=A  # one batch only
 */
import { TEAM_ROSTER, INBOUND_OWNER_IDS } from "../lib/agent-segments.mjs";
import { currentTrackingYear } from "../lib/weekly-stages-build.mjs";
import { KINDS, buildChunkManifest, monthsToPull, currentMonthFor } from "./gen-sf-history-queries.mjs";
import { activationQuery } from "./gen-activation-queries.mjs";

const TEAM_IDS = TEAM_ROSTER.map((r) => r.ownerId);
const INBOUND_IDS = [...INBOUND_OWNER_IDS];
const inList = (ids) => ids.map((id) => `'${id}'`).join(",");

const WON_FIELDS =
  "SELECT Id, Name, StageName, IsWon, CloseDate, Won_Date__c, OwnerId, Owner.Name, " +
  "RecordType.Name, AccountId, Account.Name, Account.BillingCity FROM Opportunity";
const OPP_FIELDS =
  "SELECT Id, Name, StageName, CloseDate, OwnerId, Owner.Name, AccountId, Account.Name, " +
  "Account.BillingCity FROM Opportunity";
const MP_OPP_FIELDS =
  "SELECT Id, Name, StageName, CloseDate, CreatedDate, OwnerId, Owner.Name, AccountId, " +
  "Account.Name, Account.BillingCity FROM Opportunity";
const MP_WORKING_STAGES = "'Reachout','Contacting DCM','First Pitch','Negotiations','Contract sent'";
const WEEKLY_STAGES =
  "'New Opportunity','Contacting DCM','First Pitch','Negotiations','Closed Won','Activated'";

/**
 * Build the full cache manifest. Every entry:
 *   file             scripts/.cache/... target filename
 *   batch            'A' | 'B' | 'C1' | 'C2' (parallel batch; C2 depends on C1)
 *   source           'salesforce-mcp' | 'databricks-mcp' | 'assembled' | 'local-merge'
 *   query            exact SOQL/SQL to run (null when produced by a gen script / local merge)
 *   gen              command that emits the query / produces the file (when query is null)
 *   note             provenance, assembly shape, caveats
 *   format           'sf-records' | 'mcp-table' | 'mp-totals' | 'mops-cases'
 *   bounds           [min, max] expected row count (validate-caches enforces)
 *   cap              intentional LIMIT — count == cap is expected, not truncation
 *   refreshedEachRun false only for closed-month chunks (immutable, read from disk)
 *   closedMonthChunk true for chunk files of already-closed months
 */
export function buildCacheManifest({ full = false } = {}) {
  const year = currentTrackingYear();
  const entries = [];

  // ---- history/weekly monthly chunks (incremental by default) --------------
  const allMonths = monthsToPull(year, { full: true });
  const freshMonths = new Set(monthsToPull(year, {})); // current month (+ prev in grace window)
  for (const kind of Object.keys(KINDS)) {
    for (const chunk of buildChunkManifest(year, allMonths, [kind])) {
      const isFresh = freshMonths.has(Number(chunk.month));
      entries.push({
        file: chunk.file,
        batch: kind === "inbound-stage-history" ? "B" : "A",
        source: "salesforce-mcp",
        query: chunk.query,
        gen: `node scripts/gen-sf-history-queries.mjs --kind=${kind}${isFresh ? "" : " --full"}`,
        note:
          `${kind} monthly chunk ${year}-${chunk.month}` +
          (isFresh
            ? " (current window — re-pull EVERY refresh)"
            : " (CLOSED month — immutable; read from disk, re-pull only with --full)"),
        format: "sf-records",
        bounds: [0, 1999],
        cap: null,
        refreshedEachRun: isFresh,
        closedMonthChunk: !isFresh,
      });
    }
    const { prefix } = KINDS[kind];
    entries.push({
      file: `scripts/.cache/${prefix}-${year}.json`,
      batch: kind === "inbound-stage-history" ? "B" : "A",
      source: "local-merge",
      query: null,
      gen: "node scripts/fetch-sf-stage-history.mjs --kind=all",
      note: `Merged full-year ${kind} cache (dedup of all monthly chunks). No MCP pull — local merge; errors loudly if a closed-month chunk file is missing.`,
      format: "sf-records",
      bounds: [1, 50000],
      cap: null,
      refreshedEachRun: true,
      closedMonthChunk: false,
    });
  }

  // ---- Batch A: Salesforce team core ---------------------------------------
  entries.push(
    {
      file: "scripts/.cache/sf-pipeline-stage-counts.json",
      batch: "A",
      source: "salesforce-mcp",
      query:
        "SELECT StageName, COUNT(Id) cnt FROM Opportunity WHERE RecordType.Name = 'Sales Opportunity' GROUP BY StageName",
      gen: null,
      note: "Overview snapshot funnel (RO Sales Opportunity stage distribution). Keep the `_query`/`_note` header fields when writing the cache.",
      format: "sf-records",
      bounds: [5, 50],
      cap: null,
      refreshedEachRun: true,
      closedMonthChunk: false,
    },
    {
      file: "scripts/.cache/sf-won-mtd.json",
      batch: "A",
      source: "salesforce-mcp",
      query:
        `${WON_FIELDS} WHERE Won_Date__c = THIS_MONTH AND RecordType.Name = 'Sales Opportunity' ` +
        `AND OwnerId IN (${inList(TEAM_IDS)}) ORDER BY Won_Date__c DESC`,
      gen: null,
      note: "Won MTD per-rep (SF dashboard parity: Won Date = This Month, NO StageName filter). Can be 0 rows on day 1 of a month.",
      format: "sf-records",
      bounds: [0, 400],
      cap: null,
      refreshedEachRun: true,
      closedMonthChunk: false,
    },
    {
      file: "scripts/.cache/sf-won-ytd-bydate.json",
      batch: "A",
      source: "salesforce-mcp",
      query:
        `${WON_FIELDS} WHERE Won_Date__c = THIS_YEAR AND RecordType.Name = 'Sales Opportunity' ` +
        `AND OwnerId IN (${inList(TEAM_IDS)}) ORDER BY Won_Date__c DESC`,
      gen: null,
      note: "Full-year Won_Date export — canonical Won for ALL months (merged with sf-won-mtd). Watch the 2,000-row SOQL cap as the year fills up: if totalSize hits 2000, split into half-year windows.",
      format: "sf-records",
      bounds: [1, 1999],
      cap: null,
      refreshedEachRun: true,
      closedMonthChunk: false,
    },
    {
      file: "scripts/.cache/sf-won-recent.json",
      batch: "A",
      source: "salesforce-mcp",
      query:
        `${OPP_FIELDS} WHERE RecordType.Name = 'Sales Opportunity' AND StageName = 'Activated' ` +
        `AND OwnerId IN (${inList(TEAM_IDS)}) ORDER BY CloseDate DESC LIMIT 100`,
      gen: null,
      note: "Most recently activated accounts (recent-won account tabs). LIMIT 100 is intentional.",
      format: "sf-records",
      bounds: [1, 100],
      cap: 100,
      refreshedEachRun: true,
      closedMonthChunk: false,
    },
    {
      file: "scripts/.cache/sf-pipeline-open.json",
      batch: "A",
      source: "salesforce-mcp",
      query:
        `${OPP_FIELDS} WHERE RecordType.Name = 'Sales Opportunity' AND IsClosed = false ` +
        `AND StageName NOT IN ('Closed Won','Closed Lost','Activated') ` +
        `AND OwnerId IN (${inList(TEAM_IDS)}) ORDER BY LastModifiedDate DESC LIMIT 500`,
      gen: null,
      note: "Open pipeline sample (backlog account tab). LIMIT 500 is intentional — most recently touched open opps.",
      format: "sf-records",
      bounds: [1, 500],
      cap: 500,
      refreshedEachRun: true,
      closedMonthChunk: false,
    },
    {
      file: `scripts/.cache/sf-account-activation-${year}.json`,
      batch: "A",
      source: "salesforce-mcp",
      query: activationQuery(TEAM_IDS, year),
      gen: "node scripts/gen-activation-queries.mjs --kind=team",
      note:
        "ACTIVATED source of truth — won Sales Opportunities joined to Account.provider_first_active_date__c " +
        "(>= tracking-year start), 12 team reps. One activation per account (deduped in the build, attributed to " +
        "the won opp owner). Watch the 2,000-row SOQL cap; if totalSize nears 2000, split by month on " +
        "Account.provider_first_active_date__c.",
      format: "sf-records",
      bounds: [50, 1999],
      cap: null,
      refreshedEachRun: true,
      closedMonthChunk: false,
    },
  );

  // ---- Batch B: MyPipeline + MOPS + inbound --------------------------------
  entries.push(
    {
      file: "scripts/.cache/mp-opps-working.json",
      batch: "B",
      source: "salesforce-mcp",
      query:
        `${MP_OPP_FIELDS} WHERE RecordType.Name = 'Sales Opportunity' ` +
        `AND StageName IN (${MP_WORKING_STAGES}) ` +
        `AND OwnerId IN (${inList(TEAM_IDS)}) ORDER BY CreatedDate DESC`,
      gen: null,
      note: "MyPipeline working-stage opps — FULL list (no cap). Watch the 2,000-row SOQL cap; split by stage if totalSize hits 2000.",
      format: "sf-records",
      bounds: [1, 1999],
      cap: null,
      refreshedEachRun: true,
      closedMonthChunk: false,
    },
    {
      file: "scripts/.cache/mp-opps-newopp.json",
      batch: "B",
      source: "salesforce-mcp",
      query:
        `${MP_OPP_FIELDS} WHERE RecordType.Name = 'Sales Opportunity' ` +
        `AND StageName = 'New Opportunity' ` +
        `AND OwnerId IN (${inList(TEAM_IDS)}) ORDER BY CreatedDate DESC LIMIT 1500`,
      gen: null,
      note: "New Opportunity sample — LIMIT 1500 is an INTENTIONAL cap (build keeps 75/agent; exact totals come from mp-totals.json). count == 1500 is expected, not truncation.",
      format: "sf-records",
      bounds: [1, 1500],
      cap: 1500,
      refreshedEachRun: true,
      closedMonthChunk: false,
    },
    {
      file: "scripts/.cache/mp-leads.json",
      batch: "B",
      source: "salesforce-mcp",
      query:
        "SELECT Id, Name, Company, Status, City, City__r.Name, State, CreatedDate, OwnerId, Owner.Name " +
        "FROM Lead WHERE IsConverted = false AND Status != 'Disqualified' " +
        `AND OwnerId IN (${inList(TEAM_IDS)}) ORDER BY CreatedDate DESC LIMIT 1500`,
      gen: null,
      note: "Open leads sample — LIMIT 1500 is an INTENTIONAL cap (build keeps 50/agent; exact totals come from mp-totals.json).",
      format: "sf-records",
      bounds: [1, 1500],
      cap: 1500,
      refreshedEachRun: true,
      closedMonthChunk: false,
    },
    {
      file: "scripts/.cache/mp-totals.json",
      batch: "B",
      source: "assembled",
      query:
        "-- (a) opps per rep+stage:\n" +
        "SELECT OwnerId, StageName, COUNT(Id) cnt FROM Opportunity " +
        "WHERE RecordType.Name = 'Sales Opportunity' " +
        `AND StageName IN ('New Opportunity',${MP_WORKING_STAGES}) ` +
        `AND OwnerId IN (${inList(TEAM_IDS)}) GROUP BY OwnerId, StageName\n` +
        "-- (b) open leads per rep:\n" +
        "SELECT OwnerId, COUNT(Id) cnt FROM Lead WHERE IsConverted = false AND Status != 'Disqualified' " +
        `AND OwnerId IN (${inList(TEAM_IDS)}) GROUP BY OwnerId`,
      gen: null,
      note: 'Assemble both GROUP BY results into: {"_comment":..., "opps": {ownerId: {"total": n, "<StageName>": n, ...}}, "leadsOpen": {ownerId: n}}. Authoritative per-rep totals (the mp-* lists are capped).',
      format: "mp-totals",
      bounds: [1, 50],
      cap: null,
      refreshedEachRun: true,
      closedMonthChunk: false,
    },
    {
      file: "scripts/.cache/sf-mops-cases.json",
      batch: "B",
      source: "assembled",
      query:
        "SELECT Id, CaseNumber, Subject, Status, OwnerId, Owner.Name, RecordType.Name " +
        "FROM Case WHERE IsClosed = false ORDER BY CreatedDate DESC",
      gen: null,
      note:
        "OPEN MOps cases — UNSCOPED on purpose: do NOT add an Account.BillingCountry filter. Most open cases " +
        "have BillingCountry = NULL (66 of 88 on 2026-07-02) yet are still RO (Romania queue / MOps owners), so a " +
        "country filter silently drops them; the unscoped pull matches the [MOps] Open cases dashboard. Assemble into: " +
        '{"openCases": n, "openNewOnboarding": n (RecordType = New Onboarding), ' +
        '"openByStatus": [{status,count}...], "openByRecordType": [{recordType,count}...], ' +
        '"openByOwner": [{ownerId,name,count}...], "records": [{id,caseNumber,subject,status,ownerId,ownerName,recordType,url}...]} ' +
        "(all breakdowns sorted by count desc; url = https://bolt.lightning.force.com/lightning/r/Case/<Id>/view).",
      format: "mops-cases",
      bounds: [20, 300],
      cap: null,
      refreshedEachRun: true,
      closedMonthChunk: false,
    },
    {
      file: "scripts/.cache/sf-mops-onboarding.json",
      batch: "B",
      source: "salesforce-mcp",
      query:
        "SELECT Id, Name, StageName, CloseDate, Won_Date__c, CreatedDate, LastStageChangeDate, " +
        "OwnerId, Owner.Name, AccountId, Account.Name, Account.BillingCity FROM Opportunity " +
        "WHERE RecordType.Name = 'Sales Opportunity' " +
        "AND StageName IN ('Onboarding Checklist','Onboarding','Ready to Activate','Escalation') " +
        `AND OwnerId IN (${inList(TEAM_IDS)}) ORDER BY CloseDate ASC`,
      gen: null,
      note: "MOPS onboarding/RTA buckets (opps currently parked in onboarding stages).",
      format: "sf-records",
      bounds: [1, 1999],
      cap: null,
      refreshedEachRun: true,
      closedMonthChunk: false,
    },
    {
      file: "scripts/.cache/sf-inbound-won-mtd.json",
      batch: "B",
      source: "salesforce-mcp",
      query:
        `${WON_FIELDS} WHERE Won_Date__c = THIS_MONTH AND RecordType.Name = 'Sales Opportunity' ` +
        `AND OwnerId IN (${inList(INBOUND_IDS)}) ORDER BY Won_Date__c DESC`,
      gen: null,
      note: "Inbound (Ana-Maria Preda, Catalin Corbeanu) Won MTD. Can be 0 rows on day 1 of a month.",
      format: "sf-records",
      bounds: [0, 300],
      cap: null,
      refreshedEachRun: true,
      closedMonthChunk: false,
    },
    {
      file: "scripts/.cache/sf-inbound-won-ytd-bydate.json",
      batch: "B",
      source: "salesforce-mcp",
      query:
        `${WON_FIELDS} WHERE Won_Date__c = THIS_YEAR AND RecordType.Name = 'Sales Opportunity' ` +
        `AND OwnerId IN (${inList(INBOUND_IDS)}) ORDER BY Won_Date__c DESC`,
      gen: null,
      note: "Inbound full-year Won_Date export (weekly Closed Won + YTD).",
      format: "sf-records",
      bounds: [1, 1999],
      cap: null,
      refreshedEachRun: true,
      closedMonthChunk: false,
    },
    {
      file: `scripts/.cache/sf-inbound-weekly-${year}.json`,
      batch: "B",
      source: "salesforce-mcp",
      query:
        "SELECT Id, Name, StageName, CreatedDate, LastModifiedDate, CloseDate, OwnerId, Owner.Name, " +
        "AccountId, Account.Name, Account.BillingCity FROM Opportunity " +
        "WHERE RecordType.Name = 'Sales Opportunity' " +
        `AND StageName IN (${WEEKLY_STAGES}) ` +
        `AND CreatedDate >= ${year}-01-01T00:00:00Z ` +
        `AND OwnerId IN (${inList(INBOUND_IDS)}) ORDER BY CreatedDate DESC`,
      gen: null,
      note: "Inbound weekly opps export (New Opportunity leads by week). Small enough for one pull — no monthly chunking needed.",
      format: "sf-records",
      bounds: [1, 1999],
      cap: null,
      refreshedEachRun: true,
      closedMonthChunk: false,
    },
    {
      file: `scripts/.cache/sf-inbound-account-activation-${year}.json`,
      batch: "B",
      source: "salesforce-mcp",
      query: activationQuery(INBOUND_IDS, year),
      gen: "node scripts/gen-activation-queries.mjs --kind=inbound",
      note:
        "Inbound ACTIVATED source of truth — won Sales Opportunities joined to " +
        "Account.provider_first_active_date__c (>= tracking-year start), 2 inbound reps. One activation per account.",
      format: "sf-records",
      bounds: [1, 1999],
      cap: null,
      refreshedEachRun: true,
      closedMonthChunk: false,
    },
  );

  // ---- Batch C1: Databricks activation universe -----------------------------
  entries.push(
    {
      file: "scripts/.cache/accounts-perf-accounts.json",
      batch: "C1",
      source: "databricks-mcp",
      query:
        "SELECT po.provider_id, po.opportunity_owner_user_name, po.opportunity_owner_email, " +
        "CAST(po.provider_activated_ts AS DATE) AS activated_date, pv.provider_name, pv.vendor_name, " +
        "pv.city_name, pv.business_segment_v2, pv.provider_status, " +
        "CAST(pv.first_delivered_order_ts AS DATE) AS first_order_date " +
        "FROM main.ng_delivery.dim_provider_opportunity po " +
        "LEFT JOIN main.ng_delivery.dim_provider_v2 pv ON pv.provider_id = po.provider_id " +
        `WHERE po.provider_activated_ts >= '${year}-01-01' AND po.country_name = 'Romania' ` +
        "QUALIFY ROW_NUMBER() OVER (PARTITION BY po.provider_id ORDER BY po.provider_activated_ts DESC) = 1",
      gen: null,
      note: "RO YTD activation UNIVERSE (one row per provider). Write as: header description line + blank line + {\"data\": [...]}. Column order matters (lib/accounts-performance-build).",
      format: "mcp-table",
      bounds: [50, 9999],
      cap: null,
      refreshedEachRun: true,
      closedMonthChunk: false,
    },
    {
      file: "scripts/.cache/accounts-perf-prov-opp.json",
      batch: "C1",
      source: "databricks-mcp",
      query:
        "SELECT po.provider_id, po.opportunity_id FROM main.ng_delivery.dim_provider_opportunity po " +
        `WHERE po.provider_activated_ts >= '${year}-01-01' AND po.country_name = 'Romania' ` +
        "QUALIFY ROW_NUMBER() OVER (PARTITION BY po.provider_id ORDER BY po.provider_activated_ts DESC) = 1",
      gen: null,
      note: "Provider → won opportunity map (same window/dedup as the universe). Feeds the C2 SF commission/segment pull.",
      format: "mcp-table",
      bounds: [50, 9999],
      cap: null,
      refreshedEachRun: true,
      closedMonthChunk: false,
    },
  );

  // ---- Batch C2: depends on C1 ----------------------------------------------
  entries.push(
    {
      file: "scripts/.cache/accounts-perf-monthly.json",
      batch: "C2",
      source: "databricks-mcp",
      query: null,
      gen: "node scripts/gen-accounts-perf-queries.mjs --kind=monthly",
      note: "Monthly GROSS GMV / orders / commission per provider. IN-list comes from accounts-perf-accounts.json — run AFTER batch C1 lands. Watch the 10,000-row Databricks cap (use --chunk=<n> if near it).",
      format: "mcp-table",
      bounds: [50, 9999],
      cap: null,
      refreshedEachRun: true,
      closedMonthChunk: false,
    },
    {
      file: "scripts/.cache/accounts-perf-quality.json",
      batch: "C2",
      source: "databricks-mcp",
      query: null,
      gen: "node scripts/gen-accounts-perf-queries.mjs --kind=quality",
      note: "Monthly availability & performance value/weight pairs per provider. Same IN-list dependency and 10k cap as monthly.",
      format: "mcp-table",
      bounds: [50, 9999],
      cap: null,
      refreshedEachRun: true,
      closedMonthChunk: false,
    },
    {
      file: "scripts/.cache/accounts-perf-sf-commission.json",
      batch: "C2",
      source: "assembled",
      query: null,
      gen: "node scripts/gen-accounts-perf-queries.mjs --kind=sf-commission",
      note:
        "Salesforce Commission__c per provider. The gen script emits the SOQL PRE-SPLIT into batches of ≤300 " +
        "opportunity IDs from accounts-perf-prov-opp.json (~6 batches at current universe size, scales automatically) — " +
        "larger IN-lists blow the MCP URL/header limit with HTTP 431. Run the batches in parallel, concatenate the rows, " +
        'map each back through prov-opp to [provider_id, Commission__c, opportunity_id] and write header line + {"data": [...]}. ' +
        "Same SOQL batches also feed accounts-perf-sf-segment.json.",
      format: "mcp-table",
      bounds: [50, 9999],
      cap: null,
      refreshedEachRun: true,
      closedMonthChunk: false,
    },
    {
      file: "scripts/.cache/accounts-perf-sf-segment.json",
      batch: "C2",
      source: "assembled",
      query: null,
      gen: "same SOQL batches as accounts-perf-sf-commission.json (one pre-split pull feeds both files)",
      note: 'Salesforce Account_Management_Segment__c per provider: [provider_id, segment, opportunity_id] rows, header line + {"data": [...]}. Overrides the stale Databricks business_segment_v2 for display.',
      format: "mcp-table",
      bounds: [50, 9999],
      cap: null,
      refreshedEachRun: true,
      closedMonthChunk: false,
    },
  );

  return { year, currentMonth: currentMonthFor(year), full, entries };
}

const BATCH_TITLES = {
  A: "PARALLEL BATCH A — Salesforce team core (fire all queries together)",
  B: "PARALLEL BATCH B — Salesforce MyPipeline + MOPS + inbound (fire all queries together; can run alongside A and C1)",
  C1: "PARALLEL BATCH C1 — Databricks activation universe (can run alongside A and B)",
  C2: "PARALLEL BATCH C2 — DEPENDS ON C1 (IN-lists/opportunity IDs come from C1 results)",
};

function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, "").split("=");
      return [k, v ?? true];
    }),
  );
  const manifest = buildCacheManifest({ full: Boolean(args.full) });

  if (args.json) {
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }

  const batches = args.batch ? [String(args.batch)] : Object.keys(BATCH_TITLES);
  console.error(
    `[gen-all-cache-queries] year ${manifest.year}, ${manifest.entries.length} cache files, ` +
      `mode ${manifest.full ? "FULL" : "INCREMENTAL"} (closed-month chunks ${manifest.full ? "included" : "read from disk — hidden; --full to show"}).`,
  );
  for (const batch of batches) {
    console.log(`\n${"=".repeat(80)}\n${BATCH_TITLES[batch]}\n${"=".repeat(80)}`);
    for (const e of manifest.entries) {
      if (e.batch !== batch) continue;
      if (!manifest.full && e.closedMonthChunk) continue; // incremental: closed months come from disk
      console.log(`\n-- ${e.file}`);
      console.log(`--   bounds: ${e.bounds[0]}–${e.bounds[1]} rows${e.cap ? ` (intentional cap ${e.cap})` : ""}`);
      console.log(`--   ${e.note}`);
      if (e.query) console.log(e.query);
      if (!e.query && e.gen) console.log(`--   produce via: ${e.gen}`);
    }
  }
  console.error(
    "\nAfter all pulls land: node scripts/fetch-sf-stage-history.mjs --kind=all && " +
      "node scripts/validate-caches.mjs && npm run refresh-all && npm run build",
  );
}

if (import.meta.url === `file://${process.argv[1]}`) main();
