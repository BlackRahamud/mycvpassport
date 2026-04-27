# mycvpassport.com — Gap Analysis

*Snapshot 2026-04-27. Grounded in actual repo state, not speculation. Pair with `ARCHITECTURE.md` and `COMPETITOR_AUDIT.md`.*

---

## ⚠️ Headline finding — the ATS scan is fake on both tiers

The single most important defect, ahead of every other gap:

### Free tier — does not look at the CV

`src/ATSChecker.jsx:403-482`. Free flow ignores the uploaded file entirely:
- With **no JD**: hardcoded `keywordsScore: 65, structureScore: 70, contentScore: 75, score: 70, topPercent: 42, missingCount: 5`. The `visibilityBoosters` and `rankTriggers` are sliced from the first 30 entries of `Object.values(skillSuggestions).flatMap(p => p.atsKeywords)`. Same output for every user, every CV, every session.
- With a JD: substring match of JD against `skillSuggestions[detectRole(jd)].atsKeywords`. Score is a function of JD only — the user's CV is never read.

The "uploaded file" is never opened. The user sees a believable-looking score and "boosters/triggers" derived from a 6-role hardcoded keyword bank.

### Paid tier — Anthropic is hallucinating

`supabase/functions/analyze-cv/index.ts:23`:

```ts
CV Content (base64): ${fileBase64?.substring(0, 500)}...
```

The prompt sends the **first 500 characters of the base64-encoded file** — about 375 bytes of binary garbage that is opaque to the model. Claude Haiku is then asked to score this "CV" against the JD and return scores + booster/trigger keywords + industry. The output is invented. There is no parsing step, no text extraction, no structured CV input. The 6-second artificial delay (`ATSChecker.jsx:555`) makes it feel like real work is happening.

This is the root cause of the "too generic / not converting" complaint. **Both tiers are theatre.**

### Implication for the upgrade plan
Every other Anthropic-driven module (cover letter, parse-resume, future Deep Match Report, future Bilingual Rewrite) needs CV text to be real. Fix the parsing pipeline first; everything else inherits the win.

---

## 1. Parsing gaps

| # | Gap | Where | Severity |
| --- | --- | --- | --- |
| 1.1 | `analyze-cv` Edge Function never extracts CV text. | `supabase/functions/analyze-cv/index.ts:23` | **Critical** |
| 1.2 | No server-side PDF text extraction. The frontend uses `mammoth` for DOCX (`api/cover-letter.js` flow), but PDF is "not extracted in-browser here (avoids bundling pdfjs-dist)" and there's no server fallback. PDF uploads to ATS scanner are silently lost. | `src/pages/CoverLetterPage.jsx:60-61` | **Critical** |
| 1.3 | `parse-resume.js` exists and works (Haiku, returns structured JSON) but is gated to `is_pro` only. The parser the ATS scanner needs is sitting unused for the free tier. | `api/parse-resume.js:67-79` | **High** |
| 1.4 | No structured-output schema enforcement (Zod / JSON Schema with `tools` block). Parser asks for "STRICT JSON" in plain text and parses with `JSON.parse(...)` — silent failure on malformed responses (`api/parse-resume.js:132-133`). | `api/parse-resume.js`, `analyze-cv/index.ts:54-55` | **High** |
| 1.5 | No bilingual / script detection. Arabic, Hindi, Devanagari, Urdu, Malayalam, Tamil — none. | repo-wide | **High** |
| 1.6 | No Arabic name normalisation. Mohammed / Muhammad / Mohamed / محمد all become four candidates. Dedupe is impossible. | repo-wide | **High** |
| 1.7 | No ID-format validation for Iqama (KSA, 10-digit), EID (UAE, 784-YYYY-NNNNNNN-D), QID (Qatar, 11-digit), or Aadhaar masking. | repo-wide | **Medium** (S to ship, big trust win) |
| 1.8 | No nationality / current-country / visa-status capture in builder forms. Surfacing this is mandatory for any Gulf-corridor feature. | `src/pages/BuilderPage.jsx` | **High** |
| 1.9 | No eval harness. Parser regressions invisible until users complain. | `tests/` | **High** |

---

## 2. Matching gaps

| # | Gap | Where | Severity |
| --- | --- | --- | --- |
| 2.1 | Matching is lexical substring only — `jdLower.includes(keyword.toLowerCase())`. No stemming, no synonyms, no embeddings. "Senior Software Engineer" doesn't match "Snr SWE". | `src/ATSChecker.jsx:451`, `src/JobMatch.jsx:86-94` | **High** |
| 2.2 | No `pgvector` / dense embeddings on CV or JD. No semantic search anywhere. | `supabase/migrations/*` | **High** |
| 2.3 | The "data bank" is 6 roles in `src/data/skillSuggestions.js` (it_support, banking_finance, hospitality, sales_real_estate, hr_recruitment, accounting_finance). No construction trades, no healthcare, no aviation, no oil-and-gas, no logistics, no F&B, no retail, no domestic services. The Gulf labour market is dominated by exactly those missing categories. | `src/data/skillSuggestions.js` | **Critical** |
| 2.4 | `detectRole(jd)` falls back to `"sales_real_estate"` for unknown JDs. Every unrecognised JD is silently scored against a real-estate sales keyword pack. | `src/ATSChecker.jsx:443` | **High** |
| 2.5 | Job Match is keyword-only against a JSON file at `/cvpassport_keywords.json`. No Anthropic call. Paywall is cosmetic — there's nothing premium to gate yet. | `src/JobMatch.jsx` | **Medium** |
| 2.6 | No multi-JD ranking. A user who pastes 5 JDs has to scan one at a time. | repo-wide | **Medium** (high paid-tier upsell) |

---

## 3. Scan output gaps

| # | Gap | Where | Severity |
| --- | --- | --- | --- |
| 3.1 | Output is 3 sub-scores + 8 boosters + 8 triggers. No evidence quotes from the CV ("you wrote X — try Y"). No reasoning, no specificity. | `analyze-cv/index.ts:25-36` | **Critical for conversion** |
| 3.2 | No "what to fix in 5 minutes" call-to-action. Free tier ends with an unconvincing score and a paywall. | `src/ATSChecker.jsx` | **High** |
| 3.3 | No "unlock to see" teaser — the master prompt's recommended conversion lever (`Phase 1`) is not implemented. Free output is the final word, not a wedge. | `src/ATSChecker.jsx` | **High** |
| 3.4 | No bilingual headline output (English + Arabic) for the Gulf-bound Indian user — this is the killer free-tier giveaway. | repo-wide | **Medium** |
| 3.5 | No share-friendly result page. No OG tags on a per-result URL. Users can't share their score on LinkedIn / WhatsApp — that's free distribution we're leaving on the table. | repo-wide | **Medium** |
| 3.6 | No confidence band on the score. A "76" looks identical to "76 ± 2" or "76 ± 18" — no uncertainty surfaced. | `analyze-cv/index.ts` | **Low** |
| 3.7 | Industry detection returns `"General GCC Market"` whenever there's no JD (`ATSChecker.jsx:426`). Not a useful classification. | same | **Low** |

---

## 4. Data bank gaps

| # | Gap | Where | Severity |
| --- | --- | --- | --- |
| 4.1 | "Candidate data bank" today = 6-role keyword JSON in `src/data/skillSuggestions.js` + per-template dummy profiles. There is no actual candidate intelligence layer. | `src/data/skillSuggestions.js` | **Critical** |
| 4.2 | CVs persist as one JSONB blob in `cvs.cv_data`. No column-level structured fields (skills array, seniority, industry, location). Cannot query "all candidates with Malayalam + nursing licence in Riyadh" without re-parsing every blob. | `src/resumeDb.js`, `001_hr_jobs_schema.sql` | **High** |
| 4.3 | No re-parse / backfill mechanism. New parser improvements don't propagate to existing CVs. | repo-wide | **High** |
| 4.4 | No candidate-similarity search ("show me 20 more like this hire"). No saved-search subscriptions. | `001_hr_jobs_schema.sql` | **Medium** (recruiter-tier killer feature) |
| 4.5 | No stale-flag — visa/passport/Iqama expiry awareness. Re-engagement opportunity sitting unbuilt. | repo-wide | **Medium** |
| 4.6 | No Gulf-relevant skills taxonomy (ONET-equivalent + GCC trades + healthcare licensing + hospitality cluster + aviation + driver categories LMV/HMV/HTV). | `src/data/skillSuggestions.js` | **High** |
| 4.7 | `ats_scans_used` column exists on profiles but is not incremented anywhere in the scan flow — free-tier rate limit is unenforced. | `add_ats_scans_used_to_profiles.sql` vs `src/ATSChecker.jsx` | **High** (open spend abuse) |

---

## 5. Paywall UX gaps

| # | Gap | Where | Severity |
| --- | --- | --- | --- |
| 5.1 | **Three overlapping flag systems** (`is_pro`, `plan`, `features`). Any new feature has to handle all three. `is_pro: true` short-circuits per-feature checks — once Pro, you implicitly have every per-feature unlock too. | `src/utils/paywall.js:25`, `src/services/gatekeeper.js` | **High** (refactor before scaling) |
| 5.2 | Free user hits the paywall with no preview of paid output. "Get Cover Letter AED 10" is the upsell, but the user never sees what AED 10 actually buys — no blurred sample, no testimonial, no concrete deliverable. | `src/CoverLetterModal.jsx`, `src/ATSChecker.jsx` | **High** |
| 5.3 | No conversion analytics on the paywall path. PostHog is wired but custom events for `paywall_view`, `paywall_unlock_clicked`, `payment_initiated`, `payment_completed` are sparse. The funnel is invisible. | `src/lib/analytics/posthog.js` | **High** |
| 5.4 | No A/B framework for paywall copy or price points. Every test requires a code change + redeploy. | repo-wide | **Medium** |
| 5.5 | Cover Letter tab in guide mode opens modal regardless of `hasCoverLetterAccess` (per CLAUDE.md). Behaviour is documented but the paywall logic is bypassed in guide mode — confirm intent before charging. | `src/components/FAB/FABGuideSteps.js` | **Low** |

---

## 6. Compliance & trust gaps

| # | Gap | Where | Severity |
| --- | --- | --- | --- |
| 6.1 | No data-protection / region awareness. Saudi PDPL, UAE PDPL, Qatar PDPL, India DPDP Act all impose audit, RTBF, residency rules. Single Singapore region; no KSA-pinning option. | infra | **High** (B2B blocker) |
| 6.2 | No PII redaction layer. Passport, Aadhaar, Iqama, EID, QID numbers go unmasked into prompts and logs. **Aadhaar in particular must never persist in full** — masking required. | repo-wide | **Critical** before recruiter-tier launch |
| 6.3 | No audit log on candidate-touching actions (recruiter views CV, contacts candidate, exports shortlist). | repo-wide | **High** |
| 6.4 | No bias guardrails. If a recruiter filters by nationality / religion / marital status, there's no `legal_basis` capture or human-review flag. UAE / KSA / Qatar regulators are increasingly active here. | repo-wide | **High** before recruiter-tier launch |
| 6.5 | No RTBF endpoint or self-serve account deletion that propagates beyond `auth.users` (CVs, ats_results, applications, candidate_events all need cascade). | repo-wide | **High** |
| 6.6 | RLS policies for `001_hr_jobs_schema.sql` tables not visible in the migration files I read. Confirm policies exist before scaling. | `supabase/migrations/*` | **Critical** (verify) |

---

## 7. Anthropic spend & cost-control gaps

| # | Gap | Where | Severity |
| --- | --- | --- | --- |
| 7.1 | **No prompt caching anywhere.** JD text + system prompt are re-sent on every call. If 100 users target the same JD, that's 100× billing. CLAUDE-Haiku 4.5 supports `cache_control` blocks. Easy 60-80% cost reduction. | all 3 call sites | **Critical** |
| 7.2 | **No rate limiting.** No per-IP, per-user, or per-day caps. Anonymous endpoint `analyze-cv` is fully open. | `analyze-cv/index.ts` | **Critical** |
| 7.3 | **No abuse prevention.** No Turnstile / hCaptcha / honeypot on `analyze-cv` or `cover-letter`. A single curl loop empties the API budget. | repo-wide | **Critical** |
| 7.4 | **No model routing.** All three call sites hardcode `claude-haiku-4-5-20251001`. There's no helper that takes (tier, task) → model. Sonnet/Opus paid-tier upgrades require code changes per call site. | all 3 call sites | **High** |
| 7.5 | **No token / cost logging.** Anthropic responses include `usage.input_tokens` and `usage.output_tokens` — discarded. No daily spend dashboard. | all 3 call sites | **High** |
| 7.6 | `max_tokens: 1000` on `analyze-cv`, `max_tokens: 1200` on `parse-resume`, `max_tokens: 450` on `cover-letter`. Truncation risks on long CVs are real but invisible (no logging). | call sites | **Medium** |

---

## 8. India ↔ Gulf migration corridor gaps (the moat)

This is the biggest commercial gap. **Zero of these features exist today.**

| # | Feature | Effort | Severity |
| --- | --- | --- | --- |
| 8.1 | MOFA / MEA attestation roadmap — state-by-state India → KSA / UAE / Qatar. | S (content + decision tree) | **Critical moat** |
| 8.2 | Indian degree → Saudi MOFA / UAE MoE / Qatar MoEHE equivalency mapping. AICTE / UGC / NMC / NCISM lookup. | M | **High moat** |
| 8.3 | POE eCard / ECR vs ECNR awareness — auto-flag ECR passports going to KSA / UAE / Qatar / Kuwait / Bahrain / Oman. | S | **High moat** |
| 8.4 | Trade test certificate awareness — welder, electrician, HGV driver, AC tech, scaffolder. NSDC / BECIL test centres. The entire blue-collar Gulf migration market is invisible to current product. | M | **High moat** |
| 8.5 | Salary translator: ₹X CTC India → SAR/AED/QAR package (basic + 25% housing + 10% transport + EOSB at year 2/5/10 + family/schooling + savings ratio + PPP comparison). | M | **Killer free-tool moat** |
| 8.6 | Bilingual CV — Arabic ↔ English ↔ Hindi. Proper RTL layout. Name transliteration table (محمد ↔ Mohammed ↔ मोहम्मद). | M | **High moat** |
| 8.7 | Iqama / EID / QID format validation + Aadhaar masking. | S | **Quick trust win** |
| 8.8 | Saudization / Emiratisation / Qatarization quota awareness — flag when target role is closed to expats (e.g. KSA HR Manager). | M | **Medium moat** |
| 8.9 | Visa explainer (work vs visit vs family vs free zone, transferable vs non-transferable, NOC requirements per country) in EN / AR / HI. | S–M | **Medium moat** |
| 8.10 | Indian regional language proficiency capture (Malayalam, Tamil, Telugu, Urdu, Bengali, Punjabi, Marathi, Kannada). Critical for camp/site-team clustering on blue-collar hires. | S | **Quick win, no competitor ships it** |
| 8.11 | Healthcare licensing roadmap (DHA / HAAD / MOH UAE; SCFHS KSA; QCHP Qatar; Prometric exam logistics). | L | **High-value vertical** |
| 8.12 | City fit guide — cost-of-living + commute + schooling + climate, Riyadh vs Jeddah vs Dubai vs Sharjah vs Abu Dhabi vs Doha. | S (content) | **Medium moat** |

---

## 9. Recruiter-side gaps

`/hr` route + `HRPortal` + `hr_profiles` + `jobs` + `applications` tables exist. The B2B side is scaffolded but not commercial.

| # | Gap | Severity |
| --- | --- | --- |
| 9.1 | No bulk CV upload (zip / folder / email-forward inbox). | High |
| 9.2 | No multi-candidate ranking against a JD. | High |
| 9.3 | No nationalisation quota tracker (Nitaqat / Emiratisation / Qatarization / Omanization / Bahrainization / Kuwaitization). | High |
| 9.4 | No shortlist optimizer balancing score + quota compliance. | Medium |
| 9.5 | No WhatsApp Business outreach. Bilingual templates, Friday/Saturday weekend logic, Hijri date awareness for KSA. | Medium |
| 9.6 | No bilingual offer-letter generator (DOCX). | Medium |
| 9.7 | No white-label option (recruiter logo on candidate-facing scan reports). | Low |
| 9.8 | Recruiter pricing: nothing visible in `Pricing.jsx`. B2B is the highest-ARPU lane in this market (Bayt CV Search AED 3-12k/month, Naukri Resdex ₹55k-3Cr/year). Currently zero monetisation. | **Critical** |

---

## 10. Comms & engagement gaps

| # | Gap | Severity |
| --- | --- | --- |
| 10.1 | No outreach pack — recruiter DM + WhatsApp + follow-up template, bilingual, tone-tuned. | Medium |
| 10.2 | No interview prep pack — JD-specific questions, Gulf cultural / behavioural set, model answers. | Medium |
| 10.3 | No expiry / re-engagement emails (CV stale > 6mo, visa < 90 days). | Medium |
| 10.4 | No daily ops digest to founder (signups, conversions, refunds, errors, Anthropic spend). The `daily_ops` agent in the master prompt's Phase 8 is unbuilt. | Medium |

---

## 11. Operational hygiene gaps

| # | Gap | Severity |
| --- | --- | --- |
| 11.1 | Two motion libs installed (`framer-motion` + `motion`). Bundle bloat. Pick one. | Low |
| 11.2 | `Pricing.jsx` (root) and `pages/PricingPage.jsx` both exist. Confirm one is dead and delete. | Low |
| 11.3 | `AdminPanel.jsx` and `AdminPanelV2.jsx` both exist; routing only points to V2. Delete V1. | Low |
| 11.4 | No CI on `npm run lint`, `npm run build`, or Playwright suite — manual per CLAUDE.md. Husky catches commit-time lint only. | Medium |
| 11.5 | Three analytics stacks (PostHog + GA4 + Vercel Analytics). Pick one funnel definition; let the others co-exist passively. | Medium |
| 11.6 | No `docs/PHASE_N.md` discipline yet — first run, no baseline. | Low (this prompt fixes it) |

---

## 12. Cheapest wins ranked

If we did nothing else this month, these would unblock the most leverage. All are **S**-class engineering.

1. **Fix `analyze-cv` to actually parse the CV.** Reuse `api/parse-resume.js` as a server-side step before the score prompt. Free tier still gets Haiku; paid gets Sonnet on the same parsed text. Without this, every other improvement on the AI side is decorative.
2. **Prompt caching + token logging on all three call sites.** ~60-80% cost reduction. One helper, three call-site swaps.
3. **Per-IP and per-user rate limit + Turnstile on `analyze-cv`.** Today the endpoint is open. One config + one middleware function.
4. **Iqama / EID / QID format validation + Indian regional language field in builder.** No competitor ships this. One day of work.
5. **Free-tier "Unlock to see" teaser block in scan output.** Convert the dead-end paywall into a wedge. The result page already exists; add the teaser card and per-tier copy.
6. **Public `/attestation` SEO tool** — state-by-state India → Gulf country attestation roadmap. Pure content + decision tree, zero AI cost. Top-of-funnel SEO gold.

---

## 13. What this gap analysis does NOT yet answer

These need decisions, not investigation:

- Embeddings provider: Voyage AI vs OpenAI text-embedding-3-large vs Cohere. Default recommendation: **Voyage `voyage-3-lite`** for cost, but confirm region.
- Captcha: Cloudflare Turnstile vs hCaptcha. Default recommendation: **Turnstile** (free, lower friction).
- WhatsApp provider: Meta Cloud API vs Twilio. Default recommendation: **Meta Cloud API** (cheaper in this region).
- Whether to introduce a new tier `Recruiter Pro` or extend `is_pro` semantics. Default recommendation: **new tier, new flag, deprecate `is_pro` long-term.**

If no answer comes within a session, proceed with defaults.
