# Database (Supabase) — apply guide

The dashboard reads **only** from the views defined here. Metrics come from
daily-snapshot tables (`*_daily`); every time window is derived by aggregation,
so there are no more cross-wired preset columns.

## Apply order (Supabase SQL editor → New query → paste → Run)

1. `01_history_tables.sql` — create `creative_daily`, `adset_daily`, `campaign_daily`.
2. `02_dimension_fixes.sql` — add real `budget` / `primary_country` / `primary_device` / breakdown columns to the dimension tables; drop the misspelled `impresssions_28d`.
3. `03_views.sql` — windowed metric views (`v_creative_metrics`, `v_adset_metrics`, `v_campaign_metrics`), `v_yesterday_winners`, and the `anon`/`authenticated` grants.
4. `04_retention.sql` — `prune_daily_history()` (replaces the 12h wipe).

All files are idempotent (`IF NOT EXISTS` / `CREATE OR REPLACE`) — safe to re-run.

## How the windows work

Each view has one row per entity **per `window_days`** (1, 7, 14, 28, 30, 60).
A window of N days ends **yesterday** (the last complete day): it covers
`date in (current_date - N … current_date - 1)`. `prev_*` columns are the equal
window immediately before it (for change % and fatigue detection).

Dashboard query example:

```sql
select * from v_campaign_metrics where window_days = 7;   -- last 7 days
select * from v_creative_metrics where window_days = 1;   -- yesterday
select * from v_yesterday_winners where level = 'creative' order by rank limit 5;
```

## After applying

Run the n8n daily-snapshot workflows (see `../n8n/RUNBOOK.md`) once to populate
`*_daily` for yesterday. History (up to 60 days) then accumulates one day at a
time, unless you also run the optional one-off backfill in the runbook.
