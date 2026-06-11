# Bumpy Analytics Dashboard

Performance analytics for Bumpy's Meta ad account — campaigns, ad sets, creatives,
concepts and personas — with smart alerts, a yesterday-winners surface, and
click-through detail for every entity.

## How it's wired

```
Meta Ads ──(n8n daily snapshot)──▶  Supabase  ──(SQL views)──▶  Dashboard (Next.js)
                                    *_daily            v_*_metrics
```

- **`*_daily` tables** store one row per entity **per day** (the single source of truth).
- **`v_*_metrics` views** derive every window — Yesterday / 7d / 14d / 28d / 30d / 60d —
  from that history, computing ROAS/CPM/CTR/CPP/etc. once, server-side.
- The dashboard reads **only** the views (+ `creative_persona_report` for the weekly report).

This replaces the previous design, where n8n overwrote rolling-preset columns and wiped
the tables every 12h (so there was no history, no "yesterday", and several field-mapping
bugs). See `db/` and `n8n/` for the migration + workflows.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_URL + _ANON_KEY (read-only)
npm run dev                  # http://localhost:3000
```

Auth is a passkey checked against the `passkeys` table (stored in `localStorage`).

### Apply the data layer (one-time, in Supabase)

1. Run `db/01_history_tables.sql` → `db/04_retention.sql` in order (see `db/README.md`).
2. Import the three workflows in `n8n/` and set the env vars (see `n8n/RUNBOOK.md`).
3. Activate them — history accumulates daily; an optional backfill seeds 60 days at once.

## Project layout

```
app/                 Next.js app router (shell in page.tsx)
components/
  layout/            Sidebar, TopBar, TimeframePicker
  overview/          OverviewPage, YesterdayWinners
  performance/       PerformancePage, HierarchyTable, MetricTable, columns
  detail/            EntityDetail (click-any-row modal: metric×window + trend + breakdowns)
  alerts/            AlertsPage (rules in lib/alerts.ts)
  explorer/          CreativeExplorer (quadrant scatter)
  persona/           PersonaReport (weekly)
  auth/, settings/, ui.tsx, providers.tsx
lib/
  queries.ts         all Supabase reads
  types.ts           the read contract (mirrors the SQL views)
  metrics.ts         formatting + derived-metric + aggregation helpers
  alerts.ts          pure alert-rule engine
  csvExport.ts       CSV download util
db/                  SQL migrations (history tables, views, retention)
n8n/                 daily-snapshot workflows + runbook
```

## Scripts

| command | what |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build (type-checks) |
| `npm run lint` | eslint |
