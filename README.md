# Dashy — Ultimate Sales Dashboard

Sales pipeline visibility for Romania — **Won** and **Activated** tracked separately. Next.js UI + Express API, deployed on Boltable via Paketo.

## Architecture

```
Cursor (Salesforce MCP + Bolt Sheet MCP)
  → update data/dashboard.json (or publish JSON to Google Sheet)
  → git push
  → Paketo redeploy (Boltable)
  → GET /api/dashboard
```

No Salesforce or Looker calls at runtime on Boltable.

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

- `GET /api/health`
- `GET /api/status`
- `GET /api/dashboard`

## Data sources

Default: `data/dashboard.json` in repo.

Optional Boltable env:

```
DASHBOARD_SHEET_URL=https://docs.google.com/spreadsheets/d/e/.../pub?output=json
DASHY_CACHE_TTL_MS=60000
PORT=8080
```

Google Sheet (agent refresh): `1IW8IxEs-YCsYMlCeTfkIz-b51eStjR5uUIEpkV1akRE` — see `AGENTS.md`.

## Boltable deploy

Paketo runs `npm run build` and starts `npm start` (Express serves `out/` + `/api/*`).

Config files: `project.toml`, `Procfile`.

**Auto-update:** every `git push` to the Boltable remote triggers a full rebuild and restart. Expect **~1–2 minutes of 503** (“Application is not responding”) while Paketo builds Next.js and swaps the container — this is normal redeploy downtime, not a crash.

**Health check:** `GET /api/health` is lightweight (no dashboard load). It reports `staticReady`, `dashboardCacheReady`, and `uptime` for debugging.

**Memory:** `data/dashboard.json` (~600KB) is parsed once at startup and cached in memory (~500KB JSON response). Concurrent cache-miss loads were causing OOM on small Boltable containers; the server now deduplicates loads and pre-warms the cache on boot.

**Tips to avoid repeated downtime:** batch commits before pushing; data-only updates (`data/dashboard.json`) still trigger a full rebuild on Boltable.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run dev:server` | Express + API (requires prior build) |
| `npm run build:boltable` | Production build for Boltable |
| `npm run start:server` | Serve static export + API |

## Design reference

- `DESIGN.md` — Dashy design tokens (blue/green Won, purple Activated)
- `stitch-manifest.json` — Stitch project screen IDs
- `screens/` — Stitch export attempts (SPA shells only)
- `AGENTS.md` — Cursor agent data refresh workflow

## Stitch project

- **Project ID:** 6890101916617207787
- **Title:** Dashy - Ultimate Sales Dashboard

Stitch `/export/html` URLs require Google auth and return the Stitch app shell, not rendered screen HTML. UI was implemented from the architecture spec and design tokens.
