---
name: Dashy Pipeline Grid
colors:
  primary: '#1d4ed8'
  won: '#059669'
  activated: '#7c3aed'
  surface: '#ffffff'
  background: '#f4f6fb'
  on-surface: '#0f172a'
typography:
  fontFamily: Inter
---

## Brand

**Dashy** — Ultimate B2B sales pipeline dashboard. Professional, data-forward, with clear visual separation between **Won** (green) and **Activated** (purple).

### Logo (custom SVG)

Stitch project `6890101916617207787` exports SPA shells only (auth required) — no standalone logo asset. Custom **Dashy** mark:

- Bolt Food green gradient (`#34D186` → `#2AAF6A`)
- Stylized **D** with speed dashes (delivery / “dash” energy)
- Ascending bar chart + trend arrow (sales pipeline growth)
- Files: `components/Logo.tsx`, `public/logo.svg`, `app/icon.svg` (favicon)

## Key UI patterns

- Sidebar navigation (280px fixed)
- Metric cards with trend chips
- Team progress panels (Complex & Density — Won + Activated MTD bars)
- Tabbed accounts table
- Read-only WoW report tables from JSON

## Stitch mapping

| Stitch screen | Route | Component |
|---------------|-------|-----------|
| Overview Dashboard | `/` | OverviewShell |
| Team Progress View | `/pipeline` | PipelineShell |
| Weekly Performance | `/weekly` | WeeklyShell |
| MTD & Tiers Tracking | `/mtd` | MtdShell |
| WoW Reports Builder | `/wow` | WowShell |
| Accounts Management | `/accounts` | AccountsShell |
| Hitlist Priority List | `/hitlist` | HitlistShell |
| Settings & Admin | `/settings` | SettingsShell |
