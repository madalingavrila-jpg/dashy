/** ISO week year for the 2026 weekly history slice in dashboard data. */
export const DASHBOARD_WEEK_YEAR = 2026;

const BUCHAREST = "Europe/Bucharest";
const DEFAULT_LOCALE = "en-GB";

export type WeekDateRangeOptions = {
  locale?: string;
  timeZone?: string;
  /** When `"auto"`, year is shown only if the week spans two calendar years. */
  includeYear?: boolean | "auto";
};

function formatWeekCode(week: number): string {
  return `W${String(week).padStart(2, "0")}`;
}

function parseWeekCode(code: string): number | null {
  const match = /^W(\d{1,2})$/i.exec(code.trim());
  return match ? Number(match[1]) : null;
}

function isoWeekDateRange(year: number, week: number): { start: Date; end: Date } {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);
  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start, end };
}

function calendarParts(date: Date, timeZone: string): { day: number; month: number; year: number } {
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

function monthShort(date: Date, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, { month: "short", timeZone }).format(date);
}

/** ISO week Monday–Sunday range, formatted for Europe/Bucharest (e.g. `8–14 Jun`, `29 Dec – 4 Jan 2026`). */
export function formatWeekDateRange(
  week: number,
  year: number = DASHBOARD_WEEK_YEAR,
  options: WeekDateRangeOptions = {},
): string {
  const locale = options.locale ?? DEFAULT_LOCALE;
  const timeZone = options.timeZone ?? BUCHAREST;
  const includeYear = options.includeYear ?? "auto";

  const { start, end } = isoWeekDateRange(year, week);
  const startAtNoon = new Date(start);
  startAtNoon.setUTCHours(12, 0, 0, 0);
  const endAtNoon = new Date(end);
  endAtNoon.setUTCHours(12, 0, 0, 0);

  const startParts = calendarParts(startAtNoon, timeZone);
  const endParts = calendarParts(endAtNoon, timeZone);
  const startMonth = monthShort(startAtNoon, locale, timeZone);
  const endMonth = monthShort(endAtNoon, locale, timeZone);

  const showYear =
    includeYear === true ||
    (includeYear === "auto" && startParts.year !== endParts.year);

  if (startMonth === endMonth && startParts.year === endParts.year) {
    return showYear
      ? `${startParts.day}–${endParts.day} ${endMonth} ${endParts.year}`
      : `${startParts.day}–${endParts.day} ${endMonth}`;
  }

  return showYear
    ? `${startParts.day} ${startMonth} – ${endParts.day} ${endMonth} ${endParts.year}`
    : `${startParts.day} ${startMonth} – ${endParts.day} ${endMonth}`;
}

/** Week code plus date range (e.g. `W24 · 8–14 Jun`). */
export function formatWeekLabel(
  weekCode: string,
  year: number = DASHBOARD_WEEK_YEAR,
  options?: WeekDateRangeOptions,
): string {
  const week = parseWeekCode(weekCode);
  if (week == null) return weekCode;
  return `${formatWeekCode(week)} · ${formatWeekDateRange(week, year, options)}`;
}
