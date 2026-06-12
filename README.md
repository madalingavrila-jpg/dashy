# Dashy — Ultimate Sales Dashboard

Sales pipeline visibility for Romania — **Won** and **Activated** tracked separately. Next.js UI + Express API, deployed on Boltable via Paketo.

## Architecture

```
Cursor (Salesforce MCP + Bolt Sheet MCP)
  → update data/dashboard.json (or publish JSON to Google Sheet)
  → git push
  → Paketo redeploy (Boltable)
  → GET /api/dashboard/* (lazy sections per page)
```

No Salesforce or Looker calls at runtime on Boltable.

## API (lazy load per tab)

| Endpoint | Used by |
|----------|---------|
| `GET /api/dashboard/overview` | Overview, Hitlist, WoW (partial) |
| `GET /api/dashboard/mtd` | MTD, Pipeline, Settings |
| `GET /api/dashboard/weekly` | Weekly, WoW |
| `GET /api/dashboard/accounts` | Accounts |
| `GET /api/dashboard/mops` | MOPS |
| `GET /api/dashboard/agents` | Agents, Weekly, Settings |
| `GET /api/dashboard` | Fallback (full slim payload) |

Each page fetches only the sections it needs; falls back to `/api/dashboard` if a section request fails.

## Pages

| Route | Screen |
|-------|--------|
| `/` | Overview Dashboard |
| `/pipeline` | Pipeline Funnel View (dual funnel) |
| `/weekly` | Weekly Performance |
| `/mtd` | MTD & Tiers Tracking |
| `/wow` | WoW Reports (read-only from JSON) |
| `/accounts` | Accounts (Won / Activated / backlog) |
| `/hitlist` | Hitlist Priority List |
| `/settings` | Settings & Admin (read-only) |

## Getting started

```bash
cd /Users/madalin/Desktop/dashy
npm install --cache ./.npm-cache
cp .env.example .env.local
npm run build:boltable
npm run start:server
```

Open [http://localhost:8080](http://localhost:8080).

API endpoints:

- `GET /api/health` — includes `gitSha`, `cacheTtlMs`
- `GET /api/status`
- `GET /api/dashboard` — full slim payload (backward compatible)
- `GET /api/dashboard/overview|mtd|weekly|accounts|mops|agents`

## Data sources

Default: `data/dashboard.json` in repo.

Optional Boltable env:

```
DASHBOARD_SHEET_URL=https://docs.google.com/spreadsheets/d/e/.../pub?output=json
DASHY_CACHE_TTL_MS=300000
PORT=8080
```

`DASHY_CACHE_TTL_MS` (default **5 minutes**) controls how long the server keeps the parsed dashboard in memory before re-reading the file (also invalidated when `dashboard.json` mtime changes).

**Target overrides (Settings → Save targets):** `PUT /api/target-config` writes `data/target-config.json`. Boltable’s filesystem is ephemeral — without git persistence, overrides are lost on redeploy. Set on Boltable:

```
GITHUB_TOKEN=<PAT with repo contents write on boltable/dashy>
GITHUB_REPO=boltable/dashy
GITHUB_BRANCH=main
```

When configured, each save commits `data/target-config.json` via the GitHub Contents API; the next Paketo build pulls the file from git. Expect a short redeploy (~1–2 min) after each target save, same as dashboard data pushes.

Google Sheet (agent refresh): `1IW8IxEs-YCsYMlCeTfkIz-b51eStjR5uUIEpkV1akRE` — see `AGENTS.md`.

## Boltable deploy

Paketo runs `npm run build` and starts `npm start` (Express serves `out/` + `/api/*`).

Config files: `project.toml`, `Procfile`.

**Auto-update:** every `git push` to the Boltable remote triggers a full rebuild and restart. Expect **~1–2 minutes of 503** (“Application is not responding”) while Paketo builds Next.js and swaps the container — this is normal redeploy downtime, not a crash.

**Health check:** `GET /api/health` is lightweight (no dashboard load). It reports `staticReady`, `dashboardCacheReady`, `gitSha`, `cacheTtlMs`, and `uptime`.

**Payload size:** `scripts/build-dashboard-data.mjs` and `scripts/slim-dashboard-json.mjs` write a **slim source** `data/dashboard.json` (~200–300KB): MTD `wonItems`/`activatedItems` only for the current month, weekly account lists only for the current ISO week, account tabs capped at 28 rows with Salesforce list URLs. Build precomputes `out/api/dashboard.json` (~200KB, must stay under **350KB**). UI shows **Date actualizate** in TopBar and page headers.

**Tips to avoid repeated downtime:** batch commits before pushing; data-only updates (`data/dashboard.json`) still trigger a full rebuild on Boltable.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run dev:server` | Express + API (requires prior build) |
| `npm run build:boltable` | Production build for Boltable |
| `npm run start:server` | Serve static export + API |
| `node scripts/slim-dashboard-json.mjs` | Re-slim existing `data/dashboard.json` in place |

## Design reference

- `DESIGN.md` — Dashy design tokens (blue/green Won, purple Activated)
- `stitch-manifest.json` — Stitch project screen IDs
- `screens/` — Stitch export attempts (SPA shells only)
- `AGENTS.md` — Cursor agent data refresh workflow

## Stitch project

- **Project ID:** 6890101916617207787
- **Title:** Dashy - Ultimate Sales Dashboard

Stitch `/export/html` URLs require Google auth and return the Stitch app shell, not rendered screen HTML. UI was implemented from the architecture spec and design tokens.
