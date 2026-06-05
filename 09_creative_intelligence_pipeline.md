# Creative Intelligence Pipeline — Persona-Driven Crawler

**Project Owner:** Carl Patrick Sajol  
**Status:** 🔨 Phase 1-1 (Organic Signal) fully built and functional. Phase 1-2 (Competitor Signal) built and added. Phase 2 (Creative Brief Generation) architected.  
**Started:** May 2026  
**Last Active:** May 2026

---

## What This Is

A fully automated creative intelligence pipeline that starts from a persona selection in Notion, scrapes organic TikTok and Instagram content + competitor ads, passes everything through Claude AI for pattern analysis, and outputs structured signal data and creative briefs to Notion databases.

**The core insight (from Teddy and Khie's Slack thread):** The key missing capability isn't ad saving (Foreplay does that) — it's **pattern recognition and clustering**. What hooks work for which persona, ranked by engagement metrics. This pipeline is the answer to that gap.

---

## Architecture — Full Pipeline

```
Notion Persona Library
(Creative team sets Crawl Status = "Ready to Crawl")
       ↓
N8N Notion Trigger fires
       ↓
Set Crawl Status = "Crawling" (prevent re-trigger)
       ↓
[Claude Keyword Generator — generates persona-specific search terms]
       ↓
PHASE 1-1: ORGANIC SIGNAL          PHASE 1-2: COMPETITOR SIGNAL
      ↓                                         ↓
Apify TikTok Scraper               Apify Meta Ad Library Scraper
Apify Instagram Scraper            Apify TikTok Creative Center Scraper
      ↓                                         ↓
Wait → Poll → Fetch Results        Wait → Poll → Fetch Results
      ↓                                         ↓
Normalize & Merge                  Filter 30+ day longevity ads
      ↓                                         ↓
Top 40 posts by engagement ratio   Normalize (type: "competitor")
       ↓                                        ↓
Claude Sonnet 4.6 via OpenRouter   Claude Sonnet 4.6 via OpenRouter
(organic pattern analysis)         (competitor pattern analysis)
       ↓                                        ↓
Parse JSON Response                Parse JSON Response
       ↓                                        ↓
Write to Signal Library (Notion)   Write to Signal Library (Notion)
       ↓
Set Crawl Status = "Done"

PHASE 2: CREATIVE BRIEF GENERATION
       ↓ (triggered separately)
Read Signal Library for persona
Read own Meta performance data (Meta Marketing API)
       ↓
Claude Sonnet 4.6 synthesis
       ↓
Write Creative Brief to Brief Library (Notion)
```

---

## Three Notion Databases

### 1. Persona Library (`Bumpy Persona Card Library v.2`)
**Trigger database.** Properties include:
- Persona Name (title)
- Persona Lore (rich_text) — background context for Claude
- Crawl Status (select: Ready to Crawl / Crawling / Done)
- Winning Patterns (relation to Signal Library)

### 2. Signal Library
**Pattern storage.** One page per identified pattern. Properties include:
- Pattern Name (title)
- Persona (relation to Persona Library)
- Signal Type (select: organic / competitor)
- Hook Pattern (rich_text)
- Confidence Score (number)
- Evidence Posts (url or rich_text)
- Top Hooks (rich_text — array of hooks with `why_it_works`)
- Awareness Level (select: problem-aware / solution-aware)
- Content Gaps (rich_text)

### 3. Brief Library
**Creative briefs.** Properties include:
- Brief Name (title)
- Persona (relation)
- Status (select)
- Generated Brief (rich_text — full Claude output)
- Top Performers linked (relation to Meta data)
- Created At (date)

---

## Apify Stack

**All scraping runs through Apify** — the original plan (Meta Ad Library API + Foreplay Spyder + TikTok Research API) was dropped entirely:

| Actor | Use |
|---|---|
| `clockworks/tiktok-scraper` | Organic TikTok content |
| `apify/instagram-scraper` | Organic Instagram content |
| `apify/facebook-ads-scraper` (or `s-r/meta-ads-library`) | Meta competitor ads |
| `parseforge/tiktok-creative-center-top-ads-scraper` (or `beyondops/tiktok-ad-library-scraper`) | TikTok competitor ads |

**Why Apify over official APIs:**
- Meta Ad Library API only covers political ads in EU — doesn't return commercial ads
- Foreplay Spyder adds cost + dependency for something Apify handles natively
- TikTok Research API requires approval and is too restrictive

---

## Phase 1-1: Organic Signal (FULLY BUILT ✅)

### Workflow Details (9 nodes in N8N)

**Node 1 — Notion Trigger:** Fires on page update in Persona Library when `Crawl Status = Ready to Crawl`

**Node 2 — Set Status to Crawling:** Immediately flips `Crawl Status → Crawling` to prevent re-trigger

**Node 3 — Claude Keyword Generator (Function Node):** Maps persona name + lore to platform-specific search terms:
```javascript
const keywordMap = {
  "Passport Bro": {
    tiktok: ["passport bro", "dating outside america", "dating abroad", "foreign women dating"],
    instagram: ["passportbro", "datingabroad", "foreignwomen"],
    competitors: { meta_keywords: [...], tiktok_keywords: [...] }
  },
  "Passport Girl (Relocate)": { ... }
}
```
New personas use Claude to generate keywords dynamically from `Persona Lore` — no manual mapping needed.

**Node 4a — Apify TikTok Scraper (HTTP Request):**
- `POST https://api.apify.com/v2/acts/clockworks~tiktok-scraper/runs?token=YOUR_TOKEN`
- `resultsPerPage: 30`, `maxResults: 150`, `sortBy: views`

**Node 4b — Apify Instagram Scraper (HTTP Request, parallel):**
- `POST https://api.apify.com/v2/acts/apify~instagram-scraper/runs?token=YOUR_TOKEN`
- `resultsLimit: 100`, uses `directUrls` format for hashtag search

**Node 5 — Wait + Poll (both runs):** Polls every 30 seconds until `SUCCEEDED`. Uses `defaultDatasetId` from each run's response (`$json.data.defaultDatasetId`) to fetch results.

**Node 6 — Normalize & Merge:** Normalizes both datasets into consistent schema. Extracts hook text, views, likes, comments, follower count, calculates `views-to-follower engagement ratio`. Takes **top 40 posts by ratio**.

**Node 7 — Claude Analysis (OpenRouter):** Uses `anthropic/claude-sonnet-4-6` model. Returns structured JSON:
- `hook_patterns` (array of 5 patterns)
- Each pattern: `pattern_name`, `confidence_score`, `persona_fit`, `awareness_level`, `evidence_post_urls`, `top_hooks` (with `why_it_works`), `content_gaps`

**Node 8 — Parse Response:** Extracts from `choices[0].message.content`, strips markdown formatting, parses JSON. Outputs one item per pattern.

**Node 9 — Write to Signal Library (Notion):** Creates one page per pattern.

**Node 10 — Reset Status:** Sets `Crawl Status → Done`.

---

## Phase 1-2: Competitor Signal (BUILT, branching off same trigger ✅)

Branches off the same Extract Persona Keywords node — no separate trigger needed.

Two parallel branches:

**Branch A — Meta Ad Library:**
- Apify `s-r/meta-ads-library` (or `apify/facebook-ads-scraper`)
- Searches by `competitors.meta_keywords`
- Filters for ads running 30+ days (longevity = proven performers)

**Branch B — TikTok Ad Library:**
- Apify `parseforge/tiktok-creative-center-top-ads-scraper`
- Searches by `competitors.tiktok_keywords`
- Returns CTR, video URLs, ad titles, industry, campaign objective

Both run parallel → Merge (Append mode) → Normalize → Claude competitor analysis prompt → Write to Signal Library (tagged `signal_type: competitor`).

---

## Phase 2: Creative Brief Generation (ARCHITECTED, partially built)

Triggered separately. Four paths:

| Path | Input | Output |
|---|---|---|
| Path 1 — Iteration | Top organic patterns + own Meta winners | New variations on what's working |
| Path 2 — Cross-Pollination | Organic signals from adjacent personas | Hooks borrowed across persona contexts |
| Path 3 — Gap Fill | Content gap analysis from Signal Library | New concepts targeting missed angles |
| Path 4a — New Concept Synthesis | All 3 signals merged | Entirely new concept (v1.5 feature) |

**Meta Marketing API v19.0** used to pull own ad performance data — filtered by persona name prefix in ad names. Important: any new persona added to Notion must have ads named with the same persona name prefix.

---

## Bugs Encountered & Fixes

### Bug 1 — Instagram Search Format
Direct hashtag search doesn't work with plain strings — must use `directUrls` format with hashtag URL:
```json
"directUrls": ["https://www.instagram.com/explore/tags/passportbro/"]
```

### Bug 2 — Apify `defaultDatasetId` Path
Run response nests the dataset ID at `$json.data.defaultDatasetId` — not `$json.defaultDatasetId`. Accessing the wrong path returns `undefined`.

### Bug 3 — Claude JSON Parse Error
Claude sometimes wraps JSON in markdown code fences. Parse Response node must strip them first:
```javascript
const raw = content.replace(/```json|```/g, '').trim();
const parsed = JSON.parse(raw);
```

### Bug 4 — Meta Ad Library Returns ABORTED
Apify resource limits can cause the run to return `ABORTED` status instead of `SUCCEEDED`. The IF node must accept BOTH statuses as "success" — `ABORTED` still returns partial data.

### Bug 5 — New Persona With No Keywords in Map
If a persona isn't in the `keywordMap`, Claude generates keywords dynamically from `Persona Lore`. No manual update needed for new personas.

---

## Tech Stack Summary

| Component | Tool |
|---|---|
| Automation | N8N (self-hosted) |
| TikTok organic | Apify `clockworks/tiktok-scraper` |
| Instagram organic | Apify `apify/instagram-scraper` |
| Meta competitor ads | Apify `s-r/meta-ads-library` |
| TikTok competitor ads | Apify `parseforge/tiktok-creative-center-top-ads-scraper` |
| AI analysis | Claude Sonnet 4.6 via OpenRouter (`anthropic/claude-sonnet-4-6`) |
| Own performance data | Meta Marketing API v19.0 |
| Storage | Notion (3 databases) |

---

## V1.5 Roadmap (Not Yet Built)

| Feature | What It Does | When |
|---|---|---|
| Path 4a — New Concept Synthesis | Generate entirely new concepts from all 3 signals merged | After 2–3 weeks of signal accumulation |
| Experiment Loop | Feed tested creative results back into Persona Library's Winning Patterns automatically | After first brief batch goes to production |
| Scheduled Crawls | Auto-trigger weekly crawls per persona without manual trigger | v1.5 |
| Singular API Integration | Pull MMP data for true subscription ROAS instead of Meta pixel proxy | v1.5 |
| YouTube Signal | Add YouTube Data API v3 to organic signal stack | v1.5 |

---

## Team Workflow (How to Operate)

1. Creative team opens Notion Persona Library
2. Select a persona to refresh (e.g., "Latina Lover")
3. Set `Crawl Status` → `Ready to Crawl`
4. N8N fires automatically — runs organic + competitor scraping + Claude analysis
5. Signal Library populates with new patterns in ~5–10 minutes
6. Creative team triggers brief generation for that persona
7. Brief Library receives a full creative brief
8. Creative team uses brief as starting point for next batch

---

## Ad Naming Convention (Required for Phase 2)

Format: `{Persona}-{GEO}-{CreativeCode}-{ConceptName}-{VID/IMG}-{BatchLabel}`

Examples:
- `PassportBro-US-L2vM8Q-ManyHugs2-NewYearSilly-VID-Batch2025Week50`
- `GringoLover-ES-v8Gn7M-Pulseblack-Car-VID-Batch2026Week05`
- `General-BR-L2vM8Q-ManyHugs2-Abroad-VID-Batch2025Week50`

**Important:** Persona prefix in the ad name must exactly match the persona name in Notion for Phase 2 performance filtering to work.

---

## Chat Logs

### Chat: Build plan for HTML data with Foreplay integration (May 2026)

**H:** I need you to check this HTML data... I want you to write a v1 build plan for phase 1-1 and 2. I'm thinking of using Foreplay here but Teddy mentioned: "for foreplay — I used their old version before but didn't stay long because at that time it just felt like a fancy ad library that can save ads, where what I need to aim is pattern recognition of why several ads work for several personas by using impression data × ads analysis. There's an app called Cila — I believe if we can have something like this but combine insights not per account basis it will be cool."

**A:** Researched Cila and Foreplay.

**Teddy is right on Foreplay.** It's a storage tool, not an analysis engine. The pattern recognition gap is real.

**Cila is interesting but limited.** Cila analyzes public performance signals to give viral scores and tracks multiple accounts over time. The limitation: still per-account tracking. You see what outperforms within a creator's own baseline, not what patterns emerge across multiple unrelated accounts. That's the gap identified.

**Pipeline direction is correct.** Three-signal merge → Claude synthesis model is the right architecture.

**v1 decision on tools:**
- Foreplay Spyder: dropped (cost + dependency for something Apify handles natively)
- TikTok Research API: dropped (requires approval, too restrictive)
- Meta Ad Library API: dropped (only covers political ads in EU)
- Full Apify stack instead

Delivered v1 build plan PDF. Key line: "No tool out there is going to close the pattern recognition gap for us. The cross-signal synthesis layer we're building on top of Claude is the thing that makes this pipeline ours. Everything we buy just feeds it."

---

### Chat: Persona-driven crawler pipeline for creative pattern analysis (May 2026)

**H:** [Shared Teddy and Khie's Slack thread] I have a new project here. Teddy says: "feels like we're now aligned on the architecture: Apify IG and TikTok scrapers + Meta Ads Library API + Meta Marketing API → Claude for pattern clustering and analysis → Notion." Carl says: "I think step 2 and step 1 should be switched — so persona/campaign as the starting point. The creative team decides what persona first, then the crawler finds the relevant organic and also ads."

**A:** Built Phase 1-1 (Organic Signal) fully in N8N — 9 nodes. Notion trigger (Crawl Status = Ready to Crawl) → set Crawling → keyword generator → parallel Apify TikTok + Instagram scrapes → Wait/Poll loops → Normalize & Merge (top 40 by engagement ratio) → Claude Sonnet 4.6 via OpenRouter → parse response → write Signal Library → reset status.

**Bug — Instagram search format:**

Instagram scraper requires `directUrls` format (hashtag URL), not plain hashtag strings:
```json
"directUrls": ["https://www.instagram.com/explore/tags/passportbro/"]
```

**Bug — Apify dataset ID path:**

Run response nests the dataset ID at `$json.data.defaultDatasetId` — NOT `$json.defaultDatasetId`.

**Bug — Claude JSON parse error:**

Claude sometimes wraps JSON in markdown code fences. Strip before parsing:
```javascript
const raw = content.replace(/```json|```/g, '').trim();
const parsed = JSON.parse(raw);
```

**H:** [Asked about which competitor sources to scrape — Both Meta Ad Library + TikTok Ad Library. Same Notion trigger.]

**A:** Built Phase 1-2 (Competitor Signal) — branches off same Extract Persona Keywords node, no separate trigger. Parallel Meta Ad Library (Apify `s-r/meta-ads-library`) + TikTok Ad Library (Apify `parseforge/tiktok-creative-center-top-ads-scraper`) → Merge → Normalize → Claude competitor analysis → write Signal Library (tagged competitor).

**Bug — Meta Ad Library returns ABORTED:**

Normal — Apify resource limits can cause `ABORTED` instead of `SUCCEEDED`. `ABORTED` still returns partial data. IF node must accept both `SUCCEEDED` and `ABORTED` as success.

**H:** Wait, sorry. Why n8n trigger again?

**A:** You're right, my bad. No new trigger needed. The competitor signal nodes branch off the same Extract Persona Keywords node in the existing workflow. All runs from the same Notion trigger.

Phase 2 (Brief Generation) architected: 4 paths (Iteration, Cross-Pollination, Gap Fill, New Concept Synthesis). Meta Marketing API v19.0 for own performance data, filtered by persona name prefix in ad names. Full documentation PDF generated covering all schemas, node details, troubleshooting, and v1.5 roadmap.
