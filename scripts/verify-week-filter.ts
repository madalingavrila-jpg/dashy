import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  filterWeeklyHistory,
  formatVisibleWeekRange,
  isWeekInQ2,
  isWeekVisible,
  parseWeekNumber,
} from "../lib/weekQuarterFilter.js";

const REF_DATE = new Date("2026-06-11T12:00:00+03:00");

console.log("=== isWeekInQ2(2026) ===");
const q2Weeks: string[] = [];
for (let w = 1; w <= 53; w += 1) {
  if (isWeekInQ2(2026, w)) q2Weeks.push(`W${String(w).padStart(2, "0")}`);
}
console.log(`Q2 overlap weeks: ${q2Weeks[0]}–${q2Weeks[q2Weeks.length - 1]} (${q2Weeks.length} weeks)`);

console.log("\n=== isWeekVisible @ 2026-06-11 ===");
const visible: string[] = [];
for (let w = 1; w <= 30; w += 1) {
  const code = `W${String(w).padStart(2, "0")}`;
  if (isWeekVisible(code, 2026, REF_DATE)) visible.push(code);
}
console.log(`Visible W01–W30: ${visible.join(", ")}`);

const dashboardPath = fileURLToPath(new URL("../data/dashboard.json", import.meta.url));
const dashboard = JSON.parse(readFileSync(dashboardPath, "utf8")) as {
  salesPipeline?: { weeklyPerformance?: { history?: Array<{ week: string }> } };
};
const history = dashboard.salesPipeline?.weeklyPerformance?.history ?? [];
const filtered = filterWeeklyHistory(history, REF_DATE);
const weeks = filtered.map((row) => row.week);
console.log("\n=== dashboard.json filtered ===");
console.log(`Count: ${filtered.length}`);
console.log(`Range: ${formatVisibleWeekRange(weeks)}`);
console.log(`Weeks: ${weeks.join(", ")}`);

const hidden = history.filter((row) => !weeks.includes(row.week)).map((row) => row.week);
console.log(`Hidden: ${hidden.join(", ") || "(none)"}`);

if (weeks.some((w) => (parseWeekNumber(w) ?? 0) <= 13)) {
  console.error("FAIL: Q1 week leaked into filter");
  process.exit(1);
}
console.log("\nOK");
