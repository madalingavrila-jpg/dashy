#!/usr/bin/env node
/**
 * Generate the truncation-safe, MONTHLY-chunked SOQL for the large Salesforce
 * exports that drive the Weekly tab + stage-history metrics:
 *
 *   - stage-history          → OpportunityFieldHistory (StageName transitions, 12 team reps)
 *                              merged cache: scripts/.cache/sf-stage-history-2026.json
 *   - weekly                 → Opportunity (open + won/activated, 12 team reps)
 *                              merged cache: scripts/.cache/sf-weekly-2026.json
 *   - inbound-stage-history  → OpportunityFieldHistory (2 inbound reps)
 *                              merged cache: scripts/.cache/sf-inbound-stage-history-2026.json
 *
 * ## Why this exists (the 2,000-row SOQL truncation bug)
 * A full-year `... CreatedDate >= Jan-01 ... ORDER BY CreatedDate` pull of
 * OpportunityFieldHistory for the 12 team reps returns ~8,000 rows, far over the
 * Salesforce MCP ~2,000-row cap. A naive re-pull is SILENTLY truncated, so agents
 * historically REUSED a 1+ day old copy rather than risk corrupting the cache —
 * which left the Weekly tab + stage-history metrics stale on every "refresh all".
 *
 * ## The fix (mirrors the proven gen-accounts-perf-queries approach)
 * Split each query into MONTHLY windows over the tracking year:
 *   CreatedDate >= monthStart AND CreatedDate < nextMonthStart
 * Each month returns < ~1,800 rows (peak observed: May = 1,767) — a safe margin
 * under 2,000, and never truncated. The agent runs each printed query through the
 * Salesforce MCP (`user-Salesforce` → `soqlQuery`), confirms each result has
 * `done: true` and `< 2000` records, and writes the JSON to the matching
 * per-month chunk file. `scripts/fetch-sf-stage-history.mjs` then merges + dedups
 * all chunks into the full-year cache.
 *
 * ## INCREMENTAL BY DEFAULT (closed months are immutable)
 * Salesforce field history for a CLOSED month never changes, so re-pulling
 * Jan–Jun on every refresh is wasted MCP round-trips. The DEFAULT mode therefore
 * emits ONLY the current month's chunk (plus the previous month during the first
 * 3 days of a new month, to catch late backfills across the boundary). The
 * closed-month chunk files already on disk are merged as-is by
 * fetch-sf-stage-history.mjs, which FAILS LOUDLY if any closed-month chunk file
 * is missing (then re-pull everything with `--full`).
 *
 * The owner IDs and SELECT fields are derived from the single source of truth
 * (lib/agent-segments TEAM_ROSTER / INBOUND_OWNER_IDS) and the tracking year is
 * dynamic (lib/weekly-stages-build currentTrackingYear) — so this stays correct
 * on 2027-01-01 and reproduces the exact SOQL from AGENTS.md with no hand-editing.
 *
 * ## Usage
 *   node scripts/gen-sf-history-queries.mjs                 # INCREMENTAL: current month only (all kinds)
 *   node scripts/gen-sf-history-queries.mjs --full          # every month Jan→current (backfills)
 *   node scripts/gen-sf-history-queries.mjs --kind=stage-history
 *   node scripts/gen-sf-history-queries.mjs --kind=weekly
 *   node scripts/gen-sf-history-queries.mjs --kind=inbound-stage-history
 *   node scripts/gen-sf-history-queries.mjs --year=2026 --full   # backfill a specific year
 *   node scripts/gen-sf-history-queries.mjs --through=12         # force Jan→Dec (implies --full)
 *   node scripts/gen-sf-history-queries.mjs --json          # machine-readable manifest
 *
 * Each printed block tells you the target chunk file
 * (e.g. sf-stage-history-2026-07.json). After running every chunk + saving:
 *   node scripts/fetch-sf-stage-history.mjs --kind=all
 */
import { TEAM_ROSTER, INBOUND_OWNER_IDS } from "../lib/agent-segments.mjs";
import { currentTrackingYear } from "../lib/weekly-stages-build.mjs";

/** The 12 team owner IDs (Complex + Density) — single source of truth. */
const TEAM_OWNER_IDS = TEAM_ROSTER.map((r) => r.ownerId);
/** The 2 inbound owner IDs (Ana-Maria Preda, Catalin Corbeanu). */
const INBOUND_IDS = [...INBOUND_OWNER_IDS];

const TZ = "Europe/Bucharest";

/**
 * During the first N days of a new month, incremental mode ALSO re-pulls the
 * previous month — Salesforce backfills (bulk stage edits, late Won_Date entry)
 * commonly land across the month boundary.
 */
const BOUNDARY_GRACE_DAYS = 3;

/** Stages tracked by the weekly Opportunity export. */
const WEEKLY_STAGES = [
  "New Opportunity",
  "Contacting DCM",
  "First Pitch",
  "Negotiations",
  "Closed Won",
  "Activated",
];

/** `'a','b',...` for a SOQL IN-list. */
function quoteList(values) {
  return values.map((v) => `'${v}'`).join(",");
}

/** `YYYY-MM-01T00:00:00Z` for the 1-based month index (1=Jan, 13=next-year-Jan). */
function monthBoundary(year, month1) {
  const y = year + Math.floor((month1 - 1) / 12);
  const m = ((month1 - 1) % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}-01T00:00:00Z`;
}

function bucharestPart(part) {
  return Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ, [part]: "numeric" }).format(new Date()),
  );
}

/** Current month index (1-12) in Europe/Bucharest for the given year, else 12. */
export function currentMonthFor(year) {
  if (year !== bucharestPart("year")) return 12; // non-current year → full Jan→Dec
  return bucharestPart("month");
}

/**
 * The month indices to (re-)pull.
 *   incremental (default): current month, plus previous month during the first
 *     BOUNDARY_GRACE_DAYS days of a new month. Closed months are read from the
 *     chunk files already on disk (fetch-sf-stage-history errors if one is missing).
 *   full: every month Jan → `through` (defaults to the current month).
 */
export function monthsToPull(year, { full = false, through = 0 } = {}) {
  const current = currentMonthFor(year);
  if (full || through || year !== bucharestPart("year")) {
    const end = Math.min(Number(through) || current, 12);
    return Array.from({ length: end }, (_, i) => i + 1);
  }
  const months = [current];
  if (bucharestPart("day") <= BOUNDARY_GRACE_DAYS && current > 1) months.unshift(current - 1);
  return months;
}

/** OpportunityFieldHistory StageName transitions for one month. */
function historyQueryFor(ownerIds) {
  return (year, month1) => {
    const start = monthBoundary(year, month1);
    const end = monthBoundary(year, month1 + 1);
    return (
      "SELECT OpportunityId, Field, OldValue, NewValue, CreatedDate, " +
      "Opportunity.OwnerId, Opportunity.Owner.Name, Opportunity.RecordType.Name, " +
      "Opportunity.AccountId, Opportunity.Account.Name, Opportunity.Account.BillingCity, " +
      "Opportunity.Name, Opportunity.StageName " +
      "FROM OpportunityFieldHistory " +
      "WHERE Field = 'StageName' " +
      `AND CreatedDate >= ${start} ` +
      `AND CreatedDate < ${end} ` +
      `AND Opportunity.OwnerId IN (${quoteList(ownerIds)}) ` +
      "ORDER BY CreatedDate ASC"
    );
  };
}

export const stageHistoryQuery = historyQueryFor(TEAM_OWNER_IDS);
export const inboundStageHistoryQuery = historyQueryFor(INBOUND_IDS);

/** Opportunity (weekly export) created in one month (team reps, tracked stages). */
export function weeklyQuery(year, month1) {
  const start = monthBoundary(year, month1);
  const end = monthBoundary(year, month1 + 1);
  return (
    "SELECT Id, Name, StageName, CreatedDate, LastModifiedDate, CloseDate, " +
    "OwnerId, Owner.Name, AccountId, Account.Name, Account.BillingCity " +
    "FROM Opportunity " +
    "WHERE RecordType.Name = 'Sales Opportunity' " +
    `AND StageName IN (${quoteList(WEEKLY_STAGES)}) ` +
    `AND CreatedDate >= ${start} ` +
    `AND CreatedDate < ${end} ` +
    `AND OwnerId IN (${quoteList(TEAM_OWNER_IDS)}) ` +
    "ORDER BY CreatedDate DESC"
  );
}

export const KINDS = {
  "stage-history": { build: stageHistoryQuery, prefix: "sf-stage-history" },
  weekly: { build: weeklyQuery, prefix: "sf-weekly" },
  "inbound-stage-history": { build: inboundStageHistoryQuery, prefix: "sf-inbound-stage-history" },
};

/**
 * Chunk manifest for the given kinds/months. Also consumed by
 * gen-all-cache-queries.mjs (full cache manifest) and validate-caches.mjs.
 */
export function buildChunkManifest(year, months, kinds) {
  const out = [];
  for (const kind of kinds) {
    const { build, prefix } = KINDS[kind];
    for (const m of months) {
      const mm = String(m).padStart(2, "0");
      out.push({
        kind,
        month: mm,
        file: `scripts/.cache/${prefix}-${year}-${mm}.json`,
        query: build(year, m),
      });
    }
  }
  return out;
}

function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, "").split("=");
      return [k, v ?? true];
    }),
  );
  const year = Number(args.year) || currentTrackingYear();
  const kinds = args.kind ? [args.kind] : Object.keys(KINDS);
  for (const k of kinds) {
    if (!KINDS[k]) {
      console.error(`Unknown --kind=${k}. Use ${Object.keys(KINDS).join(" | ")}.`);
      process.exit(1);
    }
  }
  const full = Boolean(args.full) || Boolean(args.through);
  const months = monthsToPull(year, { full, through: Number(args.through) || 0 });
  const mode = full || year !== new Date().getFullYear() ? "full" : "incremental";

  const manifest = buildChunkManifest(year, months, kinds);

  if (args.json) {
    console.log(JSON.stringify({ year, mode, months, chunks: manifest }, null, 2));
    return;
  }

  const monthList = months.map((m) => String(m).padStart(2, "0")).join(", ");
  console.error(
    `[gen-sf-history-queries] year ${year}, mode ${mode.toUpperCase()}, months: ${monthList}, ` +
      `kinds: ${kinds.join(", ")}.`,
  );
  if (mode === "incremental") {
    console.error(
      "Closed months are NOT re-pulled (immutable in SF field history) — their chunk files " +
        "on disk are merged as-is. Use --full to re-pull every month (backfills).",
    );
  }
  for (const c of manifest) {
    console.log(`-- [${c.kind} ${year}-${c.month}] → ${c.file}`);
    console.log(c.query);
    console.log("");
  }
  console.error(
    "Run the queries above IN PARALLEL via the Salesforce MCP (each is independent), save each " +
      "chunk JSON, then merge with: node scripts/fetch-sf-stage-history.mjs --kind=all",
  );
}

if (import.meta.url === `file://${process.argv[1]}`) main();
