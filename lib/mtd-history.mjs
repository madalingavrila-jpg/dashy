/** Build per-month MTD won/activated history from Salesforce won export rows. */

import {
  agentSegment,
  buildMtdAchievement,
  enrichAgent,
  filterTeamAgents,
  isExcludedAgent,
} from "./agent-segments.mjs";

const BUCHAREST = "Europe/Bucharest";

function monthLabelFromKey(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1, 12));
  return date.toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: BUCHAREST });
}

function monthKeyFromCloseDate(closeDate) {
  if (!closeDate || typeof closeDate !== "string") return null;
  const match = closeDate.match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : null;
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
 * Group won-export opportunities by CloseDate month and owner.
 * Won = IsWon true; Activated = StageName Activated (same month CloseDate).
 */
export function accumulateMtdHistoryRecords(records, store = new Map()) {
  for (const opp of records ?? []) {
    const monthKey = monthKeyFromCloseDate(opp.CloseDate);
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

export function buildMtdHistoryFromRecords(records) {
  const store = accumulateMtdHistoryRecords(records);
  return mtdHistoryFromStore(store);
}

export function currentMonthKey(ref = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUCHAREST,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(ref);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  return year && month ? `${year}-${month}` : null;
}
