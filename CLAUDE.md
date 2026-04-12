# CVPassport — Claude Code Constitution
*This is the Business Operating System for CVPassport. Every coding 
decision, every UI element, every fix must serve one north star: get 
the user hooked, keep them coming back, maximise conversions. Read this 
fully before touching a single file.*

---

## Who We Are
CVPassport (mycvpassport.com) is an ATS-focused CV builder SaaS targeting 
expat professionals in UAE/GCC and the India market. Solo founder. 
Primary growth market: India (massive, no restrictions, path to 
profitability). Secondary: UAE/GCC expat corridor.

Our unique hook: We serve the India-to-Gulf migration corridor. No other 
CV builder owns this narrative. Every product decision must reinforce it.

Target users: South Asian expats navigating Gulf job markets. The founder 
IS the target user — this is a core product advantage.

---

## Stack
- React + Supabase + Vercel
- GitHub: BlackRahamud/mycvpassport
- Supabase: auth, database, edge functions, RLS policies
- Resend SMTP: noreply@mycvpassport.com for all emails
- Payment Gateway: Ziina only — no Stripe, no other gateway until 
  explicitly instructed
- Anthropic API: via Supabase Edge Functions only — never client-side

---

## Deploy Protocol
npm run lint → npm run build → git add → git commit → git push
Husky blocks commit on lint failure.
Never run npm audit fix --force.
PowerShell only: no && chaining — run every command individually.

---

## Supabase RLS Policy Rule
Row Level Security must never be bypassed.
Any new table or feature must have RLS policies defined before shipping.
Never expose data across users. Never write a query that skips RLS.

---

## Design Philosophy — Apple Standard
Clean, minimal, premium. Every element earns its place.
Dark void background. Amber is the only accent. Whitespace is intentional.
Animations are subtle and purposeful — never flashy.
Typography is crisp. The UI must feel expensive.
Nothing ships until it passes the Dirham Test.

**The Dirham Test:** Is this UI premium enough that a user in Dubai would 
pay AED 50 for this right now? If no — fix the padding, spacing, and 
typography until yes.

**The 3-Second Value Rule:** Within 3 seconds of landing on any page, the 
user must understand why CVPassport over a free builder. If this is not 
immediately clear — the page is not done.

**Loss Aversion Standard:** When a user encounters a locked/premium feature, 
the UI must communicate value — not just a paywall. Show what they're 
missing. Make it feel like a loss to not upgrade. Keep it honest — never 
fabricate statistics or fake social proof.

**Price Anchoring:** Always show original price crossed out next to unlock 
button. Example: ~~AED 99~~ AED 49. Simple, standard, effective.

**Self-Healing UI:** Never show raw API errors. Ever. Always show a premium 
apology: "The AI Engine is refining results. One moment." Trust is 
everything — a raw error destroys it.

---

## Color System
- --bg-page: #0A0A0A
- --bg-surface: #141414
- --bg-elevated: #1C1C1C
- --text-primary: #FFFFFF
- --text-secondary: #A0A0A0
- --border-default: #2A2A2A
- Accent: amber #D97706
- Supporting: green for success states
- NO purple. Anywhere. Ever.
- Modals: #141414 background, 8px blur, 1px border at opacity 0.1

---

## Spacing System
Base-4 grid only: 4, 8, 16, 24, 32, 64px.
If a margin or padding is not a multiple of 4 — it is a bug.
Use clamp() for typography — scales without breakpoints.
Never hardcode px widths on containers — use percentages or max-width.

---

## Layout Rules — Pixel Perfect

### Mobile First (Priority)
Every fix and every feature must work on 375px (iPhone SE) before desktop.
Primary actions (FAB, Next buttons, CTAs) must sit in bottom 30% of 
screen for one-handed use.
Respect iOS/Android safe-area-insets on FAB and all modals.

**iOS Input Zoom Fix (Critical):**
All inputs must have font-size: 16px minimum.
Never go below 16px on any input, select, or textarea.
Safari zooms on anything below 16px and breaks the entire layout.
This is non-negotiable — it is the single most common mobile breakage.

Horizontal scrolling is a critical failure. Any element causing a 
horizontal scrollbar must be refactored immediately — never worked around.

### Desktop
Verify at 1440px (MacBook) after every fix.
Desktop must feel equally premium — mobile-first does not mean 
desktop-neglected.

### Breakpoint Verification Rule
Before proposing any fix, mentally simulate the layout at:
- 375px (iPhone SE) — primary
- 390px (iPhone 14)
- 768px (iPad)
- 1440px (MacBook)
If it breaks at any of these — it is not a fix, it is a new bug.

---

## Definition of Done
A task is ONLY done when ALL of the following pass:

**Functional:**
- [ ] Works on 375px with no layout breaks
- [ ] Works on 1440px with no layout breaks
- [ ] No console errors
- [ ] No horizontal overflow
- [ ] Every CTA on the affected page is wired and functional

**Visual:**
- [ ] Dirham Test passed
- [ ] 3-Second Value Rule passed
- [ ] At least one trust signal present (Secure Ziina Payment / 
      ATS Verified badge / social proof)
- [ ] Every visual is purposeful — no decorative elements that don't 
      serve conversion or trust

**Code:**
- [ ] GhostChip still renders invisibly on any template touched
- [ ] Black flash prevention intact (SynthesisOverlay crossfades 250ms)
- [ ] RLS policy defined for any new Supabase table
- [ ] No raw errors exposed to user

---

## Code Rules
- No transition:all — explicit properties + cubic-bezier(0.4,0,0.2,1)
- Accordion: grid-template-rows 0fr→1fr + opacity, 300ms
- No blind fixes — read the file first, analyze, then fix
- Never open App.js — open only the specific page file needed
- App.js is routing only (162 lines) — never add logic here
- DRY: if a pattern exists in one component, abstract to a hook or 
  utility before duplicating it elsewhere
- useReducer over multiple useState for any complex form or state machine
- All user data flows: Supabase → useCvpAuth → UI. Never store an 
  unsynced local copy of profile data
- Skip pleasantries in responses — code block first, brief explanation 
  after
- Verify layout at 375px and 1440px before proposing any fix

---

## Architecture Map

### Pages (src/pages/)
- Landing — S1–S9, FAQ accordion, Footer, CookieBanner
- Dashboard — hero banner, main hub
- CV Builder:
  - Top tabs: Content, Templates, ATS Check, Job Match
  - Bottom nav: My CVs, ATS, Cover Letter, Walk-In, Account
- Cover Letter page
- Walk-In Mode — /walk-in route
- Account/Profile
- Auth — Login, Signup, ResetPassword.jsx
- /terms and /privacy

### Key Files
- src/utils/paywall.js — getPaymentLink() is the ONLY payment entry point
- src/pages/ — all page components live here
- Never bypass paywall.js for any payment or upgrade flow
- Never open App.js

---

## Payments — Ziina (Live)
Gateway: Ziina only. No other gateway until explicitly instructed.
Entry point: getPaymentLink() in src/utils/paywall.js — sole gateway.
All upgrade flows route through it: UpgradeModal, FABSheet, 
CoverLetterPage. Never add a second payment path.

### Pricing (Dual Currency — Never Break)
- Explorer: Free
- Express Pass: AED 49 / ₹399 one-time
- Active Hunter: AED 29/mo or ₹199/mo (most popular)
- Career Pro: AED 199/yr or ₹999/yr
- Cover Letter: AED 10 / ₹49

**Dual Currency Rule:** ₹ pricing must display correctly on all paywall 
surfaces alongside AED pricing. Never touch a paywall component without 
verifying both currencies still render correctly.

---

## Templates
- Current: 14 templates (T1–T3 free, T4–T14 premium)
- Launch goal: 20 templates before launch
- Every new template gets GhostChip from day one — no exceptions
- Never hardcode template access — always check plan tier

### GhostChip — Never Touch
Invisible ATS keyword injection across all 14 templates.
Renders: position:absolute, color:transparent, scale(0.01), 
pointerEvents:none, aria-hidden:true.
Any layout fix must verify GhostChip still renders invisibly afterward.
This is a core product differentiator — treat it as sacred.

---

## FAB System — Foundation, Not Finished
The FAB is a baby. It has massive refinement ahead of it.
Current state is a working foundation — not a finished product.
Every FAB update must make it more functional, more purposeful, 
more visually premium, and more future-ready for AI capabilities.

### FAB Rules
- 7-layer intelligence system
- Spring animation, backdrop blur 8px
- Tab bar hides when sheet opens
- Safe-area insets respected on all FAB modals
- Never restructure FAB — only add to existing layers
- Thumb zone: all FAB actions must stay in bottom 30% of screen

### FAB as First Line of Support
Before allowing any "Contact Us" action, FAB must attempt to resolve 
using local FAQ databank first. This protects the solo founder from 
support overload at scale.

### FAB Guide Mode — Priority Bug (Fix Before Anything Else)
Old ATS UI is showing inside FAB Guide mode.
The correct ATS is the redesigned one:
- Amber radial glow, #0C0C0E background
- Scan animation with sequential steps and green ticks
- Score animates 0→final
- Chips stagger in
- Missing keywords = "Rank Triggers"
- Found keywords = "Visibility Boosters"
- Badge: "CVPassport Verified Top X% GCC Ready"
The standalone ATS Checker page is correct — mirror that exact 
experience inside FAB Guide mode.
THIS IS THE FIRST THING TO FIX. Nothing else starts until this is done.

### FAB Download Success State
The completed state must include a share prompt:
"Your CV is ATS-Ready. Share CVPassport with a friend."
Wire this into the existing useReducer completed state — do not 
restructure the state machine.

---

## ATS Checker
- Free tier: local databank only
- Pro tier: Supabase Edge Function (analyze-cv) + Claude AI
- Never call Edge Function without checking plan tier first
- Score ring wiring to download state machine: pending
- Do not touch useReducer structure — only wire ring to existing 
  idle/synthesizing/generating/completed/error states

---

## Cover Letter
- 6 structured fields, UAE Gulf tone, India formal tone
- Paywall: AED 10 / ₹49 — Anthropic API fires post-payment only
- Current template is generic — needs full rebuild:
  GhostChip injection, premium template, proper tone rendering
- Never touch the post-payment API trigger logic — rebuild template only

---

## Job Match
- Full redesign needed to match ATS Checker quality level
- Keyword matching UI is outdated
- Redesign must feel premium, conversion-focused, and purposeful

---

## Walk-In Mode
- Route: /walk-in
- 6-field rapid CV builder for blue-collar/hospitality workers
- Page and builder both need refinement to match main builder standard
- Same pixel-perfect rules apply — these users deserve the same quality

---

## PDF Generation
- Puppeteer + @sparticuz/chromium-min + puppeteer-core only
- Never use html2canvas
- Always emulateMediaType('screen') before page.pdf()
- T11 has drawT11SidebarStripeOnPdf — never touch without reading first
- deviceScaleFactor must be set in setViewport

---

## CV Preview — Flicker Protection (Permanent Pre-Flight)
ResizeObserver targets outer wrapper only.
Scale memoized via useMemo.
Outer wrapper: overflow hidden.
Scaled elements: transition:none + willChange:transform.
This pattern has caused major production bugs before — never break it.

---

## Email System
Resend SMTP — noreply@mycvpassport.com.
3 Supabase templates live: Confirm Signup, Reset Password, Magic Link.
All dark + amber branded.
Never hardcode email logic outside Supabase templates.

---

## Headless AI Layer (FAB — Confidential)
The FAB is the user-facing AI interface.
Backend uses Claude API via Anthropic through Supabase Edge Functions.
Users interact naturally — they must never know which model powers it.
Always pass data through a standardizePrompt() utility before any 
Edge Function call. This ensures the model can be swapped without 
touching the UI layer.
Never expose API keys client-side.
Architecture must remain model-agnostic at the UI layer.

---

## Free Tier Watermark
Free-tier downloaded PDFs must include a tiny, elegant, non-intrusive 
"Built with CVPassport.com" at the very bottom in --text-secondary color.
This is a passive viral growth mechanism. Never remove it.
Premium tiers: no watermark.

---

## India-Gulf Corridor — Marketing Intelligence
This is our most powerful positioning. Code must reinforce it.

India is the primary growth market — massive scale, no restrictions, 
path to profitability. UAE/GCC is the aspiration market.

**The Migration Hook:** Indian professionals moving to or targeting Gulf 
jobs are our core user. Every AI prompt, every FAB suggestion, every 
template recommendation should be aware of this corridor.

**Gulf Tone vs India Tone:**
- UAE/GCC: stability, regional experience, professional brevity
- India: formal, academic weight, certifications prominent
- Cover Letter already handles Gulf/India tone — extend this logic 
  to FAB suggestions and Job Match recommendations

**₹ Pricing:** Always visible alongside AED on all paywall surfaces.
India tagline: "It's not the burger at stake. It's your career."

---

## Growth Engineering
**Watermark:** Free PDFs carry "Built with CVPassport.com" — passive 
viral loop, zero cost.

**Download Success State:** Completed state must prompt sharing. 
Wire into existing useReducer completed state only.

**Trust Signals:** Every page must have at least one — Secure Ziina 
Payment, ATS Verified badge, or equivalent. No page ships without one.

**Zero Ad Strategy:** Growth comes from product quality, watermark 
virality, and word of mouth. Every feature must be good enough that 
users tell others about it.

---

## Future Direction — Do Not Build Yet
These must never be architecturally blocked by current decisions:

**Job Portal (/jobs)**
Future B2B feature. Supabase tables and routing must remain extensible.
Never make a schema decision that would require a rebuild to add this.

**B2B Layer**
Employer and recruiter-facing features are a future goal.
Never close this door with current architecture decisions.

**Additional Templates**
Pipeline must stay open. 20 before launch, more after.

**Model Flexibility**
The AI layer must never be hardcoded to Claude. standardizePrompt() 
utility ensures we can swap models without touching the UI.

---

## Services Completeness Standard
Every service CVPassport offers must feel premium, complete, and 
conversion-ready before launch. Nothing half-baked ships.
Every CTA across every page must be wired and functional.
Dead links = dead trust = dead product.
Every visual must be purposeful.
No decorative elements that don't serve conversion or trust.

---

## Launch Readiness Checklist
- [ ] FAB Guide ATS bug fixed (Priority 1)
- [ ] All CTAs wired across all pages
- [ ] Cover Letter template rebuilt with GhostChip
- [ ] Job Match redesigned to premium standard
- [ ] Walk-In page and builder polished
- [ ] Score ring wired to download state machine
- [ ] 20 templates with GhostChip on all
- [ ] Landing page refined — Apple standard, pixel perfect
- [ ] All pages pass 375px + 1440px test
- [ ] Dirham Test passed on every page
- [ ] 3-Second Value Rule passed on every page
- [ ] Trust signal present on every page
- [ ] Dual currency (AED + ₹) working on all paywall surfaces
- [ ] Free tier watermark on downloaded PDFs
- [ ] No console errors anywhere
- [ ] No horizontal overflow anywhere
- [ ] RLS policies on all Supabase tables
- [ ] Every service feels hot cake ready

---

*Last updated: April 2026*
*Solo founder. Every line of code is a sales rep. Make it count.*

---

# CVPassport Engineering Constitution
## The Highway Architecture — Technical Philosophy & Development Law

> "Don't build a bridge where a simple paved road will do.
> Over-engineering is just a fancy way of creating a roadblock."

---

## 1. THE SUPERHIGHWAY (Core Infrastructure)

The Superhighway is our core stack: React + Supabase + Vercel.
This is the main road. Everything runs on it. We do not tear it up.

**Stack is permanent:**
- React CRA (not Next.js, not Vite — never migrate without a war council)
- Supabase (project: evihcqpvoorsdmzjnvjz, Singapore region)
- Vercel (auto-deploys on push to main)
- GitHub: BlackRahamud/mycvpassport

**Highway Law:**
We do not build obstacles on the superhighway.
No over-engineered components. No redundant state management.
No Redux. No new state libraries. Props and React context only.
Keep the main lanes clear. Data flows in one direction. Fast.

---

## 2. THE TOLL PLAZA (Page Architecture & User Journey)

CVPassport is a highway with toll plazas.
Each tab is a toll plaza. The user pays with attention and action.

**The Plaza Sequence:**
Template → ATS → Cover Letter → Download

This is not just a breadcrumb nav. It is the journey architecture.
Every plaza has one job: collect the toll, move the user forward.

- **Template plaza:** User picks their vehicle (CV design)
- **ATS plaza:** User pays with their job description. Gets a score.
- **Cover Letter plaza:** User pays with role context. Gets a letter.
- **Download plaza:** User has paid all tolls. They collect their pass.

**Toll Booth Validation:**
Every new feature is an On-Ramp — it must merge into the main flow
without causing a traffic jam (performance lag or breaking changes).
We use a strict validation matrix at the toll booth:
lint → build → git push. If it fails the booth, it does not enter.

**No plaza is a dead end.**
Every plaza must show: where you came from, where you go next.
The Progress Ladder (ATS → Job Match → Cover Letter) is the
highway signage — it tells the user they are moving, not stuck.

---

## 3. THE PIT STOP (AI & Modular Tools)

Instead of permanent heavy structures for every task,
we use Modular Pit Stops.

- Free-tier AI APIs, optimized SVG assets — refuel capabilities
  without adding permanent weight to the codebase
- If a tool underperforms, we swap at the next pit stop
  rather than tearing up the whole road
- Anthropic API: post-payment only for Pro features
- Supabase Edge Functions: AI logic lives serverside, not client
- One API call per user action — no chains, no waterfalls

**Pit Stop Rule:**
Agility over permanence. If the library is wrong, swap it.
We did it with PDF generation (html2canvas → Puppeteer).
We will do it again. No attachment to tools. Only to outcomes.

---

## 4. FAB IS THE CHAUFFEUR

The user is the car. FAB is the chauffeur.

The car does not navigate. The car does not open its own doors.
The car arrives and the chauffeur handles everything.

**The Chauffeur reads the moment:**

| Plaza (Tab)      | What FAB Does                                        |
|------------------|------------------------------------------------------|
| My CVs / Builder | Coaches completion. Shows missing sections.          |
| ATS              | Triggers the scan. No manual upload for built CVs.   |
| Cover Letter     | Surfaces job description input. Fires generation.    |
| Walk-In          | Guides rapid 6-field CV build for same-day interviews|
| Account          | Shows plan tier. Surfaces upgrade path if Explorer.  |

**FAB collapses when the keyboard opens.**
Like an Apple Watch crown retracting — it becomes a minimal
ambient indicator, not a floating button blocking the user's view.
It listens to window.visualViewport resize events.
When keyboard closes → FAB re-expands with spring animation.
FAB never fights the user for screen space. Ever.

**FAB is not a menu. FAB is a chauffeur.**
A chauffeur reads the moment and acts. So does FAB.

**FAB Architecture — 5 Layers:**
- FAB.jsx — visual shell, animation, position
- FABMenu.jsx — the radial 2-option Apple Watch style menu
- FABSheet.jsx — the bottom sheet that slides up per tab
- FABContent.js — the data layer, what content shows per tab
- FABLogic.js — the intelligence: completion %, plan tier, context

Never mix these layers. Never put FABLogic inside FABSheet.
Never put page logic inside any FAB file.

---

## 5. THE HORIZON (Mobile-First Vision)

Our road is built toward a specific destination:
Mobile-First Career Documentation for expat professionals
in Dubai, Abu Dhabi, Riyadh, and Mumbai.

Every design decision is a signpost toward this horizon:

- Dark mode (#0A0A0A bg) — professionals use phones at night
- Amber (#D97706) — visible, warm, premium without arrogance
- Geometric icons — clean at 24px on a 390px screen
- Bottom tab nav — thumbs live at the bottom, always
- FAB mid-right — visible without blocking content
- 16px minimum font-size on all inputs — iOS never zooms the viewport
- visualViewport awareness — layout never breaks when keyboard opens

**The Pixel Law:**
Every visual element must be production-sharp on:
- 1x (older Android)
- 2x (standard retina)
- 3x (iPhone Pro, flagship Android)

Canvas: always account for devicePixelRatio.
SVG: viewBox always set. Never scale via CSS transform.
The user sees pixel-perfect or they see nothing.

---

## 6. THE HIGHWAY PHILOSOPHY (The Root Fix Law)

**Patch:** Adding font-size:16px to one input to stop iOS zoom.
**Highway:** A universal CSS rule governing every input, every
component, every tab, every future feature — once, globally, done.

**Patch:** Moving FAB 20px down to avoid a textarea.
**Highway:** FAB listens to visualViewport — never overlaps
anything, on any screen, in any tab, forever.

**Patch:** Fixing score ring on ATS page only.
**Highway:** DPR scaling fixed at component root — every
canvas/SVG renders pixel-perfect across the entire app forever.

**The mandatory question before writing a single line:**
"Will this fix prevent the problem everywhere, or just here?"
If the answer is just here — go higher. Find the root. Fix the root.

We build highways. Not potholes.

---

## 7. THE FILE ARCHITECTURE LAW

src/
pages/
BuilderPage.jsx       ← CV builder, section editing, preview
DashboardPage.jsx     ← dashboard, CV cards, resume strength
ATSPage.jsx           ← ATS checker
CoverLetterPage.jsx   ← cover letter builder
WalkInPage.jsx        ← walk-in rapid CV mode
AccountPage.jsx       ← account settings, plan status
AuthPage.jsx          ← sign in / sign up / forgot password
TemplatesPage.jsx     ← template picker
components/
FAB/                  ← FAB lives here. Isolated. Sovereign.
App.js                  ← 162 lines. Routing only. Never open.
utils/
paywall.js            ← getPaymentLink() — single gateway

**The Law:**
- App.js = the highway map. Never add to it. Never open it in Cursor.
- FAB = its own sovereign territory. No page logic enters it.
- Page files = isolated. One page, one file, one job.
- Open ONLY the file you are fixing in any Cursor prompt.

---

## 8. THE CURSOR PROTOCOL

Every Cursor prompt follows this structure without exception:
[PRE-FLIGHT CHECK]   — what files will be read first
[FILE ANCHORS]       — exact file paths to open
[CONTEXT]            — current state, what exists, what works
[TASK]               — surgical diff only, what changes
[RULES]              — what must NOT change
[TERMINAL SEQUENCE]  — lint → build → git add → commit → push
[VERIFICATION]       — what to confirm after execution

- Never write a fix blind. Read the code. Analyse. Then fix.
- For layout/CSS bugs: be 95% confident before writing the prompt.
- Max 2–3 Cursor prompts per day.
- Claude Code launch: `claude --dangerously-skip-permissions`
- Off-peak hours: before 5pm or after 11pm Dubai time.

---

## 9. THE ABSOLUTE LAWS (Never Violate)
❌ No purple. Anywhere. Ever.
❌ No transition: all. Explicit properties only.
❌ No blue focus borders. Global CSS handles all focus states.
❌ No npm audit fix --force.
❌ No new state management libraries.
❌ No opening App.js in Cursor prompts.
❌ No mixing FAB files with page files.
✅ Husky runs on every commit. If it passes, it ships.
✅ Deployment order is sacred: lint → build → add → commit → push
✅ Amber is the only accent color: #D97706 / rgba(245,158,11,x)
✅ Every fix is a highway, not a pothole.

---

## 10. THE BUFFALO PHILOSOPHY

When urgency arrives — act first, think in motion.
A buffalo runs into the storm to get through it faster.
We do not sit and plan perfect code while the product waits.
We ship, we learn, we resurface.

But we resurface the whole lane — not just the pothole.

*Built by Junaid Khan. Solo. Dubai. 2026.*
