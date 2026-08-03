#!/usr/bin/env node
/**
 * Generate the SOQL for the Activated source-of-truth export:
 * won Sales Opportunities joined to `Account.provider_first_active_date__c`.
 *
 * ## Why this exists
 * "Activated" (MTD + weekly Active) is now derived from the SF Account date field
 * `provider_first_active_date__c` (~99.9% populated) instead of the old
 * OpportunityFieldHistory transition INTO the "Activated" stage. The field is
 * account-level with no owner, so we attribute it via the account's won Sales
 * Opportunity → owner (the same owner attribution dashy already uses). Accounts
 * with multiple team opps are deduped per account in the build
 * (lib/mtd-history.mjs `pickPrimaryActivationOpp`).
 *
 * Two scopes, matching the existing team vs inbound cache split:
 *   - team    (12 reps) → scripts/.cache/sf-account-activation-2026.json
 *   - inbound (2 reps)  → scripts/.cache/sf-inbound-account-activation-2026.json
 *
 * ## Truncation
 * Each pull returns one row per won Sales Opportunity whose Account is first-active
 * in the tracking year. At current volume the team pull is ~1,100 rows and inbound
 * ~400 — both comfortably under the ~2,000-row SOQL cap. If the team pull ever
 * approaches 2,000 (`totalSize` near the cap / `done: false`), split it by month
 * on `Account.provider_first_active_date__c` (see gen-sf-history-queries.mjs) and
 * merge the monthly chunks.
 *
 * ## Usage
 *   node scripts/gen-activation-queries.mjs            # both scopes
 *   node scripts/gen-activation-queries.mjs --kind=team
 *   node scripts/gen-activation-queries.mjs --kind=inbound
 *   node scripts/gen-activation-queries.mjs --json      # machine-readable
 *
 * Run the printed query via the Salesforce MCP (`user-Salesforce` → `soqlQuery`),
 * confirm `done: true` and `< 2000` records, then save the JSON to the target file.
 */
import { TEAM_ROSTER, INBOUND_OWNER_IDS } from "../lib/agent-segments.mjs";
import { currentTrackingYear } from "../lib/weekly-stages-build.mjs";

const TEAM_OWNER_IDS = TEAM_ROSTER.map((r) => r.ownerId);
const INBOUND_IDS = [...INBOUND_OWNER_IDS];

const ACTIVATION_FIELDS =
  "SELECT Id, OwnerId, Owner.Name, IsWon, Won_Date__c, StageName, AccountId, " +
  "Account.Name, Account.BillingCity, Account.provider_first_active_date__c, RecordType.Name " +
  "FROM Opportunity";

/** Extra CloseDate + Reactivated_Date__c for RecordType=Reactivation dating. */
const REACTIVATION_FIELDS =
  "SELECT Id, OwnerId, Owner.Name, IsWon, Won_Date__c, CloseDate, StageName, AccountId, " +
  "Account.Name, Account.BillingCity, Account.provider_first_active_date__c, " +
  "Account.Reactivated_Date__c, RecordType.Name " +
  "FROM Opportunity";

function quoteList(values) {
  return values.map((v) => `'${v}'`).join(",");
}

/** SOQL for one scope's activation export (whole tracking year). */
export function activationQuery(ownerIds, year = currentTrackingYear()) {
  return (
    `${ACTIVATION_FIELDS} ` +
    "WHERE RecordType.Name = 'Sales Opportunity' " +
    "AND Account.provider_first_active_date__c != null " +
    `AND Account.provider_first_active_date__c >= ${year}-01-01 ` +
    `AND OwnerId IN (${quoteList(ownerIds)}) ` +
    "ORDER BY Account.provider_first_active_date__c"
  );
}

/**
 * SOQL for one scope's REACTIVATION candidates:
 *   1. won Sales Opportunities of the tracking year whose Account was
 *      first-active BEFORE the tracking year (classic path), OR
 *   2. won RecordType=Reactivation opportunities (commercial reactivation
 *      deals — often Won_Date__c is null; dated via Account.Reactivated_Date__c
 *      / CloseDate) on pre-tracking-year first-active accounts.
 * The build dates each reactivation via reactivationEventDate — see
 * lib/mtd-history.mjs accumulateMtdReactivated.
 */
export function reactivationQuery(ownerIds, year = currentTrackingYear()) {
  return (
    `${REACTIVATION_FIELDS} ` +
    "WHERE RecordType.Name IN ('Sales Opportunity', 'Reactivation') " +
    "AND IsWon = true " +
    "AND Account.provider_first_active_date__c != null " +
    `AND Account.provider_first_active_date__c < ${year}-01-01 ` +
    "AND (" +
    `Won_Date__c >= ${year}-01-01 ` +
    "OR (RecordType.Name = 'Reactivation' AND (" +
    `Account.Reactivated_Date__c >= ${year}-01-01 OR CloseDate >= ${year}-01-01` +
    "))" +
    ") " +
    `AND OwnerId IN (${quoteList(ownerIds)}) ` +
    "ORDER BY Won_Date__c NULLS LAST, CloseDate"
  );
}

export const ACTIVATION_KINDS = {
  team: {
    ownerIds: TEAM_OWNER_IDS,
    file: (y) => `scripts/.cache/sf-account-activation-${y}.json`,
    query: activationQuery,
  },
  inbound: {
    ownerIds: INBOUND_IDS,
    file: (y) => `scripts/.cache/sf-inbound-account-activation-${y}.json`,
    query: activationQuery,
  },
  "team-reactivation": {
    ownerIds: TEAM_OWNER_IDS,
    file: (y) => `scripts/.cache/sf-reactivation-${y}.json`,
    query: reactivationQuery,
  },
  "inbound-reactivation": {
    ownerIds: INBOUND_IDS,
    file: (y) => `scripts/.cache/sf-inbound-reactivation-${y}.json`,
    query: reactivationQuery,
  },
};

/** Manifest entries consumed by gen-all-cache-queries.mjs / validate-caches.mjs. */
export function buildActivationManifest(year = currentTrackingYear()) {
  return Object.entries(ACTIVATION_KINDS).map(([kind, { ownerIds, file, query }]) => ({
    kind,
    file: file(year),
    query: query(ownerIds, year),
  }));
}

function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, "").split("=");
      return [k, v ?? true];
    }),
  );
  const year = Number(args.year) || currentTrackingYear();
  const kinds = args.kind ? [args.kind] : Object.keys(ACTIVATION_KINDS);
  for (const k of kinds) {
    if (!ACTIVATION_KINDS[k]) {
      console.error(`Unknown --kind=${k}. Use ${Object.keys(ACTIVATION_KINDS).join(" | ")}.`);
      process.exit(1);
    }
  }

  const manifest = buildActivationManifest(year).filter((m) => kinds.includes(m.kind));

  if (args.json) {
    console.log(JSON.stringify({ year, chunks: manifest }, null, 2));
    return;
  }

  console.error(
    `[gen-activation-queries] year ${year}, kinds: ${kinds.join(", ")}. ` +
      "Activated = Account.provider_first_active_date__c (one per account, attributed to the won opp owner). " +
      "Reactivation kinds = pre-tracking-year first-active accounts with a tracking-year won opp.",
  );
  for (const c of manifest) {
    console.log(`-- [activation ${c.kind} ${year}] → ${c.file}`);
    console.log(c.query);
    console.log("");
  }
  console.error(
    "Run the queries above via the Salesforce MCP, confirm done:true and < 2000 rows, then save each " +
      "result JSON to its target file. If the team pull nears 2,000 rows, split by month on " +
      "Account.provider_first_active_date__c.",
  );
}

if (import.meta.url === `file://${process.argv[1]}`) main();
