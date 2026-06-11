/** Complex vs Density rep classification and MTD per-rep targets (Romania URads). */

export const COMPLEX_MTD_TARGET = 8;
export const DENSITY_MTD_TARGET = 25;

export const COMPLEX_OWNER_IDS = new Set([
  "005Ts0000060ICnIAM",
  "005Qs00000Mxc6EIAR",
  "005Ts000005c4hFIAQ",
  "005Qs00000Pr1HKIAZ",
  "005Qs00000N2Hh3IAF",
]);

function normalizeName(name: string): string {
  return name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function isComplexAgent(name: string, ownerId?: string): boolean {
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

export function agentSegment(name: string, ownerId?: string): "complex" | "density" {
  return isComplexAgent(name, ownerId) ? "complex" : "density";
}

export function mtdTargetForSegment(segment: "complex" | "density"): number {
  return segment === "complex" ? COMPLEX_MTD_TARGET : DENSITY_MTD_TARGET;
}
