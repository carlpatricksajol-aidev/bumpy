# Singular Performance Reporting → Slack — Full Project Documentation

**Project Owner:** Carl Patrick Sajol  
**Status:** 🔨 In Progress — Workflow built, several bugs encountered and fixed, advanced classification added  
**Started:** Early April 2026  
**Last Active:** April 2026

---

## What This Is

An n8n automation that pulls creative-level performance data from Singular, classifies creatives (Winner / Draining / Fatigued / Has Potential / Failed), and posts a rich Slack Block Kit report every Monday morning covering TikTok, Meta, and Google.

---

## Architecture

```
Monday 9AM Cron Trigger
       ↓
Calculate Last Week Date Range (Mon–Sun)
       ↓
Create Async Reports (3 platforms in parallel via Split)
   TikTok | Meta | Google
       ↓
Wait 15s → Check Status → IF not ready → loop back (up to 20 tries, ~7 min)
       ↓
Download Report JSON (returns 6 items — 3 platforms × 2 weeks)
       ↓
Rank Creatives (Code Node — classify by ad set)
       ↓
Aggregate
       ↓
Format Slack Block Message (Code Node)
       ↓
Post to Slack
```

**Singular API:** `/create_async_report` (async, not synchronous)  
**Slack format:** Block Kit — header + sections with metrics fields

---

## Singular API Configuration

### Platforms (correct source names — verified)

| Platform | Source Name |
|---|---|
| TikTok | `tiktok_ads` (NOT `tiktok_int` — that was wrong and caused `FAILED: invalid filter value`) |
| Meta | `facebook` |
| Google | `adwords` |

### Metrics Used

```
adn_cost, adn_impressions, adn_clicks, adn_installs
```

**NOT using `adn_revenue`** — revenue is cohort-based and comes back as separate fields.

### Cohort Data

Revenue lives in **Cohort Data** (not standard metrics). Parameters added to the Create Async Report node:

| Field | Value |
|---|---|
| `cohort_metrics` | `revenue,roi` |
| `cohort_periods` | `14d` |

Code node pulls revenue with fallback chain:

```javascript
const revenue = sum('revenue_14d') > 0 
  ? sum('revenue_14d') 
  : sum('revenue') > 0 
  ? sum('revenue') 
  : 0;
```

### Date Range

Two-week comparison (W1 = previous week, W2 = current week):
- `time_breakdown: all` (no breakdown — just totals for the date range)
- Dynamic date range calculated in Code node

**Bug hit:** Singular requires `time_breakdown` parameter or it returns `"An invalid time breakdown was given. (got: null)"`. Must be added as a query parameter with `Name: time_breakdown`, `Value: all`.

---

## Creative Classification Logic

Each creative is classified based on behavior across W1 and W2:

| Status | Criteria |
|---|---|
| **Winner** | Spend ≥ ad set average AND ROAS ≥ 0.60 |
| **Draining** | Spend ≥ ad set average AND ROAS < 0.60 |
| **Fatigued** | Was significant in W1 (ROAS ≥ 0.60) + ROAS↓ + CTR↓ in W2 |
| **Has Potential** | Not spending, but CTR > 1.5% AND CVR > 0.15 |
| **Failed** | Not spending, no standout metrics |
| **Neutral** | Everything else (filtered out of output) |

**Key decision:** Instead of "top 1 winner per ad set," classification uses **above-average spend within each ad set** as the threshold — so if 5 creatives all spend similarly, all 5 get classified. Matches how real creative testing works.

**Scoring formula (legacy, for reference):** CTR (40pts) + CPI efficiency (40pts) + Spend volume (20pts). Min $5 spend + 100 impressions to qualify.

---

## Bugs Encountered & Fixes

### Bug 1 — Wrong TikTok Source Name
`tiktok_int` returned `FAILED: An invalid filter value was given`. Corrected to `tiktok_ads`.

### Bug 2 — poll_count Not Incrementing
The `Store Status + Context` node was reading `poll_count` from `Store Report ID + Context` instead of from itself.  
**Fix:**
```javascript
// WRONG
$('Store Report ID + Context').item.json.poll_count ?? 0) + 1

// CORRECT
$('Store Status + Context').item.json.poll_count ?? 0) + 1
```

### Bug 3 — ROAS 0.00x for All Items
Revenue (`adn_revenue`) was empty because revenue lives in **Cohort Data**, not in the standard metrics response. Fixed by adding `cohort_metrics: revenue,roi` and `cohort_periods: 14d` to the report creation, then updating the aggregation function.

### Bug 4 — Only TikTok iOS Passing Through
Download Report JSON was returning 6 items but only 1 was making it past Rank Creatives (the node had an orange warning triangle — silent errors on other platforms).  
**Root cause:** The Rank Creatives code node was referencing wrong field names for non-TikTok platforms. Fixed by updating field references per platform.

### Bug 5 — Slack Block Message Not Rendering
The Post to Slack node had `Blocks` set to `{{ $json.slack_payload }}` but the code node was returning `blocks` (not `slack_payload`) at the top level.  
**Fix:** Blocks field → `{{ JSON.stringify($json.blocks) }}`, Notification Text → `={{ $json.text }}`.

**Also note:** The working bulk upload workflow wraps everything as `{"text": "...", "blocks": [...]}`. The Slack node needs the full JSON string, not just the blocks array alone.

---

## Slack Message Format

```
━━━━━━━━━━━━━━━━━━━━━
📊 Weekly Creative Report — 2026-03-09 → 2026-03-15
━━━━━━━━━━━━━━━━━━━━━

🎵 TikTok

🏆 Top Performing Creatives
🥇 [Creative Name]
   [Ad Set Name]
   Spend: $XXX | Impr.: XX,XXX
   Inst.: XX | CTR: X.XX%
   CPI: $X.XX | CVR: X.XX%
   IPM: X.XX | VCR: X.XX%

💀 Underperforming Creatives
...

[Meta section]
[Google section]
```

---

## OS Filtering

The workflow filters by `targetOS` — each run processes either iOS or Android separately. `os` field is included in each group output.

---

## Current Status

The core workflow is built and largely functional. Key fixes applied (source name, poll_count, cohort revenue, Slack payload format). The classification logic upgraded to above-average spend threshold.

**Known remaining issue to verify:**
- Confirm all 6 platform/week combinations pass cleanly through Rank Creatives
- Verify Slack blocks render correctly per the format above

---

## Chat Logs

### Chat: Singular performance reporting to Slack via n8n (April 2026)

**H:** I have a new project for Bumpy — pull creative-level performance from Singular, posts to Slack every Monday with winning and losing concepts across TikTok, Meta, and Google. Here's the Singular Reporting API docs: https://support.singular.net/hc/en-us/articles/360045245692

**A:** Built complete workflow JSON. Architecture: Monday 9AM cron → calculate last week date range → create async reports (3 platforms via Split) → poll loop (Wait 15s → check status, up to 20 tries ~7min) → download report JSON → rank creatives (code node) → aggregate → format Slack Block Message → post to Slack.

**Bug 1 — Wrong TikTok source name:** `tiktok_int` returned `FAILED: An invalid filter value was given`. Corrected to `tiktok_ads`.

**Bug 2 — `time_breakdown` missing:** Singular returned `"An invalid time breakdown was given. (got: null)"`. Fix: add query param `Name: time_breakdown`, `Value: all`.

**Bug 3 — poll_count not incrementing:** `Store Status + Context` node was reading `poll_count` from `Store Report ID + Context` instead of from itself.
```javascript
// WRONG
$('Store Report ID + Context').item.json.poll_count ?? 0) + 1
// CORRECT
$('Store Status + Context').item.json.poll_count ?? 0) + 1
```

**Bug 4 — ROAS 0.00x for all items:** `adn_revenue` was empty — revenue lives in Cohort Data, not standard metrics. Fix: add `cohort_metrics: revenue,roi` and `cohort_periods: 14d` to report creation. Revenue fallback in code:
```javascript
const revenue = sum('revenue_14d') > 0 ? sum('revenue_14d') : sum('revenue') > 0 ? sum('revenue') : 0;
```

**Bug 5 — Only TikTok iOS passing through:** 6 items returned but only 1 made it past Rank Creatives. Orange warning triangle = silent errors on other platforms. Root cause: Rank Creatives code node referencing wrong field names for non-TikTok platforms. Fixed by updating field references per platform.

**Bug 6 — Slack Block Message not rendering:** `Blocks` set to `{{ $json.slack_payload }}` but code node returned `blocks` (not `slack_payload`). Fix: Blocks field → `{{ JSON.stringify($json.blocks) }}`, Notification Text → `={{ $json.text }}`.

**Classification upgrade — above-average spend threshold:**

**H:** I think it doesn't mean 1 top winner per ad set... I do think that there are lots of creatives that have the same calculation around each ad set.

**A:** You're right. The fix is to use above-average spend within each ad set as the threshold instead of strict top 1:

```javascript
// Calculate average spend per ad set
const adsetSpends = {};
for (const c of creatives) {
  if (!adsetSpends[c.adset_id]) adsetSpends[c.adset_id] = [];
  adsetSpends[c.adset_id].push(c.w2.cost);
}
const adsetAvgSpend = {};
for (const [adsetId, spends] of Object.entries(adsetSpends)) {
  adsetAvgSpend[adsetId] = spends.reduce((a, b) => a + b, 0) / spends.length;
}

// Significant spender = at or above average spend in its ad set
const isSignificant = w2.cost >= adsetAvgSpend[c.adset_id] && w2.cost >= NOT_SPENDING_THRESHOLD;
```

Now if an ad set has 5 creatives all spending similarly, all 5 get classified. Matches how real creative testing works.
