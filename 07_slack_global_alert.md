# Bumpy Slack Global Alert Bot — Full Project Documentation

**Project Owner:** Carl Patrick Sajol  
**Status:** ✅ Core working — severity threshold tuning applied to reduce noise  
**Started:** March–April 2026  
**Last Active:** April 2026

---

## What This Is

An n8n automation that monitors a Telegram channel for global news (conflicts, wars, geopolitical events) and sends alerts to a Bumpy Slack channel when major events break out that could affect ad performance. Also intended to flag holidays/seasonal events that have historically impacted performance.

---

## Architecture

```
Telegram Channel (news feed — global events)
       ↓
n8n Telegram Trigger
       ↓
Grok AI Analysis (is this a conflict? severity score 1–10?)
       ↓
IF: is_conflict = true AND severity ≥ 7
       ↓ YES                     ↓ NO
#bumpy-alerts (Slack)           Dropped (no notification)
(max 5/day cap)
```

**Tools in use:**
- Telegram channel (provided by Bumpy — global news feed)
- Grok AI (for conflict classification + severity scoring)
- n8n
- Slack (output — `#bumpy-alerts` channel)

---

## Classification Logic

Each news post is analyzed by Grok and returns:

| Field | Type | Description |
|---|---|---|
| `is_conflict` | Boolean | True if news is a genuine conflict/war/geopolitical tension event |
| `severity` | Number 1–10 | Severity of the event (10 = major war outbreak) |

**Routing logic:**
- `is_conflict: true` AND `severity ≥ 7` → Send to `#bumpy-alerts` immediately
- `is_conflict: true` AND `severity 1–6` → Dropped (or weekly digest — lower priority)
- `is_conflict: false` → Dropped (regular market news — earnings, trade data, etc.)

---

## Daily Limit (Code Node)

Added to prevent alert flooding — max 5 alerts per day:

```javascript
const static = $getWorkflowStaticData('global');
const today = new Date().toISOString().split('T')[0]; // "2026-03-06"

// Reset counter if it's a new day
if (static.alertDate !== today) {
  static.alertDate = today;
  static.alertCount = 0;
}

// Block if already sent 5 today
if (static.alertCount >= 5) {
  return []; // stops execution
}

static.alertCount++;
return [$input.item];
```

---

## Bugs Encountered & Fixes

### Bug 1 — Firing Hundreds of Alerts Per Day
The Telegram channel posts constantly (mostly market noise) and the original `severity >= 4` threshold was too low.

**Fix options explored:**
- Option A: Raise severity threshold to `>= 7` (recommended first step — handles most noise naturally)
- Option B: Add daily limit Code node (max 5/day cap)
- Option C: Both together (recommended combination)

**Decision made:** Start with severity `>= 7`. That alone should drop it from hundreds to under 5 naturally. Add daily cap on top if still noisy.

### Bug 2 — IF Node Confusion (true/false branch direction)
Confusion about which branch of the IF node was true vs false.  
**Clarification:** `is_conflict: true` = Grok detected an actual conflict → trigger Slack. `is_conflict: false` = regular market news → drop.

---

## Current Configuration

| Setting | Value |
|---|---|
| Severity threshold | `>= 7` |
| Daily cap | 5 alerts/day |
| Primary Slack channel | `#bumpy-alerts` |
| Secondary (lower severity) | Weekly digest (planned) |

---

## Current Status

| Component | Status |
|---|---|
| Telegram trigger | ✅ Working |
| Grok conflict classification | ✅ Working |
| Severity scoring | ✅ Working |
| IF routing logic | ✅ Working |
| Daily limit cap | ✅ Applied |
| Slack notification | ✅ Working |
| Holiday/seasonal alerts | ⏳ Not built yet |

---

## Remaining Work

1. **Holiday/seasonal alert layer** — logic to flag ahead of known high-impact dates (e.g., Valentine's Day, New Year, etc.) that have historically affected Bumpy performance. Could use a static calendar + lookahead trigger (e.g., alert 3 days before a known event).
2. **Weekly low-severity digest** — instead of dropping severity 4–6, batch them and send a Sunday summary
3. **Performance correlation** — link alerts to actual performance data to validate which events truly impact results

---

## Chat Logs

### Chat: Bumpy Slack Global Alert (March–April 2026)

**H:** Bumpy ask me to create a Slack bot that will notify them if there are: 1) major conflict/war events break out, or 2) ahead of holidays/seasonal events that have had significant effect on our performance historically. I'm thinking of using Grok, X, and Telegram. They provided me a Telegram channel that provides news happening all around the world. Could I scrape this out? Just get those major conflicts — when small conflicts become big conflicts, it still gets reported here. Help me do the automation in n8n.

**A:** Built full n8n automation blueprint. Architecture: Telegram Trigger → Grok AI analysis (is_conflict + severity 1–10) → IF routing → Slack `#bumpy-alerts` + daily cap.

**`is_conflict` routing clarified:**
- `is_conflict: true` = Grok detected real conflict/war/tension → fire Slack (true branch = top/left connector on IF node)
- `is_conflict: false` = regular market news (earnings, trade data, stock movements) → drop silently (false branch = bottom/right connector)

Severity matters even when `is_conflict` is true: minor diplomatic spat (severity 2) vs actual war breaking out (severity 8). Original threshold: `severity >= 4`.

**H:** They have a concern — the bot is firing like hundreds per day and they're thinking it should be around 5 per day.

**A:** Options:

**Option A — Raise severity threshold (easiest):** Change `severity >= 4` to `severity >= 7`. Only genuine emergencies get through — wars, major terrorist attacks, large-scale military action. Eliminates most noise immediately.

**Option B — Add daily limit Code node:**
```javascript
const static = $getWorkflowStaticData('global');
const today = new Date().toISOString().split('T')[0];

if (static.alertDate !== today) {
  static.alertDate = today;
  static.alertCount = 0;
}

if (static.alertCount >= 5) {
  return [];
}

static.alertCount++;
return [$input.item];
```

**Option C — Both together (recommended):** Severity >= 7 + max 5/day cap.

**Recommendation:** Start with just raising severity to 7. That alone will likely drop it from hundreds to under 5 naturally without a hard cap. Add daily limit on top if still noisy after threshold change.
