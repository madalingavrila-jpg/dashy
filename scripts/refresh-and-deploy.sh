#!/bin/bash
#
# Local / launchd dashy data refresh + deploy.
#
# Preferred nightly path (fully automated, no Cursor agent):
#   n8n Schedule 14:00 Europe/Bucharest
#     → GitHub workflow_dispatch (dashy-data-refresh.yml)
#     → Databricks pull + refresh-all + build + push boltable/main
#     → Slack DM Bianca
#
# This script is the LOCAL / manual fallback (and former launchd job). It pulls
# caches from Databricks via the SQL API (no Salesforce MCP), rebuilds, and
# pushes to boltable/main. Keep the launchd plist disabled unless you need a
# laptop-side backup.
#
# Required env (or export before running):
#   DATABRICKS_HOST
#   DATABRICKS_TOKEN
#   DATABRICKS_WAREHOUSE_ID
# Optional:
#   SLACK_BOT_TOKEN   — if set, DMs Bianca after a successful push
#   DASHY_FORCE_REFRESH=1 — bypass once-per-day guard

set -uo pipefail

REPO="${DASHY_REPO:-/Users/madalin/Desktop/dashy}"
REMOTE_NAME="${DASHY_REMOTE:-boltable}"
REMOTE_BRANCH="${DASHY_REMOTE_BRANCH:-main}"

STATE_DIR="$HOME/Library/Application Support/dashy"
STATE_FILE="$STATE_DIR/last-refresh-date"
LOG="$HOME/Library/Logs/dashy-refresh.log"
LOCK="/tmp/dashy-refresh.lock"

export PATH="/Users/madalin/.local/bin:/usr/local/lib/nodejs/node-v22.15.0-darwin-x64/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin${PATH:+:$PATH}"

mkdir -p "$STATE_DIR" "$(dirname "$LOG")"

log() { echo "[$(date '+%Y-%m-%dT%H:%M:%S%z')] $*" >> "$LOG"; }

TODAY="$(date +%F)"

if [ "${DASHY_FORCE_REFRESH:-}" != "1" ] && [ -f "$STATE_FILE" ] && [ "$(cat "$STATE_FILE" 2>/dev/null)" = "$TODAY" ]; then
  log "Already refreshed successfully for $TODAY — skipping (set DASHY_FORCE_REFRESH=1 to override)."
  exit 0
fi

if ! mkdir "$LOCK" 2>/dev/null; then
  log "Another run in progress (lock present) — skipping."
  exit 0
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

cd "$REPO" || { log "Repo not found: $REPO"; exit 1; }

for var in DATABRICKS_HOST DATABRICKS_TOKEN DATABRICKS_WAREHOUSE_ID; do
  if [ -z "${!var:-}" ]; then
    log "Missing required env $var — aborting."
    exit 1
  fi
done

log "Starting Databricks refresh for $TODAY."
PREV_SHA="$(git rev-parse HEAD 2>>"$LOG" || true)"

set -e
npm run data:pull-databricks >> "$LOG" 2>&1
node scripts/fetch-sf-stage-history.mjs --kind=all >> "$LOG" 2>&1
npm run refresh-all >> "$LOG" 2>&1
npm run build >> "$LOG" 2>&1

git add data/dashboard.json data/mtd-details.json
if git diff --cached --quiet; then
  log "No data changes after rebuild — not committing."
  exit 1
fi

UPDATED_AT="$(node -e "console.log(JSON.parse(require('fs').readFileSync('data/dashboard.json','utf8')).updatedAt || '')")"
git commit -m "chore(data): local Databricks refresh ${UPDATED_AT}" >> "$LOG" 2>&1
git push "$REMOTE_NAME" "HEAD:${REMOTE_BRANCH}" >> "$LOG" 2>&1
NEW_SHA="$(git rev-parse HEAD)"
log "Pushed ${NEW_SHA} (was ${PREV_SHA:-unknown}). updatedAt=${UPDATED_AT}"

if [ -n "${SLACK_BOT_TOKEN:-}" ]; then
  BODY=$(UPDATED_AT="$UPDATED_AT" node -e '
    const text = `Hi Bianca — dashy data refresh is done ✅ Latest SF + Databricks data is live on dashy.boltable.eu (updated ${process.env.UPDATED_AT}). Please check the data when you get a chance.`;
    process.stdout.write(JSON.stringify({ channel: "U01AHG4UAPR", text }));
  ')
  curl -sS -X POST "https://slack.com/api/chat.postMessage" \
    -H "Authorization: Bearer ${SLACK_BOT_TOKEN}" \
    -H "Content-Type: application/json; charset=utf-8" \
    -d "$BODY" >> "$LOG" 2>&1 || log "Slack notify failed (non-fatal)."
fi

echo "$TODAY" > "$STATE_FILE"
log "SUCCESS — marked $TODAY done."
exit 0
