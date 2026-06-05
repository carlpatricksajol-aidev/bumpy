# Report Automation — App Store Connect + Google Play Integration

**Project Owner:** Carl Patrick Sajol  
**Status:** 🔨 In Progress — Singular working, Google Play JWT auth still being resolved  
**Started:** April 2026  
**Last Active:** May 2026

---

## What This Is

A weekly performance report automation that pulls revenue and install data from all channels (Singular for cost + installs, App Store Connect for iOS revenue, Google Play for Android revenue), merges them into a unified report, and outputs to Google Sheets and a Slack narrative.

This came out of the existing reporting workflow — the remaining gap after Singular was integrated was **App Store Connect** and **Google Play**, as neither has an MCP connector available.

---

## Architecture

```
[Singular API]          [App Store Connect JWT]     [Google Play Service Account]
  cost, installs            iOS revenue                  Android revenue
       ↓                        ↓                              ↓
[Aggregate Code Node — merge + sum by OS]
       ↓
[Google Sheets — output]
       ↓
[Slack narrative]
```

**Source of truth for revenue:** Store-reported actual revenue (App Store Connect + Google Play), NOT Singular attributed revenue. Khie confirmed the team wants store-reported MER calculations.

**Singular covers:** `adn_cost`, `custom_installs` — broken down by `source` and `os` with `time_breakdown: all`.

---

## Singular Configuration (WORKING ✅)

**Confirmed working metrics:**
- `custom_installs` — returning correctly (439,647 in test run)
- `adn_cost` — returning correctly ($230,179.36 in test run)
- `dimensions: source, os` — correctly breaking down by channel + platform
- `time_breakdown: all` — aggregated for the week
- Date range: dynamic (from Code node)
- `adn_cost = [null]` for Organic rows — expected, organic has no paid cost

**Purchases/revenue NOT coming from Singular** — iOS and Android revenue come from stores directly.

---

## App Store Connect Integration

**Auth method:** JWT  
**Credential needed:** JWT key from App Store Connect portal (must be provisioned if not already done)

**Status:** Being set up — JWT credential configured in n8n but private key format was causing issues (see troubleshooting below).

---

## Google Play Integration

**Auth method:** Service account + access token (OAuth)  
**What was confirmed working:**
- Google Play service account auth is set up
- Access token generation from service account JSON is working
- Sticking point: downloading and parsing the **Google Play earnings ZIP file** in n8n

**GCS ZIP approach:** Use `alt=media` endpoint, set Response Format to `File` in HTTP Request node, then Code node to unzip and parse the CSV inside.

---

## Bugs Encountered & Fixes

### Bug 1 — Singular `time_breakdown` Missing
Singular returned `"An invalid time breakdown was given. (got: null)"` because `time_breakdown` was not added as a query param.  
**Fix:** Add query param `time_breakdown = all`.

### Bug 2 — JWT Private Key Format (Google Play / App Store Connect)
n8n's Code node doesn't allow the `crypto` module, so JWT generation had to be done differently.

**The issue:** Private key in service account JSON has literal `\n` characters (escaped) instead of real newlines.

**Attempted fix sequence:**
1. Tried generating JWT in Code node using `crypto` → failed (module not available)
2. Tried using n8n's built-in JWT node → credential field doesn't support expressions for the private key
3. **Correct fix:** In the Code node that reads the service account JSON, clean the key:
```javascript
const raw = items[0].json;
const cleanedKey = raw.private_key.replace(/\\n/g, '\n');
return [{ json: { ...raw, private_key: cleanedKey } }];
```
Then in the JWT credential, open the service account JSON, copy the private key value, paste into a text editor, do Find & Replace `\n` → actual newline, paste the result into the credential field directly (not via expression — JWT credentials don't support expressions).

### Bug 3 — `$json.jwt` Undefined
The Get Access Token node was reading from Item C (index 2 — the service account JSON), not from the JWT Code node output.  
**Fix:** Ensure Get Access Token node is receiving input from the JWT Code node, not directly from the service account JSON. The input panel should show the JWT Code node's output with the `jwt` field.

### Bug 4 — offset in Airtable
Airtable paginates — returns max 100 records per request. An `offset` field in the response means there are more pages.  
**Fix:** Use n8n's native Airtable node (handles pagination automatically) instead of raw HTTP Request.

---

## The Aggregation Code Node (When Ready)

Once Singular data flows cleanly, this Code node aggregates everything:
- Sum `adn_cost` by `os` (iOS vs Android)
- Sum `custom_installs` by `os`
- Merge with App Store Connect iOS revenue
- Merge with Google Play Android revenue
- Calculate MER (spend / revenue) per platform

---

## Team Context

**Answered questions from initial scoping:**
- Google Play: service account needs to be set up from scratch (done during this session)
- Source of truth for spend: Singular is the single source — no cross-check needed against platform-reported spend
- Date range alignment: standard attribution window normalized per team preference
- Revenue source: store-reported, not Singular attributed
- Backend: n8n (already in place)
- Final consumer: growth / leadership

---

## Current Status

| Component | Status |
|---|---|
| Singular API integration | ✅ Working |
| Google Play service account | ✅ Auth working |
| Google Play ZIP parsing | ⏳ In progress |
| App Store Connect JWT | 🔨 Private key format being resolved |
| Merge / aggregation Code node | ⏳ Not started (blocked by store integrations) |
| Google Sheets output | ⏳ Not started |
| Slack narrative | ⏳ Not started |

---

## Chat Logs

### Chat: Report automation integration gaps — Initial scoping (April 2026)

**H:** Based on this input, prepare me some questions to ask the team: "the next initiative in our pipeline that doesn't have Meta dependencies would be the report automation — now that we already have all channels integrated to Singular. The remaining gap in our report workflow are App Store Connect and Google Play. I think neither has an MCP connector available, so might need backend work to pull those."

**A:** Prepared questions across Data Access & Auth, Data & Logic, Output & Ownership, and Build Approach. Most critical to unblock: auth setup (JWT for App Store Connect, service account for Google Play) and hosting choice.

**Team answers received:**
- Google Play service account needs to be set up from scratch
- Singular is single source for spend — no cross-check needed
- Revenue source: store-reported (not Singular attributed) for MER
- Output: Google Sheets + Slack narrative
- Backend: n8n
- Final consumer: growth / leadership

**Bug — Airtable offset/pagination:**

**H:** Why is there an offset here?

**A:** Airtable paginates — returns max 100 records per request. `offset` in response = more pages exist. Fix: use n8n's native Airtable node instead of HTTP Request — it handles pagination automatically.

**Bug — Singular `time_breakdown` missing:**

**H:** Got error here.

**A:** Error: `"An invalid time breakdown was given. (got: null)"` — Singular requires a `time_breakdown` parameter. Add: `Name: time_breakdown`, `Value: all`.

**H:** Still failed.

**A:** Issue — `time_breakdown` was put as the Value field and `all` as a separate parameter. They need to be paired in one row: Name = `time_breakdown`, Value = `all`.

**H:** I think we're missing the Purchases here.

**A:** Good catch on looking, but purchases from Singular aren't needed. Khie confirmed the team wants store-reported actual revenue for MER — iOS from App Store Connect, Android from Google Play. Singular only needs to provide cost and installs.

---

### Chat: Report automation integration gaps — Configuration (May 2026)

**H:** Please read report automation integration gaps last chat, I need some help configuring that one.

**A:** Caught up. Singular API connected (cost + installs working), App Store Connect pulling iOS revenue, Google Play auth working. Stuck on: downloading and parsing the Google Play earnings ZIP file in n8n.

**H:** No, we're actually in the Singular one. Getting the right track of metrics. Please confirm I have what I should have here.

**A:** Confirmed correct:
- `custom_installs` — 439,647 ✅
- `adn_cost` — $230,179.36 ✅
- `dimensions: source, os` — correct breakdown ✅
- `time_breakdown: all` ✅
- `adn_cost = [null]` for Organic — expected ✅
- Purchases/revenue NOT from Singular ✅

**H:** Google Play issue is all good. Let's do the code node that extracts everything first.

**A:** Provided aggregation Code node to sum `adn_cost` by `os` and `custom_installs` by `os` before merging with store revenue.

**Bug — `$json.jwt` undefined:**

**H:** It's undefined... check the left side, that's the return of the code node.

**A:** The INPUT panel shows Code in JavaScript3 but its output only shows raw service account JSON fields — no `jwt` field. The Get Access Token node is reading from Item C (index 2 — the service account JSON), not from the JWT Code node output. Fix: ensure Get Access Token receives input from the JWT Code node, not directly from the service account JSON.

**H:** What do you mean it hasn't run yet?! That's the output of the code node you gave!

**A:** The connection looks right. The orange triangle = warning. Click Code in JavaScript3 and share the output panel.

**H:** Failed here...

**A:** n8n's Code node doesn't allow the `crypto` module. Need a different approach. The issue: private key in service account JSON has literal `\n` characters instead of real newlines.

Fix — in the Code node that reads the service account JSON, clean the key:
```javascript
const raw = items[0].json;
const cleanedKey = raw.private_key.replace(/\\n/g, '\n');
return [{ json: { ...raw, private_key: cleanedKey } }];
```

Then in the JWT credential: open service account JSON → copy private key → paste into text editor → Find & Replace `\n` → actual newline → paste cleaned result into credential field directly (JWT credentials don't support expressions).
