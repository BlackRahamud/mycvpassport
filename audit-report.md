# CVPassport — Full Site Audit Report
**Date:** 2026-04-19
**Scope:** Static code audit across 9 domains. No live browser/PDF/API tests were possible — all findings are code-level verification.
**Project root:** `C:\Users\Junaid Khan\mycvpassport\mycvpassport`

---

## Severity Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 12    |
| MEDIUM   | 19    |
| LOW      | 14    |
| **TOTAL**| **45**|

## Top CRITICAL items (action first)

1. **Secrets in repo** — `.env.local` contains `ANTHROPIC_API_KEY`, Vercel OIDC token; `.env` contains iLovePDF keys. Ensure `.gitignore` covers both and rotate all exposed keys.
2. **Webhook HMAC uses `===` (timing attack)** — `api/ziina-webhook.js:39`. Replace with `crypto.timingSafeEqual`. Exploitable: attacker can flip arbitrary users to `is_pro=true`.
3. **Hardcoded Ziina URL outside paywall gateway** — `src/components/CompletionScreen.jsx:132` violates single-gateway rule.
4. **Pricing mismatch** — Career Pro shown as `₹599/yr` in `Pricing.jsx:247` and `AccountPage.jsx:81` but `₹999/yr` in `PricingPage.jsx:136`. Canonical per CLAUDE.md: `₹999/yr`.
5. **Named employers in marketing copy** — `src/components/marketing/RejectionReel.jsx:293` ("Emirates NBD, Etihad, Careem, Swiggy, Razorpay"). Legal risk.
6. **Emoji in UI** — flag + thumbs emoji in `RejectionReel.jsx`, `CompletionScreen.jsx`, `SalarySwitcher.jsx`, `TestimonialsGrid.jsx`. CLAUDE.md mandates SVG only.
7. **BuilderPage (5,913 LOC) eagerly imported in App.js** — initial bundle bloated. Convert all routes to `React.lazy`.
8. **ATS "Unlock Full Analysis" dead-ends** — `ATSChecker.jsx:1016` redirects without an UpgradeModal confirmation.
9. **ATS checker has no empty-results state** — malformed response crashes UI.
10. **`100vw` used in 5+ places** — breaks iPhone viewport when scrollbar present.

---

# Agent 1 — User Flow Audit

## Flow 1: Homepage → /signup → build CV → download PDF
All CTAs wired. `LandingPage.jsx:1278` hero → `App.js:152` `/auth` → `AuthPage.jsx:206` → `BuilderPage.jsx:2782` `handleDownload()`. State machine complete.

- [LOW] `BuilderPage.jsx:2801-2804` — error message auto-dismisses after 3s with no retry affordance; user may miss it.

## Flow 2: Homepage → /salary-switcher → brag card
`LandingPage.jsx:1848` → `App.js:230` → `SalarySwitcher.jsx:227-345` canvas export.

- [LOW] `SalarySwitcher.jsx:333` — no error handling if `canvas.toBlob()` fails. Silent failure possible.

## Flow 3: Homepage → ATS checker
Navigation wired. Error states present for file upload.

- [CRITICAL] `ATSChecker.jsx` — no fallback when API returns no/malformed analysis. UI renders `undefined`/`null` and hangs. No empty-result branch.

## Flow 4: Homepage → LinkedIn optimizer
4-state machine present at `LinkedInOptimizer.jsx:461`. Error state wired.

- [MEDIUM] `LinkedInOptimizer.jsx:524` — blank-input feedback unclear. Submit button not visibly disabled, no inline error message visible in code path.

## Flow 5: Homepage → /pricing → plan cards
Route + CTAs wired. Success overlay for `?payment=success` at `PricingPage.jsx:174-234`.

- [MEDIUM] `PricingPage.jsx:163` — `getPaymentLink()` returning null results in silent `window.location.href = undefined`. No user feedback on payment-link failure.

---

# Agent 2 — Mobile Audit (iPhone 14 / 393px)

## CRITICAL
- [CRITICAL] `100vw` overflow risk in 5 locations: `src/components/FAB/FAB.css:310`, `src/index.css:798`, `src/components/MobileTabBar.jsx:80` (inline), `BuilderPage.jsx` (inline), `HRPortal.jsx` (inline). CLAUDE.md forbids `100vw` — must be `100%`.

## MEDIUM
- [MEDIUM] `src/components/FAB/FAB.css:217-218` — `.cvp-fab-menu-icon-btn` is 36×36px (below 44×44 WCAG minimum).
- [MEDIUM] `src/index.css:904` — `.cvp-templates-preview-close` is 32×32px.

## LOW
- [LOW] `src/components/MiniToolCard.jsx:155-257` — component lacks own mobile media query; depends on parent grid.
- [LOW] No 393px-specific breakpoint (handled by 768px query — acceptable).

## Confirmed PASS
- `.cvp2-main` mobile padding fix in place (`DashboardPage.css:31` = `padding: 24px 16px !important`).
- `.cvp2-card` has `box-sizing: border-box; overflow: hidden` at `DashboardPage.css:32`.
- Global `input, textarea, select { font-size: 16px !important }` at `index.css:91` — iOS zoom prevention confirmed.
- Bottom tab bar `z-index: 60` + `safe-area-inset-bottom` at `index.css:454`.
- FAB primary button 44×44 / 56×56 at `FAB.css:425-467`.
- No `contain: paint` anywhere.
- `translateZ(0)` only on layout roots (no fixed-position descendant trapping).

---

# Agent 3 — Console + Error Audit

## CRITICAL
- [CRITICAL] `.env.local:2` — `ANTHROPIC_API_KEY="sk-ant-api03-..."` present client-side. Violates CLAUDE.md rule "Anthropic API via Supabase Edge Functions only — never client-side."
- [CRITICAL] `.env:1-2` — `ILOVEPDF_PUBLIC_KEY` and `ILOVEPDF_SECRET_KEY` in tracked `.env`. Check `.gitignore`; rotate keys.
- [CRITICAL] `.env.local:5` — Vercel OIDC token stored locally. Infrastructure provisioning token; rotate if shared.

## MEDIUM
- [MEDIUM] `src/pages/PricingPage.jsx:42-49` — `supabase.auth.getUser().then(...)` with chained `.from("profiles").select()` — no `.catch()` on either. Silent failures on network error.
- [MEDIUM] `src/pages/PricingPage.jsx:45` — accesses `data.user.id` without null guard.
- [MEDIUM] `src/pages/PricingPage.jsx:34-39` — `fetch("https://ipapi.co/json/")` state-update not guarded against unmount (race condition on fast navigation).
- [MEDIUM] `src/utils/paywall.js:16` — `await res.json()` without `.catch()` wrapper.

## LOW
- [LOW] `src/CoverLetterModal.jsx:28` — localStorage read without try/catch (Safari private mode throws).
- [LOW] `src/downloadResumeFromPreview.js:93` — `console.error` in success path (noisy logs).
- [LOW] `src/AdminPanel.jsx:659` — `.map` with stable label keys; fine but flagged for audit completeness.

---

# Agent 4 — Performance Audit

## CRITICAL
- [CRITICAL] `src/App.js:6-26` — 19 page components imported eagerly. **BuilderPage.jsx is 5,913 lines** and loads on first paint regardless of route. Convert to `React.lazy()` + `<Suspense>`.

## MEDIUM
- [MEDIUM] `src/App.js:109-244` — no `<Suspense>` boundary around routes (required once lazy is introduced).
- [MEDIUM] `public/index.html:26` — `pdf.js@3.4.120` loaded synchronously via CDN. Move to dynamic import inside file-upload path.

## LOW
- [LOW] No `loading="lazy"` on below-fold `<img>` tags (most imagery is inline SVG — minor).

## Passing
- `font-display: swap` set (`index.css:1`).
- No moment.js, no full lodash, no pdfmake/html2canvas/jspdf bundled (pdf-lib only).

---

# Agent 5 — Copy + Trust Audit

## CRITICAL
- [CRITICAL] `src/components/marketing/RejectionReel.jsx:293` — names "Emirates NBD, Etihad, Careem, Swiggy, Razorpay". Legal risk per CLAUDE.md.
- [CRITICAL] Emoji in UI (inline SVG required):
  - `src/components/marketing/RejectionReel.jsx:27-42` — flag emoji `🇦🇪`, `🇮🇳` in candidate data (9 occurrences).
  - `src/components/CompletionScreen.jsx:97-98` — `👍` / `👎` feedback buttons.
  - `src/pages/SalarySwitcher.jsx:458` — `🇦🇪`.
  - `src/components/marketing/TestimonialsGrid.jsx:36, 46` — flag emoji.
- [CRITICAL] Pricing inconsistency (Career Pro annual):
  - `src/Pricing.jsx:247` → `₹599/year`
  - `src/pages/PricingPage.jsx:136` → `₹999/year` (canonical)
  - `src/pages/AccountPage.jsx:81` → `₹599/yr`
  - Standardize to `₹999/yr`.

## MEDIUM
- [MEDIUM] Unverifiable stat "2,400+ CVs" appears in:
  - `src/hooks/useGeoContent.js:19, 39`
  - `src/pages/AuthPage.jsx:79`
  - `src/pages/PricingPage.jsx:579`
- [MEDIUM] `src/Pricing.jsx:168` — `tagline: "Most value for active job seekers"` — "Most" is a banned superlative.
- [MEDIUM] `src/UpgradeModal.jsx:37` — "3x more callbacks" is unverifiable.

## LOW
- [LOW] `src/pages/BuilderPage.jsx:2747` — TODO comment (not user-visible).
- [LOW] `src/CoverLetterModal.jsx:289` — placeholder `"e.g. Emirates NBD"` (example text, not marketing claim).

---

# Agent 6 — Payments Dry-Run Audit

## CRITICAL
- [CRITICAL] `api/ziina-webhook.js:39` — HMAC signature comparison uses `!==` string compare, not `crypto.timingSafeEqual`. Timing-attack vulnerable: attacker can forge signatures and flip arbitrary users to `is_pro=true`.
- [CRITICAL] `src/components/CompletionScreen.jsx:132` — hardcoded Ziina donation URL `https://pay.ziina.com/mycvpassport/WNqwzohwg` outside `paywall.js`. Violates single-gateway rule.

## MEDIUM
- [MEDIUM] `src/pages/PaymentSuccess.jsx:74-107` — client writes `is_pro` directly after redirect. No polling/retry loop to confirm webhook actually fired. Race: user sees success even if webhook failed.
- [MEDIUM] `api/create-ziina-payment.js:1-60` — no `is_pro` check before creating a new payment intent. Pro users can re-pay (double-charge risk).
- [MEDIUM] `src/utils/paywall.js:1-21` — no server-side pro-user guard. Client logic only.

## LOW
- [LOW] Pro badge on sidebar / dashboard fetches `is_pro` via `useEffect` — no real-time Supabase subscription. Post-payment badge may lag 5–30s until page reload.

## Confirmed PASS
- `PricingPage.jsx:64-153` — 4 plan cards render with correct prices.
- `PaymentTrustBar.jsx` imported in `PricingPage`, `CompletionScreen`, `LandingPage` — Apple Pay, Ziina, Visa, Mastercard icons present.
- `paywall.js` is the single entry point; `api/create-ziina-payment.js:41` reads `ZIINA_API_TOKEN` from `process.env` (not hardcoded).
- `api/ziina-webhook.js:32` reads `ZIINA_WEBHOOK_SECRET` from `process.env`.
- `is_pro` flip logic present at `ziina-webhook.js:135`.
- No Ziina secrets in `.env` / `.env.local`.

---

# Agent 7 — Template PDF Audit (T1–T18)

All 18 templates exist in `src/`:

| # | File | Primary Export |
|---|------|----------------|
| T1 | Template1ModernEmerald.js | PreviewModernEmerald |
| T2 | Template2DubaiModern.js | PreviewTwoCol |
| T3 | Template3ArabiaPro.js | PreviewSidebar |
| T4 | Template4ExecutiveGold.js | PreviewSlateMinimalist |
| T5 | Template5GulfExecutive.js | PreviewEditorialDark |
| T6 | Template6BankingFinance.js | PreviewBankingFinance |
| T7 | Template7CompactPro.js | PreviewCompactPro |
| T8 | Template8CreativeSidebar.js | PreviewCreativeSidebar |
| T9 | Template9Hospitality.js | PreviewHospitality |
| T10 | Template10ATSInternational.js | PreviewATSInternational |
| T11 | Template11TechITPro.js | PreviewTechITPro + stripe post-processor |
| T12 | Template12Split.js | Template12Split |
| T13 | Template13Finance.js | PreviewFinance |
| T14 | Template14.js | TimelineTemplate |
| T15 | Template15.js | PreviewSlateCarbon |
| T16 | Template16.js | PreviewCrimsonEdge |
| T17 | Template17.js | PreviewForestPro |
| T18 | Template18.js | PreviewMidnightGold |

## Findings
- GhostChips (`src/components/GhostChip.jsx`) — `position: absolute`, `scale(0.01)`, `color: transparent`, `aria-hidden="true"`. Used in all 18 templates. [PASS]
- T11 sidebar stripe post-processor at `src/serverLib/pdfDrawT11SidebarStripe.js` — loops `for i < pageCount` (line 39), draws sidebar on every page; accent bar page-1 only by design. [PASS]
- No duplicate contact block on page 2 detected statically.
- 68 `pageBreakInside: "avoid"` occurrences across templates. [PASS]
- [MEDIUM] Templates use system font stacks only (Arial/Helvetica/Georgia/Inter fallbacks). No `@font-face` or web-font imports — visual consistency risk across OSes.
- [LOW] No `@import` of Google/brand fonts in template files.

**Note:** Actual PDF rendering was not executed. Visual fidelity, overflow on multi-page CVs, and page-2 header duplication can only be confirmed by running `downloadResumeFromPreview` against each template.

---

# Agent 8 — API Firing Audit

## Canonical model check
All Anthropic calls use `claude-haiku-4-5-20251001`. No deprecated `claude-3-*`, `claude-2`, `claude-instant`, or `claude-sonnet-3-*` strings found anywhere in src/ or api/. [PASS]

## Client-side Anthropic check
Zero direct calls to `api.anthropic.com` from `src/**`. All go through `/api/cover-letter`, `/api/generate-linkedin-headline`, `/api/parse-resume`. [PASS]

## Integrations verified
| # | Flow | Status |
|---|------|--------|
| 1 | Cover letter (`/api/cover-letter` → Claude) | [PASS] — model correct, retry+countdown wired |
| 2 | 529 retry wrapper (3 attempts, 10s backoff) | [PASS] |
| 3 | LinkedIn headline (`/api/generate-linkedin-headline`) | [PASS] |
| 4 | Resume parse (`/api/parse-resume`) | [PASS] |
| 5 | Supabase auth signup/login/logout + `onAuthStateChange` | [PASS] — `useCvpAuth.js:122` listener + cleanup |
| 6 | User-type routing (recruiter → /hr, else → /dashboard) | [PASS] — `useCvpAuth.js:155-175` |
| 7 | Pro status fetch on protected routes | [PASS] — fallback to FREE on error |
| 8 | CV CRUD with RLS filters `.eq("user_id", userId)` | [PASS] |
| 9 | ATS results storage (`ats_results` insert) | [PASS] |
| 10 | Profile read (`user_type`, `full_name`) | [PASS] |
| 11 | `analyze-cv` edge function invocation | [PASS] — error state wired |

## LOW observations
- [LOW] `ATSChecker.jsx:534` — ATS result insert is fire-and-forget (failure silently logged).
- [LOW] Countdown copy says "Anthropic AI is crafting thousands" — doesn't inform user it's a retry.
- [LOW] `api/parse-resume.js:111` — generic 502 on JSON parse failure.
- [LOW] `/api/generate-linkedin-headline` — no server-side auth check; relies on client paywall gate.

---

# Agent 9 — Post-Action UX Audit

## CV Download [HEALTHY]
- State machine (`BuilderPage.jsx:2102-2121`): `idle → synthesizing → generating → completed → error`. Reset after 3s. All triggers disable button during generation.
- [LOW] No toast on successful download.

## ATS Scan [CRITICAL]
- Score 0→final animation at `ATSChecker.jsx:211-269` (easeOutCubic 1500ms). [PASS]
- Chip stagger (50ms per index) at lines 896, 924. [PASS]
- [CRITICAL] "Unlock Full Analysis" button at `ATSChecker.jsx:1016` calls `handleUnlock` which calls `getPaymentLink('ats', ...)` — but NO `UpgradeModal` imported/rendered. User is redirected straight to payment URL with no pre-checkout confirmation. Compare `CoverLetterModal.jsx:363` which correctly wires `<UpgradeModal isOpen={showPaywall} feature="coverLetter" />`.
- Free vs pro gating is otherwise correct (`ATSChecker.jsx:386-390`, `946-1050`).

## Cover Letter [HEALTHY — known bugs RESOLVED]
- A4 preview at `serverLib/coverLetterHtml.js:53` (`width: 210mm; min-height: 297mm; max-height: 297mm`).
- Sticky action bar at `CoverLetterModal.jsx:342-358`. [PASS]
- **Duplicate contact block — RESOLVED** — `coverLetterHtml.js:24-29` strips the initial name|email|phone|location line before rendering.
- **Orphaned signature — RESOLVED** — single-page `max-height: 297mm` + `orphans: 3; widows: 3` at line 61.

## Salary Switcher [HEALTHY]
- Canvas 1080×1920 at `SalarySwitcher.jsx:232, 573`. PNG export at line 333. [PASS]
- ATS meter 30→92% at `SalarySwitcher.jsx:348-362` (interval +4 per 24ms). Navigates to `/builder` after 700ms. [PASS]

## LinkedIn Optimizer [MEDIUM]
- 4-step UI markers present at `LinkedInOptimizer.jsx:133`.
- [MEDIUM] Ziina paywall trigger state and post-pay unlock logic could not be fully verified in file excerpt. Needs manual end-to-end test.

## Sign Up [HEALTHY]
- `useCvpAuth.js:242` — post-signup navigates to `/?welcome=true` (job seeker) or `/?welcome=true&type=hr` (recruiter).
- `LandingPage.jsx:634-657` — listens for `?welcome=true`, reads `firstName` from profile, shows 4s toast, cleans query param. [PASS]
- Hero personalization at `LandingPage.jsx:661-665, 1558`. [PASS]
- user_type routing at `useCvpAuth.js:162-165`. [PASS]

---

# Manual-testing recommendations

These could not be verified statically and need a real device / browser:

1. Download each of T1–T18 with a full test payload and inspect PDFs for page-2 overflow, orphaned headings, duplicate contact blocks.
2. Run the app at 393px on a real iPhone (DevTools emulation lies per CLAUDE.md) to confirm the `100vw` hits actually overflow.
3. Fire an end-to-end Ziina payment in sandbox, watch the webhook log, and confirm `is_pro` flips correctly.
4. Time the Claude cover-letter call end-to-end to confirm the 529 retry UX is acceptable on a real overload.
5. Reproduce the ATS `handleUnlock` flow to confirm the missing UpgradeModal is in fact user-facing.
