#!/usr/bin/env node
/**
 * Generate the truncation-safe, MONTHLY-chunked SOQL for the two large
 * Salesforce exports that drive the Weekly tab + stage-history metrics:
 *
 *   - stage-history  → OpportunityFieldHistory (StageName transitions)
 *                      merged cache: scripts/.cache/sf-stage-history-2026.json
 *   - weekly         → Opportunity (open + won/activated)
 *                      merged cache: scripts/.cache/sf-weekly-2026.json
 *
 * ## Why this exists (the 2,000-row SOQL truncation bug)
 * A full-year `... CreatedDate >= Jan-01 ... ORDER BY CreatedDate` pull of
 * OpportunityFieldHistory for the 12 team reps returns ~7,700 rows, far over the
 * Salesforce MCP ~2,000-row cap. A naive re-pull is SILENTLY truncated, so agents
 * historically REUSED a 1+ day old copy rather than risk corrupting the cache —
 * which left the Weekly tab + stage-history metrics stale on every "refresh all".
 *
 * ## The fix (mirrors the proven inbound h1/h2 split + gen-accounts-perf-queries)
 * Split each query into MONTHLY windows over the tracking year:
 *   CreatedDate >= monthStart AND CreatedDate < nextMonthStart
 * Each month returns < ~1,800 rows (peak observed: May = 1,767) — a safe margin
 * under 2,000, and never truncated. The agent runs each printed query through the
 * Salesforce MCP (`user-Salesforce` → `soqlQuery`), confirms each result has
 * `done: true` and `< 2000` records, and writes the JSON to the matching
 * per-month chunk file. `scripts/fetch-sf-stage-history.mjs` then merges + dedups
 * all chunks into the full-year cache.
 *
 * The owner IDs and SELECT fields are derived from the single source of truth
 * (lib/agent-segments TEAM_ROSTER) and the tracking year is dynamic
 * (lib/weekly-stages-build currentTrackingYear) — so this stays correct on
 * 2027-01-01 and reproduces the exact SOQL from AGENTS.md with no hand-editing.
 *
 * ## Usage
 *   node scripts/gen-sf-history-queries.mjs                 # both kinds, Jan→current month
 *   node scripts/gen-sf-history-queries.mjs --kind=stage-history
 *   node scripts/gen-sf-history-queries.mjs --kind=weekly
 *   node scripts/gen-sf-history-queries.mjs --year=2026     # backfill a specific year
 *   node scripts/gen-sf-history-queries.mjs --through=12    # force Jan→Dec (default: current month)
 *   node scripts/gen-sf-history-queries.mjs --json          # machine-readable manifest
 *
 * Each printed block tells you the target chunk file
 * (e.g. sf-stage-history-2026-05.json). After running every chunk + saving:
 *   node scripts/fetch-sf-stage-history.mjs --kind=all
 */
import { TEAM_ROSTER } from "../lib/agent-segments.mjs";
import { currentTrackingYear } from "../lib/weekly-stages-build.mjs";

/** The 12 team owner IDs (Complex + Density) — single source of truth. */
const TEAM_OWNER_IDS = TEAM_ROSTER.map((r) => r.ownerId);

const TZ = "Europe/Bucharest";

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

/** Current month index (1-12) in Europe/Bucharest for the given year, else 12. */
function currentMonthFor(year) {
  const now = new Date();
  const tzYear = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric" }).format(now),
  );
  if (year !== tzYear) return 12; // backfill of a non-current year → full Jan→Dec
  return Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ, month: "numeric" }).format(now),
  );
}

/** OpportunityFieldHistory StageName transitions for one month (team reps). */
export function stageHistoryQuery(year, month1) {
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
    `AND Opportunity.OwnerId IN (${quoteList(TEAM_OWNER_IDS)}) ` +
    "ORDER BY CreatedDate ASC"
  );
}

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

const KINDS = {
  "stage-history": { build: stageHistoryQuery, prefix: "sf-stage-history" },
  weekly: { build: weeklyQuery, prefix: "sf-weekly" },
};

function buildManifest(year, through, kinds) {
  const out = [];
  for (const kind of kinds) {
    const { build, prefix } = KINDS[kind];
    for (let m = 1; m <= through; m++) {
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
  const through = Number(args.through) || currentMonthFor(year);
  const kinds = args.kind ? [args.kind] : ["stage-history", "weekly"];
  for (const k of kinds) {
    if (!KINDS[k]) {
      console.error(`Unknown --kind=${k}. Use stage-history | weekly.`);
      process.exit(1);
    }
  }

  const manifest = buildManifest(year, through, kinds);

  if (args.json) {
    console.log(JSON.stringify({ year, through, chunks: manifest }, null, 2));
    return;
  }

  console.error(
    `[gen-sf-history-queries] year ${year}, months 01→${String(through).padStart(2, "0")}, ` +
      `${TEAM_OWNER_IDS.length} team owners, kinds: ${kinds.join(", ")}.`,
  );
  for (const c of manifest) {
    console.log(`-- [${c.kind} ${year}-${c.month}] → ${c.file}`);
    console.log(c.query);
    console.log("");
  }
  console.error(
    "After saving every chunk JSON, merge with: node scripts/fetch-sf-stage-history.mjs --kind=all",
  );
}

if (import.meta.url === `file://${process.argv[1]}`) main();
