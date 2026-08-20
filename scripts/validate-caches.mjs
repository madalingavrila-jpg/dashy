#!/usr/bin/env node
/**
 * CACHE VALIDATION GATE — pre-flight for the dashboard build.
 *
 * Validates every cache file in the canonical manifest
 * (scripts/gen-all-cache-queries.mjs) BEFORE build-all-data.mjs assembles
 * data/dashboard.json, so a refresh fails fast with a clear message instead of
 * building partial/empty sections. Checks per file:
 *
 *   - exists and parses (JSON, or MCP-table text with a leading header line)
 *   - row count within the manifest's expected bounds
 *   - truncation signatures: SOQL results at/over 2,000 rows, `done: false`
 *     pagination, Databricks single-pull results of exactly 10,000 rows
 *     (classic MCP cap truncation; chunk-merged files may exceed 10k and are
 *     gated by manifest bounds instead; intentional caps like mp-* LIMIT 1500
 *     are exempt)
 *   - staleness (WARNING only): files that should be re-pulled on every refresh
 *     but are older than --max-age-hours (default 36; env VALIDATE_MAX_AGE_HOURS)
 *   - merge freshness: the merged full-year history caches must not be older
 *     than their newest monthly chunk (means the merge step was skipped)
 *
 * CLOSED-MONTH chunk files are exempt from staleness by design — the
 * incremental refresh (gen-sf-history-queries default) reads them from disk and
 * never re-pulls them. A MISSING closed-month chunk is still a hard error
 * (re-pull with `node scripts/gen-sf-history-queries.mjs --full`).
 *
 * ## Usage
 *   node scripts/validate-caches.mjs                    # gate (exit 1 on errors)
 *   node scripts/validate-caches.mjs --max-age-hours=48
 *
 * Wired into scripts/build-all-data.mjs as step 0. Escape hatch (NOT for normal
 * refreshes): DASHY_SKIP_VALIDATE=1 npm run refresh-all
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCacheManifest } from "./gen-all-cache-queries.mjs";
import { TEAM_ROSTER } from "../lib/agent-segments.mjs";
import { currentTrackingYear } from "../lib/weekly-stages-build.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const errors = [];
const warnings = [];
let okCount = 0;

/** Parse a cache file according to its manifest format; returns { count, done }. */
function parseCache(path, format) {
  const raw = readFileSync(path, "utf8");
  if (format === "mcp-table") {
    // MCP execute_query results: header description line(s), then a JSON object.
    const start = raw.indexOf("{");
    if (start < 0) throw new Error("no JSON object found");
    const parsed = JSON.parse(raw.slice(start));
    const data = parsed.data;
    if (!Array.isArray(data)) throw new Error("no `data` array");
    return { count: data.length, done: true, dbTable: true };
  }
  const parsed = JSON.parse(raw);
  if (format === "mp-totals") {
    const opps = parsed.opps ?? {};
    if (typeof opps !== "object" || Object.keys(opps).length === 0)
      throw new Error("`opps` is empty — per-rep totals missing");
    if (typeof (parsed.leadsOpen ?? {}) !== "object") throw new Error("`leadsOpen` is not an object");
    return { count: Object.keys(opps).length, done: true };
  }
  if (format === "mops-cases") {
    if (typeof parsed.openCases !== "number") throw new Error("`openCases` is not a number");
    const records = parsed.records ?? [];
    if (!Array.isArray(records)) throw new Error("`records` is not an array");
    return { count: records.length, done: true };
  }
  // sf-records: { totalSize?, done?, records: [...] } or a bare array
  const records = Array.isArray(parsed) ? parsed : parsed.records;
  if (!Array.isArray(records)) throw new Error("no `records` array");
  return { count: records.length, done: parsed.done !== false };
}

/** Collect the distinct SF owner ids present in an sf-records cache file. */
function ownerIdsInCache(path, { nested = false } = {}) {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  const records = Array.isArray(parsed) ? parsed : (parsed.records ?? []);
  const ids = new Set();
  for (const rec of records) {
    const id = nested ? rec?.Opportunity?.OwnerId : rec?.OwnerId;
    if (id) ids.add(id);
  }
  return ids;
}

/**
 * ROSTER-PRESENCE GATE — every one of the 12 team reps MUST appear in the
 * full-year, owner-scoped caches. This is the precise guard for the class of bug
 * where a cache was pulled with an owner IN-list that silently dropped a rep
 * (e.g. Corneliu-Ștefan Radu missing from sf-won-ytd-bydate → 0 Won/Activated on
 * the dashboard even though SF had 11 June wins). These caches span the whole
 * tracking year for established reps, so a MISSING owner id means a bad pull, not
 * a legitimately zero rep — fail fast before the build attributes zeros.
 */
function checkRosterPresence() {
  const year = currentTrackingYear();
  const teamIds = TEAM_ROSTER.map((r) => r.ownerId);
  const targets = [
    { file: "scripts/.cache/sf-won-ytd-bydate.json", nested: false, source: "Won (all months)" },
    { file: `scripts/.cache/sf-stage-history-${year}.json`, nested: true, source: "Activated / stage history" },
    { file: `scripts/.cache/sf-weekly-${year}.json`, nested: false, source: "Weekly production" },
  ];
  for (const t of targets) {
    const path = join(root, t.file);
    if (!existsSync(path)) continue; // MISSING is already reported by the manifest loop
    let present;
    try {
      present = ownerIdsInCache(path, { nested: t.nested });
    } catch (err) {
      errors.push(`${t.file}: UNPARSEABLE during roster-presence check (${err.message}).`);
      continue;
    }
    const missing = teamIds.filter((id) => !present.has(id));
    if (missing.length) {
      errors.push(
        `${t.file}: missing ${missing.length}/${teamIds.length} team rep(s) [${missing.join(", ")}] — ` +
          `this cache drives ${t.source} and MUST contain all ${teamIds.length} reps. A dropped owner id means the ` +
          "pull used a stale/short owner IN-list (the Cornel 0-Won/0-Activated bug). Re-pull with the current " +
          "queries: node scripts/gen-all-cache-queries.mjs (owner IDs derive from lib/agent-segments TEAM_ROSTER).",
      );
    }
  }
}

function hint(entry) {
  if (entry.closedMonthChunk) {
    return "re-pull every month: node scripts/gen-sf-history-queries.mjs --full (then run the queries via the Salesforce MCP and re-run fetch-sf-stage-history.mjs)";
  }
  if (entry.gen) return `produce via: ${entry.gen}`;
  return "query: see node scripts/gen-all-cache-queries.mjs";
}

function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, "").split("=");
      return [k, v ?? true];
    }),
  );
  const maxAgeHours =
    Number(args["max-age-hours"]) || Number(process.env.VALIDATE_MAX_AGE_HOURS) || 36;

  const manifest = buildCacheManifest({ full: true });
  const chunkMtimes = new Map(); // merged-cache prefix → newest chunk mtime

  for (const entry of manifest.entries) {
    const path = join(root, entry.file);
    const name = entry.file;

    if (!existsSync(path)) {
      if (entry.optional) {
        // Not pulled yet — the build has a documented fallback for it.
        continue;
      }
      if (entry.closedMonthChunk) {
        errors.push(
          `${name}: MISSING closed-month chunk — the incremental refresh reads closed months from disk; ` +
            `without this file the merged cache silently loses a month. Fix: ${hint(entry)}`,
        );
      } else {
        errors.push(`${name}: MISSING. Fix: ${hint(entry)}`);
      }
      continue;
    }

    let parsed;
    try {
      parsed = parseCache(path, entry.format);
    } catch (err) {
      errors.push(`${name}: UNPARSEABLE (${err.message}). Re-pull it — ${hint(entry)}`);
      continue;
    }

    const { count, done, dbTable } = parsed;
    const [min, max] = entry.bounds;

    if (!done) {
      errors.push(
        `${name}: MCP result has done=false — the pull was paginated/TRUNCATED. Re-pull with a narrower window. ${hint(entry)}`,
      );
      continue;
    }
    if (entry.source !== "local-merge" && !dbTable && !entry.cap && count >= 2000) {
      errors.push(
        `${name}: ${count} rows — at/over the ~2,000-row SOQL cap; almost certainly TRUNCATED. Split the window and re-pull. ${hint(entry)}`,
      );
      continue;
    }
    // Exact 10,000 = classic single MCP pull truncation. Chunk-merged caches
    // (monthly/quality) legitimately exceed 10k and are checked via bounds.
    if (dbTable && count === 10000) {
      errors.push(
        `${name}: ${count} rows — at the 10,000-row Databricks MCP cap; result is TRUNCATED. Chunk the query (e.g. gen-accounts-perf-queries.mjs --chunk=<n>) and merge.`,
      );
      continue;
    }
    if (count < min || count > max) {
      errors.push(
        `${name}: ${count} rows outside expected bounds ${min}–${max}. ` +
          `If the data legitimately grew, update the bounds in gen-all-cache-queries.mjs; otherwise re-pull. ${hint(entry)}`,
      );
      continue;
    }

    const mtimeMs = statSync(path).mtimeMs;
    // Track newest chunk mtime per merged cache (e.g. sf-stage-history-2026-*.json → sf-stage-history-2026.json).
    const chunkMatch = basename(name).match(/^(.*-\d{4})-\d{2}\.json$/);
    if (chunkMatch) {
      const mergedFile = `scripts/.cache/${chunkMatch[1]}.json`;
      chunkMtimes.set(mergedFile, Math.max(chunkMtimes.get(mergedFile) ?? 0, mtimeMs));
    }

    if (entry.refreshedEachRun && !entry.closedMonthChunk) {
      const ageHours = (Date.now() - mtimeMs) / 3_600_000;
      if (ageHours > maxAgeHours) {
        warnings.push(
          `${name}: last refreshed ${ageHours.toFixed(1)}h ago (> ${maxAgeHours}h) — expected to be re-pulled on every refresh.`,
        );
      }
    }

    okCount += 1;
  }

  // Merge freshness: merged full-year caches must be at least as new as their
  // newest monthly chunk, otherwise the merge step was skipped after a re-pull.
  const TOLERANCE_MS = 10_000;
  for (const [mergedFile, newestChunk] of chunkMtimes) {
    const mergedPath = join(root, mergedFile);
    if (!existsSync(mergedPath)) continue; // already reported as missing above
    if (statSync(mergedPath).mtimeMs + TOLERANCE_MS < newestChunk) {
      errors.push(
        `${mergedFile}: OLDER than its newest monthly chunk — the merge was not re-run after a pull. ` +
          "Fix: node scripts/fetch-sf-stage-history.mjs --kind=all",
      );
    }
  }

  checkRosterPresence();

  for (const w of warnings) console.warn(`[validate-caches] WARN  ${w}`);
  for (const e of errors) console.error(`[validate-caches] ERROR ${e}`);
  console.log(
    `[validate-caches] ${okCount}/${manifest.entries.length} caches OK, ` +
      `${warnings.length} warning(s), ${errors.length} error(s).`,
  );
  if (errors.length > 0) {
    console.error(
      "[validate-caches] FAILING FAST — fix the caches above before building, or list every " +
        "canonical query with: node scripts/gen-all-cache-queries.mjs",
    );
    process.exit(1);
  }
}

main();
