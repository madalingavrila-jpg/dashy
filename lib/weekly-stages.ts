/** Weekly account status buckets — browser-safe mirror of weekly-stages.mjs */

export type WeeklyStatusKey = "qualified" | "negotiations" | "closedWon" | "active";

export type WeeklyStatusCounts = Record<WeeklyStatusKey, number>;

export const WEEKLY_STATUS_KEYS: WeeklyStatusKey[] = [
  "qualified",
  "negotiations",
  "closedWon",
  "active",
];

export const WEEKLY_STATUS_LABELS: Record<WeeklyStatusKey, string> = {
  qualified: "Qualified",
  negotiations: "Negotiations",
  closedWon: "Closed Won",
  active: "Active",
};

/** SF stages included in each weekly status bucket. */
export const WEEKLY_STAGE_MAP: Record<WeeklyStatusKey, string[]> = {
  qualified: ["New Opportunity", "Contacting DCM", "First Pitch"],
  negotiations: ["Negotiations"],
  closedWon: ["Contract sent", "Ready to Activate"],
  active: ["Activated"],
};

export const COMPLEX_WEEKLY_TARGETS: WeeklyStatusCounts = {
  qualified: 3,
  negotiations: 2,
  closedWon: 3,
  active: 2,
};

export const DENSITY_WEEKLY_TARGETS: WeeklyStatusCounts = {
  qualified: 8,
  negotiations: 5,
  closedWon: 8,
  active: 6,
};

export function weeklyTargetsForSegment(segment: "complex" | "density"): WeeklyStatusCounts {
  return segment === "complex" ? { ...COMPLEX_WEEKLY_TARGETS } : { ...DENSITY_WEEKLY_TARGETS };
}

export function emptyWeeklyStatusCounts(): WeeklyStatusCounts {
  return { qualified: 0, negotiations: 0, closedWon: 0, active: 0 };
}

export function weeklyStatusAccent(
  key: WeeklyStatusKey,
): "primary" | "secondary" | "won" | "activated" {
  switch (key) {
    case "qualified":
      return "primary";
    case "negotiations":
      return "secondary";
    case "closedWon":
      return "won";
    case "active":
      return "activated";
    default:
      return "primary";
  }
}
