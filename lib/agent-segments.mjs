/** Complex vs Density rep classification and MTD per-rep targets (Romania). */

/** Per-rep Won MTD targets (Romania). */
export const COMPLEX_MTD_TARGET = 10;
export const DENSITY_MTD_TARGET = 30;

/** Per-rep Activated MTD targets (unchanged). */
export const COMPLEX_ACTIVATED_MTD_TARGET = 8;
export const DENSITY_ACTIVATED_MTD_TARGET = 25;

function normalizeName(name) {
  return (name ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/**
 * SINGLE SOURCE OF TRUTH for the 12-rep Complex/Density roster: each entry pairs
 * a canonical Salesforce Owner ID with the segment and a diacritic-insensitive
 * name matcher (operates on `normalizeName(name)`). The owner-id Sets and the
 * Complex/Density name matching below are derived from this array so reps are
 * declared exactly once. `ownerIdForName` (name → canonical id) is also derived
 * here, replacing the old per-script ROSTER copy.
 *
 * @typedef {{ ownerId: string, segment: "complex" | "density", alias: string, match: (normalizedName: string) => boolean }} RosterEntry
 * @type {RosterEntry[]}
 */
export const TEAM_ROSTER = [
  // Complex (5)
  {
    ownerId: "005Ts0000060ICnIAM",
    segment: "complex",
    alias: "Madalin",
    sfName: "Ionut-Mădălin Gavrilă",
    match: (n) => /gavril|madalin/.test(n),
  },
  {
    ownerId: "005Qs00000Mxc6EIAR",
    segment: "complex",
    alias: "Paul",
    sfName: "Paul-Daniel Rîngheanu",
    match: (n) => (/paul/.test(n) || /ringheanu/.test(n)) && !/patru|patr(u|a)/.test(n),
  },
  {
    ownerId: "005Ts000005c4hFIAQ",
    segment: "complex",
    alias: "Corne",
    sfName: "Corneliu-Ștefan Radu",
    match: (n) => /corneliu/.test(n) && /(stefan|tefan)/.test(n) && /radu/.test(n),
  },
  {
    ownerId: "005Qs00000Pr1HKIAZ",
    segment: "complex",
    alias: "Vlad Popa",
    sfName: "Vlad-Bogdan Popa",
    match: (n) => /vlad/.test(n) && /popa/.test(n),
  },
  {
    ownerId: "005Qs00000N2Hh3IAF",
    segment: "complex",
    alias: "Andrei Patru",
    sfName: "Andrei-Georgian Pătru",
    match: (n) => /andrei/.test(n) && /patru|patr(u|a)/.test(n),
  },
  // Density (7)
  {
    ownerId: "005Ts000002AX4nIAG",
    segment: "density",
    alias: "Ciprian",
    sfName: "Ciprian Teodorescu",
    match: (n) => /teodorescu/.test(n),
  },
  {
    ownerId: "005Ts00000BtGPDIA3",
    segment: "density",
    alias: "Daniel Boboc",
    sfName: "Daniel-Alexandru Boboc",
    match: (n) => /boboc/.test(n),
  },
  {
    ownerId: "005Ts00000BtX53IAF",
    segment: "density",
    alias: "Daniel Toltică",
    sfName: "Daniel-Marian Toltică",
    match: (n) => /toltic/.test(n),
  },
  {
    ownerId: "005Ts000002AWIQIA4",
    segment: "density",
    alias: "Eusebiu",
    sfName: "Eusebiu Hanganu",
    match: (n) => /hanganu/.test(n),
  },
  {
    ownerId: "005Ts00000BtZV3IAN",
    segment: "density",
    alias: "Georgian",
    sfName: "Borcaeas Georgian",
    match: (n) => /borcaeas/.test(n),
  },
  {
    ownerId: "005Ts000001Ak10IAC",
    segment: "density",
    alias: "Mihnea",
    sfName: "Silviu-Mihnea Voicu",
    match: (n) => /mihnea/.test(n),
  },
  {
    ownerId: "005Ts000006V3vpIAC",
    segment: "density",
    alias: "Oroles",
    sfName: "Oroles Roșu",
    match: (n) => /oroles/.test(n) || (/rosu/.test(n) && !/borcaeas/.test(n)),
  },
];

/** Canonical Salesforce Owner IDs for the 5 Complex reps (derived from TEAM_ROSTER). */
export const COMPLEX_OWNER_IDS = new Set(
  TEAM_ROSTER.filter((r) => r.segment === "complex").map((r) => r.ownerId),
);

/** Reps removed from team roster — excluded from UI and MTD calculations. */
export const EXCLUDED_OWNER_IDS = new Set([
  "005Ts000005XKgEIAW", // Andrei-Sebastian Caba
  "005Ts00000FjJkDIAV", // Teodor Domnica
  "0057Q000004SL7qQAG", // Cezar-Mihai Voicu (not on 12-rep roster)
]);

/** Canonical Salesforce Owner IDs for the 7 active Density reps (derived from TEAM_ROSTER). */
export const DENSITY_OWNER_IDS = new Set(
  TEAM_ROSTER.filter((r) => r.segment === "density").map((r) => r.ownerId),
);

/**
 * Inbound RO reps — surfaced ONLY in the dedicated "Inbound team" tab and kept
 * deliberately OUT of the Complex/Density rosters. They are NOT team agents
 * (isTeamAgent stays false) and agentSegment never returns a value for them, so
 * they never leak into Overview/MTD/Weekly/WoW/Accounts/MyPipeline tabs.
 */
export const INBOUND_OWNER_IDS = new Set([
  "005Ts00000BtHpvIAF", // Ana-Maria Preda (ana.preda@bolt.eu)
  "005Qs00000OLyBRIA1", // Catalin Corbeanu (catalin.corbeanu@aceolution.com)
]);

/** Owner email → inbound owner id (for Databricks attribution by owner email). */
export const INBOUND_OWNER_EMAILS = {
  "ana.preda@bolt.eu": "005Ts00000BtHpvIAF",
  "catalin.corbeanu@aceolution.com": "005Qs00000OLyBRIA1",
};

export function isExcludedAgent(name, ownerId) {
  if (ownerId && EXCLUDED_OWNER_IDS.has(ownerId)) return true;

  const n = normalizeName(name);
  if (!n) return false;

  if (/\bcaba\b/.test(n)) return true;
  if (/\bdomnica\b/.test(n)) return true;
  if (/\bteodor\b/.test(n) && !/teodorescu/.test(n)) return true;
  if (/\bsebastian\b/.test(n) && !/patru|patr(u|a)/.test(n) && /\bcaba\b/.test(n)) return true;
  if (/\bcezar\b/.test(n) && /voicu/.test(n)) return true;

  return false;
}

/** True if the normalized name matches a TEAM_ROSTER entry in the given segment. */
function matchesRosterSegment(normalized, segment) {
  return TEAM_ROSTER.some((r) => r.segment === segment && r.match(normalized));
}

/** Fuzzy match owner name to Complex segment (falls back to owner ID). */
export function isComplexAgent(name, ownerId) {
  if (isExcludedAgent(name, ownerId)) return false;
  if (ownerId && COMPLEX_OWNER_IDS.has(ownerId)) return true;

  const n = normalizeName(name);
  if (!n) return false;
  return matchesRosterSegment(n, "complex");
}

/** Fuzzy match owner name to Density segment (falls back to owner ID). */
export function isDensityAgent(name, ownerId) {
  if (isExcludedAgent(name, ownerId)) return false;
  if (ownerId && DENSITY_OWNER_IDS.has(ownerId)) return true;

  const n = normalizeName(name);
  if (!n) return false;
  return matchesRosterSegment(n, "density");
}

export function isTeamAgent(name, ownerId) {
  return isComplexAgent(name, ownerId) || isDensityAgent(name, ownerId);
}

/**
 * Canonical Salesforce Owner ID for a roster name (diacritic-insensitive name
 * match via TEAM_ROSTER). Used to attribute Databricks rows that only carry an
 * owner name. Returns undefined when no roster rep matches.
 *
 * @param {string} name
 * @returns {string | undefined}
 */
export function ownerIdForName(name) {
  const n = normalizeName(name);
  if (!n) return undefined;
  return TEAM_ROSTER.find((r) => r.match(n))?.ownerId;
}

/**
 * Inbound RO rep match (owner id, then fuzzy name). Independent of the
 * Complex/Density rosters — used only by the Inbound team tab build. Never
 * treated as a team agent, so inbound reps stay out of every other tab.
 */
export function isInboundAgent(name, ownerId) {
  if (ownerId && INBOUND_OWNER_IDS.has(ownerId)) return true;

  const n = normalizeName(name);
  if (!n) return false;

  if (/\bana\b/.test(n) && /preda/.test(n)) return true;
  if (/corbeanu/.test(n)) return true;

  return false;
}

/**
 * @param {string} name
 * @param {string} [ownerId]
 * @returns {"complex" | "density" | null}
 */
export function agentSegment(name, ownerId) {
  if (isComplexAgent(name, ownerId)) return "complex";
  if (isDensityAgent(name, ownerId)) return "density";
  return null;
}

/**
 * @param {"complex" | "density"} segment
 * @returns {number}
 */
export function mtdTargetForSegment(segment) {
  return segment === "complex" ? COMPLEX_MTD_TARGET : DENSITY_MTD_TARGET;
}

/**
 * @param {"complex" | "density"} segment
 * @returns {number}
 */
export function activatedMtdTargetForSegment(segment) {
  return segment === "complex" ? COMPLEX_ACTIVATED_MTD_TARGET : DENSITY_ACTIVATED_MTD_TARGET;
}

export function enrichAgent(agent) {
  if (isExcludedAgent(agent.name, agent.ownerId)) return null;
  const segment = agentSegment(agent.name, agent.ownerId);
  if (!segment) return null;
  return {
    ...agent,
    segment,
    mtdTarget: mtdTargetForSegment(segment),
  };
}

/** Keep only reps on the Complex or Density rosters. */
export function filterTeamAgents(agents) {
  return agents
    .map((agent) => enrichAgent(agent))
    .filter(Boolean);
}

/** Zeroed dashboard agent row for a roster entry missing from SF exports. */
export function emptyRosterAgent(entry) {
  return {
    ownerId: entry.ownerId,
    name: entry.sfName,
    pipelineCount: 0,
    stageCounts: {},
    wonMtd: 0,
    activatedMtd: 0,
    wonYtd: 0,
  };
}

/** Zeroed MTD month agent row for a roster entry with no activity that month. */
export function emptyMtdRosterAgent(entry) {
  return {
    ownerId: entry.ownerId,
    name: entry.sfName,
    segment: entry.segment,
    wonMtd: 0,
    activatedMtd: 0,
    wonItems: [],
    activatedItems: [],
  };
}

/**
 * Ensure all 12 TEAM_ROSTER reps appear. Missing reps are seeded with zero
 * counts so they stay visible when the pipeline sample (LIMIT 500) or month
 * activity omits them.
 *
 * @param {object[]} agents
 * @param {{ emptyRow?: (entry: typeof TEAM_ROSTER[number]) => object }} [opts]
 */
export function ensureTeamRoster(agents, { emptyRow = emptyRosterAgent } = {}) {
  const byId = new Map();
  for (const agent of agents) {
    const enriched = enrichAgent(agent);
    if (enriched) byId.set(enriched.ownerId, enriched);
  }
  for (const entry of TEAM_ROSTER) {
    if (!byId.has(entry.ownerId)) {
      const seeded = enrichAgent(emptyRow(entry));
      if (seeded) byId.set(entry.ownerId, seeded);
    }
  }
  return [...byId.values()];
}

/** Build mtdAchievement segment tiers + global targets from enriched agents. */
export function buildMtdAchievement(agents, month, extras = {}) {
  const enriched = filterTeamAgents(agents);
  const complexAgents = enriched.filter((a) => a.segment === "complex");
  const densityAgents = enriched.filter((a) => a.segment === "density");

  const complexWonActual = complexAgents.reduce((s, a) => s + (a.wonMtd ?? 0), 0);
  const densityWonActual = densityAgents.reduce((s, a) => s + (a.wonMtd ?? 0), 0);
  const complexActivatedActual = complexAgents.reduce((s, a) => s + (a.activatedMtd ?? 0), 0);
  const densityActivatedActual = densityAgents.reduce((s, a) => s + (a.activatedMtd ?? 0), 0);

  const complexWonTarget = complexAgents.length * COMPLEX_MTD_TARGET;
  const densityWonTarget = densityAgents.length * DENSITY_MTD_TARGET;
  const complexActivatedTarget = complexAgents.length * COMPLEX_ACTIVATED_MTD_TARGET;
  const densityActivatedTarget = densityAgents.length * DENSITY_ACTIVATED_MTD_TARGET;

  const actualWon = extras.actualWon ?? complexWonActual + densityWonActual;
  const actualActivated = extras.actualActivated ?? complexActivatedActual + densityActivatedActual;

  return {
    month,
    targetWon: complexWonTarget + densityWonTarget,
    actualWon,
    targetActivated: complexActivatedTarget + densityActivatedTarget,
    actualActivated,
    leadsMtd: extras.leadsMtd ?? 0,
    qualifiedMtd: extras.qualifiedMtd ?? 0,
    complexRepCount: complexAgents.length,
    densityRepCount: densityAgents.length,
    tiers: [
      { name: "Complex", target: complexWonTarget, actual: complexWonActual, type: "won" },
      { name: "Density", target: densityWonTarget, actual: densityWonActual, type: "won" },
      { name: "Complex", target: complexActivatedTarget, actual: complexActivatedActual, type: "activated" },
      { name: "Density", target: densityActivatedTarget, actual: densityActivatedActual, type: "activated" },
    ],
  };
}
