/** Weekly account status buckets mapped from Salesforce stages. */

import { dedupeActivationByAccount, pickPrimaryActivationOpp } from "./mtd-history.mjs";

export const WEEKLY_STATUS_KEYS = ["qualified", "negotiations", "closedWon", "active"];

export const WEEKLY_QUALIFIED_STAGES = ["New Opportunity", "Contacting DCM", "First Pitch"];
export const WEEKLY_NEGOTIATIONS_STAGES = ["Negotiations"];
/**
 * Weekly "Closed Won" mirrors the canonical MTD Won definition (Won_Date__c set,
 * RecordType = 'Sales Opportunity', team reps) bucketed by ISO week — see
 * accumulateWeeklyClosedWonFromWonDate. It is NOT derived from field-history
 * "Closed Won" transitions, so "Closed Won" is absent from STAGE_TO_WEEKLY_STATUS.
 *
 * Weekly "Active" now mirrors the MTD Activated definition too:
 * `Account.provider_first_active_date__c` bucketed by ISO week — see
 * accumulateWeeklyActiveFromActivationDate. It is NO LONGER derived from the
 * field-history transition INTO the "Activated" stage, so "Activated" is
 * intentionally absent from STAGE_TO_WEEKLY_STATUS below.
 */
export const WEEKLY_ACTIVE_STAGES = ["Activated"];

/**
 * SF stage → weekly status bucket (first transition INTO stage counts).
 * NOTE: "Closed Won" and "Activated" are deliberately excluded here — weekly Won
 * is computed from Won_Date__c (accumulateWeeklyClosedWonFromWonDate) and weekly
 * Active from provider_first_active_date__c (accumulateWeeklyActiveFromActivationDate),
 * to match the rest of the app.
 */
export const STAGE_TO_WEEKLY_STATUS = {
  "New Opportunity": "qualified",
  "Contacting DCM": "qualified",
  "First Pitch": "qualified",
  Negotiations: "negotiations",
};

/** Record type for the canonical Won definition (matches lib/mtd-history.mjs). */
const WON_RECORD_TYPE = "Sales Opportunity";

const TRACKED_STAGES = new Set(Object.keys(STAGE_TO_WEEKLY_STATUS));

export const COMPLEX_WEEKLY_TARGETS = {
  qualified: 3,
  negotiations: 2,
  closedWon: 3,
  active: 2,
};
export const DENSITY_WEEKLY_TARGETS = {
  qualified: 8,
  negotiations: 5,
  closedWon: 8,
  active: 6,
};

const TZ = "Europe/Bucharest";

/**
 * Tracking year for the weekly history slice. Derived from the current
 * Europe/Bucharest calendar year instead of a literal (was hardcoded `2026`,
 * which would have silently dropped all weeks once the calendar rolled into
 * 2027-01-01). Override with WEEKLY_TRACKING_YEAR for backfills/tests.
 */
export function currentTrackingYear(ref = new Date()) {
  const override = Number(process.env.WEEKLY_TRACKING_YEAR);
  if (Number.isInteger(override) && override > 2000) return override;
  return Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric" }).format(ref),
  );
}

const TRACKING_YEAR = currentTrackingYear();

export function emptyWeeklyStatusCounts() {
  return { qualified: 0, negotiations: 0, closedWon: 0, active: 0 };
}

export function weeklyTargetsForSegment(segment) {
  return segment === "complex" ? { ...COMPLEX_WEEKLY_TARGETS } : { ...DENSITY_WEEKLY_TARGETS };
}

function calendarPartsInTz(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function isoWeekFromYmd(year, month, day) {
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

/** ISO week key using Europe/Bucharest calendar date. */
export function weekKey(date) {
  const { year, month, day } = calendarPartsInTz(date);
  const { year: isoYear, week } = isoWeekFromYmd(year, month, day);
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

export function weekLabel(key) {
  const [, w] = key.split("-W");
  return `W${String(Number(w)).padStart(2, "0")}`;
}

function parseSfDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00Z`);
  }
  return new Date(value);
}

function formatEventDate(date) {
  const { year, month, day } = calendarPartsInTz(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function accountEntry(rec, eventDate) {
  return {
    id: rec.Id,
    name: rec.Account?.Name ?? rec.Name ?? "—",
    city: rec.Account?.BillingCity ?? "—",
    stage: rec.StageName,
    date: formatEventDate(eventDate),
    sfOpportunityId: rec.Id,
    sfAccountId: rec.AccountId ?? undefined,
  };
}

function bumpCount(bucket, segment, ownerId, statusKey, rec, eventDate) {
  bucket.teams[segment][statusKey] += 1;
  if (!bucket.agents[ownerId]) {
    bucket.agents[ownerId] = { ...emptyWeeklyStatusCounts(), accounts: {} };
  }
  bucket.agents[ownerId][statusKey] += 1;
  if (!bucket.agents[ownerId].accounts[statusKey]) {
    bucket.agents[ownerId].accounts[statusKey] = [];
  }
  bucket.agents[ownerId].accounts[statusKey].push(accountEntry(rec, eventDate));
}

function applyEvent(weekStore, segment, ownerId, statusKey, rec, eventDate) {
  if (!eventDate) return;
  const { year } = calendarPartsInTz(eventDate);
  if (year !== TRACKING_YEAR) return;
  const k = weekKey(eventDate);
  const bucket = weekStore[k];
  if (!bucket) return;
  bumpCount(bucket, segment, ownerId, statusKey, rec, eventDate);
}

function pseudoOppFromHistory(hist) {
  const opp = hist.Opportunity ?? {};
  return {
    Id: hist.OpportunityId,
    Name: opp.Name ?? "—",
    Account: opp.Account,
    AccountId: opp.AccountId,
    StageName: hist.NewValue,
    OwnerId: opp.OwnerId,
    Owner: opp.Owner,
  };
}

/** Record types allowed per weekly bucket (Romania SF model). */
const RECORD_TYPES_BY_STATUS = {
  qualified: new Set(["Sales Opportunity", "Parent Opportunity"]),
  negotiations: new Set(["Sales Opportunity"]),
  closedWon: new Set(["Parent Opportunity", "Sales Opportunity"]),
  active: new Set(["Sales Opportunity"]),
};

function isAllowedRecordType(statusKey, hist) {
  const rt = hist.Opportunity?.RecordType?.Name;
  if (!rt) return true;
  const allowed = RECORD_TYPES_BY_STATUS[statusKey];
  return allowed?.has(rt) ?? rt === "Sales Opportunity";
}

/**
 * Increment weekly status counts from OpportunityFieldHistory (StageName transitions).
 * Uses the first transition INTO each tracked stage per opportunity.
 * Closed Won = first INTO "Closed Won" (week from history CreatedDate); opps now Activated still count in that week.
 */
export function accumulateWeeklyStatusFromHistory(historyRecords, weekStore, agentSegmentFn, isExcludedFn) {
  const seen = new Set();
  const sorted = [...(historyRecords ?? [])].sort(
    (a, b) => new Date(a.CreatedDate) - new Date(b.CreatedDate),
  );

  for (const hist of sorted) {
    if (hist.Field !== "StageName") continue;
    const newStage = hist.NewValue;
    if (!TRACKED_STAGES.has(newStage)) continue;

    const statusKey = STAGE_TO_WEEKLY_STATUS[newStage];
    if (!isAllowedRecordType(statusKey, hist)) continue;

    const dedupeKey = `${hist.OpportunityId}:${newStage}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const opp = hist.Opportunity ?? {};
    const ownerId = opp.OwnerId;
    const ownerName = opp.Owner?.Name ?? "";
    if (!ownerId || isExcludedFn(ownerName, ownerId)) continue;

    const segment = agentSegmentFn(ownerName, ownerId);
    if (!segment) continue;

    const eventDate = parseSfDate(hist.CreatedDate);
    applyEvent(weekStore, segment, ownerId, statusKey, pseudoOppFromHistory(hist), eventDate);
  }
}

/**
 * Weekly "Closed Won" — canonical Won definition, bucketed by ISO week.
 *
 * Mirrors MTD Won (lib/mtd-history.mjs `isWonMtdOpportunity`): an opportunity
 * counts when `Won_Date__c` is set and RecordType is "Sales Opportunity" (or
 * unset). Week = ISO week (Europe/Bucharest) of `Won_Date__c`. One row per
 * opportunity. Stage is NOT filtered — opps now in Onboarding / Activated still
 * count if Won_Date__c is set, exactly like MTD. Team reps only (12; excludes
 * Teodor Domnica & Andrei-Sebastian Caba via isExcludedFn).
 */
export function accumulateWeeklyClosedWonFromWonDate(wonRecords, weekStore, agentSegmentFn, isExcludedFn) {
  const seen = new Set();
  for (const opp of wonRecords ?? []) {
    const rt = opp.RecordType?.Name;
    if (rt && rt !== WON_RECORD_TYPE) continue;
    if (!opp.Won_Date__c) continue;

    if (opp.Id) {
      if (seen.has(opp.Id)) continue;
      seen.add(opp.Id);
    }

    const ownerId = opp.OwnerId;
    const ownerName = opp.Owner?.Name ?? "";
    if (!ownerId || isExcludedFn(ownerName, ownerId)) continue;

    const segment = agentSegmentFn(ownerName, ownerId);
    if (!segment) continue;

    const eventDate = parseSfDate(opp.Won_Date__c);
    applyEvent(weekStore, segment, ownerId, "closedWon", opp, eventDate);
  }
}

/**
 * Weekly "Active" — mirrors MTD Activated (Account.provider_first_active_date__c),
 * bucketed by ISO week. One activation per ACCOUNT (deduped across the account's
 * team opps via pickPrimaryActivationOpp) attributed to the primary won opp's
 * owner. Week = ISO week (Europe/Bucharest) of provider_first_active_date__c.
 * Replaces the old field-history transition INTO the "Activated" stage.
 */
export function accumulateWeeklyActiveFromActivationDate(
  activationRecords,
  weekStore,
  agentSegmentFn,
  isExcludedFn,
) {
  const byAccount = dedupeActivationByAccount(activationRecords);
  for (const opps of byAccount.values()) {
    const primary = pickPrimaryActivationOpp(opps);
    const activeDate = primary?.Account?.provider_first_active_date__c;
    if (!activeDate) continue;

    const ownerId = primary.OwnerId;
    const ownerName = primary.Owner?.Name ?? "";
    if (!ownerId || isExcludedFn(ownerName, ownerId)) continue;

    const segment = agentSegmentFn(ownerName, ownerId);
    if (!segment) continue;

    const rec = {
      Id: primary.Id,
      Name: primary.Name ?? primary.Account?.Name ?? "—",
      Account: primary.Account,
      AccountId: primary.AccountId,
      StageName: primary.StageName,
      OwnerId: ownerId,
      Owner: primary.Owner,
    };
    applyEvent(weekStore, segment, ownerId, "active", rec, parseSfDate(activeDate));
  }
}

/**
 * Fallback for New Opportunity: field history often omits the initial stage at creation.
 * Count CreatedDate for opps still in New Opportunity that have no history entry yet.
 */
export function accumulateNewOpportunityFallback(records, weekStore, agentSegmentFn, isExcludedFn, seenKeys) {
  for (const rec of records ?? []) {
    if (rec.StageName !== "New Opportunity" || !rec.CreatedDate) continue;
    const dedupeKey = `${rec.Id}:New Opportunity`;
    if (seenKeys?.has(dedupeKey)) continue;

    const ownerId = rec.OwnerId;
    const ownerName = rec.Owner?.Name ?? "";
    if (!ownerId || isExcludedFn(ownerName, ownerId)) continue;

    const segment = agentSegmentFn(ownerName, ownerId);
    if (!segment) continue;

    const eventDate = parseSfDate(rec.CreatedDate);
    applyEvent(weekStore, segment, ownerId, "qualified", rec, eventDate);
  }
}

export function initWeeklyBreakdownStore(maxWeek = 24) {
  const store = {};
  for (let w = 1; w <= maxWeek; w += 1) {
    const key = `${TRACKING_YEAR}-W${String(w).padStart(2, "0")}`;
    store[key] = {
      week: weekLabel(key),
      teams: {
        complex: emptyWeeklyStatusCounts(),
        density: emptyWeeklyStatusCounts(),
      },
      agents: {},
    };
  }
  return store;
}

function stripAgentAccounts(agentData) {
  const counts = emptyWeeklyStatusCounts();
  for (const key of WEEKLY_STATUS_KEYS) {
    counts[key] = agentData[key] ?? 0;
  }
  return counts;
}

export function breakdownStoreToHistory(store) {
  // Emit every initialized week (W01 through the current ISO week). Previously
  // capped at .slice(0, 24), which silently dropped W25+ once the calendar
  // advanced past week 24 — the root cause of "nu apare W25".
  return Object.keys(store)
    .sort()
    .map((k) => {
      const bucket = store[k];
      const agents = {};
      for (const [ownerId, data] of Object.entries(bucket.agents)) {
        agents[ownerId] = {
          ...stripAgentAccounts(data),
          accounts: data.accounts ?? {},
        };
      }
      return {
        week: bucket.week,
        teams: bucket.teams,
        agents,
      };
    });
}

/** Derive chart/table history from breakdown totals (single source of truth). */
export function deriveWeeklyHistory(breakdown, leadsByWeek = {}) {
  return breakdown.map((row) => {
    const { complex, density } = row.teams;
    return {
      week: row.week,
      leads: leadsByWeek[row.week] ?? 0,
      qualified: complex.qualified + density.qualified,
      negotiations: complex.negotiations + density.negotiations,
      closedWon: complex.closedWon + density.closedWon,
      active: complex.active + density.active,
    };
  });
}

/** Calendar month key (YYYY-MM, Europe/Bucharest) for a date. */
export function monthKeyInTz(date) {
  if (!date) return null;
  const { year, month } = calendarPartsInTz(date);
  return year && month ? `${year}-${String(month).padStart(2, "0")}` : null;
}

/**
 * Leads MTD = New Opportunity opps created in the given calendar month
 * (Europe/Bucharest), team reps only. Mirrors the weekly "leads" definition
 * scoped to a month — replaces the hardcoded `leadsMtd` literal.
 */
export function countMtdLeads(records, agentSegmentFn, isExcludedFn, monthKey) {
  let count = 0;
  for (const rec of records ?? []) {
    if (rec.StageName !== "New Opportunity" || !rec.CreatedDate) continue;
    const ownerId = rec.OwnerId;
    const ownerName = rec.Owner?.Name ?? "";
    if (!ownerId || isExcludedFn(ownerName, ownerId)) continue;
    if (!agentSegmentFn(ownerName, ownerId)) continue;
    if (monthKeyInTz(parseSfDate(rec.CreatedDate)) !== monthKey) continue;
    count += 1;
  }
  return count;
}

/**
 * Qualified MTD = first transition INTO a real qualification stage
 * (Contacting DCM / First Pitch) within the given calendar month
 * (Europe/Bucharest), team reps only. Excludes the initial "New Opportunity"
 * stage (that is counted as a lead, not a qualification) — replaces the
 * hardcoded `qualifiedMtd` literal.
 */
export function countMtdQualified(historyRecords, agentSegmentFn, isExcludedFn, monthKey) {
  const QUALIFIED_TRANSITION_STAGES = new Set(["Contacting DCM", "First Pitch"]);
  const seen = new Set();
  const sorted = [...(historyRecords ?? [])].sort(
    (a, b) => new Date(a.CreatedDate) - new Date(b.CreatedDate),
  );
  let count = 0;
  for (const hist of sorted) {
    if (hist.Field !== "StageName") continue;
    const newStage = hist.NewValue;
    if (!QUALIFIED_TRANSITION_STAGES.has(newStage)) continue;
    if (!isAllowedRecordType("qualified", hist)) continue;

    const dedupeKey = `${hist.OpportunityId}:${newStage}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const opp = hist.Opportunity ?? {};
    const ownerId = opp.OwnerId;
    const ownerName = opp.Owner?.Name ?? "";
    if (!ownerId || isExcludedFn(ownerName, ownerId)) continue;
    if (!agentSegmentFn(ownerName, ownerId)) continue;
    if (monthKeyInTz(parseSfDate(hist.CreatedDate)) !== monthKey) continue;
    count += 1;
  }
  return count;
}

/** Count New Opportunity leads by ISO week (CreatedDate, team agents only). */
export function countWeeklyLeads(records, agentSegmentFn, isExcludedFn) {
  const leadsByWeek = {};
  for (const rec of records ?? []) {
    const ownerId = rec.OwnerId;
    const ownerName = rec.Owner?.Name ?? "";
    if (!ownerId || isExcludedFn(ownerName, ownerId)) continue;
    if (!agentSegmentFn(ownerName, ownerId)) continue;
    if (rec.StageName !== "New Opportunity" || !rec.CreatedDate) continue;
    const created = parseSfDate(rec.CreatedDate);
    if (!created) continue;
    const { year } = calendarPartsInTz(created);
    if (year !== TRACKING_YEAR) continue;
    const label = weekLabel(weekKey(created));
    leadsByWeek[label] = (leadsByWeek[label] ?? 0) + 1;
  }
  return leadsByWeek;
}
