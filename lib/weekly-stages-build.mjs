/** Weekly account status buckets mapped from Salesforce stages. */

export const WEEKLY_STATUS_KEYS = ["qualified", "negotiations", "closedWon", "active"];

export const WEEKLY_QUALIFIED_STAGES = ["New Opportunity", "Contacting DCM", "First Pitch"];
export const WEEKLY_NEGOTIATIONS_STAGES = ["Negotiations"];
export const WEEKLY_CLOSED_WON_STAGES = ["Closed Won"];
export const WEEKLY_ACTIVE_STAGES = ["Activated"];

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
const TRACKING_YEAR = 2026;

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

/**
 * Increment weekly status counts for one opportunity record.
 * CreatedDate → New Opportunity (qualified)
 * LastModifiedDate → Contacting DCM / First Pitch (qualified), Negotiations
 * CloseDate → Closed Won, Activated
 */
export function accumulateWeeklyStatus(rec, weekStore, agentSegmentFn, isExcludedFn) {
  const ownerId = rec.OwnerId;
  const ownerName = rec.Owner?.Name ?? "";
  if (!ownerId || isExcludedFn(ownerName, ownerId)) return;

  const segment = agentSegmentFn(ownerName, ownerId);
  if (!segment) return;

  const stage = rec.StageName;
  const created = parseSfDate(rec.CreatedDate);
  const closed = parseSfDate(rec.CloseDate);
  const modified = parseSfDate(rec.LastModifiedDate);

  if (stage === "New Opportunity" && created) {
    applyEvent(weekStore, segment, ownerId, "qualified", rec, created);
  }
  if ((stage === "Contacting DCM" || stage === "First Pitch") && modified) {
    applyEvent(weekStore, segment, ownerId, "qualified", rec, modified);
  }
  if (stage === "Negotiations" && modified) {
    applyEvent(weekStore, segment, ownerId, "negotiations", rec, modified);
  }
  if (stage === "Closed Won" && closed) {
    applyEvent(weekStore, segment, ownerId, "closedWon", rec, closed);
  }
  if (stage === "Activated" && closed) {
    applyEvent(weekStore, segment, ownerId, "active", rec, closed);
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
  return Object.keys(store)
    .sort()
    .slice(0, 24)
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
