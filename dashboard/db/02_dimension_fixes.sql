-- ============================================================================
-- Bumpy Analytics — Dimension table fixes
-- ----------------------------------------------------------------------------
-- campaigns / adsets / creative_performance are repurposed as DIMENSION +
-- latest-snapshot tables: they hold attributes (name, status, parent ids,
-- persona, concept, real country/device, budget, created_at). All METRICS now
-- come from the *_daily tables via the views.
--
-- This file only adds/normalizes the attribute columns the views need. It does
-- NOT touch the legacy _7d/_prev/_28d/_30d metric columns (leave them; the views
-- ignore them). Safe to re-run.
-- Apply order: run AFTER 01_history_tables.sql.
-- ============================================================================

-- ---------- campaigns -----------------------------------------------------------
alter table campaigns add column if not exists primary_country text;
alter table campaigns add column if not exists primary_device  text;
alter table campaigns add column if not exists budget          numeric;     -- daily budget (USD)
alter table campaigns add column if not exists created_at      timestamptz;
alter table campaigns add column if not exists country_breakdown jsonb;     -- {"US": spend, ...}
alter table campaigns add column if not exists device_breakdown  jsonb;

-- ---------- adsets --------------------------------------------------------------
alter table adsets add column if not exists primary_country text;
alter table adsets add column if not exists primary_device  text;
alter table adsets add column if not exists budget          numeric;        -- daily/lifetime budget (USD)
alter table adsets add column if not exists created_at      timestamptz;
alter table adsets add column if not exists country_breakdown jsonb;
alter table adsets add column if not exists device_breakdown  jsonb;

-- ---------- creative_performance ------------------------------------------------
alter table creative_performance add column if not exists primary_country text;
alter table creative_performance add column if not exists primary_device  text;
alter table creative_performance add column if not exists budget          numeric;
alter table creative_performance add column if not exists created_at      timestamptz;
alter table creative_performance add column if not exists country_breakdown jsonb;
alter table creative_performance add column if not exists device_breakdown  jsonb;

-- The legacy misspelled column never received data. Drop it if it exists so the
-- schema is clean (the new pipeline writes 28-day data via campaign_daily).
alter table campaigns drop column if exists impresssions_28d;
