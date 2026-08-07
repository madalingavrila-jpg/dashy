#!/usr/bin/env node
/**
 * Headless pull of ALL dashy Batch A/B/C caches from Databricks.
 *
 * Food SF CRM  → main.fivetran_salesforcefood  (replaces Salesforce MCP)
 * Delivery     → main.ng_delivery               (existing accounts-perf path)
 *
 * Env (required):
 *   DATABRICKS_HOST
 *   DATABRICKS_TOKEN
 *   DATABRICKS_WAREHOUSE_ID
 *
 * Env (optional):
 *   DATABRICKS_MAX_SYNC_AGE_HOURS  (default 12) — fail if opportunity sync older
 *   DASHY_CACHE_DIR               (default scripts/.cache)
 *
 * Usage:
 *   npm run data:pull-databricks
 *   node scripts/pull-all-caches-databricks.mjs
 *
 * After this script:
 *   node scripts/fetch-sf-stage-history.mjs --kind=all
 *   npm run refresh-all && npm run build
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TEAM_ROSTER, INBOUND_OWNER_IDS } from "../lib/agent-segments.mjs";
import { currentTrackingYear } from "../lib/weekly-stages-build.mjs";
import { executeSql, executeSqlObjects } from "../lib/databricks-sql.mjs";
import { monthsToPull, KINDS } from "./gen-sf-history-queries.mjs";
import { monthlyQuery, qualityQuery, chunk } from "./gen-accounts-perf-queries.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const cacheDir = process.env.DASHY_CACHE_DIR
  ? path.resolve(process.env.DASHY_CACHE_DIR)
  : path.join(here, ".cache");

const FOOD = "main.fivetran_salesforcefood";
const TEAM_IDS = TEAM_ROSTER.map((r) => r.ownerId);
const INBOUND_IDS = [...INBOUND_OWNER_IDS];
const MAX_SYNC_AGE_H = Number(process.env.DATABRICKS_MAX_SYNC_AGE_HOURS ?? 12);

const WEEKLY_STAGES = [
  "New Opportunity",
  "Contacting DCM",
  "First Pitch",
  "Negotiations",
  "Closed Won",
  "Activated",
];
const MP_WORKING_STAGES = [
  "Reachout",
  "Contacting DCM",
  "First Pitch",
  "Negotiations",
  "Contract sent",
];

const quote = (ids) => ids.map((id) => `'${id}'`).join(",");
const aliveOpp = `COALESCE(o._fivetran_deleted, false) = false AND COALESCE(o.is_deleted, false) = false`;
const aliveAcc = `COALESCE(a._fivetran_deleted, false) = false AND COALESCE(a.is_deleted, false) = false`;
const aliveHist = `COALESCE(ofh._fivetran_deleted, false) = false`;
const aliveLead = `COALESCE(l._fivetran_deleted, false) = false AND COALESCE(l.is_deleted, false) = false`;
const aliveCase = `COALESCE(c._fivetran_deleted, false) = false AND COALESCE(c.is_deleted, false) = false`;

function ensureCacheDir() {
  fs.mkdirSync(cacheDir, { recursive: true });
}

function writeJson(relOrAbs, value) {
  const file = path.isAbsolute(relOrAbs) ? relOrAbs : path.join(cacheDir, path.basename(relOrAbs));
  // Allow scripts/.cache/foo.json or just foo.json
  const out = relOrAbs.includes("/") && !path.isAbsolute(relOrAbs)
    ? path.join(process.cwd(), relOrAbs)
    : file;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(value, null, 2)}\n`);
  return out;
}

function writeSfRecords(filePath, records, extra = {}) {
  const outPath = filePath.startsWith("scripts/")
    ? path.join(process.cwd(), filePath)
    : path.join(cacheDir, filePath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const payload = {
    ...extra,
    totalSize: records.length,
    done: true,
    records,
  };
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.error(`[pull] wrote ${outPath} (${records.length} records)`);
  return outPath;
}

function writeMcpTable(fileName, note, rows) {
  const outPath = path.join(cacheDir, fileName);
  const body = `${note}\n\n${JSON.stringify({ data: rows })}\n`;
  fs.writeFileSync(outPath, body);
  console.error(`[pull] wrote ${outPath} (${rows.length} rows)`);
  return outPath;
}

function asDate(v) {
  if (v == null || v === "") return null;
  if (typeof v === "string") return v.slice(0, 10);
  return String(v).slice(0, 10);
}

function asTs(v) {
  if (v == null || v === "") return null;
  return String(v);
}

function bool(v) {
  if (v == null) return false;
  if (typeof v === "boolean") return v;
  return String(v).toLowerCase() === "true" || v === "1";
}

function nestOpp(row, { withWon = false, withActivation = false, withCreated = false } = {}) {
  const rec = {
    attributes: { type: "Opportunity" },
    Id: row.id,
    Name: row.name,
    StageName: row.stage_name,
    CloseDate: asDate(row.close_date),
    OwnerId: row.owner_id,
    Owner: { Name: row.owner_name ?? null },
    AccountId: row.account_id,
    Account: {
      Name: row.account_name ?? null,
      BillingCity: row.billing_city ?? null,
    },
  };
  if (withWon || row.is_won != null) {
    rec.IsWon = bool(row.is_won);
    rec.Won_Date__c = asDate(row.won_date_c);
  }
  if (row.record_type_name) {
    rec.RecordType = { Name: row.record_type_name };
  }
  if (withCreated) {
    rec.CreatedDate = asTs(row.created_date);
    rec.LastModifiedDate = asTs(row.last_modified_date);
  }
  if (withActivation) {
    rec.Account.provider_first_active_date__c = asDate(row.provider_first_active_date_c);
    if (row.reactivated_date_c != null) {
      rec.Account.Reactivated_Date__c = asDate(row.reactivated_date_c);
    }
  }
  if (row.last_stage_change_date != null) {
    rec.LastStageChangeDate = asTs(row.last_stage_change_date);
  }
  return rec;
}

async function assertFreshness() {
  const rows = await executeSqlObjects(
    `SELECT MAX(_fivetran_synced) AS synced FROM ${FOOD}.opportunity`,
  );
  const synced = rows[0]?.synced ? new Date(rows[0].synced) : null;
  if (!synced || Number.isNaN(synced.getTime())) {
    throw new Error("Could not read MAX(_fivetran_synced) from fivetran_salesforcefood.opportunity");
  }
  const ageH = (Date.now() - synced.getTime()) / 3_600_000;
  console.error(`[pull] opportunity last synced ${synced.toISOString()} (${ageH.toFixed(1)}h ago)`);
  if (ageH > MAX_SYNC_AGE_H) {
    throw new Error(
      `Fivetran opportunity sync is ${ageH.toFixed(1)}h old (max ${MAX_SYNC_AGE_H}h). Aborting.`,
    );
  }
  fs.writeFileSync(
    path.join(cacheDir, "_databricks-freshness.json"),
    `${JSON.stringify({ opportunitySyncedAt: synced.toISOString(), ageHours: ageH, checkedAt: new Date().toISOString() }, null, 2)}\n`,
  );
}

async function pullWon(file, ownerIds, { yearStart = false } = {}) {
  const year = currentTrackingYear();
  const dateFilter = yearStart
    ? `o.won_date_c >= '${year}-01-01' AND o.won_date_c < '${year + 1}-01-01'`
    : `o.won_date_c >= date_trunc('month', current_date()) AND o.won_date_c < date_trunc('month', current_date()) + INTERVAL 1 MONTH`;
  const sql = `
    SELECT o.id, o.name, o.stage_name, o.is_won, o.close_date, o.won_date_c,
           o.owner_id, u.name AS owner_name, rt.name AS record_type_name,
           o.account_id, a.name AS account_name, a.billing_city
    FROM ${FOOD}.opportunity o
    JOIN ${FOOD}.record_type rt ON o.record_type_id = rt.id
    LEFT JOIN ${FOOD}.user u ON o.owner_id = u.id
    LEFT JOIN ${FOOD}.account a ON o.account_id = a.id
    WHERE ${aliveOpp}
      AND rt.name = 'Sales Opportunity'
      AND ${dateFilter}
      AND o.owner_id IN (${quote(ownerIds)})
    ORDER BY o.won_date_c DESC, o.id
  `;
  const rows = await executeSqlObjects(sql);
  writeSfRecords(file, rows.map((r) => nestOpp(r, { withWon: true })));
}

async function pullWonRecent() {
  const sql = `
    SELECT o.id, o.name, o.stage_name, o.close_date, o.owner_id, u.name AS owner_name,
           o.account_id, a.name AS account_name, a.billing_city, rt.name AS record_type_name
    FROM ${FOOD}.opportunity o
    JOIN ${FOOD}.record_type rt ON o.record_type_id = rt.id
    LEFT JOIN ${FOOD}.user u ON o.owner_id = u.id
    LEFT JOIN ${FOOD}.account a ON o.account_id = a.id
    WHERE ${aliveOpp}
      AND rt.name = 'Sales Opportunity'
      AND o.stage_name = 'Activated'
      AND o.owner_id IN (${quote(TEAM_IDS)})
    ORDER BY o.close_date DESC
    LIMIT 100
  `;
  const rows = await executeSqlObjects(sql);
  writeSfRecords("sf-won-recent.json", rows.map((r) => nestOpp(r)));
}

async function pullPipelineOpen() {
  const sql = `
    SELECT o.id, o.name, o.stage_name, o.close_date, o.owner_id, u.name AS owner_name,
           o.account_id, a.name AS account_name, a.billing_city, rt.name AS record_type_name,
           o.last_modified_date
    FROM ${FOOD}.opportunity o
    JOIN ${FOOD}.record_type rt ON o.record_type_id = rt.id
    LEFT JOIN ${FOOD}.user u ON o.owner_id = u.id
    LEFT JOIN ${FOOD}.account a ON o.account_id = a.id
    WHERE ${aliveOpp}
      AND rt.name = 'Sales Opportunity'
      AND COALESCE(o.is_closed, false) = false
      AND o.stage_name NOT IN ('Closed Won','Closed Lost','Activated')
      AND o.owner_id IN (${quote(TEAM_IDS)})
    ORDER BY o.last_modified_date DESC
    LIMIT 500
  `;
  const rows = await executeSqlObjects(sql);
  writeSfRecords("sf-pipeline-open.json", rows.map((r) => nestOpp(r, { withCreated: true })));
}

async function pullStageCounts() {
  const sql = `
    SELECT o.stage_name AS StageName, COUNT(*) AS cnt
    FROM ${FOOD}.opportunity o
    JOIN ${FOOD}.record_type rt ON o.record_type_id = rt.id
    WHERE ${aliveOpp}
      AND rt.name = 'Sales Opportunity'
    GROUP BY o.stage_name
    ORDER BY cnt DESC
  `;
  const rows = await executeSqlObjects(sql);
  const records = rows.map((r) => ({
    attributes: { type: "AggregateResult" },
    StageName: r.StageName,
    cnt: Number(r.cnt),
  }));
  writeSfRecords("sf-pipeline-stage-counts.json", records, {
    _query: "Databricks fivetran_salesforcefood GROUP BY stage_name",
    _note: "Live Sales Opportunity stage distribution from Databricks Food SF mirror.",
  });
}

async function pullActivation(file, ownerIds, { reactivation = false } = {}) {
  const year = currentTrackingYear();
  let where;
  if (reactivation) {
    where = `
      rt.name IN ('Sales Opportunity', 'Reactivation')
      AND COALESCE(o.is_won, false) = true
      AND a.provider_first_active_date_c IS NOT NULL
      AND a.provider_first_active_date_c < '${year}-01-01'
      AND (
        o.won_date_c >= '${year}-01-01'
        OR (rt.name = 'Reactivation' AND (
          a.reactivated_date_c >= '${year}-01-01' OR o.close_date >= '${year}-01-01'
        ))
      )
      AND o.owner_id IN (${quote(ownerIds)})
    `;
  } else {
    where = `
      rt.name = 'Sales Opportunity'
      AND a.provider_first_active_date_c IS NOT NULL
      AND a.provider_first_active_date_c >= '${year}-01-01'
      AND o.owner_id IN (${quote(ownerIds)})
    `;
  }
  const sql = `
    SELECT o.id, o.owner_id, u.name AS owner_name, o.is_won, o.won_date_c, o.close_date,
           o.stage_name, o.account_id, a.name AS account_name, a.billing_city,
           a.provider_first_active_date_c, a.reactivated_date_c, rt.name AS record_type_name
    FROM ${FOOD}.opportunity o
    JOIN ${FOOD}.record_type rt ON o.record_type_id = rt.id
    LEFT JOIN ${FOOD}.user u ON o.owner_id = u.id
    JOIN ${FOOD}.account a ON o.account_id = a.id
    WHERE ${aliveOpp} AND ${aliveAcc}
      AND ${where}
    ORDER BY ${reactivation ? "o.won_date_c NULLS LAST, o.close_date" : "a.provider_first_active_date_c"}
  `;
  const rows = await executeSqlObjects(sql);
  writeSfRecords(
    file,
    rows.map((r) => nestOpp(r, { withWon: true, withActivation: true })),
  );
}

async function pullHistoryChunk(kind, year, month1) {
  const { prefix } = KINDS[kind];
  const mm = String(month1).padStart(2, "0");
  const start = `${year}-${mm}-01T00:00:00Z`;
  const nextM = month1 === 12 ? 1 : month1 + 1;
  const nextY = month1 === 12 ? year + 1 : year;
  const end = `${nextY}-${String(nextM).padStart(2, "0")}-01T00:00:00Z`;
  const ownerIds = kind === "inbound-stage-history" ? INBOUND_IDS : TEAM_IDS;
  const file = `scripts/.cache/${prefix}-${year}-${mm}.json`;

  if (kind === "weekly") {
    const sql = `
      SELECT o.id, o.name, o.stage_name, o.created_date, o.last_modified_date, o.close_date,
             o.owner_id, u.name AS owner_name, o.account_id, a.name AS account_name, a.billing_city
      FROM ${FOOD}.opportunity o
      JOIN ${FOOD}.record_type rt ON o.record_type_id = rt.id
      LEFT JOIN ${FOOD}.user u ON o.owner_id = u.id
      LEFT JOIN ${FOOD}.account a ON o.account_id = a.id
      WHERE ${aliveOpp}
        AND rt.name = 'Sales Opportunity'
        AND o.stage_name IN (${quote(WEEKLY_STAGES)})
        AND o.created_date >= '${start}'
        AND o.created_date < '${end}'
        AND o.owner_id IN (${quote(ownerIds)})
      ORDER BY o.created_date DESC
    `;
    const rows = await executeSqlObjects(sql);
    writeSfRecords(
      file,
      rows.map((r) => ({
        attributes: { type: "Opportunity" },
        Id: r.id,
        Name: r.name,
        StageName: r.stage_name,
        CreatedDate: asTs(r.created_date),
        LastModifiedDate: asTs(r.last_modified_date),
        CloseDate: asDate(r.close_date),
        OwnerId: r.owner_id,
        Owner: { Name: r.owner_name ?? null },
        AccountId: r.account_id,
        Account: { Name: r.account_name ?? null, BillingCity: r.billing_city ?? null },
      })),
    );
    return;
  }

  const sql = `
    SELECT ofh.opportunity_id, ofh.field, ofh.old_value, ofh.new_value, ofh.created_date,
           o.owner_id, u.name AS owner_name, rt.name AS record_type_name,
           o.account_id, a.name AS account_name, a.billing_city,
           o.name AS opportunity_name, o.stage_name
    FROM ${FOOD}.opportunity_field_history ofh
    JOIN ${FOOD}.opportunity o ON ofh.opportunity_id = o.id
    LEFT JOIN ${FOOD}.record_type rt ON o.record_type_id = rt.id
    LEFT JOIN ${FOOD}.user u ON o.owner_id = u.id
    LEFT JOIN ${FOOD}.account a ON o.account_id = a.id
    WHERE ${aliveHist}
      AND ofh.field = 'StageName'
      AND ofh.created_date >= '${start}'
      AND ofh.created_date < '${end}'
      AND o.owner_id IN (${quote(ownerIds)})
    ORDER BY ofh.created_date ASC
  `;
  const rows = await executeSqlObjects(sql);
  writeSfRecords(
    file,
    rows.map((r) => ({
      attributes: { type: "OpportunityFieldHistory" },
      OpportunityId: r.opportunity_id,
      Field: r.field,
      OldValue: r.old_value,
      NewValue: r.new_value,
      CreatedDate: asTs(r.created_date),
      Opportunity: {
        OwnerId: r.owner_id,
        Owner: { Name: r.owner_name ?? null },
        RecordType: { Name: r.record_type_name ?? null },
        AccountId: r.account_id,
        Account: { Name: r.account_name ?? null, BillingCity: r.billing_city ?? null },
        Name: r.opportunity_name,
        StageName: r.stage_name,
      },
    })),
  );
}

async function pullAllHistoryChunks() {
  const year = currentTrackingYear();
  // Clean CI runner has no closed-month chunks on disk — always pull full year.
  const months = monthsToPull(year, { full: true });
  for (const kind of Object.keys(KINDS)) {
    for (const m of months) {
      console.error(`[pull] ${kind} ${year}-${String(m).padStart(2, "0")}`);
      await pullHistoryChunk(kind, year, m);
    }
  }
}

async function pullInboundWeekly() {
  const year = currentTrackingYear();
  const sql = `
    SELECT o.id, o.name, o.stage_name, o.created_date, o.last_modified_date, o.close_date,
           o.owner_id, u.name AS owner_name, o.account_id, a.name AS account_name, a.billing_city
    FROM ${FOOD}.opportunity o
    JOIN ${FOOD}.record_type rt ON o.record_type_id = rt.id
    LEFT JOIN ${FOOD}.user u ON o.owner_id = u.id
    LEFT JOIN ${FOOD}.account a ON o.account_id = a.id
    WHERE ${aliveOpp}
      AND rt.name = 'Sales Opportunity'
      AND o.stage_name IN (${quote(WEEKLY_STAGES)})
      AND o.created_date >= '${year}-01-01T00:00:00Z'
      AND o.owner_id IN (${quote(INBOUND_IDS)})
    ORDER BY o.created_date DESC
  `;
  const rows = await executeSqlObjects(sql);
  writeSfRecords(
    `sf-inbound-weekly-${year}.json`,
    rows.map((r) => ({
      attributes: { type: "Opportunity" },
      Id: r.id,
      Name: r.name,
      StageName: r.stage_name,
      CreatedDate: asTs(r.created_date),
      LastModifiedDate: asTs(r.last_modified_date),
      CloseDate: asDate(r.close_date),
      OwnerId: r.owner_id,
      Owner: { Name: r.owner_name ?? null },
      AccountId: r.account_id,
      Account: { Name: r.account_name ?? null, BillingCity: r.billing_city ?? null },
    })),
  );
}

async function pullMyPipeline() {
  const workingSql = `
    SELECT o.id, o.name, o.stage_name, o.close_date, o.created_date, o.owner_id,
           u.name AS owner_name, o.account_id, a.name AS account_name, a.billing_city
    FROM ${FOOD}.opportunity o
    JOIN ${FOOD}.record_type rt ON o.record_type_id = rt.id
    LEFT JOIN ${FOOD}.user u ON o.owner_id = u.id
    LEFT JOIN ${FOOD}.account a ON o.account_id = a.id
    WHERE ${aliveOpp}
      AND rt.name = 'Sales Opportunity'
      AND o.stage_name IN (${quote(MP_WORKING_STAGES)})
      AND o.owner_id IN (${quote(TEAM_IDS)})
    ORDER BY o.created_date DESC
  `;
  const newSql = `
    SELECT o.id, o.name, o.stage_name, o.close_date, o.created_date, o.owner_id,
           u.name AS owner_name, o.account_id, a.name AS account_name, a.billing_city
    FROM ${FOOD}.opportunity o
    JOIN ${FOOD}.record_type rt ON o.record_type_id = rt.id
    LEFT JOIN ${FOOD}.user u ON o.owner_id = u.id
    LEFT JOIN ${FOOD}.account a ON o.account_id = a.id
    WHERE ${aliveOpp}
      AND rt.name = 'Sales Opportunity'
      AND o.stage_name = 'New Opportunity'
      AND o.owner_id IN (${quote(TEAM_IDS)})
    ORDER BY o.created_date DESC
    LIMIT 1500
  `;
  const mapOpp = (r) => ({
    attributes: { type: "Opportunity" },
    Id: r.id,
    Name: r.name,
    StageName: r.stage_name,
    CloseDate: asDate(r.close_date),
    CreatedDate: asTs(r.created_date),
    OwnerId: r.owner_id,
    Owner: { Name: r.owner_name ?? null },
    AccountId: r.account_id,
    Account: { Name: r.account_name ?? null, BillingCity: r.billing_city ?? null },
  });
  const working = await executeSqlObjects(workingSql);
  const newOpps = await executeSqlObjects(newSql);
  writeSfRecords("mp-opps-working.json", working.map(mapOpp));
  writeSfRecords("mp-opps-newopp.json", newOpps.map(mapOpp));

  // Leads — City__r may not exist in Fivetran; use city / city_c when present
  const leadSql = `
    SELECT l.id, l.name, l.company, l.status, l.city, l.state, l.created_date,
           l.owner_id, u.name AS owner_name
    FROM ${FOOD}.lead l
    LEFT JOIN ${FOOD}.user u ON l.owner_id = u.id
    WHERE ${aliveLead}
      AND COALESCE(l.is_converted, false) = false
      AND COALESCE(l.status, '') != 'Disqualified'
      AND l.owner_id IN (${quote(TEAM_IDS)})
    ORDER BY l.created_date DESC
    LIMIT 1500
  `;
  const leads = await executeSqlObjects(leadSql);
  writeSfRecords(
    "mp-leads.json",
    leads.map((r) => ({
      attributes: { type: "Lead" },
      Id: r.id,
      Name: r.name,
      Company: r.company,
      Status: r.status,
      City: r.city,
      State: r.state,
      CreatedDate: asTs(r.created_date),
      OwnerId: r.owner_id,
      Owner: { Name: r.owner_name ?? null },
    })),
  );

  const oppTotalsSql = `
    SELECT o.owner_id AS OwnerId, o.stage_name AS StageName, COUNT(*) AS cnt
    FROM ${FOOD}.opportunity o
    JOIN ${FOOD}.record_type rt ON o.record_type_id = rt.id
    WHERE ${aliveOpp}
      AND rt.name = 'Sales Opportunity'
      AND o.stage_name IN (${quote(["New Opportunity", ...MP_WORKING_STAGES])})
      AND o.owner_id IN (${quote(TEAM_IDS)})
    GROUP BY o.owner_id, o.stage_name
  `;
  const leadTotalsSql = `
    SELECT l.owner_id AS OwnerId, COUNT(*) AS cnt
    FROM ${FOOD}.lead l
    WHERE ${aliveLead}
      AND COALESCE(l.is_converted, false) = false
      AND COALESCE(l.status, '') != 'Disqualified'
      AND l.owner_id IN (${quote(TEAM_IDS)})
    GROUP BY l.owner_id
  `;
  const oppTotals = await executeSqlObjects(oppTotalsSql);
  const leadTotals = await executeSqlObjects(leadTotalsSql);
  const opps = {};
  for (const r of oppTotals) {
    if (!opps[r.OwnerId]) opps[r.OwnerId] = { total: 0 };
    const n = Number(r.cnt);
    opps[r.OwnerId][r.StageName] = n;
    opps[r.OwnerId].total += n;
  }
  const leadsOpen = {};
  for (const r of leadTotals) leadsOpen[r.OwnerId] = Number(r.cnt);
  writeJson("scripts/.cache/mp-totals.json", {
    _comment: "Assembled from Databricks Food SF (authoritative per-rep totals)",
    opps,
    leadsOpen,
  });
  console.error(`[pull] wrote scripts/.cache/mp-totals.json`);
}

async function pullMops() {
  const caseSql = `
    SELECT c.id, c.case_number, c.subject, c.status, c.owner_id, u.name AS owner_name,
           rt.name AS record_type_name, c.created_date
    FROM ${FOOD}.case c
    LEFT JOIN ${FOOD}.user u ON c.owner_id = u.id
    LEFT JOIN ${FOOD}.record_type rt ON c.record_type_id = rt.id
    WHERE ${aliveCase}
      AND COALESCE(c.is_closed, false) = false
    ORDER BY c.created_date DESC
  `;
  const cases = await executeSqlObjects(caseSql);
  const byStatus = new Map();
  const byRt = new Map();
  const byOwner = new Map();
  let openNewOnboarding = 0;
  for (const c of cases) {
    byStatus.set(c.status, (byStatus.get(c.status) ?? 0) + 1);
    const rt = c.record_type_name ?? "Unknown";
    byRt.set(rt, (byRt.get(rt) ?? 0) + 1);
    if (rt === "New Onboarding") openNewOnboarding += 1;
    const key = c.owner_id ?? "unknown";
    if (!byOwner.has(key)) byOwner.set(key, { ownerId: key, name: c.owner_name ?? null, count: 0 });
    byOwner.get(key).count += 1;
  }
  const sortDesc = (a, b) => b.count - a.count;
  const payload = {
    openCases: cases.length,
    openNewOnboarding,
    openByStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })).sort(sortDesc),
    openByRecordType: [...byRt.entries()].map(([recordType, count]) => ({ recordType, count })).sort(sortDesc),
    openByOwner: [...byOwner.values()].sort(sortDesc),
    records: cases.map((c) => ({
      id: c.id,
      caseNumber: c.case_number,
      subject: c.subject,
      status: c.status,
      ownerId: c.owner_id,
      ownerName: c.owner_name,
      recordType: c.record_type_name,
      url: `https://bolt.lightning.force.com/lightning/r/Case/${c.id}/view`,
    })),
  };
  writeJson("scripts/.cache/sf-mops-cases.json", payload);
  console.error(`[pull] wrote scripts/.cache/sf-mops-cases.json (${cases.length} open cases)`);

  const onbSql = `
    SELECT o.id, o.name, o.stage_name, o.close_date, o.won_date_c, o.created_date,
           o.last_stage_change_date, o.owner_id, u.name AS owner_name,
           o.account_id, a.name AS account_name, a.billing_city
    FROM ${FOOD}.opportunity o
    JOIN ${FOOD}.record_type rt ON o.record_type_id = rt.id
    LEFT JOIN ${FOOD}.user u ON o.owner_id = u.id
    LEFT JOIN ${FOOD}.account a ON o.account_id = a.id
    WHERE ${aliveOpp}
      AND rt.name = 'Sales Opportunity'
      AND o.stage_name IN ('Onboarding Checklist','Onboarding','Ready to Activate','Escalation')
      AND o.owner_id IN (${quote(TEAM_IDS)})
    ORDER BY o.close_date ASC
  `;
  const onb = await executeSqlObjects(onbSql);
  writeSfRecords(
    "sf-mops-onboarding.json",
    onb.map((r) => {
      const rec = nestOpp(r, { withCreated: true });
      rec.Won_Date__c = asDate(r.won_date_c);
      return rec;
    }),
  );
}

async function pullAccountsPerf() {
  const year = currentTrackingYear();
  const universeSql = `
    SELECT po.provider_id, po.opportunity_owner_user_name, po.opportunity_owner_email,
           CAST(po.provider_activated_ts AS DATE) AS activated_date, pv.provider_name, pv.vendor_name,
           pv.city_name, pv.business_segment_v2, pv.provider_status,
           CAST(pv.first_delivered_order_ts AS DATE) AS first_order_date
    FROM main.ng_delivery.dim_provider_opportunity po
    LEFT JOIN main.ng_delivery.dim_provider_v2 pv ON pv.provider_id = po.provider_id
    WHERE po.provider_activated_ts >= '${year}-01-01' AND po.country_name = 'Romania'
    QUALIFY ROW_NUMBER() OVER (PARTITION BY po.provider_id ORDER BY po.provider_activated_ts DESC) = 1
  `;
  const provOppSql = `
    SELECT po.provider_id, po.opportunity_id
    FROM main.ng_delivery.dim_provider_opportunity po
    WHERE po.provider_activated_ts >= '${year}-01-01' AND po.country_name = 'Romania'
    QUALIFY ROW_NUMBER() OVER (PARTITION BY po.provider_id ORDER BY po.provider_activated_ts DESC) = 1
  `;
  const { data: universe } = await executeSql(universeSql);
  const { data: provOpp } = await executeSql(provOppSql);
  writeMcpTable(
    "accounts-perf-accounts.json",
    "RO YTD activation universe from Databricks ng_delivery (pull-all-caches-databricks)",
    universe,
  );
  writeMcpTable(
    "accounts-perf-prov-opp.json",
    "Provider → opportunity map from Databricks ng_delivery (pull-all-caches-databricks)",
    provOpp,
  );

  const providerIds = [...new Set(universe.map((r) => String(r[0])).filter((id) => id && id !== "null"))];
  const oppIds = [...new Set(provOpp.map((r) => String(r[1])).filter((id) => id && id !== "null"))];

  // Monthly + quality in chunks of 400 providers to keep statements manageable
  const idBatches = chunk(providerIds.map(Number).filter((n) => Number.isFinite(n)), 400);
  let monthlyRows = [];
  let qualityRows = [];
  for (const batch of idBatches) {
    const { data: m } = await executeSql(monthlyQuery(batch));
    const { data: q } = await executeSql(qualityQuery(batch));
    monthlyRows = monthlyRows.concat(m);
    qualityRows = qualityRows.concat(q);
  }
  writeMcpTable(
    "accounts-perf-monthly.json",
    "Monthly GMV/orders/commission from fact_provider_monthly (pull-all-caches-databricks)",
    monthlyRows,
  );
  writeMcpTable(
    "accounts-perf-quality.json",
    "Monthly quality metrics from fact_provider_monthly (pull-all-caches-databricks)",
    qualityRows,
  );

  // Commission + segment from Food SF (no Salesforce MCP)
  const commissionRows = [];
  const segmentRows = [];
  for (const batch of chunk(oppIds, 400)) {
    const sql = `
      SELECT o.id, o.commission_c, a.account_management_segment_c
      FROM ${FOOD}.opportunity o
      LEFT JOIN ${FOOD}.account a ON o.account_id = a.id
      WHERE ${aliveOpp}
        AND o.id IN (${quote(batch)})
    `;
    const rows = await executeSqlObjects(sql);
    const byOpp = new Map(provOpp.map((r) => [String(r[1]), String(r[0])]));
    for (const r of rows) {
      const providerId = byOpp.get(String(r.id));
      if (!providerId) continue;
      commissionRows.push([providerId, r.commission_c, r.id]);
      segmentRows.push([providerId, r.account_management_segment_c, r.id]);
    }
  }
  writeMcpTable(
    "accounts-perf-sf-commission.json",
    "Commission__c from fivetran_salesforcefood (pull-all-caches-databricks)",
    commissionRows,
  );
  writeMcpTable(
    "accounts-perf-sf-segment.json",
    "Account_Management_Segment__c from fivetran_salesforcefood (pull-all-caches-databricks)",
    segmentRows,
  );

  // Churn prevention SF status
  const { isTeamAgent } = await import("../lib/agent-segments.mjs");
  const teamProviderIds = [];
  const seen = new Set();
  for (const row of universe) {
    const ownerName = row[1];
    const id = String(row[0]);
    if (!ownerName || !isTeamAgent(ownerName)) continue;
    if (!id || id === "null" || seen.has(id)) continue;
    seen.add(id);
    teamProviderIds.push(id);
  }
  const statusRows = [];
  for (const batch of chunk(teamProviderIds, 400)) {
    // inactive_30_days_c may be absent in some sync schemas — fall back without it
    let rows;
    try {
      rows = await executeSqlObjects(`
        SELECT a.id, a.name, a.provider_id_c, a.status_c, a.is_deleted,
               a.inactive_30_days_c, a.billing_city, a.provider_first_active_date_c
        FROM ${FOOD}.account a
        WHERE ${aliveAcc}
          AND a.provider_id_c IN (${batch.join(",")})
      `);
    } catch {
      rows = await executeSqlObjects(`
        SELECT a.id, a.name, a.provider_id_c, a.status_c, a.is_deleted,
               CAST(NULL AS BOOLEAN) AS inactive_30_days_c,
               a.billing_city, a.provider_first_active_date_c
        FROM ${FOOD}.account a
        WHERE ${aliveAcc}
          AND a.provider_id_c IN (${batch.join(",")})
      `);
    }
    for (const r of rows) {
      statusRows.push([
        String(r.provider_id_c),
        r.id,
        r.name,
        r.status_c,
        bool(r.is_deleted),
        r.inactive_30_days_c,
        r.billing_city,
        asDate(r.provider_first_active_date_c),
      ]);
    }
  }
  writeMcpTable(
    "churn-prevention-sf-status.json",
    "Account Status__c from fivetran_salesforcefood (pull-all-caches-databricks)",
    statusRows,
  );
}

async function main() {
  ensureCacheDir();
  console.error(`[pull] cache dir ${cacheDir}`);
  await assertFreshness();

  const year = currentTrackingYear();
  console.error(`[pull] tracking year ${year}`);

  // Batch A
  await pullStageCounts();
  await pullWon("sf-won-mtd.json", TEAM_IDS);
  await pullWon("sf-won-ytd-bydate.json", TEAM_IDS, { yearStart: true });
  await pullWonRecent();
  await pullPipelineOpen();
  await pullActivation(`sf-account-activation-${year}.json`, TEAM_IDS);
  await pullActivation(`sf-reactivation-${year}.json`, TEAM_IDS, { reactivation: true });
  await pullAllHistoryChunks();

  // Batch B
  await pullMyPipeline();
  await pullMops();
  await pullWon("sf-inbound-won-mtd.json", INBOUND_IDS);
  await pullWon("sf-inbound-won-ytd-bydate.json", INBOUND_IDS, { yearStart: true });
  await pullInboundWeekly();
  await pullActivation(`sf-inbound-account-activation-${year}.json`, INBOUND_IDS);
  await pullActivation(`sf-inbound-reactivation-${year}.json`, INBOUND_IDS, { reactivation: true });

  // Batch C
  await pullAccountsPerf();

  console.error("[pull] done — next: node scripts/fetch-sf-stage-history.mjs --kind=all");
}

main().catch((err) => {
  console.error("[pull] FAILED:", err?.stack || err);
  process.exit(1);
});
