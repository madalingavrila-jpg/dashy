/** Build per-month MTD won (Won_Date__c) and activated (field history) history. */

import {
  agentSegment,
  buildMtdAchievement,
  enrichAgent,
  filterTeamAgents,
  isExcludedAgent,
} from "./agent-segments.mjs";

const BUCHAREST = "Europe/Bucharest";
const MTD_WON_STAGE = "Closed Won";
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

function upsertAgentMonth(store, monthKey, opp) {
  const ownerId = opp.OwnerId;
  const name = opp.Owner?.Name ?? "Unknown";
  if (isExcludedAgent(name, ownerId)) return null;

  const segment = agentSegment(name, ownerId);
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
export function accumulateMtdWonFromWonDate(records, store = new Map()) {
  for (const opp of records ?? []) {
    if (!isWonMtdOpportunity(opp)) continue;

    const monthKey = monthKeyFromDate(parseSfDate(opp.Won_Date__c));
    if (!monthKey) continue;

    const agent = upsertAgentMonth(store, monthKey, opp);
    if (!agent) continue;

    agent.wonMtd += 1;
    agent.wonItems.push(mapMtdItem(opp));
  }
  return store;
}

/** @deprecated Renamed — use accumulateMtdWonFromWonDate. */
export const accumulateMtdWonFromCloseDate = accumulateMtdWonFromWonDate;

/**
 * Activated MTD from first transition INTO Activated (field history).
 * Event month = OpportunityFieldHistory.CreatedDate in Europe/Bucharest.
 */
export function accumulateMtdActivatedFromStageHistory(historyRecords, store = new Map()) {
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
    if (!ownerId || isExcludedAgent(ownerName, ownerId)) continue;
    if (!agentSegment(ownerName, ownerId)) continue;

    const eventDate = parseSfDate(hist.CreatedDate);
    const monthKey = monthKeyFromDate(eventDate);
    if (!monthKey) continue;

    seenActivated.add(dedupeKey);

    const pseudo = pseudoOppFromHistory(hist, eventDate);
    const agent = upsertAgentMonth(store, monthKey, pseudo);
    if (!agent) continue;

    agent.activatedMtd += 1;
    agent.activatedItems.push(mapMtdItem(pseudo));
  }

  return store;
}

/** Field-history Closed Won only — fallback for mtdHistory months without Won_Date export. */
export function accumulateMtdWonFromStageHistory(historyRecords, store = new Map()) {
  const sorted = [...(historyRecords ?? [])].sort(
    (a, b) => new Date(a.CreatedDate) - new Date(b.CreatedDate),
  );
  const seenWon = new Set();

  for (const hist of sorted) {
    if (hist.Field !== "StageName") continue;
    if (hist.NewValue !== MTD_WON_STAGE) continue;

    const dedupeKey = `${hist.OpportunityId}:${MTD_WON_STAGE}`;
    if (seenWon.has(dedupeKey)) continue;

    const opp = hist.Opportunity ?? {};
    const ownerId = opp.OwnerId;
    const ownerName = opp.Owner?.Name ?? "";
    if (!ownerId || isExcludedAgent(ownerName, ownerId)) continue;
    if (!agentSegment(ownerName, ownerId)) continue;

    const eventDate = parseSfDate(hist.CreatedDate);
    const monthKey = monthKeyFromDate(eventDate);
    if (!monthKey) continue;

    seenWon.add(dedupeKey);

    const pseudo = pseudoOppFromHistory(hist, eventDate);
    const agent = upsertAgentMonth(store, monthKey, pseudo);
    if (!agent) continue;

    agent.wonMtd += 1;
    agent.wonItems.push(mapMtdItem(pseudo));
  }

  return store;
}

/**
 * Hybrid MTD store: activated from field history; won from Won_Date__c where exported,
 * else field-history Closed Won for prior months.
 */
export function buildHybridMtdStore(wonRecords, historyRecords) {
  const store = accumulateMtdActivatedFromStageHistory(historyRecords);
  accumulateMtdWonFromStageHistory(historyRecords, store);

  const wonDateStore = accumulateMtdWonFromWonDate(wonRecords, new Map());
  for (const [monthKey, wonAgents] of wonDateStore) {
    if (!store.has(monthKey)) store.set(monthKey, new Map());
    const monthStore = store.get(monthKey);
    // Won_Date__c export is authoritative — drop field-history won for this month.
    for (const agent of monthStore.values()) {
      agent.wonMtd = 0;
      agent.wonItems = [];
    }
    for (const [ownerId, wonAgent] of wonAgents) {
      if (monthStore.has(ownerId)) {
        const agent = monthStore.get(ownerId);
        agent.wonMtd = wonAgent.wonMtd;
        agent.wonItems = wonAgent.wonItems;
      } else {
        monthStore.set(ownerId, wonAgent);
      }
    }
  }

  return store;
}

/** @deprecated Use buildHybridMtdStore — kept for tests. */
export function accumulateMtdFromStageHistory(historyRecords, store = new Map()) {
  accumulateMtdWonFromStageHistory(historyRecords, store);
  accumulateMtdActivatedFromStageHistory(historyRecords, store);
  return store;
}

/** @deprecated Use accumulateMtdWonFromWonDate + accumulateMtdActivatedFromStageHistory. */
export function accumulateMtdHistoryRecords(records, store = new Map()) {
  accumulateMtdWonFromWonDate(records, store);
  for (const opp of records ?? []) {
    if (opp.StageName !== MTD_ACTIVATED_STAGE) continue;
    const monthKey = monthKeyFromDate(parseSfDate(opp.Won_Date__c ?? opp.CloseDate));
    if (!monthKey) continue;
    const agent = upsertAgentMonth(store, monthKey, opp);
    if (!agent) continue;
    agent.activatedMtd += 1;
    agent.activatedItems.push(mapMtdItem(opp));
  }
  return store;
}

export function mtdHistoryFromStore(store) {
  const monthKeys = [...store.keys()].sort((a, b) => b.localeCompare(a));

  return monthKeys.map((monthKey) => {
    const agents = filterTeamAgents([...store.get(monthKey).values()]).sort(
      (a, b) => b.wonMtd - a.wonMtd || a.name.localeCompare(b.name),
    );

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

export function buildMtdHistoryFromHybrid(wonRecords, historyRecords) {
  const store = buildHybridMtdStore(wonRecords, historyRecords);
  return mtdHistoryFromStore(store);
}

/** @deprecated Use buildMtdHistoryFromHybrid. */
export function buildMtdHistoryFromStageHistory(historyRecords) {
  const store = accumulateMtdFromStageHistory(historyRecords);
  return mtdHistoryFromStore(store);
}

/** @deprecated Use buildMtdHistoryFromHybrid. */
export function buildMtdHistoryFromRecords(records) {
  const store = accumulateMtdHistoryRecords(records);
  return mtdHistoryFromStore(store);
}

export function currentMonthKey(ref = new Date()) {
  return monthKeyFromDate(ref);
}
