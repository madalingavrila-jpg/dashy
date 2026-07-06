/** Build per-month MTD won (Won_Date__c) and activated (field history) history. */

import {
  agentSegment,
  buildMtdAchievement,
  enrichAgent,
  ensureTeamRoster,
  emptyMtdRosterAgent,
  isExcludedAgent,
} from "./agent-segments.mjs";

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
    city: opp.Account?.BillingCity ?? "—",
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
 */
export function buildHybridMtdStore(wonRecords, activationRecords) {
  const store = accumulateMtdActivatedFromActivationDate(activationRecords);
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

export function buildMtdHistoryFromHybrid(wonRecords, activationRecords) {
  const store = buildHybridMtdStore(wonRecords, activationRecords);
  return mtdHistoryFromStore(store);
}

export function currentMonthKey(ref = new Date()) {
  return monthKeyFromDate(ref);
}
