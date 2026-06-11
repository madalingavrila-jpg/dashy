---
name: URads Pipeline Grid
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

URads B2B sales pipeline dashboard. Professional, data-forward, with clear visual separation between **Won** (green) and **Activated** (purple).

## Key UI patterns

- Sidebar navigation (280px fixed)
- Metric cards with trend chips
- Dual funnel panels (sales vs onboarding)
- Tabbed accounts table
- Read-only WoW report tables from JSON

## Stitch mapping

| Stitch screen | Route | Component |
|---------------|-------|-----------|
| Overview Dashboard | `/` | OverviewShell |
| Pipeline Funnel View | `/pipeline` | PipelineShell |
| Weekly Performance | `/weekly` | WeeklyShell |
| MTD & Tiers Tracking | `/mtd` | MtdShell |
| WoW Reports Builder | `/wow` | WowShell |
| Accounts Management | `/accounts` | AccountsShell |
| Hitlist Priority List | `/hitlist` | HitlistShell |
| Settings & Admin | `/settings` | SettingsShell |
