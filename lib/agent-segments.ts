/** Complex vs Density rep classification and MTD per-rep targets (Romania). */

/** Per-rep Won MTD targets (Romania). */
export const COMPLEX_MTD_TARGET = 10;
export const DENSITY_MTD_TARGET = 30;

/** Per-rep Activated MTD targets (unchanged). */
export const COMPLEX_ACTIVATED_MTD_TARGET = 8;
export const DENSITY_ACTIVATED_MTD_TARGET = 25;

export const COMPLEX_OWNER_IDS = new Set([
  "005Ts0000060ICnIAM",
  "005Qs00000Mxc6EIAR",
  "005Ts000005c4hFIAQ",
  "005Qs00000Pr1HKIAZ",
  "005Qs00000N2Hh3IAF",
]);

/** Reps removed from team roster — excluded from UI and MTD calculations. */
export const EXCLUDED_OWNER_IDS = new Set([
  "005Ts000005XKgEIAW", // Andrei-Sebastian Caba
  "005Ts00000FjJkDIAV", // Teodor Domnica
]);

export const DENSITY_OWNER_IDS = new Set([
  "005Ts000002AX4nIAG",
  "005Ts00000BtGPDIA3",
  "005Ts00000BtX53IAF",
  "005Ts000002AWIQIA4",
  "005Ts00000BtZV3IAN",
  "005Ts000001Ak10IAC",
  "005Ts000006V3vpIAC",
]);

function normalizeName(name: string): string {
  return name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function isExcludedAgent(name: string, ownerId?: string): boolean {
  if (ownerId && EXCLUDED_OWNER_IDS.has(ownerId)) return true;

  const n = normalizeName(name);
  if (!n) return false;

  if (/\bcaba\b/.test(n)) return true;
  if (/\bdomnica\b/.test(n)) return true;
  if (/\bteodor\b/.test(n) && !/teodorescu/.test(n)) return true;
  if (/\bsebastian\b/.test(n) && !/patru|patr(u|a)/.test(n) && /\bcaba\b/.test(n)) return true;

  return false;
}

export function isComplexAgent(name: string, ownerId?: string): boolean {
  if (isExcludedAgent(name, ownerId)) return false;
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

export function isDensityAgent(name: string, ownerId?: string): boolean {
  if (isExcludedAgent(name, ownerId)) return false;
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

  return false;
}

export function isTeamAgent(name: string, ownerId?: string): boolean {
  return isComplexAgent(name, ownerId) || isDensityAgent(name, ownerId);
}

export function agentSegment(name: string, ownerId?: string): "complex" | "density" | null {
  if (isComplexAgent(name, ownerId)) return "complex";
  if (isDensityAgent(name, ownerId)) return "density";
  return null;
}

export function mtdTargetForSegment(segment: "complex" | "density"): number {
  return segment === "complex" ? COMPLEX_MTD_TARGET : DENSITY_MTD_TARGET;
}

export function activatedMtdTargetForSegment(segment: "complex" | "density"): number {
  return segment === "complex" ? COMPLEX_ACTIVATED_MTD_TARGET : DENSITY_ACTIVATED_MTD_TARGET;
}
