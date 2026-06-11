-- ============================================================================
-- Bumpy Analytics — Daily snapshot history tables
-- ----------------------------------------------------------------------------
-- One row per entity per day. This is the single source of truth for metrics.
-- Every time window (yesterday / 7d / 14d / 28d / 30d / 60d) is derived from
-- these tables by the views in 03_views.sql — no more cross-wired preset columns.
--
-- The n8n "daily snapshot" workflows UPSERT yesterday's row here once per day
-- (conflict target = the primary key). 04_retention.sql prunes rows > 65 days.
--
-- Only RAW, additive counters are stored (spend, revenue, impressions, clicks,
-- link_clicks, conversions). reach/frequency/purchase_roas are that day's value
-- (not additive) and are treated approximately across multi-day windows.
-- Apply order: run this file FIRST. Safe to re-run (IF NOT EXISTS).
-- ============================================================================

-- ---------- Creative (ad) level -------------------------------------------------
create table if not exists creative_daily (
  ad_id              text        not null,
  date               date        not null,
  adset_id           text,
  campaign_id        text,
  spend              numeric      default 0,
  revenue            numeric      default 0,   -- purchase_conversion_value
  impressions        bigint       default 0,
  reach              bigint       default 0,
  clicks             bigint       default 0,
  link_clicks        bigint       default 0,
  unique_link_clicks bigint       default 0,
  conversions        numeric      default 0,   -- purchases
  frequency          numeric      default 0,
  purchase_roas      numeric      default 0,   -- Meta-reported ROAS for the day
  video_plays        bigint       default 0,   -- for hook rate
  thruplays          bigint       default 0,   -- for hold rate
  synced_at          timestamptz  default now(),
  primary key (ad_id, date)
);

create index if not exists creative_daily_date_idx        on creative_daily (date);
create index if not exists creative_daily_campaign_idx    on creative_daily (campaign_id);
create index if not exists creative_daily_adset_idx       on creative_daily (adset_id);

-- ---------- Ad set level --------------------------------------------------------
create table if not exists adset_daily (
  adset_id           text        not null,
  date               date        not null,
  campaign_id        text,
  spend              numeric      default 0,
  revenue            numeric      default 0,
  impressions        bigint       default 0,
  reach              bigint       default 0,
  clicks             bigint       default 0,
  link_clicks        bigint       default 0,
  unique_link_clicks bigint       default 0,
  conversions        numeric      default 0,
  frequency          numeric      default 0,
  purchase_roas      numeric      default 0,
  synced_at          timestamptz  default now(),
  primary key (adset_id, date)
);

create index if not exists adset_daily_date_idx     on adset_daily (date);
create index if not exists adset_daily_campaign_idx on adset_daily (campaign_id);

-- ---------- Campaign level ------------------------------------------------------
create table if not exists campaign_daily (
  campaign_id        text        not null,
  date               date        not null,
  spend              numeric      default 0,
  revenue            numeric      default 0,
  impressions        bigint       default 0,
  reach              bigint       default 0,
  clicks             bigint       default 0,
  link_clicks        bigint       default 0,
  unique_link_clicks bigint       default 0,
  conversions        numeric      default 0,
  app_installs       bigint       default 0,
  frequency          numeric      default 0,
  purchase_roas      numeric      default 0,
  synced_at          timestamptz  default now(),
  primary key (campaign_id, date)
);

create index if not exists campaign_daily_date_idx on campaign_daily (date);
