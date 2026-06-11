/** Complex vs Density rep classification and MTD per-rep targets (Romania). */

/** Per-rep Won MTD targets (Romania). */
export const COMPLEX_MTD_TARGET = 10;
export const DENSITY_MTD_TARGET = 30;

/** Per-rep Activated MTD targets (unchanged). */
export const COMPLEX_ACTIVATED_MTD_TARGET = 8;
export const DENSITY_ACTIVATED_MTD_TARGET = 25;

/** Canonical Salesforce Owner IDs for the 5 Complex reps. */
export const COMPLEX_OWNER_IDS = new Set([
  "005Ts0000060ICnIAM", // Ionut-Mădălin Gavrilă (Madalin)
  "005Qs00000Mxc6EIAR", // Paul-Daniel Rîngheanu (Paul)
  "005Ts000005c4hFIAQ", // Corneliu-Ștefan Radu (Corne)
  "005Qs00000Pr1HKIAZ", // Vlad-Bogdan Popa (Vlad Popa)
  "005Qs00000N2Hh3IAF", // Andrei-Georgian Pătru (Andrei Patru)
]);

/** Canonical Salesforce Owner IDs for the 9 Density reps (RO-Sales Planning sheet). */
export const DENSITY_OWNER_IDS = new Set([
  "005Ts000002AX4nIAG", // Ciprian Teodorescu
  "005Ts00000BtGPDIA3", // Daniel-Alexandru Boboc
  "005Ts00000BtX53IAF", // Daniel-Marian Toltică
  "005Ts000002AWIQIA4", // Eusebiu Hanganu
  "005Ts00000BtZV3IAN", // Borcaeas Georgian
  "005Ts000001Ak10IAC", // Silviu-Mihnea Voicu
  "005Ts000006V3vpIAC", // Oroles Roșu
  "005Ts000005XKgEIAW", // Andrei-Sebastian Caba
  "005Ts00000FjJkDIAV", // Teodor Domnica
]);

function normalizeName(name) {
  return (name ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/** Fuzzy match owner name to Complex segment (falls back to owner ID). */
export function isComplexAgent(name, ownerId) {
  if (ownerId && COMPLEX_OWNER_IDS.has(ownerId)) return true;

  const n = normalizeName(name);
  if (!n) return false;

  if (/gavril|madalin/.test(n)) return true;
  if (/vlad/.test(n) && /popa/.test(n)) return true;
  if (/andrei/.test(n) && /patru|patr(u|a)/.test(n)) return true;
  if (/paul/.test(n) && !/patru|patr(u|a)/.test(n)) return true;
  if (/corneliu/.test(n) && /(stefan|tefan)/.test(n) && /radu/.test(n)) return true;

  return false;
}

/** Fuzzy match owner name to Density segment (falls back to owner ID). */
export function isDensityAgent(name, ownerId) {
  if (ownerId && DENSITY_OWNER_IDS.has(ownerId)) return true;

  const n = normalizeName(name);
  if (!n) return false;

  if (/teodorescu/.test(n)) return true;
  if (/boboc/.test(n)) return true;
  if (/toltic/.test(n)) return true;
  if (/hanganu/.test(n)) return true;
  if (/borcaeas/.test(n)) return true;
  if (/voicu/.test(n) || /mihnea/.test(n)) return true;
  if (/oroles/.test(n) || (/rosu/.test(n) && !/borcaeas/.test(n))) return true;
  if (/caba/.test(n) || (/sebastian/.test(n) && !/patru|patr(u|a)/.test(n))) return true;
  if (/domnica/.test(n) || (/teodor/.test(n) && !/teodorescu/.test(n))) return true;

  return false;
}

export function isTeamAgent(name, ownerId) {
  return isComplexAgent(name, ownerId) || isDensityAgent(name, ownerId);
}

export function agentSegment(name, ownerId) {
  if (isComplexAgent(name, ownerId)) return "complex";
  if (isDensityAgent(name, ownerId)) return "density";
  return null;
}

export function mtdTargetForSegment(segment) {
  return segment === "complex" ? COMPLEX_MTD_TARGET : DENSITY_MTD_TARGET;
}

export function activatedMtdTargetForSegment(segment) {
  return segment === "complex" ? COMPLEX_ACTIVATED_MTD_TARGET : DENSITY_ACTIVATED_MTD_TARGET;
}

export function enrichAgent(agent) {
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
