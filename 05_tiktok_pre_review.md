# TikTok Creative Pre-Review Automation — Full Project Documentation

**Project Owner:** Carl Patrick Sajol  
**Status:** 🔨 In Progress — Core workflow built, Google Sheets row update issue being resolved  
**Started:** April 2026  
**Last Active:** April 2026

---

## What This Is

An n8n automation that pre-reviews Bumpy's TikTok creatives (videos and landing page URLs) via the TikTok Marketing API before submitting them as actual ads. The goal is to catch policy violations early, reduce ad rejections, and shorten the time from creative to live ad.

**Reference doc:** Bytedance Lark document (internal) — TikTok pre-review API documentation

---

## Architecture

```
Google Sheets (status = READY trigger)
       ↓ (webhook via Apps Script)
n8n Webhook
       ↓
Code in JavaScript (extract row data + source_row)
       ↓
Submit Pre-Review (TikTok API — video + landing page)
       ↓
Wait + Poll (check pre-review status)
       ↓
Parse Result
       ↓
Update Google Sheets row (Video ID, Pre-review Result, Status, Timestamp)
```

**TikTok API:** TikTok Marketing API pre-review endpoint  
**Creative types in scope:** Video, Landing Page URL

---

## Credentials

- TikTok API Access Token: Available
- TikTok Advertiser ID: Available

---

## Google Apps Script (Code.gs)

**Trigger:** When a row's Status column is set to `READY` in the Google Sheet, the Apps Script fires a webhook to n8n with the row data.

### Key fields sent in webhook payload:
- `source_row` — the Google Sheet row number (needed for the update node)
- All pre-review task fields (video URL, landing page URL, advertiser ID, etc.)

**Change applied to Code.gs:** Added `Row` column write before webhook fires:
```javascript
// Write row number to "Row" column for n8n to use as unique identifier
const rowCol = getCol(sheet, "Row");
if (rowCol > 0) sheet.getRange(row, rowCol).setValue(row);
```

The Google Sheet must have a `Row` column in the header for this to work.

---

## n8n Workflow — Node Details

### Node: Code in JavaScript
Extracts structured data from the webhook payload. Passes through `source_row` for downstream use.

### Node: Submit Pre-Review (TikTok API)
Calls the TikTok Marketing API pre-review endpoint. Submits both video and landing page URL together.

### Node: Wait + Poll
Polls the TikTok API for pre-review task status until it's complete. Pattern: Wait → Check Status → IF complete → continue, else loop.

### Node: Parse Result
Reads the pre-review result from:
```javascript
$json.data.pre_review_result_list[0].material_id  // Video ID
$json.data.pre_review_result_list[0].pre_review_status  // Pre-review Result
$json.data.task_status  // Task ID
```

### Node: Update Google Sheets
Updates the original row with results.

**Column mapping to update:**
- `Video ID` → `$json.data.pre_review_result_list[0].material_id`
- `Pre-review Result` → `$json.data.pre_review_result_list[0].pre_review_status`
- `Video Result` → `$json.data.pre_review_result_list[0].pre_review_status`
- `Task ID` → `$json.data.task_status`
- `Status` → `Approved` or `Rejected`
- `Result Timestamp` → `$now`

---

## Bugs Encountered & Fixes

### Bug 1 — No Row Number in n8n Google Sheets Node
n8n's Google Sheets node doesn't have a "row number" option — it needs a column to match on for the update.

**Fix applied:**
1. Added a `Row` column to the Google Sheet header manually
2. Updated Code.gs to write the row number to that column before firing the webhook:
   ```javascript
   sheet.getRange(row, getCol(sheet, "Row")).setValue(row);
   ```
3. In n8n Google Sheets update node: Column to match on = `Row`, Value = `{{ $('Code in JavaScript').item.json.source_row }}`

### Bug 2 — `source_row` Not Available in Update Node
The update node couldn't find `source_row` because intermediate TikTok API response nodes had overwritten `$json`.

**Fix:** Reference it explicitly: `$('Code in JavaScript').item.json.source_row`

---

## TikTok Pre-Review API — Key Notes

- Pre-review is asynchronous — you submit and poll for results
- `pre_review_status` can return: `APPROVED`, `REJECTED`, `UNDER_REVIEW`
- If `REJECTED`, the rejection reason is available in the result list for each material
- Landing page URL check is separate from video check — both go into the same task submission
- Material ID from the pre-review result is what gets used when creating the actual TikTok ad

---

## Current Status

| Component | Status |
|---|---|
| Apps Script webhook trigger | ✅ Working |
| n8n webhook receiver | ✅ Working |
| TikTok pre-review submission | ✅ Working |
| Poll + status check loop | ✅ Working |
| Parse pre-review result | ✅ Working |
| Update Google Sheets row | 🔨 Row column added, `source_row` fix applied — needs verification |

---

## Next Steps

1. Verify the Google Sheets update works with the `Row` column + `source_row` match
2. Test end-to-end with a real creative (video + landing page)
3. Add rejection reason parsing — surface the specific reason from `pre_review_result_list` when `REJECTED`
4. Add Slack notification when a pre-review comes back `APPROVED` or `REJECTED`
5. Consider connecting this to the Creative Bulk Uploader — pre-review could become a step in the upload workflow

---

## Chat Logs

### Chat: Creative Pre-review (April 2026)

**H:** New project here! Can you access this? https://bytedance.sg.larkoffice.com/docx/IySxdS4nnouazwxPvVBlIniugEh

**A:** Can't access — blocked by robots.txt and requires login. Please copy-paste, export, or screenshot.

**H:** [Pasted the API docs] Basically, what we want to do is to pre-review the creative we do in TikTok to lessen the restrictions on the ads we make.

**A:** Asked clarifying questions:
- What to build → n8n workflow
- Creative types → Video, Landing Page URL
- TikTok API credentials → Yes, have both

Built n8n workflow JSON. Architecture: Google Sheets (status = READY) → Apps Script fires webhook → n8n receives → Code in JavaScript extracts data + source_row → Submit Pre-Review to TikTok API → Wait + Poll → Parse result → Update Google Sheets.

**Bug — No row number in n8n Google Sheets node:**

**H:** There's no row number here.

**A:** n8n's Google Sheets node doesn't have a row number option — needs a column to match on for updates. Fix:

1. Add `Row` column to Google Sheet header manually
2. In Code.gs, write row number to that column before webhook fires:
```javascript
const rowCol = getCol(sheet, "Row");
if (rowCol > 0) sheet.getRange(row, rowCol).setValue(row);
```
3. In n8n update node: Column to match on = `Row`, Value = `{{ $('Code in JavaScript').item.json.source_row }}`

**H:** Is this it? [shared Code.gs snippet]

**A:** Yes! Add this right after `if (status !== "READY") return;`:
```javascript
// Write row number to "Row" column for n8n to use as unique identifier
const rowCol = getCol(sheet, "Row");
if (rowCol > 0) sheet.getRange(row, rowCol).setValue(row);
```

Two things needed:
1. Add `Row` column to the sheet header manually (type "Row" in next available column after Notes)
2. Add those 3 lines into `handleStatusReady` right after line 197

Then in n8n: Column to match on = `Row`, Value = `{{ $('Code in JavaScript').item.json.source_row }}`
