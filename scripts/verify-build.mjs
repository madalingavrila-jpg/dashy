#!/usr/bin/env node
/** Fail the Paketo build if required production artifacts are missing. */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const SECTIONS = [
  "overview",
  "mtd",
  "weekly",
  "accounts",
  "accounts-performance",
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
const mpItems = sp.myPipeline?.items;
if (!Array.isArray(mpItems) || mpItems.length === 0) {
  dataErrors.push("salesPipeline.myPipeline.items is empty — run `npm run refresh-all` (build-my-pipeline).");
}
const teamAgents = sp.agents;
if (!Array.isArray(teamAgents) || teamAgents.length !== 12) {
  dataErrors.push(
    `salesPipeline.agents must list all 12 team reps (got ${teamAgents?.length ?? 0}) — ` +
      "ensureTeamRoster should seed missing reps with zero counts.",
  );
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
const API_PAYLOAD_MAX_BYTES = 350_000;
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
