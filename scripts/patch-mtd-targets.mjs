#!/usr/bin/env node
/**
 * Patches data/dashboard.json with segment/mtdTarget on agents and recalculated mtdAchievement.
 * Optionally merges fresh SF MTD counts per owner (June 2026).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { enrichAgent, buildMtdAchievement } from "../lib/agent-segments.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dashboardPath = join(root, "data/dashboard.json");

/** Won MTD — Sales Opportunity, CloseDate THIS_MONTH (SF 2026-06-11). */
const SF_WON_MTD = {
  "005Ts00000BtX53IAF": 45,
  "005Ts00000BtZV3IAN": 30,
  "005Ts000002AWIQIA4": 24,
  "005Ts00000BtGPDIA3": 22,
  "005Ts000002AX4nIAG": 20,
  "005Ts000001Ak10IAC": 19,
  "005Ts000006V3vpIAC": 17,
  "005Ts00000BtHpvIAF": 12,
  "005Qs00000OLyBRIA1": 11,
  "005Ts000005c4hFIAQ": 7,
  "005Qs00000N2Hh3IAF": 5,
  "005Qs00000Mxc6EIAR": 5,
  "005Ts0000060ICnIAM": 3,
};

/** Activated MTD — StageName Activated, CloseDate THIS_MONTH. */
const SF_ACTIVATED_MTD = {
  "005Ts00000BtGPDIA3": 19,
  "005Ts000002AX4nIAG": 11,
  "005Ts00000BtX53IAF": 10,
  "005Ts000001Ak10IAC": 9,
  "005Ts00000BtZV3IAN": 8,
  "005Ts000002AWIQIA4": 7,
  "005Ts000005c4hFIAQ": 6,
  "005Qs00000Mxc6EIAR": 3,
  "005Qs00000N2Hh3IAF": 3,
  "005Qs00000OLyBRIA1": 2,
  "005Ts0000060ICnIAM": 2,
  "005Ts000006V3vpIAC": 1,
};

const dashboard = JSON.parse(readFileSync(dashboardPath, "utf8"));
const { mtdAchievement: prevMtd } = dashboard.salesPipeline;

const agents = (dashboard.salesPipeline.agents ?? []).map((agent) => {
  const wonMtd = SF_WON_MTD[agent.ownerId] ?? agent.wonMtd ?? 0;
  const activatedMtd = SF_ACTIVATED_MTD[agent.ownerId] ?? agent.activatedMtd ?? 0;
  return enrichAgent({ ...agent, wonMtd, activatedMtd });
});

const mtdAchievement = buildMtdAchievement(agents, prevMtd.month ?? "June 2026", {
  leadsMtd: prevMtd.leadsMtd ?? 173,
  qualifiedMtd: prevMtd.qualifiedMtd ?? 15,
});

dashboard.updatedAt = new Date().toISOString();
dashboard.salesPipeline.agents = agents;
dashboard.salesPipeline.mtdAchievement = mtdAchievement;

writeFileSync(dashboardPath, `${JSON.stringify(dashboard, null, 2)}\n`);

const complex = agents.filter((a) => a.segment === "complex");
console.log("Patched dashboard.json", {
  agents: agents.length,
  complexReps: complex.map((a) => a.name),
  densityReps: agents.length - complex.length,
  targetWon: mtdAchievement.targetWon,
  targetActivated: mtdAchievement.targetActivated,
  actualWon: mtdAchievement.actualWon,
  actualActivated: mtdAchievement.actualActivated,
});
