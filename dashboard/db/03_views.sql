-- ============================================================================
-- Bumpy Analytics — Windowed metric views
-- ----------------------------------------------------------------------------
-- One row per entity PER WINDOW (long format). The dashboard reads e.g.
--   select * from v_campaign_metrics where window_days = 7;
-- Windows: 1 (yesterday) / 7 / 14 / 28 / 30 / 60 days, each ENDING yesterday
-- (the last complete day). prev_* columns are the immediately preceding window
-- of equal length, used for change% and fatigue detection.
--
-- All derived ratios (roas, cpm, ctr, cpc, cpp, cvr, ipm, pp10k, avg_purchase)
-- are computed here ONCE, server-side, from the daily sums — always consistent.
--
-- frequency is the AVERAGE of the daily frequency values over the window. (You
-- cannot sum daily reach to get a multi-day unique reach, so impressions/reach
-- across many days is meaningless — that produced absurd values like 22x.)
--
-- Schema notes (from the live DB):
--   • adsets has no `persona` column            → not selected here
--   • creative_performance has no adset_id /     → adset_id & campaign_id are
--     campaign_id (only adset_name)                derived from creative_daily
-- Apply order: run AFTER 01 and 02. Safe to re-run (CREATE OR REPLACE).
-- ============================================================================

-- CREATE OR REPLACE cannot reorder/rename a view's existing columns, and this
-- revision moves `frequency` into the aggregate (changing column order). So drop
-- the views first, then recreate. (Nothing else in the DB depends on them.)
drop view if exists v_creative_metrics;
drop view if exists v_adset_metrics;
drop view if exists v_campaign_metrics;
drop view if exists v_yesterday_winners;

-- ---------------------------------------------------------------------------
-- CREATIVE
-- ---------------------------------------------------------------------------
create or replace view v_creative_metrics as
with windows(window_days) as (values (1),(7),(14),(28),(30),(60)),
parent as (
  select distinct on (ad_id) ad_id, adset_id, campaign_id
  from creative_daily
  order by ad_id, date desc
),
agg as (
  select
    cp.ad_id, cp.ad_name, p.adset_id, cp.adset_name, p.campaign_id,
    cp.persona, cp.concept_code, cp.media_type, cp.batch, cp.language,
    cp.status, cp.primary_country, cp.primary_device, cp.budget, cp.created_at,
    cp.country_breakdown, cp.device_breakdown, cp.thumbnail_url, cp.permalink, cp.video_id,
    w.window_days,
    coalesce(sum(d.spend)       filter (where d.date >  current_date - 1 - w.window_days),0) as spend,
    coalesce(sum(d.revenue)     filter (where d.date >  current_date - 1 - w.window_days),0) as revenue,
    coalesce(sum(d.impressions) filter (where d.date >  current_date - 1 - w.window_days),0) as impressions,
    coalesce(max(d.reach)       filter (where d.date >  current_date - 1 - w.window_days),0) as reach,
    coalesce(sum(d.clicks)      filter (where d.date >  current_date - 1 - w.window_days),0) as clicks,
    coalesce(sum(d.link_clicks) filter (where d.date >  current_date - 1 - w.window_days),0) as link_clicks,
    coalesce(sum(d.conversions) filter (where d.date >  current_date - 1 - w.window_days),0) as conversions,
    coalesce(sum(d.video_plays) filter (where d.date >  current_date - 1 - w.window_days),0) as video_plays,
    coalesce(sum(d.thruplays)   filter (where d.date >  current_date - 1 - w.window_days),0) as thruplays,
    coalesce(round(avg(d.frequency) filter (where d.date > current_date - 1 - w.window_days), 2),0) as frequency,
    coalesce(sum(d.spend)       filter (where d.date <= current_date - 1 - w.window_days),0) as prev_spend,
    coalesce(sum(d.revenue)     filter (where d.date <= current_date - 1 - w.window_days),0) as prev_revenue,
    coalesce(sum(d.conversions) filter (where d.date <= current_date - 1 - w.window_days),0) as prev_conversions
  from creative_performance cp
  left join parent p on p.ad_id = cp.ad_id
  cross join windows w
  left join creative_daily d
    on  d.ad_id = cp.ad_id
    and d.date <= current_date - 1
    and d.date >  current_date - 1 - (2 * w.window_days)
  group by cp.ad_id, cp.ad_name, p.adset_id, cp.adset_name, p.campaign_id,
           cp.persona, cp.concept_code, cp.media_type, cp.batch, cp.language,
           cp.status, cp.primary_country, cp.primary_device, cp.budget, cp.created_at,
           cp.country_breakdown, cp.device_breakdown, cp.thumbnail_url, cp.permalink, cp.video_id,
           w.window_days
)
select
  agg.*,
  round((revenue / nullif(spend,0))::numeric, 4)                       as roas,
  round(((spend / nullif(impressions,0)) * 1000)::numeric, 2)          as cpm,
  round((clicks::numeric / nullif(impressions,0)), 6)                  as ctr,
  round((spend / nullif(clicks,0))::numeric, 2)                        as cpc,
  round((spend / nullif(conversions,0))::numeric, 2)                   as cpp,
  round((conversions / nullif(clicks,0))::numeric, 6)                  as cvr,
  round((impressions::numeric / 1000), 2)                              as ipm,
  round(((conversions / nullif(impressions,0)) * 10000)::numeric, 2)   as pp10k,
  round((revenue / nullif(conversions,0))::numeric, 2)                 as avg_purchase,
  round((video_plays::numeric / nullif(impressions,0)), 4)             as hook_rate,
  round((thruplays::numeric  / nullif(video_plays,0)), 4)              as hold_rate,
  round((prev_revenue / nullif(prev_spend,0))::numeric, 4)             as prev_roas,
  case when prev_spend > 0
       then round((((spend - prev_spend) / prev_spend) * 100)::numeric, 1) end as spend_change_pct,
  case when prev_conversions > 0
       then round((((conversions - prev_conversions) / prev_conversions) * 100)::numeric, 1) end as conversions_change_pct,
  case when prev_spend > 0 and prev_revenue > 0
       then round(((( (revenue/nullif(spend,0)) - (prev_revenue/nullif(prev_spend,0)) )
                     / nullif((prev_revenue/nullif(prev_spend,0)),0)) * 100)::numeric, 1) end as roas_change_pct
from agg;

-- ---------------------------------------------------------------------------
-- AD SET  (adsets dimension has campaign_id; no persona column)
-- ---------------------------------------------------------------------------
create or replace view v_adset_metrics as
with windows(window_days) as (values (1),(7),(14),(28),(30),(60)),
agg as (
  select
    a.adset_id, a.adset_name, a.campaign_id,
    a.status, a.primary_country, a.primary_device, a.budget, a.created_at,
    a.country_breakdown, a.device_breakdown,
    w.window_days,
    coalesce(sum(d.spend)       filter (where d.date >  current_date - 1 - w.window_days),0) as spend,
    coalesce(sum(d.revenue)     filter (where d.date >  current_date - 1 - w.window_days),0) as revenue,
    coalesce(sum(d.impressions) filter (where d.date >  current_date - 1 - w.window_days),0) as impressions,
    coalesce(max(d.reach)       filter (where d.date >  current_date - 1 - w.window_days),0) as reach,
    coalesce(sum(d.clicks)      filter (where d.date >  current_date - 1 - w.window_days),0) as clicks,
    coalesce(sum(d.link_clicks) filter (where d.date >  current_date - 1 - w.window_days),0) as link_clicks,
    coalesce(sum(d.conversions) filter (where d.date >  current_date - 1 - w.window_days),0) as conversions,
    coalesce(round(avg(d.frequency) filter (where d.date > current_date - 1 - w.window_days), 2),0) as frequency,
    coalesce(sum(d.spend)       filter (where d.date <= current_date - 1 - w.window_days),0) as prev_spend,
    coalesce(sum(d.revenue)     filter (where d.date <= current_date - 1 - w.window_days),0) as prev_revenue,
    coalesce(sum(d.conversions) filter (where d.date <= current_date - 1 - w.window_days),0) as prev_conversions
  from adsets a
  cross join windows w
  left join adset_daily d
    on  d.adset_id = a.adset_id
    and d.date <= current_date - 1
    and d.date >  current_date - 1 - (2 * w.window_days)
  group by a.adset_id, a.adset_name, a.campaign_id,
           a.status, a.primary_country, a.primary_device, a.budget, a.created_at,
           a.country_breakdown, a.device_breakdown, w.window_days
)
select
  agg.*,
  round((revenue / nullif(spend,0))::numeric, 4)                     as roas,
  round(((spend / nullif(impressions,0)) * 1000)::numeric, 2)        as cpm,
  round((clicks::numeric / nullif(impressions,0)), 6)                as ctr,
  round((spend / nullif(clicks,0))::numeric, 2)                      as cpc,
  round((spend / nullif(conversions,0))::numeric, 2)                 as cpp,
  round((conversions / nullif(clicks,0))::numeric, 6)                as cvr,
  round((impressions::numeric / 1000), 2)                            as ipm,
  round(((conversions / nullif(impressions,0)) * 10000)::numeric, 2) as pp10k,
  round((revenue / nullif(conversions,0))::numeric, 2)               as avg_purchase,
  round((prev_revenue / nullif(prev_spend,0))::numeric, 4)           as prev_roas,
  case when prev_spend > 0
       then round((((spend - prev_spend) / prev_spend) * 100)::numeric, 1) end as spend_change_pct,
  case when prev_conversions > 0
       then round((((conversions - prev_conversions) / prev_conversions) * 100)::numeric, 1) end as conversions_change_pct,
  case when prev_spend > 0 and prev_revenue > 0
       then round(((( (revenue/nullif(spend,0)) - (prev_revenue/nullif(prev_spend,0)) )
                     / nullif((prev_revenue/nullif(prev_spend,0)),0)) * 100)::numeric, 1) end as roas_change_pct
from agg;

-- ---------------------------------------------------------------------------
-- CAMPAIGN
-- ---------------------------------------------------------------------------
create or replace view v_campaign_metrics as
with windows(window_days) as (values (1),(7),(14),(28),(30),(60)),
agg as (
  select
    c.campaign_id, c.campaign_name,
    c.status, c.primary_country, c.primary_device, c.budget, c.created_at,
    c.country_breakdown, c.device_breakdown,
    w.window_days,
    coalesce(sum(d.spend)        filter (where d.date >  current_date - 1 - w.window_days),0) as spend,
    coalesce(sum(d.revenue)      filter (where d.date >  current_date - 1 - w.window_days),0) as revenue,
    coalesce(sum(d.impressions)  filter (where d.date >  current_date - 1 - w.window_days),0) as impressions,
    coalesce(max(d.reach)        filter (where d.date >  current_date - 1 - w.window_days),0) as reach,
    coalesce(sum(d.clicks)       filter (where d.date >  current_date - 1 - w.window_days),0) as clicks,
    coalesce(sum(d.link_clicks)  filter (where d.date >  current_date - 1 - w.window_days),0) as link_clicks,
    coalesce(sum(d.conversions)  filter (where d.date >  current_date - 1 - w.window_days),0) as conversions,
    coalesce(sum(d.app_installs) filter (where d.date >  current_date - 1 - w.window_days),0) as app_installs,
    coalesce(round(avg(d.frequency) filter (where d.date > current_date - 1 - w.window_days), 2),0) as frequency,
    coalesce(sum(d.spend)        filter (where d.date <= current_date - 1 - w.window_days),0) as prev_spend,
    coalesce(sum(d.revenue)      filter (where d.date <= current_date - 1 - w.window_days),0) as prev_revenue,
    coalesce(sum(d.conversions)  filter (where d.date <= current_date - 1 - w.window_days),0) as prev_conversions
  from campaigns c
  cross join windows w
  left join campaign_daily d
    on  d.campaign_id = c.campaign_id
    and d.date <= current_date - 1
    and d.date >  current_date - 1 - (2 * w.window_days)
  group by c.campaign_id, c.campaign_name,
           c.status, c.primary_country, c.primary_device, c.budget, c.created_at,
           c.country_breakdown, c.device_breakdown, w.window_days
)
select
  agg.*,
  round((revenue / nullif(spend,0))::numeric, 4)                     as roas,
  round(((spend / nullif(impressions,0)) * 1000)::numeric, 2)        as cpm,
  round((clicks::numeric / nullif(impressions,0)), 6)                as ctr,
  round((spend / nullif(clicks,0))::numeric, 2)                      as cpc,
  round((spend / nullif(conversions,0))::numeric, 2)                 as cpp,
  round((conversions / nullif(clicks,0))::numeric, 6)                as cvr,
  round((impressions::numeric / 1000), 2)                            as ipm,
  round(((conversions / nullif(impressions,0)) * 10000)::numeric, 2) as pp10k,
  round((revenue / nullif(conversions,0))::numeric, 2)               as avg_purchase,
  round((prev_revenue / nullif(prev_spend,0))::numeric, 4)           as prev_roas,
  case when prev_spend > 0
       then round((((spend - prev_spend) / prev_spend) * 100)::numeric, 1) end as spend_change_pct,
  case when prev_conversions > 0
       then round((((conversions - prev_conversions) / prev_conversions) * 100)::numeric, 1) end as conversions_change_pct,
  case when prev_spend > 0 and prev_revenue > 0
       then round(((( (revenue/nullif(spend,0)) - (prev_revenue/nullif(prev_spend,0)) )
                     / nullif((prev_revenue/nullif(prev_spend,0)),0)) * 100)::numeric, 1) end as roas_change_pct
from agg;

-- ---------------------------------------------------------------------------
-- YESTERDAY WINNERS  (top performers for the last complete day)
-- Ranked by ROAS among entities that spent at least the guard amount yesterday.
-- creative_performance has no campaign_id, so the creative parent_id comes from
-- creative_daily.
-- ---------------------------------------------------------------------------
create or replace view v_yesterday_winners as
with min_spend as (select 20::numeric as guard)
select * from (
  select 'campaign'::text as level, d.campaign_id as entity_id,
         c.campaign_name as name, c.campaign_id as parent_id,
         d.spend, d.revenue, d.conversions,
         round((d.revenue / nullif(d.spend,0))::numeric, 4) as roas,
         row_number() over (order by (d.revenue / nullif(d.spend,0)) desc nulls last) as rank
  from campaign_daily d
  join campaigns c on c.campaign_id = d.campaign_id
  cross join min_spend m
  where d.date = current_date - 1 and d.spend >= m.guard
  union all
  select 'adset', d.adset_id, a.adset_name, a.campaign_id,
         d.spend, d.revenue, d.conversions,
         round((d.revenue / nullif(d.spend,0))::numeric, 4),
         row_number() over (order by (d.revenue / nullif(d.spend,0)) desc nulls last)
  from adset_daily d
  join adsets a on a.adset_id = d.adset_id
  cross join min_spend m
  where d.date = current_date - 1 and d.spend >= m.guard
  union all
  select 'creative', d.ad_id, cp.ad_name, d.campaign_id,
         d.spend, d.revenue, d.conversions,
         round((d.revenue / nullif(d.spend,0))::numeric, 4),
         row_number() over (order by (d.revenue / nullif(d.spend,0)) desc nulls last)
  from creative_daily d
  join creative_performance cp on cp.ad_id = d.ad_id
  cross join min_spend m
  where d.date = current_date - 1 and d.spend >= m.guard
) ranked;

-- ---------------------------------------------------------------------------
-- GRANTS — expose to the Supabase anon (read-only) + authenticated roles
-- ---------------------------------------------------------------------------
grant select on creative_daily, adset_daily, campaign_daily to anon, authenticated;
grant select on v_creative_metrics, v_adset_metrics, v_campaign_metrics, v_yesterday_winners
  to anon, authenticated;
