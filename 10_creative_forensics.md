# Creative Forensics — Reverse Engineering Ad Performance

**Project Owner:** Carl Patrick Sajol  
**Status:** ✅ Analysis framework completed — v4 forensics document produced  
**Started:** April 2026  
**Last Active:** April 2026

---

## What This Is

A deep forensic analysis framework for reverse-engineering why Bumpy's winning video ads outperform losers — using 6 ads (3 winners, 3 losers) from the same creative format and persona contexts, with real performance data.

This was also used to evaluate whether Claude Opus 4.6 (or Sonnet) could be integrated as an AI analyst for ongoing ad analytics — the answer is yes, and the framework here is the foundation.

---

## The 6 Ads Analyzed

### Winners

| Ad Name | Persona | Spend | ROAS | Watch Time Ratio | CTR |
|---|---|---|---|---|---|
| General-BR-L2vM8Q-ManyHugs2-Abroad-VID-Batch2025Week50 | General | $16,405 | 0.51x | 0.28 (4s/14s) | 1.12% |
| PassportBro-US-L2vM8Q-ManyHugs2-NewYearSilly-VID-Batch2025Week50 | PassportBro | $13,445 | 0.63x | 0.21 (3s/14s) | 1.00% |
| GringoLover-ES-v8Gn7M-Pulseblack-Car-VID-Batch2026Week05 | GringoLover | $13,000 | 0.62x | 0.42 (3s/7s) | 1.25% |

### Losers

| Ad Name | Persona | Spend | ROAS | Watch Time Ratio | CTR |
|---|---|---|---|---|---|
| General-ES-a2Ef3y-wanted-peace-VID-Batch2026Week05 | General | $64.80 | 1.38x | 0.33 (2s/6s) | 0.76% |
| PassportBro-US-a2Ef3y-wanted-growing-VID-Batch2026Week05 | PassportBro | $17.80 | 1.65x | 0.33 (2s/6s) | 0.93% |
| GringoLover-PH-H7kM3N-Airport-ItalianSelfie-VID-Batch2026Week04 | GringoLover | $13.78 | 1.38x | 0.23 (3s/11s) | 0.67% |

---

## Key Finding: The Binary Structural Line

**Every winner delivers ≥1 scene cut in the first 1.5 seconds. Every loser delivers 0.**

This is the structural separator between Spending Gang (winners) and Suppressed (losers) at the frame level.

---

## The Trigger Stack Model (Section 3B)

Winners fire a three-component psychological trigger chain:

1. **T1 — Identity Recognition** (0–1.5s): The hook must activate identity recognition immediately. The viewer sees themselves (or who they want to be) in the first frame.
2. **T2 — Outcome Projection** (1.5–4s): Once identity is recognized, the ad must project a desirable outcome the viewer can see themselves achieving.
3. **T3 — Social Proof or Urgency** (4s+): Seals the mechanism — proof that others like them are achieving this outcome.

**Where each loser's chain breaks:**
- Loser 1 (General-ES): Chain dies at T1 — generic text fails to fire identity recognition
- Loser 2 (PassportBro-US): Chain breaks at T2 — correct identity label but no outcome to project into (AI portrait ≠ outcome)
- Loser 3 (GringoLover-PH): Chain breaks at T2 — correct text but kitchen visual contradicts the aspiration signal → cognitive dissonance → scroll

**Loser 3's tragedy:** It has a scroll-stopping frame (airport reunion at second 7) — but average watch time is 3 seconds. The good content starts at second 4+. The structure buries the best moment.

---

## The One-Frame Test (Section 3C)

For each ad: identify the single highest-density conversion moment (the frame that most concentrates identity + outcome + social proof).

Winners: their highest-density frame appears in the first 1.5 seconds.  
Losers: their highest-density frame appears after the average viewer has already scrolled.

---

## Transferable Mechanism — Component Test

For a creative to work, all 3 components must be present AND correctly calibrated:
- Loser 1: 0/3
- Loser 2: 0.5/3 (has identity label, missing outcome)
- Loser 3: 1.5/3 (has correct text, wrong visual)

Even 1.5/3 is insufficient. All three components must fire.

---

## The Experiment Framework (Section 7)

For each of the 5 proposed hook variants:

```
Hypothesis: "We believe replacing [current hook] with [new hook] 
will [increase/decrease] [metric] because [mechanism reason]"

Hook: [exact 0.1-second architecture]
What stays identical: [list every constant]

Signals to watch:
- 3-second view rate threshold: [X%] (earliest signal hook is failing)
- WTR target: [X]
- CTR target: [X%]
- ROAS threshold: [X] in [timeframe]

Kill condition: at [spend] + [3-second view rate], stop. 
What this tells you: [which mechanism component failed]
```

---

## Framework Document Versions

| Version | What Changed |
|---|---|
| v1 | Initial analysis |
| v2 | Added psychological framework |
| v3 | Added hook format type classification |
| v4 (final) | 0.1-second breakdown tables for ALL 6 ads, Trigger Stack model (3B), One-Frame Test (3C), 5 specific hook variants, 3-second view rate as earliest spend signal, component scoring for each loser |

**Final output:** `bumpy_forensics_v4.docx`

---

## Claude AI for Ongoing Analytics (Separate Discussion)

Teddy's request was to use Claude Opus 4.6 to read ad analytics and identify what's working. The verdict:

**Feasibility:** Yes, very doable. Claude (Opus or Sonnet) is strong at reasoning over structured analytics data — ad performance CSVs, Meta insights, Singular exports, etc.

**How it would work for Bumpy:**
1. Connect ad analytics via API (Meta, TikTok, Singular)
2. Feed Claude the data in a structured format
3. Prompt it to identify patterns: which creatives drive conversions, which audiences are fatiguing, where CPR is trending wrong
4. Output structured analysis to Slack or Notion

**Key requirement:** Tracking must be clean and naming conventions consistent. If campaigns are named randomly or UTMs are messy, the AI analysis is only as good as the underlying data structure.

This has since been integrated into the **Creative Intelligence Pipeline** (see that doc) — using Claude Sonnet 4.6 via OpenRouter for pattern analysis.

---

## Chat Logs

### Chat: Reverse-engineering high-performing Bumpy dating app video ads (April 2026)

**H:** You are a senior Meta Ads creative strategist. I'm going to give you 6 video ads — 3 winners and 3 losers — along with their performance data.

Winners: General-BR (Spend $16,405, ROAS 0.51x, WTR 0.28, CTR 1.12%), PassportBro-US (Spend $13,445, ROAS 0.63x, WTR 0.21, CTR 1.00%), GringoLover-ES (Spend $13,000, ROAS 0.62x, WTR 0.42, CTR 1.25%)

Losers: General-ES (Spend $64.80, ROAS 1.38x, WTR 0.33, CTR 0.76%), PassportBro-US (Spend $17.80, ROAS 1.65x, WTR 0.33, CTR 0.93%), GringoLover-PH (Spend $13.78, ROAS 1.38x, WTR 0.23, CTR 0.67%)

**A:** Extracted video frames using ffprobe/ffmpeg. Performed frame-by-frame analysis. Built forensics framework across 4 document versions.

**v4 key additions:**
- Section 3A: 0.1-second breakdown tables for ALL 6 ads — binary structural line found: every winner delivers ≥1 scene cut in first 1.5 seconds, every loser delivers 0
- Section 3B: Trigger Stack model — T1 (Identity Recognition 0–1.5s) → T2 (Outcome Projection 1.5–4s) → T3 (Social Proof/Urgency 4s+). Maps exactly where each loser's chain breaks
- Section 3C: One-Frame Test — winners' highest-density frame in first 1.5s; losers' best frame after viewer has already scrolled
- Section 5: Component scoring — Loser 1: 0/3, Loser 2: 0.5/3, Loser 3: 1.5/3. Even 1.5/3 is insufficient
- Section 7: 3-second view rate as earliest spend signal (earliest signal hook is failing before mechanism fires)
- 5 specific hook variants, each ranked by confidence and addressing specific vulnerability from Section 3A

Output: `bumpy_forensics_v4.docx`

---

### Chat: Claude Opus 4.6 for ad analytics integration (April 2026)

**H:** Teddy asked me — they were planning to use Claude Opus 4.6 to their own system to help them identify what ads are really working and let AI read its analytics. What do you think and how do you think it's possible for us? With our style of advertising do we need to tweak something?

**A:** LinkedIn post couldn't be fetched (blocked). But based on the description:

**The idea is solid and yes, very doable.** Claude Opus 4.6 (`claude-opus-4-6`) is strong at reasoning over structured data — analytics reports, ad performance CSVs, dashboard screenshots. The use case Teddy is describing — feed it campaign data, ask it to surface what's performing and why — is one of the more practical immediate AI applications for marketing teams.

**How it would work for Bumpy:**
1. Connect ad analytics via API (Meta, TikTok, Singular)
2. Feed Claude structured data
3. Prompt to identify patterns: which creatives drive conversions, which audiences are fatiguing, where CPR is trending wrong
4. Output to Slack or Notion

**For your advertising style:** AI analytics reading works best when tracking is clean and naming conventions are consistent. If campaigns are named randomly or UTMs are messy, the AI analysis is only as good as the underlying data structure.

**This discussion was the seed for the Creative Intelligence Pipeline** — using Claude Sonnet 4.6 via OpenRouter for pattern analysis at scale (see Project 9).
