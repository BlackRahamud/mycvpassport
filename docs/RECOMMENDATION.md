# Phase 0 — Recommendation: which 2 phases first

*Snapshot 2026-04-27. Sources: `ARCHITECTURE.md`, `GAP_ANALYSIS.md`, `COMPETITOR_AUDIT.md`. The Master Prompt v2 numbered 10 phases. This doc picks the 2 with biggest leverage this month.*

---

## TL;DR

**Run two phases in parallel:**
1. **Phase 1 — Free-tier scan that actually wows** (with the smoking-gun fix bolted on as the literal first commit).
2. **Phase 3 — India ↔ Gulf migration corridor** (start with S-class wins: regional-language field, ID validators, public Attestation Roadmap, CTC→Gulf Package translator).

Phase 4 (bilingual parser) is consumed *into* Phase 1 — we can't fix the scan without fixing parsing.
Phase 7's cost dashboard + rate limiting is added as a **prerequisite** to Phase 1 — we're about to multiply Anthropic spend, we need spend visibility before, not after.

Defer Phases 2, 5, 6, 8, 9, 10 to next month. Phase 5 (data bank intelligence) only becomes valuable once Phase 1 produces real CV text — there's nothing to embed yet.

---

## Why these two

### Phase 1 first — because the product is broken

Both free and paid ATS scans currently ignore the uploaded CV (see `GAP_ANALYSIS.md` headline). Every conversion lever downstream — paid Deep Match, bilingual rewrite, salary intel — depends on real CV text reaching Claude. Until that's fixed, Phase 2's expensive Sonnet/Opus features will hallucinate over the same empty bytes.

This phase delivers:
- Real CV text extraction (server-side PDF, reuse `api/parse-resume.js`)
- Real Anthropic call with full text in the prompt
- Free tier scan output with **5 concrete reasons + top 3 missing skills + 1 bilingual headline + 1 "unlock to see" teaser**
- Per-IP / per-user rate limiting + Turnstile on the open endpoint
- Prompt caching (60-80% Anthropic cost cut)
- Token logging + cost dashboard

**Outcome:** the scan stops being theatre, the paywall converts on a real wedge, and we have spend visibility before scaling.

### Phase 3 in parallel — because that's the moat

Phase 1 makes us "as good as Jobscan but cheaper." Phase 3 makes us **the only product that exists for this user.** No competitor — Jobscan, Hiration, Resume.io, Bayt, GulfTalent, Naukri Gulf, LinkedIn — ships any meaningful India-to-Gulf corridor feature. The cheapest wins (regional-language field, Iqama/EID/QID validation, free public Attestation Roadmap, CTC→Gulf Package translator) are all S-class — content + decision trees + format checks. Most cost zero Anthropic tokens.

These also generate **organic SEO traffic** ("MOFA attestation Saudi from Kerala" is a high-intent search no current player owns), giving Phase 1's improved scan a steady stream of new visitors to convert.

**Outcome:** SEO funnel + product moat + cheap to ship + impossible for global tools to copy.

---

## Sequencing within the two phases

### Week 1
- **Day 1-2 (P1):** Fix `analyze-cv` Edge Function — call `parse-resume` first, send real text to Haiku, return 5 reasons + 3 missing skills.
- **Day 3 (P1):** Add prompt caching on JD + system prompt across all 3 call sites. Add `usage` token logging to a `anthropic_calls` table.
- **Day 4 (P1):** Per-IP + per-user rate limit on `analyze-cv`. Cloudflare Turnstile.
- **Day 5 (P3 quick win):** Indian regional-language field in builder + Iqama/EID/QID format validation.

### Week 2
- **Day 6-7 (P1):** New free-tier result UI — 5 reasons, 3 missing skills, bilingual headline, "unlock to see" teaser, share-friendly OG result page.
- **Day 8-9 (P3):** Public `/attestation` route — state-by-state India → Gulf country roadmap. SEO-tuned. Static decision tree, no AI.
- **Day 10 (P1+P3):** Wire scan results to suggest the matching attestation roadmap when a degree is detected ("Don't forget to attest before flying").

### Week 3
- **Day 11-13 (P3):** CTC → Gulf Package translator at `/salary-translator` (already have `SalarySwitcher` page — extend not replace). Live FX, EOSB at year 2/5/10, schooling, savings ratio.
- **Day 14 (P1):** A/B framework for paywall copy and the teaser block. PostHog feature flags.
- **Day 15 (P1):** Eval harness — 30 hand-labelled CVs, regression-fail CI on parser + scan output.

### Week 4 — buffer + first instrumented pricing test
- Cost dashboard for founder.
- Pricing page comparison table ("vs Naukri ₹20,800 / vs Resume.io ₹2,089/mo trap").
- Decide on Active Hunter price test (₹199 → ₹299 or split tier).

---

## What this delivers in 30 days

| | Today | After 30 days |
| --- | --- | --- |
| Free scan | Hardcoded scores, CV not read | Real Haiku scan with 5 reasons, 3 missing skills, bilingual headline, share OG page |
| Paid scan | Haiku hallucinating on 500 base64 chars | Sonnet on full parsed text — actually worth paying for |
| Anthropic spend | ~3× achievable, no visibility | Cached + logged + capped per-user, founder dashboard live |
| Abuse risk | Open endpoint, no captcha | Rate-limited + Turnstile + per-IP cap |
| India-Gulf moat | None | Regional-language field, ID validators, Attestation Roadmap (free + SEO), CTC translator |
| Conversion path | Dead-end paywall | Teaser + share-loop + corridor-tool funnel |
| Eval safety | None | 30-CV regression suite in CI |

---

## What we're explicitly NOT doing this month

- **Phase 2** modules (Deep Match, Bilingual Rewrite, Visa Analyzer, Multi-JD Ranker) — defer until Phase 1's parsing is solid. Layer them on month 2.
- **Phase 5** (pgvector, embeddings, similarity search) — depends on real CV text + skills taxonomy. Month 2-3.
- **Phase 6** (recruiter tier B2B) — biggest ARPU but biggest scope. Needs compliance work first. Month 3.
- **Phase 8** (daily ops agent) — nice-to-have. Build after Phase 1 instrumentation exists for it to summarise.
- **Phase 9** (MCP server) — useful for power users but no near-term revenue impact.
- **Phase 10** (skills, slash commands, hooks) — Anthropic-internal tooling. No customer-facing impact.

---

## Open decisions needed before week 1 starts

| Decision | Recommended default | Cost of wrong choice |
| --- | --- | --- |
| Captcha provider | **Cloudflare Turnstile** (free, lower friction than hCaptcha) | Easy to swap |
| Embeddings (when Phase 5 starts) | **Voyage `voyage-3-lite`** | Easy to swap |
| WhatsApp provider (Phase 6) | **Meta Cloud API** (cheaper than Twilio for this region) | Medium — vendor lock |
| Tier flag refactor | **New tier `recruiter`, deprecate `is_pro` long-term** | Significant — start sooner |
| Free-tier daily cap | **3 anonymous, 10 signed-in (per Master Prompt cost table)** | Easy to tune |
| Paid model upgrade | **Sonnet 4.6 for paid scan + cover letter; Haiku for free** | Tunable |

If no answer in this session, proceed with defaults.

---

## What I will NOT touch without explicit approval

Per CLAUDE.md and memory:
- No `App.js` changes in Cursor.
- No new Stripe / non-Ziina payment integration.
- No client-side Anthropic calls.
- No template count claims in marketing copy.
- No specific employer / institution names in marketing copy.
- No `transition: all`. No purple.
- Public/free routes stay outside `ProtectedRoute`.
- No npm audit fix --force.

Phase 0 ends here. Awaiting your nod on Phase 1 + Phase 3 — or a redirect.
