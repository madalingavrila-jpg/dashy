#!/usr/bin/env node
/**
 * Merge the MONTHLY-chunked Salesforce MCP exports into the full-year caches,
 * deduping so a re-pull is always safe and idempotent. This is the merge half of
 * the truncation-safe refresh — `scripts/gen-sf-history-queries.mjs` emits the
 * per-month SOQL (each chunk < 2,000 rows, under the SOQL cap), the agent runs
 * each via the Salesforce MCP and writes the result to the matching chunk file,
 * then this script merges + dedups all chunks.
 *
 * Two kinds (see AGENTS.md → "Chunked stage-history + weekly refresh"):
 *
 *   stage-history  sf-stage-history-YYYY-MM.json  → sf-stage-history-YYYY.json
 *                  (OpportunityFieldHistory; dedup by
 *                   OpportunityId+Field+CreatedDate+OldValue+NewValue)
 *   weekly         sf-weekly-YYYY-MM.json         → sf-weekly-YYYY.json
 *                  (Opportunity; dedup by Id, newest LastModifiedDate wins)
 *
 * Each chunk file may be either the raw MCP response (`{ records: [...] }` /
 * `{ totalSize, records }`) or a bare array. Missing chunk files are skipped with
 * a warning so a partial re-pull never corrupts the merged cache.
 *
 * ## Usage
 *   node scripts/fetch-sf-stage-history.mjs                 # stage-history only (back-compat)
 *   node scripts/fetch-sf-stage-history.mjs --kind=stage-history
 *   node scripts/fetch-sf-stage-history.mjs --kind=weekly
 *   node scripts/fetch-sf-stage-history.mjs --kind=all
 *   node scripts/fetch-sf-stage-history.mjs --year=2026
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(__dirname, ".cache");

function records(data) {
  const r = data.records ?? data;
  return Array.isArray(r) ? r : null;
}

/** Stable dedup key — drops duplicate rows from overlapping/re-pulled chunks. */
const DEDUP_KEYS = {
  "stage-history": (r) =>
    [r.OpportunityId, r.Field, r.CreatedDate, r.OldValue, r.NewValue].join("|"),
  weekly: (r) => String(r.Id),
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
};

function mergeKind(kind, year) {
  const { prefix, sortAsc } = KINDS[kind];
  const re = new RegExp(`^${prefix}-${year}-\\d{2}\\.json$`);
  const monthFiles = readdirSync(cacheDir)
    .filter((f) => re.test(f))
    .sort();

  if (monthFiles.length === 0) {
    console.error(`[${kind}] No monthly chunk files found (${prefix}-${year}-NN.json).`);
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

  let ok = false;
  for (const kind of kinds) {
    if (!KINDS[kind]) {
      console.error(`Unknown --kind=${kind}. Use stage-history | weekly | all.`);
      process.exit(1);
    }
    ok = mergeKind(kind, year) || ok;
  }
  if (!ok) process.exit(1);
}

main();
