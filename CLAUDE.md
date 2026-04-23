# CVPassport — Claude Code Constitution
*This is the Business Operating System for CVPassport. Every coding decision, every UI element, every fix must serve one north star: get the user hooked, keep them coming back, maximise conversions. Read this fully before touching a single file.*

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
NEVER use transition:all — explicit properties only with cubic-bezier(0.4,0,0.2,1)
NEVER open more than 2 files per Cursor prompt.
NEVER stack multiple changes in one Cursor chat — one fix at a time.

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
