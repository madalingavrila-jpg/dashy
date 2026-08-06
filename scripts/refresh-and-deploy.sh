#!/usr/bin/env bash
#
# Manual / local dashy data refresh + deploy (Databricks-backed).
# Nightly automation lives in n8n → GitHub Actions (dashy-data-refresh.yml).
# This script is for laptop runs when you want the same path without waiting
# for the schedule.
#
# Requires:
#   DATABRICKS_HOST, DATABRICKS_TOKEN, DATABRICKS_WAREHOUSE_ID
# Optional:
#   DASHY_SKIP_FRESHNESS=1
#   SLACK_BOT_TOKEN  (to DM Bianca after a successful push)
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

log() { echo "[$(date '+%Y-%m-%dT%H:%M:%S%z')] $*"; }

: "${DATABRICKS_HOST:?Set DATABRICKS_HOST}"
: "${DATABRICKS_TOKEN:?Set DATABRICKS_TOKEN}"
: "${DATABRICKS_WAREHOUSE_ID:?Set DATABRICKS_WAREHOUSE_ID}"

log "Pulling caches from Databricks…"
npm run data:pull-databricks

log "Merging stage-history / weekly chunks…"
node scripts/fetch-sf-stage-history.mjs --kind=all

log "Rebuilding dashboard sections…"
npm run refresh-all

log "Production build + verify…"
npm run build

UPDATED_AT="$(node -e "console.log(JSON.parse(require('fs').readFileSync('data/dashboard.json','utf8')).updatedAt || '')")"
log "updatedAt=${UPDATED_AT}"

if [[ "${DASHY_SKIP_GIT:-}" == "1" ]]; then
  log "DASHY_SKIP_GIT=1 — not committing."
  exit 0
fi

git add data/dashboard.json data/mtd-details.json scripts/.cache || true
if git diff --cached --quiet; then
  log "No data changes to commit."
else
  git commit -m "chore(data): Databricks refresh ${UPDATED_AT}"
  # Prefer boltable remote when present (Paketo), else origin.
  if git remote get-url boltable >/dev/null 2>&1; then
    git push boltable HEAD:main
  else
    git push origin HEAD:main
  fi
  log "Pushed."
fi

if [[ -n "${SLACK_BOT_TOKEN:-}" ]]; then
  MSG="Hi Bianca — dashy data refresh is done ✅ Latest SF + Databricks data is live on dashy.boltable.eu (updated ${UPDATED_AT}). Please check the data when you get a chance."
  curl -sS -X POST https://slack.com/api/chat.postMessage \
    -H "Authorization: Bearer ${SLACK_BOT_TOKEN}" \
    -H "Content-Type: application/json; charset=utf-8" \
    --data-binary @- <<EOF
{"channel":"U01AHG4UAPR","text":$(node -e "console.log(JSON.stringify(process.argv[1]))" "$MSG")}
EOF
  log "Notified Bianca on Slack."
else
  log "SLACK_BOT_TOKEN unset — skip Bianca notify."
fi
