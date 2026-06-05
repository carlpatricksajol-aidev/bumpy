# Meta Ad Comment Moderation System — Full Project Documentation

**Project Owner:** Carl Patrick Sajol  
**Status:** 🔨 Partially working — comment deletion was functional at one point, broke when Advanced Access was rejected  
**Started:** April 2026  
**Last Active:** April 2026

---

## What This Is

An automation to auto-hide or auto-delete comments on Bumpy's Facebook and Instagram ads. In the dating app space, it's common for bad actors to drop negative/spam comments on ads. The goal is to automate moderation rather than manually reviewing every comment.

---

## Architecture

```
Webhook (Meta real-time notification)
       ↓
Analysis Engine (keyword filter + AI sentiment scoring)
       ↓
Action: Delete / Hide / Flag for review
       ↓
Moderation Dashboard (edge cases)
       ↓
Audit log (all deletions tracked)
```

**Tech used:** Meta Graph API, n8n webhook workflow, Facebook/Instagram Business Account  
**App ID:** `1429381954582190`  
**Page IDs used:** `1019494927918378` (iOS page), `111144870248270` (Android page)

---

## Meta API Permissions Required

- `pages_manage_engagement` — to read, hide, and delete comments on page posts
- `ads_management` — for ad-specific comment access

**Permission levels:**
- Standard Access — insufficient for ad post comments in most cases
- Advanced Access — required for ad comment management at scale

---

## What Was Built

### Hide Comments Flow (Facebook)
- Graph API endpoint: `POST /{comment-id}?is_hidden=true`
- Tested and working for regular page posts
- For ad posts — requires Advanced Access

### Delete Comments Flow
- Graph API endpoint: `DELETE /{comment-id}`
- **This WAS working** — activity log confirms successful deletions from ad comments on February 18, 2026

### AI-Based Moderation (Planned)
- Sentiment analysis / ML model for nuanced classification
- Multi-language classification (important for international dating app audience)
- Hybrid: keyword pre-filter → AI scoring → action

---

## Bugs & Issues Encountered

### Issue 1 — Advanced Access Rejected
Advanced Access was applied for and **rejected** by Meta for `pages_manage_engagement`. After the rejection, the workflow stopped working.

**What likely happened:**
- Token from before the rejection may have been invalidated
- App permissions may have been reset or restricted
- App may have gone into restricted state

### Issue 2 — Workflow Broke After Rejection
Comment deletion was confirmed working (activity log shows successful deletions from Feb 18, 2026) but stopped working after the Advanced Access rejection.

**Most likely cause:** Token invalidated when Advanced Access was rejected.

---

## Troubleshooting Steps

### Step 1 — Check App Status
Go to: `https://developers.facebook.com/apps/1429381954582190/settings/basic/`  
Verify app is **Live** (not Development, Restricted, or Suspended).

### Step 2 — Regenerate Token
The old token may have been invalidated. Generate a **fresh Page Access Token**:
1. Go to Graph API Explorer
2. Get a new Page Access Token
3. Make sure `pages_manage_engagement` is checked
4. Replace token in the workflow

### Step 3 — Check Why Advanced Access Was Rejected
Go to: `https://developers.facebook.com/apps/1429381954582190/app-review/permissions/`  
Click on `pages_manage_engagement` → look for rejection reason → address issues → resubmit.

### Step 4 — Test on Regular Page Post First
1. Post something on the Bumpy page (not an ad)
2. Comment on it
3. Try to delete that comment with the workflow
4. If it works → the issue is specifically Advanced Access for ads
5. If it fails → the issue is a permission or token problem at the base level

---

## Important Notes

- `pages_manage_engagement` Standard Access may only work on regular page posts, not ad posts — this is a known Meta limitation
- Deletion WAS working before the Advanced Access rejection, meaning the underlying workflow logic and API calls are correct
- The issue is purely an auth/permissions state problem, not a code problem
- Once a fresh token is in place and app state is confirmed clean, it should resume working

---

## Current Status

| Component | Status |
|---|---|
| Keyword-based filter | ✅ Logic designed |
| Hide comment API | ✅ Endpoint confirmed working |
| Delete comment API | ✅ Was working, broke on permission issue |
| n8n webhook workflow | ✅ Built |
| Advanced Access | ⚠️ Rejected — needs resubmission |
| AI moderation layer | ⏳ Planned |
| Audit trail / log | ⏳ Planned |
| Moderation dashboard | ⏳ Not started |

---

## Next Steps

1. Regenerate a fresh Page Access Token
2. Confirm app is in Live mode
3. Test deletion on a regular page post (not ad) to confirm baseline permission works
4. Review rejection reason for Advanced Access → resubmit with fixes
5. Once Advanced Access approved, re-test on ad posts
6. Implement rate limit handling
7. Consider "hide" as default action instead of immediate delete (safer for borderline cases)

---

## Chat Logs

### Chat: Meta comment deletion (April 2026)

**H:** Bumpy wants another project — auto delete comments from Ads (Facebook & Instagram) since in the Dating App field it's really normal to encounter people who deliberately add bad comments in those ads. Now they ask me if we can automate the deletion/managing of comments.

**A:** Yes, doable with Meta Graph API. Recommended hybrid approach: keyword pre-filter → AI scoring → action. Key requirements: `pages_manage_engagement` and `ads_management` permissions, webhook for real-time notifications. Suggested architecture: Webhook → Analysis Engine → Action (Delete/Hide/Flag) → Moderation Dashboard → Audit log.

**H:** Let's start with the documentation to hide comments in Facebook.

**A:** Researched Graph API. Hide endpoint: `POST /{comment-id}?is_hidden=true`. Delete endpoint: `DELETE /{comment-id}`. Built n8n webhook workflow. Applied for Advanced Access on `pages_manage_engagement`.

**[After Advanced Access rejected]**

**A:** Advanced Access was rejected. Standard Access may only allow deleting comments on regular page posts, not ad posts. Action items: check rejection reason at developers.facebook.com/apps/1429381954582190/app-review/permissions/, fix issues, resubmit.

**H:** Again... I was able to delete comments in ads — I even have my activities log.

**A:** You're absolutely right — the deletion log shows it WAS working! All those comments were successfully deleted from ads on February 18, 2026. So something changed between when it was working and now.

Most likely: token invalidated when Advanced Access was rejected. Meta may have:
1. Revoked Standard Access for `pages_manage_engagement`
2. Invalidated the old token
3. Restricted the app temporarily

**Quick fixes:**
1. Generate a fresh Page Access Token from Graph API Explorer with `pages_manage_engagement` checked
2. Check app status at developers.facebook.com/apps/1429381954582190/settings/basic/ — verify it's Live
3. Review rejection reason → address it → resubmit Advanced Access
4. Test on a regular page post first (not ad) — if works, issue is specifically Advanced Access for ads; if fails, it's a base token/permission issue
