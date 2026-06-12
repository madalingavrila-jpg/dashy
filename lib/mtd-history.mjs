/** Build per-month MTD won/activated history from OpportunityFieldHistory (first stage transition). */

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

/** Same record-type rules as weekly production (lib/weekly-stages-build.mjs). */
const RECORD_TYPES_WON = new Set(["Parent Opportunity", "Sales Opportunity"]);
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

function isAllowedMtdRecordType(kind, hist) {
  const rt = hist.Opportunity?.RecordType?.Name;
  if (!rt) return true;
  if (kind === "won") return RECORD_TYPES_WON.has(rt);
  return RECORD_TYPES_ACTIVATED.has(rt);
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
    CloseDate: formatEventDate(eventDate),
  };
}

export function mapMtdItem(opp) {
  return {
    id: opp.Id,
    name: opp.Account?.Name ?? opp.Name ?? "—",
    city: opp.Account?.BillingCity ?? "—",
    closeDate: opp.CloseDate ?? "—",
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
 * Count first transition INTO Closed Won / Activated per opportunity.
 * Event month = OpportunityFieldHistory.CreatedDate in Europe/Bucharest.
 */
export function accumulateMtdFromStageHistory(historyRecords, store = new Map()) {
  const sorted = [...(historyRecords ?? [])].sort(
    (a, b) => new Date(a.CreatedDate) - new Date(b.CreatedDate),
  );
  const seenWon = new Set();
  const seenActivated = new Set();

  for (const hist of sorted) {
    if (hist.Field !== "StageName") continue;

    const newStage = hist.NewValue;
    let kind = null;
    let dedupeKey = null;
    let seen = null;

    if (newStage === MTD_WON_STAGE) {
      kind = "won";
      dedupeKey = `${hist.OpportunityId}:${MTD_WON_STAGE}`;
      seen = seenWon;
    } else if (newStage === MTD_ACTIVATED_STAGE) {
      kind = "activated";
      dedupeKey = `${hist.OpportunityId}:${MTD_ACTIVATED_STAGE}`;
      seen = seenActivated;
    } else {
      continue;
    }

    if (seen.has(dedupeKey)) continue;
    if (!isAllowedMtdRecordType(kind, hist)) continue;

    const opp = hist.Opportunity ?? {};
    const ownerId = opp.OwnerId;
    const ownerName = opp.Owner?.Name ?? "";
    if (!ownerId || isExcludedAgent(ownerName, ownerId)) continue;
    if (!agentSegment(ownerName, ownerId)) continue;

    const eventDate = parseSfDate(hist.CreatedDate);
    const monthKey = monthKeyFromDate(eventDate);
    if (!monthKey) continue;

    seen.add(dedupeKey);

    const pseudo = pseudoOppFromHistory(hist, eventDate);
    const agent = upsertAgentMonth(store, monthKey, pseudo);
    if (!agent) continue;

    if (kind === "won") {
      agent.wonMtd += 1;
      agent.wonItems.push(mapMtdItem(pseudo));
    } else {
      agent.activatedMtd += 1;
      agent.activatedItems.push(mapMtdItem(pseudo));
    }
  }

  return store;
}

/** @deprecated CloseDate-based MTD — use accumulateMtdFromStageHistory instead. */
export function accumulateMtdHistoryRecords(records, store = new Map()) {
  for (const opp of records ?? []) {
    const monthKey = monthKeyFromDate(parseSfDate(opp.CloseDate));
    if (!monthKey) continue;

    const agent = upsertAgentMonth(store, monthKey, opp);
    if (!agent) continue;

    if (opp.IsWon === true) {
      agent.wonMtd += 1;
      agent.wonItems.push(mapMtdItem(opp));
    }
    if (opp.StageName === "Activated") {
      agent.activatedMtd += 1;
      agent.activatedItems.push(mapMtdItem(opp));
    }
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

export function buildMtdHistoryFromStageHistory(historyRecords) {
  const store = accumulateMtdFromStageHistory(historyRecords);
  return mtdHistoryFromStore(store);
}

/** @deprecated Use buildMtdHistoryFromStageHistory. */
export function buildMtdHistoryFromRecords(records) {
  const store = accumulateMtdHistoryRecords(records);
  return mtdHistoryFromStore(store);
}

export function currentMonthKey(ref = new Date()) {
  return monthKeyFromDate(ref);
}
