#!/bin/bash
#
# Daily dashboard data refresh + deploy, run by launchd (eu.boltable.dashy.refresh).
#
# Scheduling model (see eu.boltable.dashy.refresh.plist):
#   - launchd StartCalendarInterval fires at 13:00 local time.
#   - If the Mac was asleep/off at 13:00, launchd runs the missed job once at the
#     next wake — giving the "run after 1PM whenever the laptop opens" behavior.
#
# Once-per-day guard (this script):
#   - We record the last SUCCESSFUL refresh date in a state file.
#   - If today already succeeded, exit early (prevents duplicate runs when the
#     machine wakes several times after 13:00).
#   - We only write the state file on a *successful* refresh + push, so a failed
#     13:00 attempt still retries on the next wake after 1PM.
#
# All times use the laptop's local timezone (currently Europe/Bucharest), which
# matches both the plist calendar hour and the dashboard's reporting timezone.

set -uo pipefail

REPO="/Users/madalin/Desktop/dashy"
REMOTE_URL="https://github.com/boltable/dashy.git"
CURSOR_AGENT="/Users/madalin/.local/bin/cursor-agent"

STATE_DIR="$HOME/Library/Application Support/dashy"
STATE_FILE="$STATE_DIR/last-refresh-date"
LOG="$HOME/Library/Logs/dashy-refresh.log"
LOCK="/tmp/dashy-refresh.lock"

# launchd hands jobs a minimal environment; make sure node/uv/cursor-agent/git resolve.
export PATH="/Users/madalin/.local/bin:/usr/local/lib/nodejs/node-v22.15.0-darwin-x64/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

mkdir -p "$STATE_DIR" "$(dirname "$LOG")"

log() { echo "[$(date '+%Y-%m-%dT%H:%M:%S%z')] $*" >> "$LOG"; }

TODAY="$(date +%F)"

# --- Once-per-day guard ---------------------------------------------------
# launchd decides *when* we run (13:00, or the next wake if 13:00 was missed
# while asleep/off). This guard only enforces "at most one successful refresh
# per calendar day": if today already succeeded, skip. Because we only mark a
# day done on success (see bottom), a failed run leaves today un-marked so the
# next launchd wake-after-13:00 retries it.
if [ -f "$STATE_FILE" ] && [ "$(cat "$STATE_FILE" 2>/dev/null)" = "$TODAY" ]; then
  log "Already refreshed successfully for $TODAY — skipping."
  exit 0
fi

# --- Concurrency lock -----------------------------------------------------
if ! mkdir "$LOCK" 2>/dev/null; then
  log "Another run in progress (lock present) — skipping."
  exit 0
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

cd "$REPO" || { log "Repo not found: $REPO"; exit 1; }

log "Starting refresh for $TODAY."

PREV_SHA="$(git ls-remote "$REMOTE_URL" refs/heads/main 2>>"$LOG" | cut -f1)"
log "Remote boltable/main before: ${PREV_SHA:-unknown}"

read -r -d '' PROMPT <<'EOF'
Refresh ALL Bolt Food sales dashboard data and deploy it. Run fully non-interactively; do not ask questions. Follow the data-refresh workflow documented in AGENTS.md ("Refresh all data — one command"):

1. Salesforce MCP — re-run the documented queries and refresh EVERY export under scripts/.cache/ that can change:
   - sf-pipeline-stage-counts.json (GROUP BY StageName — drives the Overview snapshot funnel)
   - sf-pipeline-open.json, sf-won-mtd.json (Won_Date THIS_MONTH), sf-won-ytd-bydate.json (Won_Date THIS_YEAR),
     sf-won-recent.json, sf-stage-history-2026*.json, sf-weekly-2026.json, sf-mops-cases.json, sf-mops-onboarding.json
   - MyPipeline: mp-opps-working.json, mp-opps-newopp.json, mp-leads.json, mp-totals.json
   - Inbound: sf-inbound-won-mtd.json, sf-inbound-won-ytd-bydate.json, sf-inbound-stage-history-2026-h1/h2.json, sf-inbound-weekly-2026.json
2. Databricks MCP (mcp-databricks-bolt) — refresh accounts-perf-accounts.json, accounts-perf-monthly.json, accounts-perf-quality.json (revenue/quality; replaces Looker).
3. Run: npm run refresh-all   (orchestrator — rebuilds ALL sections: Overview/MTD, Weekly, WoW, MOPS, Accounts performance, MyPipeline, Inbound — into data/dashboard.json with a fresh updatedAt; never wipes a tab).
4. Run: npm run build   (Next build + precompute + verify-build; it must pass — verify-build fails loudly if any section is empty or Won == Activated).
5. Commit data/dashboard.json and the refreshed scripts/.cache exports (optional if using S3 publish), then either:
   a) `npm run upload-s3` / publish API for data-only (no Paketo), OR
   b) push to the "boltable" remote main branch so Boltable (Paketo) redeploys (also seeds S3 on boot).

Do NOT send any Slack messages. If the Salesforce or Databricks MCP is unavailable, stop and report the failure instead of committing stale data.
EOF

"$CURSOR_AGENT" --print --force --trust --approve-mcps --workspace "$REPO" "$PROMPT" >> "$LOG" 2>&1
AGENT_EXIT=$?
log "cursor-agent exit: $AGENT_EXIT"

NEW_SHA="$(git ls-remote "$REMOTE_URL" refs/heads/main 2>>"$LOG" | cut -f1)"
log "Remote boltable/main after: ${NEW_SHA:-unknown}"

# Success = agent exited cleanly AND a new commit actually landed on the remote.
# dashboard.json's updatedAt always changes on a real refresh, so a successful
# run always advances the remote SHA.
if [ "$AGENT_EXIT" -eq 0 ] && [ -n "$NEW_SHA" ] && [ "$NEW_SHA" != "$PREV_SHA" ]; then
  echo "$TODAY" > "$STATE_FILE"
  log "SUCCESS — pushed $NEW_SHA. Marked $TODAY done (no more runs today)."
  exit 0
fi

log "FAILURE — not marking $TODAY done; will retry on the next wake after 13:00."
exit 1
