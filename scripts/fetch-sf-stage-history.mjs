#!/usr/bin/env node
/**
 * Merge the MONTHLY-chunked Salesforce MCP exports into the full-year caches,
 * deduping so a re-pull is always safe and idempotent. This is the merge half of
 * the truncation-safe refresh — `scripts/gen-sf-history-queries.mjs` emits the
 * per-month SOQL (each chunk < 2,000 rows, under the SOQL cap), the agent runs
 * each via the Salesforce MCP and writes the result to the matching chunk file,
 * then this script merges + dedups all chunks.
 *
 * Three kinds (see AGENTS.md → "Chunked stage-history + weekly refresh"):
 *
 *   stage-history          sf-stage-history-YYYY-MM.json          → sf-stage-history-YYYY.json
 *                          (OpportunityFieldHistory; dedup by
 *                           OpportunityId+Field+CreatedDate+OldValue+NewValue)
 *   weekly                 sf-weekly-YYYY-MM.json                 → sf-weekly-YYYY.json
 *                          (Opportunity; dedup by Id, newest LastModifiedDate wins)
 *   inbound-stage-history  sf-inbound-stage-history-YYYY-MM.json  → sf-inbound-stage-history-YYYY.json
 *                          (same dedup as stage-history; 2 inbound reps)
 *
 * ## Incremental refresh contract (closed months come from disk)
 * gen-sf-history-queries.mjs is INCREMENTAL by default: agents only re-pull the
 * current month (+ previous month right after a month boundary). This merge
 * therefore expects EVERY month Jan→current to have a chunk file on disk and
 * FAILS LOUDLY if a closed-month chunk is missing — that means the incremental
 * assumption is broken and you must re-pull everything:
 *   node scripts/gen-sf-history-queries.mjs --full
 *
 * ## Inbound h1/h2 migration
 * The inbound stage-history used to be cached as two half-year files
 * (sf-inbound-stage-history-YYYY-h1.json / -h2.json). On the first
 * `--kind=inbound-stage-history` run, any month that has no monthly chunk file
 * yet is seeded from the h1/h2 records (one-time, never overwrites existing
 * monthly chunks). After that the monthly chunks are canonical.
 *
 * Each chunk file may be either the raw MCP response (`{ records: [...] }` /
 * `{ totalSize, records }`) or a bare array.
 *
 * ## Usage
 *   node scripts/fetch-sf-stage-history.mjs                 # stage-history only (back-compat)
 *   node scripts/fetch-sf-stage-history.mjs --kind=stage-history
 *   node scripts/fetch-sf-stage-history.mjs --kind=weekly
 *   node scripts/fetch-sf-stage-history.mjs --kind=inbound-stage-history
 *   node scripts/fetch-sf-stage-history.mjs --kind=all
 *   node scripts/fetch-sf-stage-history.mjs --year=2026
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(__dirname, ".cache");

function records(data) {
  const r = data.records ?? data;
  return Array.isArray(r) ? r : null;
}

/** Stable dedup key — drops duplicate rows from overlapping/re-pulled chunks. */
const historyKey = (r) =>
  [r.OpportunityId, r.Field, r.CreatedDate, r.OldValue, r.NewValue].join("|");

const DEDUP_KEYS = {
  "stage-history": historyKey,
  weekly: (r) => String(r.Id),
  "inbound-stage-history": historyKey,
};

/** weekly: keep the row with the newest LastModifiedDate when Ids collide. */
function preferNewerWeekly(existing, incoming) {
  const a = existing?.LastModifiedDate ?? existing?.CreatedDate ?? "";
  const b = incoming?.LastModifiedDate ?? incoming?.CreatedDate ?? "";
  return b > a ? incoming : existing;
}

const KINDS = {
  "stage-history": {
    prefix: "sf-stage-history",
    sortAsc: true, // CreatedDate ascending (matches the SOQL ORDER BY)
  },
  weekly: {
    prefix: "sf-weekly",
    sortAsc: false, // CreatedDate descending
  },
  "inbound-stage-history": {
    prefix: "sf-inbound-stage-history",
    sortAsc: true,
  },
};

/** Current month (1-12, Europe/Bucharest) for `year`; 12 for past years. */
function expectedThroughMonth(year) {
  const now = new Date();
  const tz = { timeZone: "Europe/Bucharest" };
  const tzYear = Number(new Intl.DateTimeFormat("en-CA", { ...tz, year: "numeric" }).format(now));
  if (year < tzYear) return 12;
  return Number(new Intl.DateTimeFormat("en-CA", { ...tz, month: "numeric" }).format(now));
}

/**
 * One-time migration: seed missing inbound monthly chunk files from the legacy
 * half-year exports (h1 = Jan–Jun, h2 = Jul–Dec pull windows; we split strictly
 * by each record's CreatedDate month). Existing monthly chunks are NEVER
 * overwritten — fresh MCP pulls always win over the legacy files.
 */
function seedInboundMonthlyChunksFromHalves(year) {
  const halves = [`sf-inbound-stage-history-${year}-h1.json`, `sf-inbound-stage-history-${year}-h2.json`]
    .map((f) => join(cacheDir, f))
    .filter((p) => existsSync(p));
  if (halves.length === 0) return;

  const byMonth = new Map(); // "MM" → records[]
  for (const path of halves) {
    const recs = records(JSON.parse(readFileSync(path, "utf8"))) ?? [];
    for (const r of recs) {
      const created = String(r.CreatedDate ?? "");
      if (!created.startsWith(`${year}-`)) continue;
      const mm = created.slice(5, 7);
      if (!byMonth.has(mm)) byMonth.set(mm, []);
      byMonth.get(mm).push(r);
    }
  }

  let seeded = 0;
  for (const [mm, recs] of [...byMonth.entries()].sort()) {
    const chunkPath = join(cacheDir, `sf-inbound-stage-history-${year}-${mm}.json`);
    if (existsSync(chunkPath)) continue; // fresh pull wins
    writeFileSync(
      chunkPath,
      `${JSON.stringify({ totalSize: recs.length, done: true, records: recs }, null, 2)}\n`,
    );
    console.log(
      `[inbound-stage-history] Seeded ${year}-${mm} chunk from legacy h1/h2 (${recs.length} records).`,
    );
    seeded += 1;
  }
  if (seeded > 0) {
    console.log(
      `[inbound-stage-history] Migrated ${seeded} month(s) from h1/h2 — monthly chunks are now canonical.`,
    );
  }
}

function mergeKind(kind, year) {
  const { prefix, sortAsc } = KINDS[kind];

  if (kind === "inbound-stage-history") seedInboundMonthlyChunksFromHalves(year);

  const re = new RegExp(`^${prefix}-${year}-\\d{2}\\.json$`);
  const monthFiles = readdirSync(cacheDir)
    .filter((f) => re.test(f))
    .sort();

  if (monthFiles.length === 0) {
    console.error(`[${kind}] No monthly chunk files found (${prefix}-${year}-NN.json).`);
    return false;
  }

  // Closed-month guard: with the incremental refresh (gen-sf-history-queries
  // default), closed months are NEVER re-pulled — so every month Jan→current
  // MUST already exist on disk. A missing chunk means the merged cache would
  // silently lose a whole month of history.
  const through = expectedThroughMonth(year);
  const missing = [];
  for (let m = 1; m <= through; m++) {
    const mm = String(m).padStart(2, "0");
    if (!monthFiles.includes(`${prefix}-${year}-${mm}.json`)) missing.push(`${year}-${mm}`);
  }
  if (missing.length > 0) {
    console.error(
      `[${kind}] ERROR: missing monthly chunk file(s) for ${missing.join(", ")} ` +
        `(expected ${prefix}-${year}-NN.json for every month 01→${String(through).padStart(2, "0")}).\n` +
        `[${kind}] The incremental refresh only re-pulls the current month and reads closed months ` +
        `from disk — a missing closed-month chunk would silently drop that month from the merged cache.\n` +
        `[${kind}] Fix: re-pull every month with\n` +
        `[${kind}]   node scripts/gen-sf-history-queries.mjs --kind=${kind} --full\n` +
        `[${kind}] then run the printed queries via the Salesforce MCP and re-run this merge.`,
    );
    return false;
  }

  const keyOf = DEDUP_KEYS[kind];
  const byKey = new Map();
  let totalRead = 0;
  for (const file of monthFiles) {
    const data = JSON.parse(readFileSync(join(cacheDir, file), "utf8"));
    const recs = records(data);
    if (!recs) {
      console.error(`[${kind}] Unexpected format in ${file} — skipping.`);
      continue;
    }
    if (recs.length >= 2000) {
      console.error(
        `[${kind}] WARNING ${file} has ${recs.length} rows — at/over the 2,000 SOQL cap; ` +
          "this chunk may be TRUNCATED. Split the window further and re-pull.",
      );
    }
    totalRead += recs.length;
    for (const r of recs) {
      const k = keyOf(r);
      if (kind === "weekly" && byKey.has(k)) {
        byKey.set(k, preferNewerWeekly(byKey.get(k), r));
      } else if (!byKey.has(k)) {
        byKey.set(k, r);
      }
    }
    console.log(`  ${file}: ${recs.length} records`);
  }

  const merged = [...byKey.values()];
  merged.sort((a, b) => {
    const d = new Date(a.CreatedDate) - new Date(b.CreatedDate);
    return sortAsc ? d : -d;
  });

  const outPath = join(cacheDir, `${prefix}-${year}.json`);
  writeFileSync(
    outPath,
    `${JSON.stringify({ totalSize: merged.length, records: merged }, null, 2)}\n`,
  );
  const dupes = totalRead - merged.length;
  console.log(
    `[${kind}] Wrote ${outPath} — ${merged.length} unique records ` +
      `(${totalRead} read, ${dupes} duplicate${dupes === 1 ? "" : "s"} dropped)\n`,
  );
  return true;
}

function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, "").split("=");
      return [k, v ?? true];
    }),
  );
  const year = Number(args.year) || new Date().getFullYear();
  const requested = args.kind ?? "stage-history";
  const kinds = requested === "all" ? Object.keys(KINDS) : [requested];

  let allOk = true;
  for (const kind of kinds) {
    if (!KINDS[kind]) {
      console.error(`Unknown --kind=${kind}. Use ${Object.keys(KINDS).join(" | ")} | all.`);
      process.exit(1);
    }
    allOk = mergeKind(kind, year) && allOk;
  }
  if (!allOk) process.exit(1);
}

main();
