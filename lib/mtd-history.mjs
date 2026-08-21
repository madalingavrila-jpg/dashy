/** Build per-month MTD won (Won_Date__c) and activated (field history) history. */

import {
  agentSegment,
  buildMtdAchievement,
  enrichAgent,
  ensureTeamRoster,
  emptyMtdRosterAgent,
  isExcludedAgent,
} from "./agent-segments.mjs";
import { resolveAccountCity } from "./city-overrides.mjs";
import { forcedReactivationOpps } from "./activation-overrides.mjs";

const BUCHAREST = "Europe/Bucharest";
const MTD_ACTIVATED_STAGE = "Activated";

const RECORD_TYPE_WON_MTD = "Sales Opportunity";
const RECORD_TYPES_ACTIVATED = new Set(["Sales Opportunity"]);

function monthLabelFromKey(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1, 12));
  return date.toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: BUCHAREST });
}

function calendarPartsInTz(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUCHAREST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  return { year: get("year"), month: get("month"), day: get("day") };
}

function monthKeyFromDate(date) {
  if (!date) return null;
  const { year, month } = calendarPartsInTz(date);
  return year && month ? `${year}-${month}` : null;
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
  return `${year}-${month}-${day}`;
}

function isAllowedActivatedRecordType(hist) {
  const rt = hist.Opportunity?.RecordType?.Name;
  if (!rt) return true;
  return RECORD_TYPES_ACTIVATED.has(rt);
}

/**
 * Won MTD = Sales Opportunity with Won_Date__c in month (Europe/Bucharest).
 * Stage is not filtered — opps in Onboarding / Activated still count if Won_Date__c is set.
 */
export function isWonMtdOpportunity(opp) {
  const rt = opp.RecordType?.Name;
  if (rt && rt !== RECORD_TYPE_WON_MTD) return false;
  return Boolean(opp.Won_Date__c);
}

function pseudoOppFromHistory(hist, eventDate) {
  const opp = hist.Opportunity ?? {};
  return {
    Id: hist.OpportunityId,
    Name: opp.Name ?? "—",
    Account: opp.Account,
    AccountId: opp.AccountId,
    StageName: hist.NewValue,
    OwnerId: opp.OwnerId,
    Owner: opp.Owner,
    Won_Date__c: formatEventDate(eventDate),
    CloseDate: formatEventDate(eventDate),
  };
}

export function mapMtdItem(opp) {
  return {
    id: opp.Id,
    name: opp.Account?.Name ?? opp.Name ?? "—",
    city: resolveAccountCity(opp.AccountId, opp.Account?.BillingCity),
    closeDate: opp.Won_Date__c ?? opp.CloseDate ?? "—",
    sfOpportunityId: opp.Id,
    sfAccountId: opp.AccountId,
  };
}

/**
 * Default classifier — Complex/Density team reps. Pass a different one (e.g. the
 * inbound classifier) via the accumulator `opts` to scope a build to a separate
 * roster without touching the team tabs.
 */
const DEFAULT_CLASSIFIER = { segmentOf: agentSegment, isExcluded: isExcludedAgent };

function upsertAgentMonth(store, monthKey, opp, classifier = DEFAULT_CLASSIFIER) {
  const ownerId = opp.OwnerId;
  const name = opp.Owner?.Name ?? "Unknown";
  if (classifier.isExcluded(name, ownerId)) return null;

  const segment = classifier.segmentOf(name, ownerId);
  if (!segment) return null;

  if (!store.has(monthKey)) store.set(monthKey, new Map());
  const monthAgents = store.get(monthKey);

  if (!monthAgents.has(ownerId)) {
    monthAgents.set(ownerId, {
      ownerId,
      name,
      segment,
      wonMtd: 0,
      activatedMtd: 0,
      wonItems: [],
      activatedItems: [],
    });
  }
  return monthAgents.get(ownerId);
}

/**
 * Won MTD from Won_Date__c (SF dashboard Won Date = This Month).
 * Month = Won_Date__c in Europe/Bucharest; one row per opportunity.
 */
export function accumulateMtdWonFromWonDate(records, store = new Map(), classifier = DEFAULT_CLASSIFIER) {
  for (const opp of records ?? []) {
    if (!isWonMtdOpportunity(opp)) continue;

    const monthKey = monthKeyFromDate(parseSfDate(opp.Won_Date__c));
    if (!monthKey) continue;

    const agent = upsertAgentMonth(store, monthKey, opp, classifier);
    if (!agent) continue;

    agent.wonMtd += 1;
    agent.wonItems.push(mapMtdItem(opp));
  }
  return store;
}

/**
 * Pick the primary won Sales Opportunity for an account (owner attribution).
 * The activation date is an account-level field, so an account may carry several
 * team opportunities. Prefer the won opp, then the most recent Won_Date__c, then
 * a stable Id tiebreak — mirroring dashy's existing won-opp → owner attribution.
 */
export function pickPrimaryActivationOpp(opps) {
  return [...opps].sort((a, b) => {
    const wonA = a.IsWon ? 1 : 0;
    const wonB = b.IsWon ? 1 : 0;
    if (wonA !== wonB) return wonB - wonA;
    const dateA = a.Won_Date__c ?? "";
    const dateB = b.Won_Date__c ?? "";
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return (a.Id ?? "").localeCompare(b.Id ?? "");
  })[0];
}

/** Pseudo-opportunity for an activation record so mapMtdItem shows the activation date. */
function pseudoOppFromActivation(opp, activeDate) {
  return {
    Id: opp.Id,
    Name: opp.Name ?? opp.Account?.Name ?? "—",
    Account: opp.Account,
    AccountId: opp.AccountId,
    StageName: opp.StageName,
    OwnerId: opp.OwnerId,
    Owner: opp.Owner,
    Won_Date__c: activeDate,
    CloseDate: activeDate,
  };
}

/**
 * Tracking year for reactivation dating — the current Europe/Bucharest calendar
 * year (same rule as lib/weekly-stages-build.mjs currentTrackingYear, duplicated
 * here to avoid a circular import; honors the same WEEKLY_TRACKING_YEAR override).
 */
function trackingYearForNow(ref = new Date()) {
  const override = Number(process.env.WEEKLY_TRACKING_YEAR);
  if (Number.isInteger(override) && override > 2000) return override;
  return Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: BUCHAREST, year: "numeric" }).format(ref),
  );
}

/**
 * Index of the FIRST field-history transition INTO the 'Activated' stage per
 * opportunity, restricted to the given tracking year (Europe/Bucharest).
 * Used to date REACTIVATIONS (accounts first-active before the tracking year).
 */
export function firstActivatedTransitionIndex(historyRecords, year = trackingYearForNow()) {
  const index = new Map();
  for (const hist of historyRecords ?? []) {
    if (hist.Field !== "StageName" || hist.NewValue !== MTD_ACTIVATED_STAGE) continue;
    const date = parseSfDate(hist.CreatedDate);
    if (!date) continue;
    if (Number(calendarPartsInTz(date).year) !== year) continue;
    const cur = index.get(hist.OpportunityId);
    if (!cur || date < cur) index.set(hist.OpportunityId, date);
  }
  return index;
}

const REACTIVATION_RECORD_TYPE = "Reactivation";

/**
 * Reactivation event date for one account's opp group (Europe/Bucharest):
 *   1. earliest field-history transition INTO 'Activated' in the tracking year
 *      across the account's opps (primary signal), else
 *   2. the primary opp's Won_Date__c — ONLY when that opp is already in the
 *      'Activated' stage (history gap fallback), else
 *   3. RecordType=Reactivation (or Account.Reactivated_Date__c set): use
 *      Account.Reactivated_Date__c, then CloseDate when IsWon — these deals
 *      often have null Won_Date__c and never enter the 'Activated' stage, else
 *   4. null — the account has not gone live yet (won but still onboarding);
 *      it will count once the Activated transition lands.
 */
export function reactivationEventDate(opps, transitionIndex, primary) {
  let earliest = null;
  for (const opp of opps) {
    const t = transitionIndex.get(opp.Id);
    if (t && (!earliest || t < earliest)) earliest = t;
  }
  if (earliest) return earliest;
  if (primary?.StageName === MTD_ACTIVATED_STAGE && primary?.Won_Date__c) {
    return parseSfDate(primary.Won_Date__c);
  }
  const rt = primary?.RecordType?.Name;
  const reDate = primary?.Account?.Reactivated_Date__c;
  if (rt === REACTIVATION_RECORD_TYPE || reDate) {
    if (reDate) return parseSfDate(reDate);
    if (primary?.IsWon && primary?.CloseDate) return parseSfDate(primary.CloseDate);
  }
  return null;
}

/**
 * REACTIVATIONS → Activated MTD. A reactivation is an account with a tracking-
 * year won Sales Opportunity OR won RecordType=Reactivation opp whose
 * `provider_first_active_date__c` is BEFORE the tracking year (so the base
 * activation accumulator skips it). Same dedup (one per account) and owner
 * attribution as base Activated; dated by reactivationEventDate. Items are
 * flagged `reactivated: true` for the drill-down lists.
 */
export function accumulateMtdReactivated(
  reactivationRecords,
  historyRecords,
  store = new Map(),
  classifier = DEFAULT_CLASSIFIER,
  year = trackingYearForNow(),
) {
  const transitionIndex = firstActivatedTransitionIndex(historyRecords, year);
  const byAccount = dedupeActivationByAccount(reactivationRecords);
  for (const opps of byAccount.values()) {
    const primary = pickPrimaryActivationOpp(opps);
    const firstActive = primary?.Account?.provider_first_active_date__c;
    // Belt: base logic owns accounts first-active in the tracking year.
    if (!firstActive || Number(firstActive.slice(0, 4)) >= year) continue;

    const eventDate = reactivationEventDate(opps, transitionIndex, primary);
    if (!eventDate) continue;

    const monthKey = monthKeyFromDate(eventDate);
    if (!monthKey || Number(monthKey.slice(0, 4)) !== year) continue;

    const pseudo = pseudoOppFromActivation(primary, formatEventDate(eventDate));
    const agent = upsertAgentMonth(store, monthKey, pseudo, classifier);
    if (!agent) continue;

    agent.activatedMtd += 1;
    agent.activatedItems.push({ ...mapMtdItem(pseudo), reactivated: true });
  }
  return store;
}

/**
 * FORCED reactivations (lib/activation-overrides.mjs) → Activated MTD. One-off
 * same-tracking-year re-wins that both other accumulators skip. Scans the base
 * activation export (the re-win opp lives there, not in the reactivation
 * candidate export) and dates each forced opp by its OWN first transition INTO
 * 'Activated', so the original activation month is not reused.
 */
export function accumulateMtdForcedReactivations(
  activationRecords,
  historyRecords,
  store = new Map(),
  classifier = DEFAULT_CLASSIFIER,
  year = trackingYearForNow(),
) {
  const transitionIndex = firstActivatedTransitionIndex(historyRecords, year);
  const seen = new Set();
  for (const opp of forcedReactivationOpps(activationRecords)) {
    if (seen.has(opp.Id)) continue;
    const eventDate = transitionIndex.get(opp.Id);
    if (!eventDate) continue;

    const monthKey = monthKeyFromDate(eventDate);
    if (!monthKey || Number(monthKey.slice(0, 4)) !== year) continue;

    const pseudo = pseudoOppFromActivation(opp, formatEventDate(eventDate));
    const agent = upsertAgentMonth(store, monthKey, pseudo, classifier);
    if (!agent) continue;

    seen.add(opp.Id);
    agent.activatedMtd += 1;
    agent.activatedItems.push({ ...mapMtdItem(pseudo), reactivated: true });
  }
  return store;
}

/**
 * Group won Sales Opportunity activation records by AccountId (activation is an
 * account-level field, so multiple opps per account must be deduped to one).
 */
export function dedupeActivationByAccount(activationRecords) {
  const byAccount = new Map();
  for (const opp of activationRecords ?? []) {
    const acctId = opp.AccountId ?? opp.Id;
    if (!byAccount.has(acctId)) byAccount.set(acctId, []);
    byAccount.get(acctId).push(opp);
  }
  return byAccount;
}

/**
 * Activated MTD from `Account.provider_first_active_date__c` (the SF Account
 * date field, ~99.9% populated). Event month = that date in Europe/Bucharest.
 * One activation per ACCOUNT (deduped across the account's team opps); attributed
 * to the primary won opp's owner. This REPLACED the old field-history "first
 * transition INTO Activated" source — see AGENTS.md (Activated = provider first
 * active date). Reactivations/boundary shifts are expected differences vs the
 * old stage-transition counts.
 */
export function accumulateMtdActivatedFromActivationDate(
  activationRecords,
  store = new Map(),
  classifier = DEFAULT_CLASSIFIER,
) {
  const byAccount = dedupeActivationByAccount(activationRecords);
  for (const opps of byAccount.values()) {
    const primary = pickPrimaryActivationOpp(opps);
    const activeDate = primary?.Account?.provider_first_active_date__c;
    if (!activeDate) continue;

    const monthKey = monthKeyFromDate(parseSfDate(activeDate));
    if (!monthKey) continue;

    const pseudo = pseudoOppFromActivation(primary, activeDate);
    const agent = upsertAgentMonth(store, monthKey, pseudo, classifier);
    if (!agent) continue;

    agent.activatedMtd += 1;
    agent.activatedItems.push(mapMtdItem(pseudo));
  }
  return store;
}

/**
 * Legacy: Activated MTD from first transition INTO Activated (field history).
 * Event month = OpportunityFieldHistory.CreatedDate in Europe/Bucharest.
 * RETAINED for reference/back-compat; the live Activated source is now
 * accumulateMtdActivatedFromActivationDate (provider_first_active_date__c).
 */
export function accumulateMtdActivatedFromStageHistory(historyRecords, store = new Map(), classifier = DEFAULT_CLASSIFIER) {
  const sorted = [...(historyRecords ?? [])].sort(
    (a, b) => new Date(a.CreatedDate) - new Date(b.CreatedDate),
  );
  const seenActivated = new Set();

  for (const hist of sorted) {
    if (hist.Field !== "StageName") continue;
    if (hist.NewValue !== MTD_ACTIVATED_STAGE) continue;

    const dedupeKey = `${hist.OpportunityId}:${MTD_ACTIVATED_STAGE}`;
    if (seenActivated.has(dedupeKey)) continue;
    if (!isAllowedActivatedRecordType(hist)) continue;

    const opp = hist.Opportunity ?? {};
    const ownerId = opp.OwnerId;
    const ownerName = opp.Owner?.Name ?? "";
    if (!ownerId || classifier.isExcluded(ownerName, ownerId)) continue;
    if (!classifier.segmentOf(ownerName, ownerId)) continue;

    const eventDate = parseSfDate(hist.CreatedDate);
    const monthKey = monthKeyFromDate(eventDate);
    if (!monthKey) continue;

    seenActivated.add(dedupeKey);

    const pseudo = pseudoOppFromHistory(hist, eventDate);
    const agent = upsertAgentMonth(store, monthKey, pseudo, classifier);
    if (!agent) continue;

    agent.activatedMtd += 1;
    agent.activatedItems.push(mapMtdItem(pseudo));
  }

  return store;
}

/**
 * MTD store — single canonical Won definition for EVERY month:
 *   - Activated: `Account.provider_first_active_date__c` month (one per account,
 *     attributed to the primary won opp's owner). Was field-history transitions
 *     INTO Activated; switched per AGENTS.md.
 *   - Won: `Won_Date__c` (Sales Opportunity) via `isWonMtdOpportunity`,
 *     bucketed by the Bucharest calendar month of `Won_Date__c`.
 *
 * Callers MUST pass the full-year Won_Date export (sf-won-ytd-bydate.json,
 * merged with the THIS_MONTH export) as `wonRecords` so prior months are
 * counted from Won_Date too — NOT from a field-history "Closed Won" fallback.
 * The old fallback double-counted bulk stage backfills (e.g. phantom January
 * inflation) and broke the Won≠Activated / canonical-Won contract.
 *
 * `activationRecords` are the won Sales Opportunities joined to
 * Account.provider_first_active_date__c (scripts/.cache/sf-account-activation-*).
 *
 * `reactivation` (optional) = { records, historyRecords }: the reactivation
 * candidate export (scripts/.cache/sf-reactivation-*) plus the stage-history
 * records used to date each reactivation (first INTO 'Activated'). Reactivated
 * accounts (pre-tracking-year first-active) count toward Activated too.
 */
export function buildHybridMtdStore(wonRecords, activationRecords, reactivation = null) {
  const store = accumulateMtdActivatedFromActivationDate(activationRecords);
  if (reactivation) {
    accumulateMtdReactivated(reactivation.records, reactivation.historyRecords, store);
  }
  accumulateMtdForcedReactivations(activationRecords, reactivation?.historyRecords, store);
  accumulateMtdWonFromWonDate(wonRecords, store);
  return store;
}

export function mtdHistoryFromStore(store) {
  const monthKeys = [...store.keys()].sort((a, b) => b.localeCompare(a));

  return monthKeys.map((monthKey) => {
    const agents = ensureTeamRoster([...store.get(monthKey).values()], {
      emptyRow: emptyMtdRosterAgent,
    }).sort((a, b) => b.wonMtd - a.wonMtd || a.name.localeCompare(b.name));

    const monthLabel = monthLabelFromKey(monthKey);
    const mtdAchievement = buildMtdAchievement(agents, monthLabel);

    return {
      monthKey,
      monthLabel,
      agents: agents.map((agent) => ({
        ownerId: agent.ownerId,
        name: agent.name,
        segment: agent.segment,
        wonMtd: agent.wonMtd,
        activatedMtd: agent.activatedMtd,
        wonItems: agent.wonItems,
        activatedItems: agent.activatedItems,
      })),
      mtdAchievement,
    };
  });
}

/** Per-owner MTD counts for a single month from the field-history store. */
export function mtdAgentsForMonth(store, monthKey) {
  const monthAgents = store.get(monthKey);
  if (!monthAgents) return new Map();
  return monthAgents;
}

/** Merge SF export payloads, deduping opportunities by Id. */
export function mergeWonExportRecords(exports) {
  const byId = new Map();
  for (const payload of exports) {
    for (const opp of payload?.records ?? []) {
      if (opp?.Id) byId.set(opp.Id, opp);
    }
  }
  return [...byId.values()];
}

export function buildMtdHistoryFromHybrid(wonRecords, activationRecords, reactivation = null) {
  const store = buildHybridMtdStore(wonRecords, activationRecords, reactivation);
  return mtdHistoryFromStore(store);
}

export function currentMonthKey(ref = new Date()) {
  return monthKeyFromDate(ref);
}
