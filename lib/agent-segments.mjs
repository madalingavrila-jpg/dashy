/** Complex vs Density rep classification and MTD per-rep targets (Romania URads). */

export const COMPLEX_MTD_TARGET = 8;
export const DENSITY_MTD_TARGET = 25;

/** Canonical Salesforce Owner IDs for the 5 Complex reps. */
export const COMPLEX_OWNER_IDS = new Set([
  "005Ts0000060ICnIAM", // Ionut-Mădălin Gavrilă (Madalin)
  "005Qs00000Mxc6EIAR", // Paul-Daniel Rîngheanu (Paul)
  "005Ts000005c4hFIAQ", // Corneliu-Ștefan Radu (Corne)
  "005Qs00000Pr1HKIAZ", // Vlad-Bogdan Popa (Vlad Popa)
  "005Qs00000N2Hh3IAF", // Andrei-Georgian Pătru (Andrei Patru)
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

export function agentSegment(name, ownerId) {
  return isComplexAgent(name, ownerId) ? "complex" : "density";
}

export function mtdTargetForSegment(segment) {
  return segment === "complex" ? COMPLEX_MTD_TARGET : DENSITY_MTD_TARGET;
}

export function enrichAgent(agent) {
  const segment = agentSegment(agent.name, agent.ownerId);
  return {
    ...agent,
    segment,
    mtdTarget: mtdTargetForSegment(segment),
  };
}

/** Build mtdAchievement segment tiers + global targets from enriched agents. */
export function buildMtdAchievement(agents, month, extras = {}) {
  const enriched = agents.map(enrichAgent);
  const complexAgents = enriched.filter((a) => a.segment === "complex");
  const densityAgents = enriched.filter((a) => a.segment === "density");

  const complexWonActual = complexAgents.reduce((s, a) => s + (a.wonMtd ?? 0), 0);
  const densityWonActual = densityAgents.reduce((s, a) => s + (a.wonMtd ?? 0), 0);
  const complexActivatedActual = complexAgents.reduce((s, a) => s + (a.activatedMtd ?? 0), 0);
  const densityActivatedActual = densityAgents.reduce((s, a) => s + (a.activatedMtd ?? 0), 0);

  const complexWonTarget = complexAgents.length * COMPLEX_MTD_TARGET;
  const densityWonTarget = densityAgents.length * DENSITY_MTD_TARGET;
  const complexActivatedTarget = complexWonTarget;
  const densityActivatedTarget = densityWonTarget;

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
