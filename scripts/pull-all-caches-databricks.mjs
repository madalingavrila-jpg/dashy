#!/usr/bin/env node
/**
 * Headless pull of ALL dashy caches from Databricks (no Salesforce MCP).
 *
 * Sources:
 *   - main.fivetran_salesforcefood  → CRM caches (Won, Activated, history, MOPS, MyPipeline, …)
 *   - main.ng_delivery              → accounts-perf C1/C2
 *
 * Env (required):
 *   DATABRICKS_HOST              e.g. https://bolt-common.cloud.databricks.com
 *   DATABRICKS_TOKEN             PAT / SP token
 *   DATABRICKS_WAREHOUSE_ID      SQL warehouse id
 *
 * Optional:
 *   DASHY_MAX_SYNC_AGE_HOURS     fail if opportunity Fivetran sync older than N hours (default 12)
 *   DASHY_SKIP_FRESHNESS=1       skip the freshness gate
 *
 * Usage:
 *   node scripts/pull-all-caches-databricks.mjs
 *   npm run data:pull-databricks
 *
 * After this:
 *   node scripts/fetch-sf-stage-history.mjs --kind=all
 *   npm run refresh-all && npm run build
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { TEAM_ROSTER, INBOUND_OWNER_IDS } from "../lib/agent-segments.mjs";
import { currentTrackingYear } from "../lib/weekly-stages-build.mjs";
import { monthsToPull } from "./gen-sf-history-queries.mjs";
import {
  monthlyQuery,
  qualityQuery,
  chunk,
  readActivatedProviderIds,
  readWonOpportunityIds,
  SF_COMMISSION_BATCH_SIZE,
} from "./gen-accounts-perf-queries.mjs";
import { readTeamActivatedProviderIds, SF_STATUS_BATCH_SIZE } from "./gen-churn-prevention-queries.mjs";
import { executeSql, executeSqlObjects, sqlStringList } from "./lib/databricks-sql.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const cacheDir = join(here, ".cache");

const SF = "main.fivetran_salesforcefood";
const TEAM_IDS = TEAM_ROSTER.map((r) => r.ownerId);
const INBOUND_IDS = [...INBOUND_OWNER_IDS];
const TEAM_IN = sqlStringList(TEAM_IDS);
const INBOUND_IN = sqlStringList(INBOUND_IDS);

const YEAR = currentTrackingYear();
const MAX_SYNC_AGE_H = Number(process.env.DASHY_MAX_SYNC_AGE_HOURS || 12);

const WEEKLY_STAGES = [
  "New Opportunity",
  "Contacting DCM",
  "First Pitch",
  "Negotiations",
  "Closed Won",
  "Activated",
];
const MP_WORKING = ["Reachout", "Contacting DCM", "First Pitch", "Negotiations", "Contract sent"];
const MOPS_ONB = ["Onboarding Checklist", "Onboarding", "Ready to Activate", "Escalation"];

function log(...args) {
  console.log(`[pull-databricks ${new Date().toISOString()}]`, ...args);
}

function writeJson(relOrAbs, obj) {
  const path = relOrAbs.startsWith("/") ? relOrAbs : join(root, relOrAbs);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n");
  const n = Array.isArray(obj.records)
    ? obj.records.length
    : Array.isArray(obj.data)
      ? obj.data.length
      : obj.opps
        ? Object.keys(obj.opps).length
        : "?";
  log(`wrote ${path.replace(root + "/", "")} (${n} rows)`);
}

function writeMcpTable(rel, header, data) {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${header}\n\n${JSON.stringify({ data })}\n`);
  log(`wrote ${rel} (${data.length} rows)`);
}

function sfRecords(records, extra = {}) {
  return { totalSize: records.length, done: true, ...extra, records };
}

function asDate(v) {
  if (v == null || v === "") return null;
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function asTs(v) {
  if (v == null || v === "") return null;
  return String(v).replace(" ", "T");
}

function nestOpp(row) {
  return {
    attributes: { type: "Opportunity" },
    Id: row.id,
    Name: row.name,
    StageName: row.stage_name,
    IsWon: row.is_won == null ? undefined : Boolean(row.is_won),
    IsClosed: row.is_closed == null ? undefined : Boolean(row.is_closed),
    CloseDate: asDate(row.close_date),
    Won_Date__c: asDate(row.won_date_c),
    CreatedDate: asTs(row.created_date),
    LastModifiedDate: asTs(row.last_modified_date),
    LastStageChangeDate: asTs(row.last_stage_change_date),
    OwnerId: row.owner_id,
    Owner: { Name: row.owner_name ?? null },
    RecordType: row.record_type_name ? { Name: row.record_type_name } : undefined,
    AccountId: row.account_id ?? null,
    Account: {
      Name: row.account_name ?? null,
      BillingCity: row.billing_city ?? null,
      provider_first_active_date__c: asDate(row.provider_first_active_date_c),
      Reactivated_Date__c: asDate(row.reactivated_date_c),
    },
  };
}

function nestHistory(row) {
  return {
    attributes: { type: "OpportunityFieldHistory" },
    OpportunityId: row.opportunity_id,
    Field: row.field,
    OldValue: row.old_value,
    NewValue: row.new_value,
    CreatedDate: asTs(row.created_date),
    Opportunity: {
      OwnerId: row.owner_id,
      Owner: { Name: row.owner_name ?? null },
      RecordType: row.record_type_name ? { Name: row.record_type_name } : undefined,
      AccountId: row.account_id ?? null,
      Account: {
        Name: row.account_name ?? null,
        BillingCity: row.billing_city ?? null,
      },
      Name: row.opportunity_name ?? null,
      StageName: row.stage_name ?? null,
    },
  };
}

const OPP_JOINS = `
FROM ${SF}.opportunity o
JOIN ${SF}.record_type rt ON o.record_type_id = rt.id
LEFT JOIN ${SF}.user u ON o.owner_id = u.id
LEFT JOIN ${SF}.account a ON o.account_id = a.id
WHERE COALESCE(o._fivetran_deleted, false) = false
  AND COALESCE(o.is_deleted, false) = false
`;

const OPP_COLS = `
  o.id, o.name, o.stage_name, o.is_won, o.is_closed,
  o.close_date, o.won_date_c, o.created_date, o.last_modified_date,
  o.last_stage_change_date, o.owner_id, u.name AS owner_name,
  rt.name AS record_type_name, o.account_id, a.name AS account_name,
  a.billing_city, a.provider_first_active_date_c, a.reactivated_date_c
`;

async function checkFreshness() {
  if (process.env.DASHY_SKIP_FRESHNESS === "1") {
    log("skipping freshness gate (DASHY_SKIP_FRESHNESS=1)");
    return;
  }
  const rows = await executeSqlObjects(
    `SELECT MAX(_fivetran_synced) AS synced FROM ${SF}.opportunity`,
  );
  const synced = rows[0]?.synced;
  if (!synced) throw new Error("Could not read MAX(_fivetran_synced) from opportunity");
  const ageH = (Date.now() - new Date(synced).getTime()) / 3600000;
  log(`opportunity Fivetran sync=${synced} age=${ageH.toFixed(2)}h (max ${MAX_SYNC_AGE_H}h)`);
  writeJson("scripts/.cache/_databricks-freshness.json", {
    opportunitySyncedAt: synced,
    ageHours: ageH,
    checkedAt: new Date().toISOString(),
  });
  if (ageH > MAX_SYNC_AGE_H) {
    throw new Error(
      `Fivetran opportunity sync is ${ageH.toFixed(1)}h old (limit ${MAX_SYNC_AGE_H}h). Aborting.`,
    );
  }
}

async function pullWon(file, ownerIn, { monthOnly = false, yearOnly = false } = {}) {
  let dateFilter = "1=1";
  if (monthOnly) {
    dateFilter =
      "o.won_date_c >= date_trunc('month', current_date()) AND o.won_date_c < date_trunc('month', current_date()) + INTERVAL 1 MONTH";
  } else if (yearOnly) {
    dateFilter = `o.won_date_c >= '${YEAR}-01-01' AND o.won_date_c < '${YEAR + 1}-01-01'`;
  }
  const rows = await executeSqlObjects(
    `SELECT ${OPP_COLS} ${OPP_JOINS}
     AND rt.name = 'Sales Opportunity'
     AND ${dateFilter}
     AND o.owner_id IN (${ownerIn})
     ORDER BY o.won_date_c DESC, o.id`,
  );
  writeJson(file, sfRecords(rows.map(nestOpp)));
}

async function pullActivation(file, ownerIn) {
  const rows = await executeSqlObjects(
    `SELECT ${OPP_COLS} ${OPP_JOINS}
     AND rt.name = 'Sales Opportunity'
     AND a.provider_first_active_date_c IS NOT NULL
     AND a.provider_first_active_date_c >= '${YEAR}-01-01'
     AND o.owner_id IN (${ownerIn})
     ORDER BY a.provider_first_active_date_c`,
  );
  writeJson(file, sfRecords(rows.map(nestOpp)));
}

async function pullReactivation(file, ownerIn) {
  const rows = await executeSqlObjects(
    `SELECT ${OPP_COLS} ${OPP_JOINS}
     AND rt.name IN ('Sales Opportunity', 'Reactivation')
     AND COALESCE(o.is_won, false) = true
     AND a.provider_first_active_date_c IS NOT NULL
     AND a.provider_first_active_date_c < '${YEAR}-01-01'
     AND (
       o.won_date_c >= '${YEAR}-01-01'
       OR (rt.name = 'Reactivation' AND (
         a.reactivated_date_c >= '${YEAR}-01-01' OR o.close_date >= '${YEAR}-01-01'
       ))
     )
     AND o.owner_id IN (${ownerIn})
     ORDER BY o.won_date_c NULLS LAST, o.close_date`,
  );
  writeJson(file, sfRecords(rows.map(nestOpp)));
}

async function pullStageHistoryChunk(file, ownerIn, year, month) {
  const mm = String(month).padStart(2, "0");
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMm = String(nextMonth).padStart(2, "0");
  const rows = await executeSqlObjects(
    `SELECT
       ofh.opportunity_id, ofh.field, ofh.old_value, ofh.new_value, ofh.created_date,
       o.owner_id, u.name AS owner_name, rt.name AS record_type_name,
       o.account_id, a.name AS account_name, a.billing_city,
       o.name AS opportunity_name, o.stage_name
     FROM ${SF}.opportunity_field_history ofh
     JOIN ${SF}.opportunity o ON ofh.opportunity_id = o.id
     JOIN ${SF}.record_type rt ON o.record_type_id = rt.id
     LEFT JOIN ${SF}.user u ON o.owner_id = u.id
     LEFT JOIN ${SF}.account a ON o.account_id = a.id
     WHERE COALESCE(ofh._fivetran_deleted, false) = false
       AND ofh.field = 'StageName'
       AND ofh.created_date >= '${year}-${mm}-01T00:00:00Z'
       AND ofh.created_date < '${nextYear}-${nextMm}-01T00:00:00Z'
       AND o.owner_id IN (${ownerIn})
     ORDER BY ofh.created_date ASC`,
  );
  writeJson(file, sfRecords(rows.map(nestHistory)));
}

async function pullWeeklyChunk(file, ownerIn, year, month) {
  const mm = String(month).padStart(2, "0");
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMm = String(nextMonth).padStart(2, "0");
  const stages = sqlStringList(WEEKLY_STAGES);
  const rows = await executeSqlObjects(
    `SELECT ${OPP_COLS} ${OPP_JOINS}
     AND rt.name = 'Sales Opportunity'
     AND o.stage_name IN (${stages})
     AND o.created_date >= '${year}-${mm}-01T00:00:00Z'
     AND o.created_date < '${nextYear}-${nextMm}-01T00:00:00Z'
     AND o.owner_id IN (${ownerIn})
     ORDER BY o.created_date DESC`,
  );
  writeJson(file, sfRecords(rows.map(nestOpp)));
}

async function pullInboundWeekly(file) {
  const stages = sqlStringList(WEEKLY_STAGES);
  const rows = await executeSqlObjects(
    `SELECT ${OPP_COLS} ${OPP_JOINS}
     AND rt.name = 'Sales Opportunity'
     AND o.stage_name IN (${stages})
     AND o.created_date >= '${YEAR}-01-01T00:00:00Z'
     AND o.owner_id IN (${INBOUND_IN})
     ORDER BY o.created_date DESC`,
  );
  writeJson(file, sfRecords(rows.map(nestOpp)));
}

async function pullPipelineStageCounts() {
  const clean = await executeSqlObjects(
    `SELECT o.stage_name AS StageName, COUNT(*) AS cnt
     FROM ${SF}.opportunity o
     JOIN ${SF}.record_type rt ON o.record_type_id = rt.id
     WHERE COALESCE(o._fivetran_deleted, false) = false
       AND COALESCE(o.is_deleted, false) = false
       AND rt.name = 'Sales Opportunity'
     GROUP BY o.stage_name`,
  );
  writeJson(
    "scripts/.cache/sf-pipeline-stage-counts.json",
    sfRecords(
      clean.map((r) => ({ StageName: r.StageName, cnt: Number(r.cnt) })),
      {
        _query:
          "SELECT StageName, COUNT(Id) cnt FROM Opportunity WHERE RecordType.Name = 'Sales Opportunity' GROUP BY StageName",
        _note: "Pulled via Databricks main.fivetran_salesforcefood",
        _source: "databricks",
      },
    ),
  );
}

async function pullWonRecent() {
  const rows = await executeSqlObjects(
    `SELECT ${OPP_COLS} ${OPP_JOINS}
     AND rt.name = 'Sales Opportunity'
     AND o.stage_name = 'Activated'
     AND o.owner_id IN (${TEAM_IN})
     ORDER BY o.close_date DESC
     LIMIT 100`,
  );
  writeJson("scripts/.cache/sf-won-recent.json", sfRecords(rows.map(nestOpp)));
}

async function pullPipelineOpen() {
  const rows = await executeSqlObjects(
    `SELECT ${OPP_COLS} ${OPP_JOINS}
     AND rt.name = 'Sales Opportunity'
     AND COALESCE(o.is_closed, false) = false
     AND o.stage_name NOT IN ('Closed Won','Closed Lost','Activated')
     AND o.owner_id IN (${TEAM_IN})
     ORDER BY o.last_modified_date DESC
     LIMIT 500`,
  );
  writeJson("scripts/.cache/sf-pipeline-open.json", sfRecords(rows.map(nestOpp)));
}

async function pullMyPipeline() {
  const working = sqlStringList(MP_WORKING);
  const workingRows = await executeSqlObjects(
    `SELECT ${OPP_COLS} ${OPP_JOINS}
     AND rt.name = 'Sales Opportunity'
     AND o.stage_name IN (${working})
     AND o.owner_id IN (${TEAM_IN})
     ORDER BY o.created_date DESC`,
  );
  writeJson("scripts/.cache/mp-opps-working.json", sfRecords(workingRows.map(nestOpp)));

  const newRows = await executeSqlObjects(
    `SELECT ${OPP_COLS} ${OPP_JOINS}
     AND rt.name = 'Sales Opportunity'
     AND o.stage_name = 'New Opportunity'
     AND o.owner_id IN (${TEAM_IN})
     ORDER BY o.created_date DESC
     LIMIT 1500`,
  );
  writeJson("scripts/.cache/mp-opps-newopp.json", sfRecords(newRows.map(nestOpp)));

  const leads = await executeSqlObjects(
    `SELECT l.id, l.name, l.company, l.status, l.city, l.state, l.created_date,
            l.owner_id, u.name AS owner_name
     FROM ${SF}.lead l
     LEFT JOIN ${SF}.user u ON l.owner_id = u.id
     WHERE COALESCE(l._fivetran_deleted, false) = false
       AND COALESCE(l.is_deleted, false) = false
       AND COALESCE(l.is_converted, false) = false
       AND COALESCE(l.status, '') != 'Disqualified'
       AND l.owner_id IN (${TEAM_IN})
     ORDER BY l.created_date DESC
     LIMIT 1500`,
  );
  writeJson(
    "scripts/.cache/mp-leads.json",
    sfRecords(
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
        Owner: { Name: r.owner_name },
      })),
    ),
  );

  const oppTotals = await executeSqlObjects(
    `SELECT o.owner_id AS OwnerId, o.stage_name AS StageName, COUNT(*) AS cnt
     FROM ${SF}.opportunity o
     JOIN ${SF}.record_type rt ON o.record_type_id = rt.id
     WHERE COALESCE(o._fivetran_deleted, false) = false
       AND COALESCE(o.is_deleted, false) = false
       AND rt.name = 'Sales Opportunity'
       AND o.stage_name IN ('New Opportunity', ${working})
       AND o.owner_id IN (${TEAM_IN})
     GROUP BY o.owner_id, o.stage_name`,
  );
  const leadTotals = await executeSqlObjects(
    `SELECT l.owner_id AS OwnerId, COUNT(*) AS cnt
     FROM ${SF}.lead l
     WHERE COALESCE(l._fivetran_deleted, false) = false
       AND COALESCE(l.is_deleted, false) = false
       AND COALESCE(l.is_converted, false) = false
       AND COALESCE(l.status, '') != 'Disqualified'
       AND l.owner_id IN (${TEAM_IN})
     GROUP BY l.owner_id`,
  );
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
    _comment: "Assembled from Databricks Food SF GROUP BY",
    opps,
    leadsOpen,
  });
}

async function pullMops() {
  const cases = await executeSqlObjects(
    `SELECT c.id, c.case_number, c.subject, c.status, c.owner_id,
            u.name AS owner_name, rt.name AS record_type_name
     FROM ${SF}.\`case\` c
     LEFT JOIN ${SF}.user u ON c.owner_id = u.id
     LEFT JOIN ${SF}.record_type rt ON c.record_type_id = rt.id
     WHERE COALESCE(c._fivetran_deleted, false) = false
       AND COALESCE(c.is_deleted, false) = false
       AND COALESCE(c.is_closed, false) = false
     ORDER BY c.created_date DESC`,
  );
  const records = cases.map((r) => ({
    id: r.id,
    caseNumber: r.case_number,
    subject: r.subject,
    status: r.status,
    ownerId: r.owner_id,
    ownerName: r.owner_name,
    recordType: r.record_type_name,
    url: `https://bolt.lightning.force.com/lightning/r/Case/${r.id}/view`,
  }));
  const byStatus = new Map();
  const byRt = new Map();
  const byOwner = new Map();
  let openNewOnboarding = 0;
  for (const r of records) {
    byStatus.set(r.status, (byStatus.get(r.status) || 0) + 1);
    byRt.set(r.recordType, (byRt.get(r.recordType) || 0) + 1);
    const ok = byOwner.get(r.ownerId) || { ownerId: r.ownerId, name: r.ownerName, count: 0 };
    ok.count += 1;
    byOwner.set(r.ownerId, ok);
    if (r.recordType === "New Onboarding") openNewOnboarding += 1;
  }
  const sortDesc = (a, b) => b.count - a.count;
  writeJson("scripts/.cache/sf-mops-cases.json", {
    openCases: records.length,
    openNewOnboarding,
    openByStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })).sort(sortDesc),
    openByRecordType: [...byRt.entries()]
      .map(([recordType, count]) => ({ recordType, count }))
      .sort(sortDesc),
    openByOwner: [...byOwner.values()].sort(sortDesc),
    records,
  });

  const onbStages = sqlStringList(MOPS_ONB);
  const onb = await executeSqlObjects(
    `SELECT ${OPP_COLS} ${OPP_JOINS}
     AND rt.name = 'Sales Opportunity'
     AND o.stage_name IN (${onbStages})
     AND o.owner_id IN (${TEAM_IN})
     ORDER BY o.close_date ASC`,
  );
  writeJson("scripts/.cache/sf-mops-onboarding.json", sfRecords(onb.map(nestOpp)));
}

async function pullHistoryAllMonths() {
  const months = monthsToPull(YEAR, { full: true });
  for (const month of months) {
    const mm = String(month).padStart(2, "0");
    await pullStageHistoryChunk(
      `scripts/.cache/sf-stage-history-${YEAR}-${mm}.json`,
      TEAM_IN,
      YEAR,
      month,
    );
    await pullWeeklyChunk(`scripts/.cache/sf-weekly-${YEAR}-${mm}.json`, TEAM_IN, YEAR, month);
    await pullStageHistoryChunk(
      `scripts/.cache/sf-inbound-stage-history-${YEAR}-${mm}.json`,
      INBOUND_IN,
      YEAR,
      month,
    );
  }
}

async function pullAccountsPerfC1() {
  const universeSql = `
    SELECT po.provider_id, po.opportunity_owner_user_name, po.opportunity_owner_email,
           CAST(po.provider_activated_ts AS DATE) AS activated_date,
           pv.provider_name, pv.vendor_name, pv.city_name, pv.business_segment_v2,
           pv.provider_status, CAST(pv.first_delivered_order_ts AS DATE) AS first_order_date
    FROM main.ng_delivery.dim_provider_opportunity po
    LEFT JOIN main.ng_delivery.dim_provider_v2 pv ON pv.provider_id = po.provider_id
    WHERE po.provider_activated_ts >= '${YEAR}-01-01' AND po.country_name = 'Romania'
    QUALIFY ROW_NUMBER() OVER (PARTITION BY po.provider_id ORDER BY po.provider_activated_ts DESC) = 1
  `;
  const { data: universe } = await executeSql(universeSql);
  writeMcpTable(
    "scripts/.cache/accounts-perf-accounts.json",
    "RO YTD activation universe (Databricks ng_delivery)",
    universe,
  );

  const provOppSql = `
    SELECT po.provider_id, po.opportunity_id
    FROM main.ng_delivery.dim_provider_opportunity po
    WHERE po.provider_activated_ts >= '${YEAR}-01-01' AND po.country_name = 'Romania'
    QUALIFY ROW_NUMBER() OVER (PARTITION BY po.provider_id ORDER BY po.provider_activated_ts DESC) = 1
  `;
  const { data: provOpp } = await executeSql(provOppSql);
  writeMcpTable(
    "scripts/.cache/accounts-perf-prov-opp.json",
    "provider → opportunity map (Databricks ng_delivery)",
    provOpp,
  );
}

async function pullAccountsPerfC2() {
  if (!existsSync(join(cacheDir, "accounts-perf-accounts.json"))) {
    throw new Error("C2 requires accounts-perf-accounts.json — C1 must run first");
  }
  const providerIds = readActivatedProviderIds();
  const CHUNK = 400;
  const monthly = [];
  const quality = [];
  for (const batch of chunk(providerIds, CHUNK)) {
    const { data: m } = await executeSql(monthlyQuery(batch));
    monthly.push(...m);
    const { data: q } = await executeSql(qualityQuery(batch));
    quality.push(...q);
  }
  writeMcpTable(
    "scripts/.cache/accounts-perf-monthly.json",
    "Monthly GMV/orders/commission (Databricks fact_provider_monthly)",
    monthly,
  );
  writeMcpTable(
    "scripts/.cache/accounts-perf-quality.json",
    "Monthly quality metrics (Databricks fact_provider_monthly)",
    quality,
  );

  // Commission + segment from Food SF
  const oppIds = readWonOpportunityIds();
  const oppToProv = new Map();
  {
    const raw = readFileSync(join(cacheDir, "accounts-perf-prov-opp.json"), "utf8");
    const data = JSON.parse(raw.slice(raw.indexOf("{"))).data ?? [];
    for (const [pid, oid] of data) {
      if (oid) oppToProv.set(String(oid), String(pid));
    }
  }
  const commission = [];
  const segment = [];
  for (const batch of chunk(oppIds, SF_COMMISSION_BATCH_SIZE)) {
    const rows = await executeSqlObjects(
      `SELECT o.id, o.commission_c, a.account_management_segment_c
       FROM ${SF}.opportunity o
       LEFT JOIN ${SF}.account a ON o.account_id = a.id
       WHERE COALESCE(o._fivetran_deleted, false) = false
         AND o.id IN (${sqlStringList(batch)})`,
    );
    for (const r of rows) {
      const pid = oppToProv.get(String(r.id));
      if (!pid) continue;
      commission.push([pid, r.commission_c == null ? null : Number(r.commission_c), r.id]);
      segment.push([pid, r.account_management_segment_c ?? null, r.id]);
    }
  }
  writeMcpTable(
    "scripts/.cache/accounts-perf-sf-commission.json",
    "SF Commission__c via Databricks Food SF [provider_id, rate, opportunity_id]",
    commission,
  );
  writeMcpTable(
    "scripts/.cache/accounts-perf-sf-segment.json",
    "SF Account_Management_Segment__c via Databricks Food SF",
    segment,
  );

  // Churn prevention SF status
  const statusIds = readTeamActivatedProviderIds();
  const statusRows = [];
  for (const batch of chunk(statusIds, SF_STATUS_BATCH_SIZE)) {
    const rows = await executeSqlObjects(
      `SELECT a.id, a.name, a.provider_id_c, a.status_c, a.is_deleted,
              a.inactive_30_days_c, a.billing_city, a.provider_first_active_date_c
       FROM ${SF}.account a
       WHERE COALESCE(a._fivetran_deleted, false) = false
         AND a.provider_id_c IN (${batch.join(",")})`,
    );
    for (const r of rows) {
      statusRows.push([
        String(r.provider_id_c),
        r.id,
        r.name,
        r.status_c,
        Boolean(r.is_deleted),
        Boolean(r.inactive_30_days_c),
        r.billing_city,
        asDate(r.provider_first_active_date_c),
      ]);
    }
  }
  writeMcpTable(
    "scripts/.cache/churn-prevention-sf-status.json",
    "SF Account status for churn prevention [provider_id, account_id, name, status, is_deleted, inactive_30, city, first_active]",
    statusRows,
  );
}

async function main() {
  mkdirSync(cacheDir, { recursive: true });
  log(`tracking year=${YEAR}; team=${TEAM_IDS.length}; inbound=${INBOUND_IDS.length}`);

  await checkFreshness();

  log("=== Batch A: team CRM ===");
  await pullPipelineStageCounts();
  await pullWon("scripts/.cache/sf-won-mtd.json", TEAM_IN, { monthOnly: true });
  await pullWon("scripts/.cache/sf-won-ytd-bydate.json", TEAM_IN, { yearOnly: true });
  await pullWonRecent();
  await pullPipelineOpen();
  await pullActivation(`scripts/.cache/sf-account-activation-${YEAR}.json`, TEAM_IN);
  await pullReactivation(`scripts/.cache/sf-reactivation-${YEAR}.json`, TEAM_IN);
  await pullHistoryAllMonths();

  log("=== Batch B: MyPipeline + MOPS + inbound ===");
  await pullMyPipeline();
  await pullMops();
  await pullWon("scripts/.cache/sf-inbound-won-mtd.json", INBOUND_IN, { monthOnly: true });
  await pullWon("scripts/.cache/sf-inbound-won-ytd-bydate.json", INBOUND_IN, { yearOnly: true });
  await pullInboundWeekly(`scripts/.cache/sf-inbound-weekly-${YEAR}.json`);
  await pullActivation(`scripts/.cache/sf-inbound-account-activation-${YEAR}.json`, INBOUND_IN);
  await pullReactivation(`scripts/.cache/sf-inbound-reactivation-${YEAR}.json`, INBOUND_IN);

  log("=== Batch C1: accounts-perf universe ===");
  await pullAccountsPerfC1();

  log("=== Batch C2: monthly/quality/commission/churn ===");
  await pullAccountsPerfC2();

  log("DONE — next: node scripts/fetch-sf-stage-history.mjs --kind=all && npm run refresh-all");
}

main().catch((err) => {
  console.error("[pull-databricks] FAILED:", err);
  process.exit(1);
});
