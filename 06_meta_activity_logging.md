# Meta Activity Logging + Slack Notifications — Full Project Documentation

**Project Owner:** Carl Patrick Sajol  
**Status:** ✅ Working — Duplicate notification bug fixed, formatting improved  
**Started:** April 2026  
**Last Active:** April 2026

---

## What This Is

A scheduled n8n workflow that pulls all activity from the Meta Ad Account (changes made by users — budget edits, creative swaps, status changes, etc.), logs them to Google Sheets as the source of truth, and sends a Slack notification listing only new changes — **excluding** changes made by "Meta" (automated Meta actions).

---

## Architecture

```
Schedule Trigger (recurring)
       ↓
Get Ad Account Activities (Meta Graph API)
       ↓
Code in JavaScript (normalize + generate unique keys)
       ↓
Append or Update Row in Google Sheets (dedup by unique_key)
       ↓
Read Sheet — filter: slack_notified = blank AND Username ≠ "Meta"
       ↓
Format Slack Message (Code Node)
       ↓
Post to Slack
       ↓
Update Sheet — mark notified rows: slack_notified = TRUE
```

**Meta Ad Account ID:** `590108853233793`  
**Source of truth:** Google Sheets  
**New column added:** `slack_notified` (Boolean — prevents duplicate notifications across executions)

---

## Unique Key Logic

Each activity row gets a unique key to prevent duplicate logging:
```javascript
const uniqueKey = `${item.json.object_id}_${item.json.event_time}_${extraData.type || item.json.event_type}`;
```

This ensures the same Meta event never gets logged twice even if the scheduled workflow fetches it on multiple runs.

---

## Data Fields Logged

| Field | Source |
|---|---|
| `unique_key` | Generated (object_id + event_time + event_type) |
| `date` | Formatted from `event_time` (e.g., "February 16 2026") |
| `time` | Formatted from `event_time` (e.g., "02:49:20 PM") |
| `ad_account_id` | Hardcoded `590108853233793` |
| `object_type` | `item.json.object_type` |
| `object_id` | `item.json.object_id` |
| `object_name` | `item.json.object_name` |
| `field_name` | `extraData.type` or `item.json.event_type` |
| `old_value` | `extraData.old_value` (stringified) |
| `new_value` | `extraData.new_value` (stringified) |
| `user_name` | `item.json.actor_name` |
| `change_action` | `item.json.event_type` |

---

## Duplicate Prevention Strategy

**The problem:** Scheduled runs re-fetch the same 248 activities every execution. Without dedup, the same activity would trigger a Slack notification on every run.

**Two-layer solution:**

### Layer 1 — `unique_key` in Google Sheets
`Append or Update` node uses `unique_key` as the match column. Same activity → updates existing row instead of creating new. Prevents duplicate rows in the sheet.

### Layer 2 — `slack_notified` column
After the Slack message is sent, those rows get marked `slack_notified = TRUE`.  
On the next run, the "Read Sheet" step filters for `slack_notified = blank` — so only rows that haven't been notified yet go through.

---

## Slack Message Format

**Final format (after formatting iteration):**

```
━━━━━━━━━━━━━━━━━━━━━
📊 Meta Ad Account Changes — 3 new change(s)
━━━━━━━━━━━━━━━━━━━━━

• Alifya Rofi › `update_ad_creative`
  📋 PassportBro-US-Y4nR8W...mp4
  (none) → (media url)
  🕐 March 10, 2026 at 09:03:36 AM

• Alifya Rofi › `run_status`
  📋 General-BR-n6f2Wt-banner...mp4
  Pending Process → Inactive
  🕐 March 10, 2026 at 04:41:02 AM

━━━━━━━━━━━━━━━━━━━━━
```

**Key formatting decisions:**
- Long values truncated at 60 characters
- URLs replaced with `_(media url)_` (not the raw URL)
- `null` values shown as `(none)` 
- `*bold*` and `_italic_` render natively in Slack (no Block Kit needed for this)
- Plain **Text** field used (not Blocks) — simpler, less breakage risk

**The Code node for formatting:**
```javascript
const truncate = (str, max = 60) => {
  if (!str || str === 'null') return '(none)';
  const s = String(str);
  if (s.startsWith('http')) return '_(media url)_';
  return s.length > max ? s.substring(0, max) + '...' : s;
};
```

---

## Bugs Encountered & Fixes

### Bug 1 — Slack Sending Duplicate Messages on Every Run
Every run fetched the same 248 activities and sent them all to Slack again.  
**Fix:** Added `slack_notified` column + two-step read → filter → post → update pattern.

### Bug 2 — Unreadable Slack Format
Original format dumped raw long strings including full ad creative URLs into the message — completely unreadable.  
**Fix:** Truncation helper + URL masking + visual separators (`━━━━━━━━━━━`).

---

## Current Status

| Component | Status |
|---|---|
| Meta Graph API activity pull | ✅ Working |
| Unique key dedup | ✅ Working |
| Google Sheets logging | ✅ Working |
| `slack_notified` dedup | ✅ Working |
| Slack message formatting | ✅ Working (after iteration) |
| "Meta" username exclusion | ✅ Working |

---

## Chat Logs

### Chat: Preventing duplicate Slack notifications in scheduled Meta activity workflow (April 2026)

**H:** I need to tweak this workflow. The automation is for Meta activity logging. I need to add a Slack notification saying changes happened in Meta (Sheets is source of truth). Workflow is: Get Ad Account Activities → Code in JavaScript → Append or Update Row in Sheet → send Slack message with Username (exclude "Meta"). Problem: this is on a schedule trigger — how do I prevent duplicate Slack messages from the last execution?

[Shared existing Code node with `uniqueKey` generation: `${object_id}_${event_time}_${type}`]

**A:** Core problem: every scheduled run fetches the same 248 activities and would trigger Slack every time. Solution: add `slack_notified` column to the sheet.

Updated workflow order:
```
Schedule Trigger → Get Ad Account Activities → Split Out → Code in JS 
→ Append or Update Row → Read Sheet (unnotified only) → Filter (exclude Meta) 
→ Slack Message → Update Row (mark notified)
```

Layer 1 — `unique_key`: `Append or Update` node uses `unique_key` as match column. Same activity → updates existing row, no duplicate rows.

Layer 2 — `slack_notified`: after Slack message sent, mark rows `slack_notified = TRUE`. Next run only processes rows where `slack_notified = blank`.

**H:** [Confirmed approach working, but Slack format was unreadable — full ad creative URLs in messages]

**H:** I don't like that format here, can you change it? It's not readable at all.

**A:** The `new_value` field contains the full ad creative URL which is huge. Truncate long values and clean up the format:

```javascript
const truncate = (str, max = 60) => {
  if (!str || str === 'null') return '(none)';
  const s = String(str);
  if (s.startsWith('http')) return '_(media url)_';
  return s.length > max ? s.substring(0, max) + '...' : s;
};

const lines = items.map(item => {
  const d = item.json;
  const user_name   = d['Username']    || d.user_name    || '(unknown)';
  const object_name = d['Object Name'] || d.object_name  || '(unknown)';
  const field_name  = d['Field Name']  || d.field_name   || '(unknown)';
  const old_value   = d['Old Value']   || d.old_value    || '';
  const new_value   = d['New Value']   || d.new_value    || '';
  const date        = d['Date']        || d.date         || '';
  const time        = d['Time']        || d.time         || '';
  return `• *${user_name}* › \`${field_name}\`\n  📋 *${object_name}*\n  ${truncate(old_value)} → ${truncate(new_value)}\n  🕐 ${date} at ${time}`;
});

const message = [
  `━━━━━━━━━━━━━━━━━━━━━`,
  `📊 *Meta Ad Account Changes* — ${items.length} new change(s)`,
  `━━━━━━━━━━━━━━━━━━━━━`,
  ``,
  lines.join('\n\n'),
  ``,
  `━━━━━━━━━━━━━━━━━━━━━`
].join('\n');

return [{ json: { slack_message: message } }];
```

URLs replaced with `_(media url)_`, long text cut at 60 chars, readable at a glance. Use plain **Text** field in Slack node (not Blocks) — simpler, less breakage.
