# Creative Bulk Uploader v2 — Full Project Documentation

**Project Owner:** Carl Patrick Sajol  
**Status:** 🔨 In Progress — Core upload working, remaining workflows pending  
**Started:** April 2026  
**Last Active:** May 2026

---

## What This Is

An Airtable-based campaign management and bulk upload platform that replaces the old Google Sheets → n8n manual workflow. Inspired by adtable.ai — one single worksheet where the UA can build and launch Meta campaigns in one go. The vision is a "single source of truth" for creatives, campaigns, ad sets, copy, and upload status.

**The Problem It Solves:**  
Every bi-weekly creative batch required a UA specialist to manually: gather Drive folder links from Slack one by one, enter them into Google Sheets, select creatives, campaigns, and ad sets row by row, then trigger upload to Meta via n8n webhook. Ad copy also had to be bulk-edited separately in Meta Ads Manager after upload. Slow, error-prone, doesn't scale.

---

## Architecture

```
Slack (#marketing-creatives)
       ↓
n8n Slack Ingestion Workflow
       ↓
Airtable (5 tables — Source of Truth)
       ↓
n8n Orchestration Workflows
       ↓
Meta Marketing API
       ↓
Performance data loops back to Airtable
```

**Airtable Base ID:** `appysGPwUA1GDlxjS`  
**Meta Ad Account:** `act_590108853233793`

### Airtable Tables

| Table | ID | Purpose |
|---|---|---|
| Upload Queue | `tblpN7xa4Rbsg3bCX` | Staging area for creatives ready to upload |
| Campaigns DB | `tblgT7qF94H0ThJQh` | Synced campaigns from Meta |
| Ad Sets DB | `tblhMJbjr8YLnaxUI` | Synced ad sets from Meta |
| Creatives DB | (TBD) | Post-upload creative records with Meta IDs |
| Config Table | (Main config row) | Shared settings per upload batch |

---

## Phased Build Plan

### Phase 1 — Airtable Foundation ✅ DONE
- 5-table Airtable base set up
- Schema designed for Upload Queue, Campaigns DB, Ad Sets DB
- Lookup fields from Ad Sets DB to Upload Queue working (OS, App Store URL)

### Phase 2 — Automation Backend

#### Workflow 1 — Slack Ingestion ✅ DONE
Pulls Drive folder links from #marketing-creatives automatically and creates rows in Upload Queue.

#### Workflow 2 — Drive File Population ✅ DONE
Populates file metadata from Google Drive into Upload Queue rows.  
**Key fix that was applied:** `Creative File` field made a URL field holding `driveFileUrl` (separate from `File Name`). The bug was that `.first()` in the POST node always returned folder 1's data regardless of which folder was being processed — fixed by passing `originalFields` through the loop per item, not from `.first()`.

#### Workflow 3 — Campaigns & Ad Sets Sync ⏳ PARTIALLY BUILT
Daily cron to sync active campaigns and ad sets from Meta into Airtable (30 campaigns, 70+ ad sets). Chosen as automation rather than manual populate due to volume.  
Node flow: Manual Trigger → Fetch active campaigns from Meta → Split Out → Write to Campaigns DB → Fetch ad sets per campaign → Write to Ad Sets DB → Link back.

#### Workflow 4 — Meta Bulk Upload (Workflow 5) 🔨 CORE WORKING, FIXES APPLIED
**The most critical workflow.** Expands each config row into individual ad items per ad set, uploads to Meta.

**Current architecture of the upload flow:**
```
Airtable Trigger (Upload Queue status = UPLOADING)
       ↓
Get Full Record
       ↓
Fetch Sibling Files → Split Out
       ↓
[Expander Code Node]  ← cross-products files × ad sets × copy
       ↓
CHECK IF VIDEO (IF node)
       ↓ YES                           ↓ NO
Upload Video Creative to Meta1     Upload Creative to Meta1
       ↓                                    ↓
Get Thumbnails                      Upload Image Creative
       ↓
Upload Thumbnail to Meta1
       ↓
Create Ad Creative (Video)          Create Ad Creative (Image)
       ↓                                    ↓
CHECK IF ANDROID                    CHECK IF ANDROID
       ↓ iOS           ↓ Android           ↓
Create Ad (iOS)   Create Ad (Android)    ...same
```

**Page IDs in use:**
- iOS: `1019494927918378`
- Android: `111144870248270`

**App Store URLs:**
- iOS: `http://itunes.apple.com/app/id1455336523`
- Android: `https://play.google.com/store/apps/details?id=app.bumpy.android`

---

## Key Technical Details & Bugs Solved

### Expander Code Node — The Core Logic
The Expander sits after `Fetch Sibling Files → Split Out`. It cross-products each sibling file with shared config fields (Headline, Primary Text, CTA, Description, Campaign, Batch Label, Drive Folder URL) and each Ad Set ID. It outputs one item per file × ad set combination.

**Problem discovered:** `$json.fields.Headline` becomes `undefined` in the Create Ad Creative nodes because intermediate Meta API responses (Upload Video, Get Thumbnails, etc.) overwrite `$json` — they don't preserve the `fields` object.  
**Fix:** Reference as `$('Expander').item.json.fields.Headline` (explicit node reference). Also added stable `_expanderKey` (combo of Airtable record ID + ad set ID) to each output item for reliable downstream lookup.

**Platform field removed from Expander:** `Platform` is no longer propagated via `sharedCopy` — OS is derived per ad set via Airtable lookup field.

### Ad Creative JSON — Blank Title/Message Fix
Both video and image ad creative payloads updated with `?? ''` fallback for null/undefined Headline and Primary Text fields so the workflow doesn't break when copy is blank:

```json
"title": "{{ $('Expander').item.json.fields.Headline ?? '' }}",
"message": {{ JSON.stringify($('Expander').item.json.fields['Primary Text'] ?? '') }}
```

### OS Routing — Android vs iOS
`CHECK IF ANDROID` nodes route the ad to the correct page (1019... for iOS, 111144... for Android).

**Known limitation:** `fields['OS (from Ad Set)'][0]` reads the first linked ad set's OS — may not match the specific ad set being targeted when a batch has mixed OS ad sets. The current recommended workaround (Option A) is for UAs to use separate config rows per OS (one iOS batch, one Android batch).

**Option B (future):** Fetch each ad set's OS and App Store URL per item via API call in the Expander node.

### Duplicate Execution Bug — Fixed
**Root cause:** When Airtable sent 2 webhook pings for the same row, the workflow executed twice, creating duplicate ads.  
**Fix applied:** Added `N8N_CONCURRENCY_PRODUCTION_LIMIT=1` environment variable to Docker `/root/docker-compose.yml`.  
**Restart command used:** `docker compose down && docker compose up -d` (note: `docker-compose` v1 not installed, must use `docker compose` with space).

### Expander — Platform Field
`'Platform': config['Platform']` removed from `sharedCopy` in the Expander — Platform is no longer propagated because OS is now derived per ad set via the lookup field on Upload Queue.

---

## Current Status Per Workflow

| Workflow | Status | Notes |
|---|---|---|
| Slack Ingestion | ✅ Done | Working |
| Drive File Population | ✅ Done | `.first()` bug fixed |
| Campaigns/Ad Sets Sync | ⏳ Partially built | Node flow drafted |
| Meta Bulk Upload | 🔨 Working with fixes | Core pipeline working, duplicate fix applied |
| Log to Creatives DB | ⏳ Not built | After successful upload, write Meta Creative ID + asset data |
| Performance Sync | ⏳ Not started | Daily pull of Meta insights back into Airtable |

---

## Remaining Work

1. **Log to Creatives DB** — after a successful upload, write Meta Creative ID + asset data to Creatives DB
2. **Complete Workflow 4 (Campaigns/Ad Sets Sync)** — finish the daily cron
3. **Workflow 6 (Performance Sync)** — daily Meta insights into Performance DB
4. **Option B for OS routing** — per-item OS resolution via Expander API call (when mixed-OS batches become a hard requirement)
5. **Test end-to-end** with the concurrency fix in place

---

## Chat Logs

### Chat: Creative bulk uploader automation for Meta campaigns (Original kickoff — April 2026)

**H:** New project in Bumpy. A bulk uploader — duplicating meta but with automation. "our vision here is a single worksheet where the UA can build & launch campaigns in one go plus create customized views for different needs (whether it's creative or high-level analysis) adtable.ai is the closest reference to what we want to build toward."

**Problem:** Every bi-weekly creative batch requires the UA specialist to manually gather Drive folder links from Slack, enter them into Google Sheets, select creatives, campaigns, and ad sets row by row, then trigger upload to Meta via n8n webhook. Ad copy also has to be bulk-edited separately in Meta Ads Manager after upload.

**A:** Recommended Airtable-based architecture: Slack (#marketing-creatives) → n8n ingestion → Airtable (5 tables) → n8n orchestration → Meta Marketing API → performance loops back. Phased 4–5 week plan. Airtable chosen over custom build as the source of truth. Built Slack Ingestion and Drive File Population in this session.

**Bug found — `.first()` always returning folder 1 data:** The POST node body used `$('Code in JavaScript').first().json.originalFields['Batch Label']` — `.first()` always returns folder 1's data regardless of which folder is being processed. When processing folder 2's files, it was writing folder 1's Batch Label, Slack Message Link, etc.

**Fix:** Pass `originalFields` through the loop from the current item, not from `.first()`. Replace all `.first()` references in the POST body with `{{ $json.originalFields['Batch Label'] }}` etc.

**Confirmed working:** PATCH (update existing row) and POST (create new row) nodes both confirmed working once the `.first()` fix was applied.

---

### Chat: Creative bulk uploader automation — Expander fix, OS routing (May 2026)

**H:** [Continued from previous session — asked for Expander code node update]

**A:** Caught up on context. The Expander Code node sits after `Fetch Sibling Files → Split Out`, cross-producting each sibling file with shared config fields and each Ad Set ID. Problem: `$json.fields.Headline` becomes undefined in Create Ad Creative nodes because intermediate Meta API responses overwrite `$json`. Fix: reference as `$('Expander').item.json.fields.Headline`.

**Updated Expander code provided** — adds stable `_expanderKey` (Airtable record ID + ad set ID combo) to each output item. `Platform` removed from `sharedCopy` — OS is now derived per ad set via Airtable lookup field.

**OS routing discussion:**
- `fields['OS (from Ad Set)'][0]` reads the first linked ad set's OS — may mismatch when batch has mixed OS ad sets
- `Ad Set Single` field gets the per-item ad set ID for downstream nodes expecting a single ad set
- **Option A (recommended to ship faster):** UAs do separate config rows per OS — one iOS batch, one Android batch. `[0]` works fine if all ad sets in a config row share the same OS.
- **Option B (future):** Add step in Expander to fetch each ad set's OS from Ad Sets DB via API call before assigning. More accurate but requires another HTTP call.

---

### Chat: Meta campaigns bulk uploader expander code — Duplicate fix (May 2026)

**H:** Please read the latest chat I have in this "Creative bulk uploader automation for Meta campaigns" chat. Get the context. The last chat I have was asking for the expander's code node new code.

**A:** [Retrieved context] Duplicate execution bug found and fixed. When Airtable sent 2 webhook pings for the same row, the workflow executed twice creating duplicate ads.

**Fix:** Added `N8N_CONCURRENCY_PRODUCTION_LIMIT=1` environment variable to Docker.

**Steps taken:**
```bash
find / -name "docker-compose.yml" 2>/dev/null
# → /root/docker-compose.yml
nano /root/docker-compose.yml
# N8N_CONCURRENCY_PRODUCTION_LIMIT=1 was already there ✅
docker compose down && docker compose up -d
# root-n8n-1 → Started, root-traefik-1 → Started ✅
```

**Note:** `docker-compose` (v1) is NOT installed. Must use `docker compose` with a space.

**Remaining roadmap:**
- ✅ Workflow 5 (Bulk Upload) — mostly working, fixes applied
- ⏳ Log to Creatives DB — after successful upload, write Meta Creative ID + asset data
- ⏳ Workflow 4 (Campaigns/Ad Sets Sync) — daily cron
- ⏳ Workflow 6 (Performance Sync) — daily Meta insights

---

### Chat: Handle blank title and message in Meta ad code (April 2026)

**H:** Can you adjust this code so that if the title and message is blank, it will still continue.

Video ad creative payload (iOS page `1019494927918378`):
```json
{
  "title": "{{ $('Expander').item.json.fields.Headline }}",
  "message": {{ JSON.stringify($('Expander').item.json.fields['Primary Text']) }}
}
```

**A:** Added `?? ''` nullish coalescing fallback to both fields:
```json
{
  "title": "{{ $('Expander').item.json.fields.Headline ?? '' }}",
  "message": {{ JSON.stringify($('Expander').item.json.fields['Primary Text'] ?? '') }}
}
```

**H:** Also for this one (Android/image ad, page `111144870248270`):
```json
{
  "message": {{ JSON.stringify($('Loop Over Items3').item.json.fields['Primary Text']) }},
  "name": "{{ $('Loop Over Items3').item.json.fields.Headline }}"
}
```

**A:**
```json
{
  "message": {{ JSON.stringify($('Loop Over Items3').item.json.fields['Primary Text'] ?? '') }},
  "name": "{{ $('Loop Over Items3').item.json.fields.Headline ?? '' }}"
}
```

Same fix — `?? ''` inside `JSON.stringify(...)` for Primary Text and `?? ''` on Headline. Workflow no longer breaks when copy fields are blank.
