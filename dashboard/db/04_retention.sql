-- ============================================================================
-- Bumpy Analytics — Retention
-- ----------------------------------------------------------------------------
-- Replaces the old "Meta Insights - Deletion" workflow that wiped & recreated
-- every table every 12h (which is why no history ever existed). Instead we keep
-- ~65 days of daily snapshots (a little over the 60-day requirement) and prune
-- older rows. Dimension tables (campaigns/adsets/creative_performance) are never
-- wiped — the daily snapshot workflow upserts/refreshes them.
--
-- Run the prune once a day. Two options:
--   A) call prune_daily_history() from the n8n daily workflow (recommended), or
--   B) schedule it with pg_cron (uncomment the bottom block if pg_cron is on).
-- Apply order: run AFTER 01–03. Safe to re-run.
-- ============================================================================

create or replace function prune_daily_history(keep_days int default 65)
returns void
language sql
as $$
  delete from creative_daily where date < current_date - keep_days;
  delete from adset_daily    where date < current_date - keep_days;
  delete from campaign_daily where date < current_date - keep_days;
$$;

-- Option B — uncomment if the pg_cron extension is enabled in this project:
-- select cron.schedule('prune-bumpy-daily', '30 5 * * *', $$select prune_daily_history(65)$$);
