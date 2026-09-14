export type IsoWeek = {
  year: number;
  week: number;
};

/** ISO-8601 week number (weeks numbered from start of year). */
export function getIsoWeek(date: Date): IsoWeek {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

export function formatWeekCode(week: number): string {
  return `W${String(week).padStart(2, "0")}`;
}

export function parseWeekCode(code: string): number | null {
  const match = /^W(\d{1,2})$/i.exec(code.trim());
  return match ? Number(match[1]) : null;
}

export function formatWeekTitle(week: number, year: number): string {
  return `Week ${week} · ${year}`;
}

const BUCHAREST = "Europe/Bucharest";

export function isoWeekDateRange(year: number, week: number): { start: Date; end: Date } {
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

/** @deprecated Prefer `formatWeekDateRange` from `@/lib/weekDateRange`. */
export function formatIsoWeekDateRange(
  year: number,
  week: number,
  locale = "en-GB",
): string {
  const { start, end } = isoWeekDateRange(year, week);
  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();
  const startMonth = start.toLocaleDateString(locale, { month: "short", timeZone: "UTC" });
  const endMonth = end.toLocaleDateString(locale, { month: "short", timeZone: "UTC" });

  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${startDay}–${endDay} ${endMonth} ${year}`;
  }

  return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${year}`;
}

/** Bucharest calendar month (YYYY-MM) of the ISO week's Sunday. */
export function isoWeekEndMonthKey(
  year: number,
  week: number,
  timeZone = BUCHAREST,
): string {
  const { end } = isoWeekDateRange(year, week);
  const noon = new Date(end);
  noon.setUTCHours(12, 0, 0, 0);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(noon);
  const y = parts.find((part) => part.type === "year")?.value;
  const m = parts.find((part) => part.type === "month")?.value;
  return y && m ? `${y}-${m}` : "";
}

export function weekCodeEndMonthKey(
  weekCode: string,
  year: number,
  timeZone = BUCHAREST,
): string {
  const week = parseWeekCode(weekCode);
  if (week == null) return "";
  return isoWeekEndMonthKey(year, week, timeZone);
}

export function priorWeekCode(currentCode: string): string | null {
  const weekNum = parseWeekCode(currentCode);
  if (weekNum == null || weekNum <= 1) return null;
  return formatWeekCode(weekNum - 1);
}
