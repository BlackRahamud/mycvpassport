# mycvpassport.com — Architecture

*Snapshot as of 2026-04-27. Source: read of repo at `feat/landing-polish-templates-payment` HEAD.*

---

## 1. Stack

| Layer | Choice |
| --- | --- |
| Frontend framework | React 18.3 (Create React App / `react-scripts` 5) |
| Routing | `react-router-dom` v7 |
| Styling | Inline styles + a shared style object (`src/builderStyles.js`); no Tailwind, no CSS-in-JS lib. CSS variables live in `src/styles.css` (per memory). |
| State | React hooks only. No Redux/Zustand/Jotai. Auth/profile state via custom `useCvpAuth()` hook (`src/useCvpAuth.js`). |
| Animation | `framer-motion` 12 + `motion` 12 (both installed — duplicates) |
| Hosting | Vercel (static React build + Vercel Serverless Functions under `/api/*`) |
| Database | Supabase Postgres (project ID `evihcqpvoorsdmzjnvjz`, Singapore) |
| Auth | Supabase Auth (PKCE) |
| Edge compute | Supabase Edge Functions (`supabase/functions/*`) — Deno runtime |
| Payment | Ziina only, via `/api/create-ziina-payment` + `/api/ziina-webhook` |
| Email | Resend SMTP (`noreply@mycvpassport.com`) |
| AI | Anthropic Claude (Haiku 4.5) — server-side only |
| File parsing | `mammoth` (DOCX, client-side); PDF text extraction is **not** done in-browser |
| PDF generation | `puppeteer-core` + `@sparticuz/chromium-min` for serverless PDF render (`api/generate-pdf.js`) |
| Analytics | PostHog (EU) + Google Analytics 4 (`react-ga4`) + Vercel Analytics |

---

## 2. Routing surface

All routes defined in `src/App.js:124-272`. Auth gating is per-route via inline ternaries on `user` (no `<ProtectedRoute>` wrapper).

### Top-level (rendered outside the main app shell)
- `/pricing` → `PricingPage`
- `/payment-success` → `PaymentSuccess` (Ziina redirect)
- `/hr` → `HRPortal` (recruiter portal)
- `/jobs`, `/jobs/:jobId` → `JobsListPage`, `JobPage`

### Public (no auth required, paywalls inside)
- `/` → `LandingPage`
- `/walk-in` → 6-field rapid CV builder
- `/auth`, `/register`, `/auth/callback`, `/reset-password` → auth flow
- `/ats`, `/ats-checker` → ATS Checker (paywall internal)
- `/templates` → template browser
- `/linkedin-optimizer`, `/salary-switcher`, `/tools` → mini-tools
- `/blog`, `/blog/:slug`, `/about` → content
- `/india-to-uae`, `/gulf-career`, `/gulf/:reportId` → **existing Gulf-corridor content pages** (note: not just useGeoContent — there are dedicated pages already)
- `/terms`, `/privacy`, `/refund` → legal

### Auth-gated (`Navigate to="/" replace` if no user)
- `/dashboard` → `DashboardPage`
- `/account` → `AccountPage`
- `/builder` → `BuilderPage` (~5000 lines, 4 tabs: Content / Templates / ATS Check / Job Match)
- `/cover-letter` → `CoverLetterPage`
- `/dashboard/applications` → `ApplicationsPage`

### Admin
- `/admin` → `AdminPanelV2`, hard-coded to `connectingjunaidkhan@gmail.com` only

---

## 3. Database schema

Source: `supabase/migrations/001_hr_jobs_schema.sql`, `002_permissions.sql`, `003_admin_schema.sql`, plus loose ALTER scripts (`add_is_pro_to_profiles.sql`, `add_ats_scans_used_to_profiles.sql`, `add_recruiter_notes_to_applications.sql`, `gulf_reports.sql`, `waitlist.sql`).

| Table | Purpose | Key columns |
| --- | --- | --- |
| `profiles` | Extended Supabase auth user. **Mixed flag system** (see §6). | `id`, `is_pro` (bool), `plan` (string enum), `features` (JSONB), `expiry`, `ats_scans_used`, `flagged`, `user_type`, `company_name`, `work_email` |
| `cvs` | User-saved CVs, full content as JSONB. | `id`, `user_id`, `cv_data` (JSONB), `template_id`, `title`, `updated_at` |
| `ats_results` | Persisted ATS scan outputs. | `user_id`, `score`, `keywords_score`, `structure_score`, `content_score`, `visibility_boosters`, `rank_triggers`, `industry`, `created_at` |
| `hr_profiles` | Recruiter accounts. | `company_name`, `plan`, `verified` |
| `jobs` | Job postings on the CVPassport job board. | `requirements` (JSONB), `keywords` (JSONB), `salary_min/max`, `location`, `market` (`gulf` / `india`), `hiring_status` |
| `applications` | Candidate→job applications. | `cv_snapshot` (JSONB), `ats_score`, `match_keywords`, `missing_keywords`, `status`, `recruiter_notes` |
| `candidate_events` | Timeline of applied/viewed/shortlisted/etc. | event-type, ts, actor |
| `gulf_reports` | Cached Gulf career reports (used by `/gulf/:reportId`) | tbd |
| `waitlist` | Pre-launch email capture | tbd |
| `downloads` | Per-user download counter (free tier limit 3) | `user_id`, `created_at` |

**No `pgvector`, no embeddings table, no candidate similarity index.**

**RLS:** required by CLAUDE.md but not all policies are visible in the migration files I read. Confirm before any new table goes live.

---

## 4. API surface

### Vercel Serverless (`/api/*.js` — Node runtime)

| Endpoint | Purpose | Auth | Anthropic? |
| --- | --- | --- | --- |
| `api/create-ziina-payment.js` | Create Ziina checkout URL | Pass-through | No |
| `api/ziina-webhook.js` | Mark profile paid on webhook | Webhook secret | No |
| `api/cover-letter.js` | Generate 3-para cover letter body | None server-side (paywall is client-side via `hasFeatureAccess`) | **Yes — Haiku 4.5** |
| `api/parse-resume.js` | Structured resume → JSON via Claude | Bearer token + `is_pro` check | **Yes — Haiku 4.5** |
| `api/generate-linkedin-headline.js` | LinkedIn headline generator | tbd | likely yes |
| `api/notify-candidate.js` | Recruiter→candidate email | tbd | tbd |
| `api/generate-pdf.js` | Server-side PDF render via Puppeteer | tbd | No |
| `api/prerender.js` | SEO prerender helper | tbd | No |

### Supabase Edge Function (Deno)

| Function | Purpose | Auth | Anthropic? |
| --- | --- | --- | --- |
| `supabase/functions/analyze-cv/index.ts` | ATS scan (paid tier) | None — open endpoint | **Yes — Haiku 4.5** |
| `supabase/functions/ats-lead-welcome/index.ts` | Welcome email after lead capture | tbd | No |

---

## 5. Anthropic integration

Three call sites, all use `claude-haiku-4-5-20251001`, all hit `https://api.anthropic.com/v1/messages`, none use prompt caching, none log tokens, no rate-limit middleware.

| Call site | Prompt body | Critical issue |
| --- | --- | --- |
| `supabase/functions/analyze-cv/index.ts:17-36` | "ATS expert for GCC and India" + JD + filename + `fileBase64?.substring(0, 500)` of base64 (≈375 bytes of binary noise). | **Model never sees CV content.** Output is hallucinated. See `GAP_ANALYSIS.md` §1. |
| `api/cover-letter.js:25-56` | Builds prompt from structured `cvData` fields (name, role, skills, experience bullets) + JD slice (8000 chars). System prompt enforces 225-word ceiling. Has retry/backoff on 429/529. | Functional, but no caching of the JD. If 100 users target the same JD, that's 100 paid token bills. |
| `api/parse-resume.js:12-35` | Resume text (12000-char slice) → strict JSON `{work_experience, education, skills}`. | Functional. Gated to `profile.is_pro`. Client must extract text first (mammoth for DOCX; PDF requires server-side or copy-paste). |

`ANTHROPIC_API_KEY` lives in Vercel env vars (Node side) and Supabase Edge env vars (Deno side) — two separate secrets to rotate.

---

## 6. Auth & paywall

### Auth
- `src/supabaseClient.js` configures Supabase client (PKCE flow).
- `src/authUtils.js` — error code → user message mapper (rate-limited / wrong creds / etc.).
- `src/useCvpAuth.js` — main auth hook, exposes `user`, `profile`, `isPro`, `authReady`, navigation helpers.

### Tier gating — three overlapping mechanisms (cleanup needed)
1. **`profile.is_pro` boolean** — legacy flag.
2. **`profile.plan`** string enum: `EXPRESS_PASS`, `ACTIVE_HUNTER`, `CAREER_PRO`, `PRO`, `MAX_PRO`.
3. **`profile.features`** JSONB object — per-feature one-time unlocks (e.g. `coverLetter: true`, `linkedinOptimizer: true`).

Source of truth: `src/services/gatekeeper.js`. `getGatekeeperData()` reads all three, normalises to `{ isPaidUser, plan, features, downloadsUsed, atsScansUsed }`, and caches in sessionStorage for 10 minutes.

Paywall helpers in `src/utils/paywall.js`:
- `hasFeatureAccess(profile, feature)` → `is_pro || features?.[feature]`.
- `getPaymentLink(feature, userId, userEmail)` → POST to `/api/create-ziina-payment`, returns Ziina URL.
- `handlePaywallClick(...)` → wraps a click handler; redirects to Ziina if locked, runs `onSuccess` if not.

### Pricing tiers (CLAUDE.md)

| Tier | Price | What it unlocks |
| --- | --- | --- |
| Explorer | Free | 3 downloads, local-databank ATS, walk-in CV |
| Express Pass | AED 49 / ₹399 (one-time) | tbd — confirm in `Pricing.jsx` |
| Active Hunter | AED 29/mo / ₹199/mo | "Most Popular" |
| Career Pro | AED 199/yr / ₹999/yr | All features |
| Cover Letter unlock | AED 10 / ₹49 (one-time) | Single-purpose Anthropic generation |

---

## 7. Analytics & observability

Three analytics stacks running in parallel:
- **PostHog** (`src/lib/analytics/posthog.js`) — production-only by default; `identifyPostHog`, `trackPostHog`. EU host.
- **Google Analytics 4** (`react-ga4`) — pageview on every route change (`App.js:114-116`).
- **Vercel Analytics** (`@vercel/analytics/react`) — auto.

**Custom events:** very thin. Found:
- `gtag('event', 'lead_capture', { source: 'ats_checker' })` in `ATSChecker.jsx:391-395`.
- A central `logEvent` helper in `src/lib/analytics/logEvent.js` — usage TBD in audit.

**No token/cost dashboard.** Anthropic spend is invisible from inside the app.

**No request-level logging on edge functions.** Errors fall through with generic strings.

---

## 8. Tests

- `tests/` — Playwright. Four spec files: `new-user`, `frequent-user`, `fab-guided-flow`, `fab-edge-cases`. UI/journey only.
- `src/App.test.js` — single CRA-default test.
- **Zero** unit tests for: `paywall.js`, `gatekeeper.js`, `detectRole.js`, `useGeoContent.js`, the Anthropic prompt builders, or any business logic.
- **No eval harness** for Anthropic outputs (parser, ATS, cover letter). No fixtures, no regression tracking.

---

## 9. Geo / bilingual

- `src/hooks/useGeoContent.js` — uses `Intl.DateTimeFormat().resolvedOptions().timeZone`. If `Asia/Kolkata` or `Asia/Calcutta` → India copy + ₹. Else → Gulf copy + AED.
- Dedicated content pages: `IndiaToUaePage`, `GulfCareerPage` (route `/gulf-career` and `/gulf/:reportId`).
- **No Arabic UI, no RTL anywhere.** Grep for `rtl`, `arabic`, `dir=` returns nothing in `src/`.
- **No Hindi/Arabic/Urdu/Malayalam/Tamil capture** anywhere in the CV builder.

---

## 10. File architecture (top of mind)

```
src/
├── App.js                         # 354 lines, all routes
├── LandingPage.jsx                # 1779 lines
├── HowItWorks.jsx                 # landing component
├── ATSChecker.jsx                 # ATS scanner UI (1000+ lines)
├── JobMatch.jsx                   # local-only keyword scoring + paywall blur
├── CoverLetterModal.jsx           # builder-internal modal
├── Pricing.jsx                    # legacy pricing? PricingPage is in src/pages
├── pages/
│   ├── BuilderPage.jsx            # ~5000 lines, the CV editor
│   ├── DashboardPage.jsx
│   ├── ATSPage.jsx
│   ├── CoverLetterPage.jsx
│   ├── HRPortal.jsx               # recruiter side
│   ├── JobsListPage.jsx, JobPage.jsx, ApplicationsPage.jsx
│   ├── IndiaToUaePage.jsx, GulfCareerPage.jsx, SalarySwitcher.jsx
│   ├── LinkedInOptimizer.jsx
│   └── … legal, blog, account, walk-in, payment-success, reset-password
├── components/
│   ├── FAB/                       # 11-step guided flow
│   ├── ATSScanner.jsx, SynthesisOverlay.jsx, NewCvLobby.jsx
│   └── marketing/, navigation/, motion/, landing/
├── hooks/
│   ├── useGeoContent.js
│   └── useCvProgress.js
├── services/gatekeeper.js
├── utils/
│   ├── paywall.js                 # payment SOLE source of truth
│   └── detectRole.js
├── data/
│   ├── skillSuggestions.js        # the "data bank" (≈6 roles)
│   ├── fabFormat.js, fabTone.js, fabDetect.js, fabParse.js
│   └── coverLetterDataBank.generated.js
├── serverLib/                     # PDF/HTML template renderers (1 per template)
└── lib/analytics/                 # posthog + logEvent

api/                               # Vercel serverless
supabase/
├── functions/{analyze-cv, ats-lead-welcome}/
└── migrations/*.sql
docs/                              # this file lives here
```

---

## 11. Known constraints (from CLAUDE.md)

- Never bypass RLS.
- Payment: Ziina only — no Stripe.
- Anthropic only via server (Edge Function or Vercel) — never client.
- Never use `transition: all`. Always explicit properties + `cubic-bezier(0.4,0,0.2,1)`.
- No purple in UI.
- Never claim a template count ("Gulf-ready templates", not "14 templates").
- No specific employer / institution names in marketing copy (UAE/GCC legal risk).
- PowerShell: run commands individually (no `&&`).
- Public/free-tool routes must live outside auth guards (per memory; not all routes audited for this rule yet).

---

## 12. Risk-flagged areas (for the upgrade plan)

1. **`analyze-cv` does not parse CVs.** Single biggest defect. See `GAP_ANALYSIS.md`.
2. **Three overlapping tier flags** (`is_pro`, `plan`, `features`). One source-of-truth refactor before scaling tiers.
3. **No prompt caching.** ~3× Anthropic spend vs achievable.
4. **No rate limiting / captcha** on `analyze-cv` or `cover-letter`. Open spend abuse vector.
5. **No eval harness** for any Anthropic-driven feature. Regressions silent.
6. **Mixed analytics stacks** (PostHog + GA4 + Vercel) without a unified funnel definition.
7. **`is_pro` short-circuits all `hasFeatureAccess`** — once a user is `is_pro`, they get every per-feature unlock too. Confirm this is intentional before adding the recruiter tier.
