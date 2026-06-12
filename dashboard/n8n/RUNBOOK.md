# n8n — Daily snapshot pipeline (runbook)

This replaces the old pipeline that fetched four rolling presets (7/14/28/30d),
**overwrote** them onto one row per entity, and **wiped every table every 12h**.
The new model writes **one row per entity per day** into `creative_daily`,
`adset_daily`, `campaign_daily`; the dashboard's SQL views derive every window
from that history. Apply `../db/*.sql` first.

## What changed / what was fixed

- **Yesterday is the unit.** Each workflow pulls Meta insights with
  `date_preset=yesterday` and upserts a dated row. History accumulates daily.
- **No more wipes.** Retention = `prune_daily_history(65)` (see `db/04_retention.sql`),
  called at the end of the daily run or via pg_cron.
- **Bug fixes carried in the Code nodes:**
  - ROAS read from Meta's `purchase_roas` (fallback `revenue/spend`) — consistently.
  - CPC/CTR/CPM/CPP/CVR are **no longer written** by n8n at all — the views compute
    them from raw counters, so the old `cpc_7d = ctr_7d` mistake cannot recur.
  - The misspelled `impresssions_28d` column is dropped (see `db/02`).
- **Secrets out of the workflow.** The Meta token and Supabase keys are read from
  n8n **environment variables**, not hardcoded in node URLs.

## One-time setup

1. Apply `db/01`–`db/04` in the Supabase SQL editor.
2. In n8n, set these environment variables (Settings → Variables, or host env):
   - `META_ACCESS_TOKEN` — your Meta Graph API token (rotate the old leaked one).
   - `META_AD_ACCOUNT` — `act_590108853233793`.
   - `SUPABASE_URL` — `https://<project>.supabase.co`.
   - `SUPABASE_SERVICE_KEY` — the **service_role** key (server-side only; never ship to the dashboard).
3. Import the three workflows from this folder and **Activate** them:
   - `campaign_daily_snapshot.json`
   - `adset_daily_snapshot.json`
   - `creative_daily_snapshot.json`
4. Leave the schedule staggered (campaigns 05:00, adsets 05:10, creatives 05:20 UTC)
   so Meta rate limits are comfortable.

## How each workflow works

`Schedule (daily) → HTTP GET Meta insights (date_preset=yesterday, paginated)
 → Split Out "data" → Code (parse → daily row) → HTTP POST Supabase upsert`

### The upsert (HTTP Request node)

- **Method:** POST
- **URL:** `={{ $env.SUPABASE_URL }}/rest/v1/<table>?on_conflict=<pk cols>`
  - campaign_daily → `?on_conflict=campaign_id,date`
  - adset_daily → `?on_conflict=adset_id,date`
  - creative_daily → `?on_conflict=ad_id,date`
- **Headers:**
  - `apikey: {{ $env.SUPABASE_SERVICE_KEY }}`
  - `Authorization: Bearer {{ $env.SUPABASE_SERVICE_KEY }}`
  - `Content-Type: application/json`
  - `Prefer: resolution=merge-duplicates,return=minimal`
- **Body (JSON):** the parsed row as an array — re-running the day overwrites, never duplicates.

### Meta field → column mapping (per day)

| column               | Meta source                                              |
|----------------------|----------------------------------------------------------|
| spend                | `spend`                                                  |
| revenue              | `action_values[omni_purchase/purchase/…]`                |
| purchase_roas        | `purchase_roas[0].value` (fallback revenue/spend)        |
| impressions / reach  | `impressions` / `reach`                                  |
| clicks               | `clicks`                                                 |
| link_clicks          | `inline_link_clicks`                                     |
| unique_link_clicks   | `unique_inline_link_clicks`                              |
| conversions          | `actions[omni_purchase/purchase/…]`                      |
| app_installs (campaign) | `actions[mobile_app_install/omni_app_install/…]`      |
| video_plays (creative)  | `video_play_actions[video_view]`                      |
| thruplays (creative)    | `video_thruplay_watched_actions[video_view]`          |
| frequency            | `frequency`                                              |
| date                 | yesterday (`YYYY-MM-DD`, computed in the Code node)      |

## Dimension refresh (attributes — optional add-on, recommended)

The metric views also read attribute columns from the dimension tables
(`campaigns`/`adsets`/`creative_performance`): `status`, `primary_country`,
`primary_device`, `budget`, `created_at`, and the breakdown JSON. Keep these fresh
with a small daily upsert (REST, `on_conflict=<id>`), using:
- entity metadata call (`/<account>/campaigns` or `/adsets` or `/ads`) for
  `name`, `effective_status`, `daily_budget`/`lifetime_budget`, `created_time`;
- a `breakdowns=country` and a `breakdowns=impression_device` insights call to set
  `primary_country` / `primary_device` (highest-spend bucket) and the breakdown JSON.

**Important:** set `primary_country` from the real **country breakdown**, NOT from
the ad name's language code (that was the old "everything shows Unknown" bug).

## One-off backfill — get ~60 days immediately (`backfill_60d.json`)

History otherwise fills in one day at a time. To seed the past 60 days at once,
import **`backfill_60d.json`** and click **Execute workflow** once:

- It calls Meta with `time_range={since:-60d, until:yesterday}&time_increment=1`,
  which returns **one row per entity per day** in a single (paginated) call per
  level — so each daily row's `date` comes from Meta's `date_start`.
- It upserts into `campaign_daily` / `adset_daily` / `creative_daily`
  (`on_conflict=<id>,date`), so re-running is safe and never duplicates.
- It only needs the same env vars as the daily workflows. **Delete or deactivate
  it after one successful run** (the daily snapshots take over from there).

Note: it filters to currently-active entities (matching the daily workflows). Meta
retains ad-level data well beyond 60 days, so the window is not a limitation.
