/** Weekly account status buckets mapped from Salesforce stages. */

export const WEEKLY_STATUS_KEYS = ["qualified", "negotiations", "closedWon", "active"];

/** SF stages → weekly status bucket (Romania Sales Opportunity). */
export const WEEKLY_QUALIFIED_STAGES = ["New Opportunity", "Contacting DCM", "First Pitch"];
export const WEEKLY_NEGOTIATIONS_STAGES = ["Negotiations"];
export const WEEKLY_CLOSED_WON_STAGES = ["Closed Won"];
export const WEEKLY_ACTIVE_STAGES = ["Activated"];

/** Per-rep default weekly targets (Complex / Density). */
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

export function emptyWeeklyStatusCounts() {
  return { qualified: 0, negotiations: 0, closedWon: 0, active: 0 };
}

export function weeklyTargetsForSegment(segment) {
  return segment === "complex" ? { ...COMPLEX_WEEKLY_TARGETS } : { ...DENSITY_WEEKLY_TARGETS };
}

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

export function weekKey(date) {
  const { year, week } = isoWeek(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function weekLabel(key) {
  const [, w] = key.split("-W");
  return `W${String(Number(w)).padStart(2, "0")}`;
}

function bumpCount(bucket, segment, ownerId, statusKey) {
  bucket.teams[segment][statusKey] += 1;
  if (!bucket.agents[ownerId]) bucket.agents[ownerId] = emptyWeeklyStatusCounts();
  bucket.agents[ownerId][statusKey] += 1;
}

/**
 * Increment weekly status counts for one opportunity record.
 * CreatedDate → New Opportunity (qualified); LastModifiedDate → pipeline stages; CloseDate → won/active.
 */
export function accumulateWeeklyStatus(rec, weekStore, agentSegmentFn, isExcludedFn) {
  const ownerId = rec.OwnerId;
  const ownerName = rec.Owner?.Name ?? "";
  if (!ownerId || isExcludedFn(ownerName, ownerId)) return;

  const segment = agentSegmentFn(ownerName, ownerId);
  if (!segment) return;

  const stage = rec.StageName;
  const created = rec.CreatedDate ? new Date(rec.CreatedDate) : null;
  const closed = rec.CloseDate ? new Date(`${rec.CloseDate}T12:00:00Z`) : null;
  const modified = rec.LastModifiedDate ? new Date(rec.LastModifiedDate) : null;

  function apply(date, statusKey) {
    if (!date || date.getFullYear() !== 2026) return;
    const k = weekKey(date);
    const bucket = weekStore[k];
    if (!bucket) return;
    bumpCount(bucket, segment, ownerId, statusKey);
  }

  if (created && stage === "New Opportunity") apply(created, "qualified");
  if (modified && (stage === "Contacting DCM" || stage === "First Pitch")) {
    apply(modified, "qualified");
  }
  if (modified && stage === "Negotiations") apply(modified, "negotiations");
  if (closed && stage === "Closed Won") apply(closed, "closedWon");
  if (closed && stage === "Activated") apply(closed, "active");
}

export function initWeeklyBreakdownStore(maxWeek = 24) {
  const store = {};
  for (let w = 1; w <= maxWeek; w += 1) {
    const key = `2026-W${String(w).padStart(2, "0")}`;
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

export function breakdownStoreToHistory(store) {
  return Object.keys(store)
    .sort()
    .slice(0, 24)
    .map((k) => store[k]);
}
