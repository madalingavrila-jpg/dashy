#!/usr/bin/env node
/** Fail the Paketo build if required production artifacts are missing. */
import fs from "node:fs";
import path from "node:path";
import { TEAM_ROSTER, INBOUND_OWNER_IDS } from "../lib/agent-segments.mjs";
import { buildMtdHistoryFromHybrid, mergeWonExportRecords } from "../lib/mtd-history.mjs";

const root = process.cwd();

/**
 * Canonical roster the build MUST always ship. Derived from the single source of
 * truth (TEAM_ROSTER) so a roster change updates this guard automatically. This
 * is the permanent guard against the "agents disappeared from tables" regression:
 * a rep with zero pipeline sample rows or zero MTD activity in the selected
 * month/week must still be seeded (ensureTeamRoster) — never silently dropped.
 */
const EXPECTED_TEAM_IDS = TEAM_ROSTER.map((entry) => entry.ownerId);
const EXPECTED_TEAM_ID_SET = new Set(EXPECTED_TEAM_IDS);
const EXPECTED_TEAM_COUNT = EXPECTED_TEAM_IDS.length;
const EXPECTED_INBOUND_COUNT = INBOUND_OWNER_IDS.size;

/**
 * Compare a section's owner-id list against the canonical 12-rep roster.
 * Returns a human-readable diff string when it does NOT match exactly, else "".
 */
function rosterMismatch(ownerIds) {
  const present = new Set(ownerIds);
  const missing = EXPECTED_TEAM_IDS.filter((id) => !present.has(id));
  const unexpected = [...present].filter((id) => !EXPECTED_TEAM_ID_SET.has(id));
  if (ownerIds.length === EXPECTED_TEAM_COUNT && !missing.length && !unexpected.length) {
    return "";
  }
  const parts = [`got ${ownerIds.length}/${EXPECTED_TEAM_COUNT}`];
  if (missing.length) parts.push(`missing [${missing.join(", ")}]`);
  if (unexpected.length) parts.push(`unexpected [${unexpected.join(", ")}]`);
  return parts.join("; ");
}
const SECTIONS = [
  "overview",
  "mtd",
  "weekly",
  "accounts",
  "accounts-performance",
  "churn-prevention",
  "mops",
  "agents",
  "my-pipeline",
  "inbound",
  "mtd-details",
];
const required = [
  "out/index.html",
  "dist/src/server.js",
  "dist/src/routes/api.js",
  "dist/src/services/dashboard.js",
  "dist/lib/agent-segments.js",
  "dist/lib/format.js",
  "dist/lib/isoWeek.js",
  "dist/lib/salesforce.js",
  "data/dashboard.json",
  "out/api/dashboard.json",
  "out/api/dashboard.json.gz",
  "out/api/dashboard.json.br",
  "dist/build-info.json",
  ...SECTIONS.map((section) => `out/api/dashboard/${section}.json`),
  ...SECTIONS.map((section) => `out/api/dashboard/${section}.json.gz`),
  ...SECTIONS.map((section) => `out/api/dashboard/${section}.json.br`),
];

const missing = required.filter((rel) => !fs.existsSync(path.join(root, rel)));

if (missing.length > 0) {
  console.error("[verify-build] Missing required build artifacts:");
  for (const file of missing) {
    console.error(`  - ${file}`);
  }
  process.exit(1);
}

let dashboard;
try {
  dashboard = JSON.parse(fs.readFileSync(path.join(root, "data/dashboard.json"), "utf8"));
} catch (error) {
  const message = error instanceof Error ? error.message : "invalid JSON";
  console.error(`[verify-build] data/dashboard.json is not valid JSON: ${message}`);
  process.exit(1);
}

// --- Non-empty section guards -------------------------------------------------
// Fail loudly on a partial refresh (e.g. a builder that didn't run or wiped a
// tab). These sections are produced by the orchestrator (scripts/build-all-data.mjs);
// an empty one means the deploy would ship a blank tab.
const dataErrors = [];

const sp = dashboard.salesPipeline ?? {};
const inboundReps = dashboard.inboundTeam?.reps;
if (!Array.isArray(inboundReps) || inboundReps.length === 0) {
  dataErrors.push("inboundTeam.reps is empty — run `npm run refresh-all` (build-inbound-team).");
}
const apAccounts = dashboard.accountsPerformance?.accounts;
if (!Array.isArray(apAccounts) || apAccounts.length === 0) {
  dataErrors.push(
    "accountsPerformance.accounts is empty — run `npm run refresh-all` (build-accounts-performance).",
  );
}
const churnAccounts = dashboard.churnPrevention?.accounts;
if (!Array.isArray(churnAccounts) || churnAccounts.length === 0) {
  dataErrors.push(
    "churnPrevention.accounts is empty — run `npm run refresh-all` (build-churn-prevention).",
  );
}
const mpItems = sp.myPipeline?.items;
if (!Array.isArray(mpItems) || mpItems.length === 0) {
  dataErrors.push("salesPipeline.myPipeline.items is empty — run `npm run refresh-all` (build-my-pipeline).");
}
// --- Team roster guard (permanent) -------------------------------------------
// The team agent roster MUST contain EXACTLY the 12 canonical reps — no missing
// reps (the "agents disappeared" bug: zero-activity reps dropped after a refresh)
// and no unexpected/excluded reps leaking in. Enforced on the Overview `agents`
// list AND on EVERY month in `mtdHistory` (so the Monthly Overview month switch
// can never render a short roster). ensureTeamRoster seeds missing reps with
// zero counts; if that ever regresses, the build fails loudly here.
const teamAgents = sp.agents;
if (!Array.isArray(teamAgents)) {
  dataErrors.push(
    "salesPipeline.agents is missing or not an array — ensureTeamRoster must seed all 12 team reps.",
  );
} else {
  const diff = rosterMismatch(teamAgents.map((a) => a?.ownerId));
  if (diff) {
    dataErrors.push(
      `salesPipeline.agents must list exactly the ${EXPECTED_TEAM_COUNT} team reps (${diff}) — ` +
        "ensureTeamRoster should seed missing reps with zero counts.",
    );
  }
}

const mtdHistory = sp.mtdHistory;
if (!Array.isArray(mtdHistory) || mtdHistory.length === 0) {
  dataErrors.push(
    "salesPipeline.mtdHistory is empty — run `npm run refresh-all` (build-dashboard-data).",
  );
} else {
  for (const month of mtdHistory) {
    const diff = rosterMismatch((month?.agents ?? []).map((a) => a?.ownerId));
    if (diff) {
      dataErrors.push(
        `salesPipeline.mtdHistory[${month?.monthKey ?? "?"}] must list all ${EXPECTED_TEAM_COUNT} team reps (${diff}) — ` +
          "each month must seed zero-activity reps (mtdHistoryFromStore → ensureTeamRoster).",
      );
    }
  }
}

if (Array.isArray(inboundReps) && inboundReps.length !== EXPECTED_INBOUND_COUNT) {
  dataErrors.push(
    `inboundTeam.reps must list exactly the ${EXPECTED_INBOUND_COUNT} inbound reps (got ${inboundReps.length}).`,
  );
}

// --- MTD reconciliation guard (catches silently-zeroed / mis-attributed reps) --
// The 12-rep presence guard above only proves a rep ROW exists; it does NOT prove
// the row carries that rep's REAL Won/Activated counts. The Cornel bug shipped all
// 12 rows but with 0/0 for a rep who actually had 11 June wins. These two checks
// close that gap:
//
//   (1) Self-consistency (always): every mtdHistory month's `mtdAchievement`
//       totals must equal the SUM of that month's per-rep counts, and the YTD
//       Overview totals must equal the sum across months. A rep dropped between
//       the per-rep list and the achievement aggregation (attribution/classifier
//       mismatch) makes these not reconcile.
//   (2) Cache cross-check (when the SF caches are present — i.e. at data-refresh
//       time, NOT on a cache-less Boltable redeploy): recompute the canonical MTD
//       history straight from the raw caches and assert the shipped per-rep counts
//       match. This catches a stale/short cache pull whose zeros were baked into
//       dashboard.json, and a dashboard.json that wasn't rebuilt after a re-pull.
if (Array.isArray(mtdHistory) && mtdHistory.length > 0) {
  let ytdWon = 0;
  let ytdActivated = 0;
  for (const month of mtdHistory) {
    const agents = month?.agents ?? [];
    const sumWon = agents.reduce((s, a) => s + (a?.wonMtd ?? 0), 0);
    const sumActivated = agents.reduce((s, a) => s + (a?.activatedMtd ?? 0), 0);
    ytdWon += sumWon;
    ytdActivated += sumActivated;
    const ach = month?.mtdAchievement ?? {};
    if (typeof ach.actualWon === "number" && ach.actualWon !== sumWon) {
      dataErrors.push(
        `mtdHistory[${month?.monthKey}] actualWon (${ach.actualWon}) != Σ per-rep wonMtd (${sumWon}) — ` +
          "a rep was dropped between the per-rep list and mtdAchievement (attribution/classifier bug).",
      );
    }
    if (typeof ach.actualActivated === "number" && ach.actualActivated !== sumActivated) {
      dataErrors.push(
        `mtdHistory[${month?.monthKey}] actualActivated (${ach.actualActivated}) != Σ per-rep activatedMtd (${sumActivated}).`,
      );
    }
  }
  const wonTotalValue = sp.totals?.won?.value;
  const activatedTotalValue = sp.totals?.activated?.value;
  if (typeof wonTotalValue === "number" && wonTotalValue !== ytdWon) {
    dataErrors.push(
      `totals.won.value (${wonTotalValue}) != Σ mtdHistory per-rep wonMtd (${ytdWon}) — YTD Won must reconcile to the per-rep MTD store.`,
    );
  }
  if (typeof activatedTotalValue === "number" && activatedTotalValue !== ytdActivated) {
    dataErrors.push(
      `totals.activated.value (${activatedTotalValue}) != Σ mtdHistory per-rep activatedMtd (${ytdActivated}) — YTD Activated must reconcile.`,
    );
  }

  // (2) Cross-check per-rep counts against the raw caches (refresh-time only).
  // Won comes from the Won_Date exports; Activated from the account-activation
  // export (Account.provider_first_active_date__c) — the canonical Activated source.
  const cacheDir = path.join(root, "scripts/.cache");
  const wonYtdPath = path.join(cacheDir, "sf-won-ytd-bydate.json");
  const activationPath = path.join(cacheDir, "sf-account-activation-2026.json");
  if (fs.existsSync(wonYtdPath) && fs.existsSync(activationPath)) {
    try {
      const readRecords = (p) => {
        const parsed = JSON.parse(fs.readFileSync(p, "utf8"));
        return Array.isArray(parsed) ? parsed : (parsed.records ?? []);
      };
      const wonMtdPath = path.join(cacheDir, "sf-won-mtd.json");
      const wonExports = [{ records: readRecords(wonYtdPath) }];
      if (fs.existsSync(wonMtdPath)) wonExports.push({ records: readRecords(wonMtdPath) });
      for (const name of fs.readdirSync(cacheDir).filter((n) => /^sf-won-\d{4}-\d{2}\.json$/.test(n))) {
        wonExports.push({ records: readRecords(path.join(cacheDir, name)) });
      }
      const wonAll = mergeWonExportRecords(wonExports);
      // Reactivations (pre-2026 first-active accounts, dated via stage history)
      // count toward Activated — mirror the build so the cross-check reconciles.
      const reactivationPath = path.join(cacheDir, "sf-reactivation-2026.json");
      const stageHistoryPath = path.join(cacheDir, "sf-stage-history-2026.json");
      const reactivation = {
        records: fs.existsSync(reactivationPath) ? readRecords(reactivationPath) : [],
        historyRecords: fs.existsSync(stageHistoryPath) ? readRecords(stageHistoryPath) : [],
      };
      const expected = buildMtdHistoryFromHybrid(wonAll, readRecords(activationPath), reactivation);
      const expectedByMonth = new Map(expected.map((m) => [m.monthKey, m]));
      for (const month of mtdHistory) {
        const exp = expectedByMonth.get(month?.monthKey);
        if (!exp) continue;
        const expByOwner = new Map(exp.agents.map((a) => [a.ownerId, a]));
        for (const agent of month?.agents ?? []) {
          const e = expByOwner.get(agent?.ownerId);
          if (!e) continue;
          if ((agent?.wonMtd ?? 0) !== e.wonMtd || (agent?.activatedMtd ?? 0) !== e.activatedMtd) {
            dataErrors.push(
              `mtdHistory[${month.monthKey}] rep ${agent?.name ?? agent?.ownerId}: shipped ` +
                `${agent?.wonMtd ?? 0}W/${agent?.activatedMtd ?? 0}A != canonical ${e.wonMtd}W/${e.activatedMtd}A ` +
                "from caches. Re-run `npm run refresh-all && npm run build` after re-pulling the SF caches " +
                "(a stale/short owner IN-list drops a rep's counts — the Cornel 0/0 bug).",
            );
          }
        }
      }
    } catch (err) {
      dataErrors.push(
        `MTD cache cross-check failed to run: ${err instanceof Error ? err.message : err}. ` +
          "Verify scripts/.cache SF exports are valid JSON.",
      );
    }
  }
}

// --- Won ≠ Activated invariant (Overview totals must be derived, not equal) ---
const wonTotal = sp.totals?.won?.value;
const activatedTotal = sp.totals?.activated?.value;
if (typeof wonTotal !== "number" || wonTotal <= 0) {
  dataErrors.push(`salesPipeline.totals.won.value is not a positive number (${wonTotal}).`);
}
if (typeof activatedTotal !== "number" || activatedTotal <= 0) {
  dataErrors.push(`salesPipeline.totals.activated.value is not a positive number (${activatedTotal}).`);
}
if (
  typeof wonTotal === "number" &&
  typeof activatedTotal === "number" &&
  wonTotal === activatedTotal
) {
  dataErrors.push(
    `salesPipeline.totals.won (${wonTotal}) === totals.activated (${activatedTotal}) — ` +
      "Won and Activated must be distinct metrics (see AGENTS.md: Won ≠ Activated).",
  );
}

// Snapshot funnel must carry live counts (de-hardcoded), not all zeros.
const snapshotSales = sp.snapshot?.sales;
if (!Array.isArray(snapshotSales) || !snapshotSales.some((s) => (s?.count ?? 0) > 0)) {
  dataErrors.push("salesPipeline.snapshot.sales has no positive stage counts — stage-counts export missing?");
}

if (dataErrors.length > 0) {
  console.error("[verify-build] dashboard data failed validation:");
  for (const err of dataErrors) console.error(`  - ${err}`);
  process.exit(1);
}

const apiPath = path.join(root, "out/api/dashboard.json");
const apiBytes = fs.statSync(apiPath).size;
// 360 KB: Aug 2026 YTD volume landed ~351 KB while still fully slimmed (gzip ~42 KB).
const API_PAYLOAD_MAX_BYTES = 360_000;
if (apiBytes > API_PAYLOAD_MAX_BYTES) {
  console.error(
    `[verify-build] out/api/dashboard.json is ${apiBytes} bytes (max ${API_PAYLOAD_MAX_BYTES}). ` +
      "Slim drill-down data in serializeDashboardApi to avoid Boltable OOM.",
  );
  process.exit(1);
}

// Per-section payload guard. The server preloads every section file (raw + gz +
// br) into memory at startup (apiAssets.preloadApiAssets), so an unbounded
// section (e.g. an unslimmed my-pipeline / accounts-performance after a big
// data refresh) inflates steady-state RSS on the 384 MB Boltable heap. The
// full /api/dashboard payload is already capped above; the large per-section
// files (my-pipeline, accounts-performance) are NOT in that payload, so guard
// them separately. Generous ceiling — meant to catch runaway growth, not to be
// a tight budget.
const SECTION_PAYLOAD_MAX_BYTES = 1_500_000;
const oversizeSections = [];
for (const section of SECTIONS) {
  const sectionPath = path.join(root, `out/api/dashboard/${section}.json`);
  const bytes = fs.statSync(sectionPath).size;
  if (bytes > SECTION_PAYLOAD_MAX_BYTES) {
    oversizeSections.push(`${section} (${bytes} bytes)`);
  }
}
if (oversizeSections.length > 0) {
  console.error(
    `[verify-build] section payload(s) exceed ${SECTION_PAYLOAD_MAX_BYTES} bytes: ${oversizeSections.join(", ")}. ` +
      "Slim the section in serializeDashboardSection/sliceDashboardSection to avoid Boltable OOM.",
  );
  process.exit(1);
}

console.log(
  `[verify-build] OK — static export, server bundle, and dashboard data verified (api ${apiBytes} bytes)`,
);
