import { isoWeekDateRange, getIsoWeek } from "@/lib/isoWeek";
import { DASHBOARD_WEEK_YEAR } from "@/lib/weekDateRange";

const BUCHAREST = "Europe/Bucharest";
const Q2_MONTHS = new Set([4, 5, 6]);

function calendarParts(
  date: Date,
  timeZone: string,
): { day: number; month: number; year: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? 0),
    month: Number(parts.find((part) => part.type === "month")?.value ?? 0),
    day: Number(parts.find((part) => part.type === "day")?.value ?? 0),
  };
}

/** Bucharest calendar date for `now`, used for ISO week numbering. */
export function getCurrentIsoWeek(now: Date = new Date(), timeZone: string = BUCHAREST): {
  year: number;
  week: number;
} {
  const parts = calendarParts(now, timeZone);
  const localDate = new Date(parts.year, parts.month - 1, parts.day);
  return getIsoWeek(localDate);
}

export function parseWeekNumber(weekCode: string): number | null {
  const match = /^W(\d{1,2})$/i.exec(weekCode.trim());
  return match ? Number(match[1]) : null;
}

/** True when any day of the ISO week falls in Apr–Jun for `year` (Europe/Bucharest). */
export function isWeekInQ2(
  year: number,
  weekNum: number,
  timeZone: string = BUCHAREST,
): boolean {
  const { start } = isoWeekDateRange(year, weekNum);
  for (let offset = 0; offset < 7; offset += 1) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + offset);
    day.setUTCHours(12, 0, 0, 0);
    const parts = calendarParts(day, timeZone);
    if (parts.year === year && Q2_MONTHS.has(parts.month)) {
      return true;
    }
  }
  return false;
}

/** Q2 2026 weeks plus any week on/after the current ISO week (Europe/Bucharest). */
export function isWeekVisible(
  weekCode: string,
  year: number = DASHBOARD_WEEK_YEAR,
  now: Date = new Date(),
  timeZone: string = BUCHAREST,
): boolean {
  const weekNum = parseWeekNumber(weekCode);
  if (weekNum == null) return false;

  if (year === DASHBOARD_WEEK_YEAR && isWeekInQ2(year, weekNum, timeZone)) {
    return true;
  }

  const { start: weekStart } = isoWeekDateRange(year, weekNum);
  const current = getCurrentIsoWeek(now, timeZone);
  const { start: currentStart } = isoWeekDateRange(current.year, current.week);
  return weekStart.getTime() >= currentStart.getTime();
}

export function filterWeeklyHistory<T extends { week: string }>(
  rows: T[] | undefined,
  now: Date = new Date(),
): T[] {
  if (!rows?.length) return [];
  return rows.filter((row) => isWeekVisible(row.week, DASHBOARD_WEEK_YEAR, now));
}

export function sortWeekCodes(weeks: string[]): string[] {
  return [...weeks].sort((a, b) => {
    const na = parseWeekNumber(a) ?? 0;
    const nb = parseWeekNumber(b) ?? 0;
    return na - nb;
  });
}

/** Current week when visible, otherwise the earliest visible week. */
export function pickDefaultWeek(weeks: string[], currentWeek?: string): string {
  if (!weeks.length) return "";
  if (currentWeek && weeks.includes(currentWeek)) return currentWeek;
  return sortWeekCodes(weeks)[0] ?? "";
}

export function formatVisibleWeekRange(weeks: string[]): string {
  const sorted = sortWeekCodes(weeks);
  if (!sorted.length) return "—";
  if (sorted.length === 1) return sorted[0]!;
  return `${sorted[0]}–${sorted[sorted.length - 1]}`;
}
