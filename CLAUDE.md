# CVPassport — Claude Code Constitution
*This is the Business Operating System for CVPassport. Every coding decision, every UI element, every fix must serve one north star: get the user hooked, keep them coming back, maximise conversions. Read this fully before touching a single file.*

---

## ⚠️ Active rebuild — Phase 1 in flight (started 2026-04-27)

**Current state:** the scan pipeline is being rebuilt. Do not introduce features that depend on the old hardcoded path. New features that consume CV data must wait for the new parser (Phase 1 Day 2-3) or read it as a contract.

**Smoking gun (Phase 0 finding):** the ATS scan ignores the CV on both tiers.
- Free path (`src/ATSChecker.jsx:403-482`): hardcoded scores 65/70/75; uploaded file is never opened. Same output for every user.
- Paid path (`supabase/functions/analyze-cv/index.ts:23`): the prompt sends `fileBase64?.substring(0, 500)` — first 500 base64 chars of binary noise. Claude is hallucinating with no real input.
- The 6-second wait at `ATSChecker.jsx:555` is artificial delay to make it feel like AI work.

**Phase 1 + Phase 3 in parallel — 30 days.** Phase 1 fixes parsing + caching + rate limit + Turnstile + real free-tier output + retroactive re-scan. Phase 3 ships the corridor moat (regional-language field, ID validators, public Attestation Roadmap, CTC→Gulf Package translator). Phase 2 (paid modules), Phase 5 (embeddings), Phase 6 (recruiter B2B), Phase 8/9/10 are deferred to month 2-3.

**Branch policy.** Phase 1 work lives on `feat/upgrade-phase-1-scan-fix`, cut from `main` (not from the design-polish branch). One phase = one branch = one PR.

### Locked decisions (do not re-ask)

| Choice | Locked default |
| --- | --- |
| Captcha provider | Cloudflare Turnstile |
| Embeddings (when Phase 5 starts) | Voyage `voyage-3-lite` |
| WhatsApp provider (Phase 6) | Meta Cloud API |
| Paid scan model | `claude-sonnet-4-6` |
| Free scan model | `claude-haiku-4-5` |
| Tier refactor | Introduce `recruiter` tier; keep `is_pro` for now, plan deprecation. Schema-only change in Phase 1 — no UI break. |
| PDF text extraction | `unpdf` for native PDFs, `tesseract.js` fallback for image-only PDFs, hard-fail on encrypted PDFs |
| Eval fixtures | 15 hand-crafted synthesised + 15 real anonymised production samples (drop into `evals/scan/fixtures/` as available) |
| Retroactive re-scan email | Claude drafts, founder approves before flipping `RETRO_RESCAN_ENABLED=true` |

### Phase 0 deliverables

`docs/ARCHITECTURE.md`, `docs/GAP_ANALYSIS.md`, `docs/COMPETITOR_AUDIT.md`, `docs/RECOMMENDATION.md`. Read these before opening any Phase 1 / Phase 3 ticket.

### Eval harness — Phase 1 hard gate

`evals/scan/` runs against every Phase 1 PR. Failing the harness blocks merge. Acceptance: ≥ 90 % field accuracy, score Pearson ≥ 0.85 vs ground truth, calibration invariant `displayed_score < min(per_ats_scores)` holds for every fixture, adversarial test passes (same JD with different CVs produces different output).

### Phase 11 prep — ATS calibration

Three YAML profiles seeded in `ats_profiles/`: Workday, LinkedIn, Bayt. Fields: `parser_strictness`, `hates`, `prefers`, `keyword_match`, `scoring_weights`, `known_failure_modes`. Public stats page + validation feedback loop deferred — only the data capture and the calibration invariant are wired now.

---

## Who We Are
CVPassport (mycvpassport.com) is an ATS-focused CV builder SaaS targeting expat professionals in UAE/GCC and the India market. Solo founder.
Primary growth market: India (massive, no restrictions, path to profitability). Secondary: UAE/GCC expat corridor.
Our unique hook: We serve the India-to-Gulf migration corridor. No other CV builder owns this narrative.
Target users: South Asian expats navigating Gulf job markets.

---

## Stack
- React + Supabase + Vercel
- GitHub: BlackRahamud/mycvpassport
- Supabase: auth, database, edge functions, RLS policies
- Resend SMTP: noreply@mycvpassport.com
- Payment Gateway: Ziina only — no Stripe, no other gateway
- Anthropic API: via Supabase Edge Functions only — never client-side

---

## Deploy Protocol
npm run lint → npm run build → git add → git commit → git push
Husky blocks commit on lint failure.
Never run npm audit fix --force.
PowerShell only: no && chaining — run every command individually.

---

## Supabase
- Project ID: evihcqpvoorsdmzjnvjz (Singapore region)
- RLS must never be bypassed
- Any new table needs RLS policies before shipping
- Edge Function deployed: analyze-cv (ATS checker, Anthropic API)

---

## Design System — NON-NEGOTIABLE
Background: #0A0A0A
Surface: #141414
Elevated: #1C1C1C
Text primary: #FFFFFF
Text secondary: #A0A0A0
Border default: #2A2A2A
Accent amber: #D97706 (use sparingly — CTAs, highlights only)
Green: #1D9E75 (success, ATS pass states)
Blue: #378ADD (info, ATS check states)

NEVER use purple anywhere in the app.
Exception: the /blog content surface (BlogPage, BlogPostPage, posts.js badge tones) is exempt from the no-purple rule and may use any palette.
NEVER use transition:all — explicit properties only with cubic-bezier(0.4,0,0.2,1)
NEVER hardcode hex colors in new code — pull from the tokens above. If a needed shade isn't listed, add it to the token block first, then use the named token.
NEVER use drop-shadow for glow effects — use box-shadow with the accent color at low opacity, or a conic-gradient ring for OLED moments. Drop-shadow flattens to grey on dark surfaces.
NEVER open more than 2 files per Cursor prompt.
NEVER stack multiple changes in one Cursor chat — one fix at a time.

---

## Design Discipline

You are not just a code executor on UI tasks — you are designer + engineer. Treat every component as a marketing asset. First-pass code should ship-quality.

### Aesthetic targets
- Vercel, Linear, Raycast, Resend. When uncertain how a surface should feel, pull up one of those four mentally before writing the JSX.
- Mobile-first for new components, then desktop. Write the mobile layout first; let desktop be the override, not the default. Existing desktop-first components (BuilderPage, LandingPage, the 19 templates) are grandfathered — don't refactor unless the task is specifically a mobile rebuild.
- Conversion lens: every UI element should push toward an action (signup, build, download, upgrade). If a component has no path to an action, ask why it's there.

### Animation
- Framer Motion (v12.37, already installed) is the default for transitions, reveals, and stateful motion. Use `motion.div` over hand-rolled CSS transitions.
- Easing standard: `cubic-bezier(0.4, 0, 0.2, 1)` (also pinned in Design System).
- Reduced-motion users: respect `prefers-reduced-motion` — Framer Motion's `useReducedMotion()` hook handles this.

### No placeholder UI
- Never ship lorem ipsum, "TODO copy", greyed-out skeletons in the position where real content goes, or fake demo data (see the Finance template hardcoded-section incident — commit `0748056`).
- If the copy is unclear, **ask before building** — don't invent placeholder text and ship it.
- Empty/loading states are real UI and should be designed, not skeletoned.

### Process for UI tasks
- Read the existing component before touching it (already in Session Rules — repeated here because UI especially demands it).
- Identify what's already there vs. what's missing — design the diff, not the whole component.
- For non-trivial UI changes: describe the visual intent in one sentence in your update before writing JSX.

---

## iOS Safari Mobile CSS Rules (learned Apr 17 2026)

### The dashboard mobile overflow fix
- Root cause: `.cvp2-main` had `padding: 24px 28px` — 28px horizontal was too wide for 393px iPhone viewport
- Fix: mobile media query override to `padding: 24px 16px`
- Also: `.cvp2-card` needs `box-sizing: border-box` + `overflow: hidden` to contain progress bars and long content

### iOS Safari rules — never break these
1. Never use `100vw` — it includes scrollbar width (~15-20px). Always use `100%` instead.
2. `overflow-x: hidden` on a wrapper div does NOT stop fixed-position children from overflowing. Fixed elements escape to the viewport directly.
3. `contain: paint` causes aggressive paint clipping on Safari — avoid it on any component that has fixed-position children.
4. `translateZ(0)` forces GPU compositing but makes the element the containing block for ALL fixed-position descendants — they anchor to the element, not the viewport.
5. `DevTools mobile emulation lies.` Chrome hides scrollbar width and handles paint differently. Always test on a real device before merging CSS fixes.
6. When stuck: measure actual pixel widths in DevTools by hovering elements. Don't theorize — the numbers tell the truth.

### Debug method for mobile overflow
1. Open DevTools → iPhone emulation
2. Hover over the overflowing element
3. Read the computed width in the tooltip
4. Compare to viewport width (393px iPhone 14, 375px iPhone SE)
5. The difference = your overflow amount
6. Find which parent's padding + child's padding is stacking

### War Room method for CSS bugs
Claude.ai = strategy + diagnosis
Gemini = CSS/Safari domain expertise (ask for one fix, one element, one property)
Claude Code = executor

---

## File Architecture
- src/LandingPage.jsx — 1779 lines, main landing page
- src/HowItWorks.jsx — How It Works section (separate component)
- src/pages/BuilderPage.jsx — main CV builder, ~5000+ lines
- src/components/FAB/FAB.jsx — FAB component
- src/components/FAB/FABSheet.jsx — FAB sheet with guide steps
- src/components/FAB/FABGuideSteps.js — guide step definitions
- src/hooks/useGeoContent.js — geo-aware copy (Gulf vs India)
- src/utils/paywall.js — getPaymentLink(feature) — SOLE payment gateway
- src/CoverLetterModal.jsx — cover letter modal
- src/pages/CoverLetterPage.jsx — cover letter page
- App.js — 162 lines routing only. NEVER open App.js in Cursor.

---

## Payment Architecture
getPaymentLink(feature) in src/utils/paywall.js is the SOLE gateway.
Keys: coverLetter, expressPass, activeHunter, careerPro
Links: all Ziina URLs in ZIINA_LINKS object.
Never hardcode payment URLs anywhere else.
Never add new payment links without adding to paywall.js first.

Pricing:
- Explorer: Free
- Express Pass: AED 49 / ₹399 one-time
- Active Hunter: AED 29/mo / ₹199/mo (Most Popular)
- Career Pro: AED 199/yr / ₹999/yr

---

## What Is Built (as of Apr 14 2026)

### Landing Page (src/LandingPage.jsx)
- Desktop rebuilt Apr14: background paths + 72px headline + glassmorphism CTA
- Bento cards: Your CV + Guide Flow + ATS Check
- HowItWorks.jsx: 3 phone frames, CV rotates every 4s, pulsing field glow, ATS ring gradient
- Hamburger: nav links + "View Pricing Plans" CTA → /pricing + auth section
- Light/dark Apple-style toggle: 400ms crossfade, localStorage persistence
- Hero CTA → /signup
- No template count mentioned anywhere — say "Gulf-ready templates" not "14 templates"
- useGeoContent.js: Gulf and India geo-aware copy, Intl.DateTimeFormat timezone detection

### Builder (src/pages/BuilderPage.jsx)
- 4 tabs: Content, Templates, ATS Check, Job Match
- Download state machine: useReducer, states idle→synthesizing→generating→completed→error
- CV Preview: ResizeObserver targets outer wrapper, scale via useMemo, overflow:hidden

### FAB Guide Flow (src/components/FAB/)
- 11 steps end-to-end, all working
- Step 10: blurred cover letter preview background (builderTab="coverletter")
- Step 10 card: "Get Cover Letter AED10" + "Unlock Everything AED29/mo"
- Step 11: Download CV only, no Skip
- Cover Letter tab in guide mode opens modal regardless of hasCoverLetterAccess
- FABGuideSteps.js body text has minor pending fix: still says "Full Pro Pass AED25"

### ATS Checker (src/ATSChecker.jsx)
- Free: local databank (detectRole + skillSuggestions)
- Pro: Supabase Edge Function + Claude API when JD provided
- Score animates 0→final, chips stagger in

### Cover Letter
- src/CoverLetterModal.jsx — modal version (used in builder)
- src/pages/CoverLetterPage.jsx — standalone page
- 6 structured fields, Gulf tone / India tone
- Paywall: AED10 / ₹49, Anthropic API fires post-payment only
- "Your CV" dropdown deleted — single CV users see nothing

### Job Match Tab
- Geo-aware hero copy, amber textarea focus, live keyword counter
- Blurred preview paywall, empty state crosshair icon

### Templates Tab
- Card clip fixed (isolation:isolate, z-index:20)
- Per-template dummy profiles (5 people)
- FAB guard in 3 locations

### Email System
- Resend SMTP: noreply@mycvpassport.com
- 3 Supabase templates: confirm signup, reset password, magic link
- ResetPassword.jsx deployed

### Payments
- Ziina live: Express Pass AED49, Active Hunter AED29, Career Pro AED199, Cover Letter AED10
- SynthesisOverlay crossfades 250ms to prevent black flash

### Walk-In Mode
- 6-field rapid CV builder, dark navy header, 3px green accent stripe

### Original Applicant CV (storage-backed, added Jun 25 2026)
- The CV file uploaded in the apply form is now KEPT (was discarded). It lives in object storage; the DB keeps only a pointer.
- Private Storage bucket `applicant-cvs` (public=false). Path layout: `{candidate_uid}/{job_id}-{ts}.{ext}` — first folder segment = owner uid.
- `applications.cv_file_path text` is the pointer column (NULL for easy-apply / built-on-CVPassport candidates with no uploaded file).
- Storage RLS (migration `021_applicant_cvs_storage.sql`): candidate r/w own folder (keyed on foldername = auth.uid()); HR reads a CV only via `EXISTS` an application of theirs pointing at it — inherits the `applications` SELECT RLS, so no cross-agency leakage.
- Upload happens in `JobPage.jsx` `submitApplication` (best-effort; failure still records the app). Re-apply keeps the prior file unless a new one is uploaded. Logged-out apply can't carry the File through the `/auth` replay → persists for logged-in applicants only.
- Serve (rebuilt Jul 2 2026): `src/components/hr/CvViewerOverlay.jsx` — full-height split overlay (CV left as pdf.js canvases, candidate intelligence right: ScoreRing + VerdictCard + skills match + actions). File bytes come from `src/lib/hr/cvFile.js`: authenticated `storage.download()` (RLS-checked), blob re-typed from the extension so legacy octet-stream uploads render inline; signed URLs only feed the Download / new-tab anchors. Render chain pdf→pdf.js (lazy chunk, worker copied to public/ by `scripts/copy-pdf-worker.mjs`), docx→mammoth HTML sheet, image→img, else/failure→file card. NEVER window.open after an await anywhere in the portal (popup blockers eat it — enforced by `src/lib/gestureWindowOpen.test.js`). Overlay z-index 3500 (above kanban drawer scrim 3000, below modals 4000). Verify harness: `node scripts/verify-cv-viewer.mjs <outDir> [--browser=firefox] [--fail-storage]` drives the production build with a stubbed backend.
- Wired into BOTH HR detail panels: `CandidatesPage.jsx` (CRM) and `JobPipelinePage.jsx` (pipeline) — `cv_file_path` in each `applications` select; keep the `BulkCvImport` import BEFORE `CvViewerOverlay` in both pages (mini-css-extract order is fatal on CI).

---

## What Is Pending (build order)

1. FABGuideSteps.js — fix body text "Full Pro Pass AED25" → "Unlock Everything AED29/mo"
2. Coffee payment link — add to Ziina + paywall.js
3. CLAUDE.md commit (this file — commit after updating)
4. Dashboard redesign — full overhaul pending
5. Ghost Typing feature — FAB guided mode, character-by-character field typing
6. CV Import feature — paste CV text → Anthropic parses → auto-fills builder fields (Active Hunter+)
7. CVPassport Jobs portal — job board with HR posting + user applying (early stage, 1 HR contact)
8. Globe animation on landing page hero (deferred — complex)
9. Framework 7 — Scale System (trigger: Junaid says "hit")
10. ~~Remotion install~~ — DONE Jul 7 2026. `remotion @remotion/cli @remotion/player` installed (devDeps); project at `src/remotion/` (investor walkthrough film, 16:9 + 9:16). Captures come from `scripts/capture-investor-video.mjs` (production build + stubbed backend + Playwright, fixture data only); music bed from `scripts/make-audio.mjs`; Remotion public dir = `video-assets/` (never app `public/`). Renders land in `output/` (gitignored). Re-render: `npx remotion render src/remotion/index.js InvestorFilm output/film.mp4`.

---

## Marketing Rules (NEVER violate)
- No superlatives ("best", "most powerful", "#1")
- No unverifiable stats ("10,000 users", "98% success rate")
- Feature and process claims only ("ATS-engineered", "Gulf-market ready")
- Never name specific employers or institutions (legal risk)
- Never mention a template count — say "Gulf-ready templates" not "14 templates"
- Every CTA must have a working navigate() or onClick — zero dead buttons
- Hero CTA always → /signup for new users

### Copy / Legal
- Never reference specific institutions, banks, or government-affiliated entities by name or strong implication (e.g. "a leading UAE bank", "a national airline"). Generic industry terms are acceptable (e.g. "aviation", "banking sector", "tech hiring"). This applies to all marketing copy, landing pages, and UI text. UAE and GCC markets carry legal risk for implied partnerships.

---

## Session Rules
- Always read CLAUDE.md before starting any session
- Always read the specific file before changing it
- Never give a blind fix — analyse first
- npm run lint && npm run build before every commit
- Never commit without explicit instruction
- PowerShell: run every command individually (no && chaining)
- Max 2-3 Claude Code prompts per day
- Off-peak hours preferred: before 5pm or after 11pm Dubai time
