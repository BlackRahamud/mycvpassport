# Analytics — Day 2 Reference

This doc captures the analytics architecture, the events we ship, and the hand-off context for tomorrow's data review. It exists so neither Junaid nor Claude has to re-derive context from chat logs.

---

## Architecture (one paragraph)

`logEvent(eventType, metadata?, options?)` from `src/lib/analytics/logEvent.js` is the single fan-out point. It writes to three sinks **in parallel, fire-and-forget, never throws**:

1. **Supabase `candidate_events`** — authed-only (RLS blocks anon writes; verified empirically with PG error 42501)
2. **PostHog** — `posthog.capture(eventType, metadata)` for all users (anon and authed)
3. **Microsoft Clarity** — `window.clarity('event', eventType)` custom tag for all users

Each sink has its own try/catch. If Supabase is down, PostHog and Clarity still fire. If PostHog throws, the others run. Failure of one sink does not block the others.

User identification:
- `useCvpAuth.applySession` calls `identifyClarity(userId, traits)` and `identifyPostHog(userId, traits)` once per identity transition (guarded by `lastIdentifiedIdRef` against tab-focus SIGNED_IN re-fires).
- After `fetchProStatus` resolves, both are re-identified with `{ plan: 'free' | 'pro' }`.
- Sign-out triggers `resetPostHog()` (Clarity has no persona reset — sessions, not personas).
- A synchronous `currentAuthUserId()` cache (`src/lib/analytics/authState.js`) lets `logEvent` attach the candidate_id without going async.

Init: both `initClarity()` and `initPostHog()` are called once on app boot in `src/index.js`. Both are no-ops in non-production builds unless `REACT_APP_ANALYTICS_FORCE=true`.

---

## Tonight's Shipped Work

7 commits pushed to `origin/main`. Listed in chronological order with what each shipped.

### `311f6e7` — chore(analytics): wire Microsoft Clarity for session recording
**Day 1, earlier session.** The Clarity wrapper.

Files: `src/lib/analytics/clarity.js` (new), `src/index.js` (init call), `.env.example` (placeholders).

- Module exports: `initClarity`, `identifyClarity`, `tagClarity`
- Standard Clarity script-tag injection at runtime; queue stub set up before remote script loads
- SSR-safe, idempotent, gated by `NODE_ENV` + `REACT_APP_ANALYTICS_FORCE`
- Vercel env: `REACT_APP_CLARITY_PROJECT_ID` already set in Production + Preview

### `fe52782` — chore(analytics): install posthog-js + env scaffolding
**Phase A Commit 1.**

Files: `package.json`, `package-lock.json`, `.env.example`.

- `posthog-js@^1.372.1` added (client only; no posthog-node)
- `.env.example` documents `REACT_APP_POSTHOG_KEY` + `REACT_APP_POSTHOG_HOST`
- Vercel env vars added by Junaid in parallel

### `dcd79c5` — feat(analytics): unified logEvent helper + PostHog init + auth identify
**Phase A Commit 2.**

Files: `src/lib/analytics/posthog.js` (new), `src/lib/analytics/logEvent.js` (new), `src/lib/analytics/authState.js` (new), `src/index.js`, `src/useCvpAuth.js`.

- `posthog.js` mirrors `clarity.js` structure (init/identify/track/reset)
- PostHog config: `autocapture: false`, `disable_session_recording: true` (Clarity covers it), `person_profiles: 'identified_only'`
- `logEvent` triple-writes to Supabase (gated on `candidateId != null` per RLS — anon writes are blocked, PostHog + Clarity still fire)
- `authState.js` provides synchronous `currentAuthUserId()` cache
- `useCvpAuth.applySession` wires identify/reset, guarded by `lastIdentifiedIdRef`
- `fetchProStatus` re-identifies with plan trait once known

### `b9d52e3` — feat(analytics): wire 4 phase-A events into builder
**Phase A Commit 3.**

File: `src/pages/BuilderPage.jsx` only.

Events shipped (4):
- `builder_loaded` — useEffect([], []) with `didFireBuilderLoadedRef` guard against StrictMode double-invoke
- `preview_clicked` — `useEffect([fabSheet, ...])` with `prevFabSheetRef` for transition detection (covers all 5 `setFabSheet("preview")` call sites with one effect)
- `download_clicked` — first statement in `handleDownload`, before any conditional logic
- `save_attempted_unauthed` — inside `handleSave` early-return branch, fires with `options.userId = null` (Supabase write skipped due to RLS; PostHog + Clarity capture)

### `b4699a2` — feat(auth): default to signup for first-time visitors + auth_page_loaded event
**Commit 4.**

Files: `src/useCvpAuth.js`, `src/pages/AuthPage.jsx`.

UX change:
- `/auth` defaults to **signup** for first-time visitors (was: signin)
- Override to signin via `?mode=signin` URL param OR `cvp_returning_user="true"` localStorage
- Flag set inside `applySession` on every authed-session observation (covers signup, login, returning users on first deploy)
- Heading: `"Create your CVPassport account"` (signup mode)
- Subheading: `"Free to start. No credit card required."` (signup mode)
- Submit button: `"Create account"` (lowercase 'a', signup mode)

Event shipped:
- `auth_page_loaded` — fires once on mount (ref-guarded). Props: `mode_shown` (translated `login`→`signin`), `is_first_time_visitor`, `has_session`, `referrer`, `route_origin` (`/auth` vs `/register` for funnel segmentation), `route_query_params`

### `aa62736` — fix(landing): route hero + final-CTA "Try it free" to signup flow + add homepage_cta_clicked event
**Commit 5.** Critical conversion-leak fix.

Files: `src/components/landing/HeroSection.jsx`, `src/components/landing/FinalCTASection.jsx`, `src/LandingPage.jsx`.

Two CTA bug fixes:
1. **Hero "Try it free →"** was hardcoded to `navigate('/ats')` — bypassed signup entirely. Now calls `onSignup` → `/auth` (signup mode forced).
2. **Final CTA "Try it free"** was hardcoded to `navigate('/builder')` — dropped users into unguarded builder where saves silently fail. Now calls `onSignup`.

Event shipped:
- `homepage_cta_clicked` — fires from BOTH primary CTAs. Props include `cta_section` (`'hero'` | `'final_cta'`), `cta_destination_before` (literal old destination), `cta_destination_after` (`'/auth?mode=signup'`). The before/after pattern lets us A/B confirm the fix in PostHog.

Bento cards, nav, footer, pricing, secondary CTAs explicitly NOT touched.

### `c110652` — feat(templates): track template_card_clicked + template_applied events with source disambiguation
**Commit 6.** Pure tracking, zero functional change.

Files: `src/pages/TemplatesPage.jsx`, `src/App.js`, `src/pages/BuilderPage.jsx`.

- `BuilderTemplatesTab` gains `source = "builder_tab"` (default) and `user` props
- `/templates` standalone passes `source="templates_page"` from `TemplatesBrowseLayout`
- In-builder Templates tab keeps default `"builder_tab"`
- ONE component instrumentation handles BOTH contexts cleanly

Events shipped:
- `template_card_clicked` — fires inside existing `onPick` handler before existing logic. Props: `template_id`, `template_name`, `template_tier` (`'free'`|`'premium'`), `source`, `is_authenticated`
- `template_applied` — fires inside "Use This Template" modal CTA before existing `onApplyTemplateAndGoToContent`. Same prop shape

---

## Full Phase A Event Roster (8 shipped)

| Event | Where it fires | Source disambiguation |
|---|---|---|
| `builder_loaded` | BuilderPage mount | n/a |
| `preview_clicked` | `fabSheet` transitions to `'preview'` | n/a |
| `download_clicked` | First line of `handleDownload` | n/a |
| `save_attempted_unauthed` | `handleSave` unauth early-return | userId=null; Supabase write skipped (RLS) |
| `auth_page_loaded` | `/auth` and `/register` mount | `route_origin` prop distinguishes |
| `homepage_cta_clicked` | Hero + Final CTA primary clicks | `cta_section` prop: `'hero'` \| `'final_cta'` |
| `template_card_clicked` | Any template card pick | `source` prop: `'templates_page'` \| `'builder_tab'` |
| `template_applied` | "Use This Template" modal commit | `source` prop: `'templates_page'` \| `'builder_tab'` |

## Phase B — DEFERRED (not shipped, do not start without explicit trigger)

These were spec'd but explicitly deferred pending Clarity recording review and overnight data:

- `field_focused` — needs throttling logic across all 38 input handlers (table is in Day 1 prep)
- `experience_added` — fires on Add-Experience commit
- `tab_switched` — couples with the **ghost-row fix** (the `saveBridgeRef.current?.()` autosave on Templates tab visit at `BuilderPage.jsx:2514` — currently producing 19/34 ghost rows)
- `mobile_preview_opened` — couples with mobile UX investigation
- Exit-intent micro-survey + `cv_exit_feedback` table migration

## Phase B trigger criteria

Day 2 work begins **after** the founder has:
1. Reviewed 5+ Clarity recordings of real /builder sessions
2. Inspected the PostHog Live Events feed for the 8 shipped events
3. Inspected Supabase `candidate_events` row counts via:
   ```sql
   SELECT event_type, COUNT(*) FROM candidate_events
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY event_type ORDER BY COUNT(*) DESC;
   ```
4. Decided which Phase B items have evidence to justify the build

---

## The `cvp_returning_user` localStorage flag

Used by Commit 4 to drive the `/auth` default mode.

- **Set**: by `useCvpAuth.applySession` whenever an authed session is observed (covers signup, login, returning users on first deploy). Wrapped in try/catch — Safari private-browsing throws on `localStorage.setItem`.
- **Read**: by the `useState` initializer for `authMode` and by the `auth_page_loaded` event for `is_first_time_visitor`. Both wrapped in try/catch.
- **Value**: literal string `"true"` when returning, missing/empty when first-time. Comparison is `=== "true"`.
- **Lifetime**: persists per browser profile. Cleared by manual localStorage wipe or Incognito sessions.

Override hierarchy for `/auth` default mode:
1. `?mode=signin` URL param — wins
2. `cvp_returning_user === "true"` — sets default to `"login"`
3. Otherwise → `"signup"` (the new default for first-time visitors)

---

## Commit-3 design choice worth remembering

`preview_clicked` was implemented as a **state-transition effect** (`useEffect([fabSheet])` with `prevFabSheetRef`) rather than 5 inline `logEvent` calls at each `setFabSheet("preview")` call site. Rationale: all 5 sites are user-action callbacks (none programmatic), so transition-time and click-time are functionally equivalent — and the effect is one event call instead of 5 inline duplicates. If we ever start setting `fabSheet === "preview"` programmatically (e.g. on guide step advance), the event semantics shift from "user clicked" to "preview opened" — flag this if it happens.

---

## Open observations carried over from Day 0 / Day 1 investigations

These are facts to remember, not action items:

1. **`/builder` has no auth guard** — anyone can land there, type, and lose work silently. Hero/Final-CTA fixes in Commit 5 reduce the surface but don't eliminate it. Direct-link, bookmark, and back-button flows still expose unauthed users.
2. **`saveBridgeRef.current?.()` fires on every visit to the Templates tab** (`BuilderPage.jsx:2514`) — this is the ghost-row source. Phase B work, gated on tracking data confirming the pattern.
3. **`EMPTY_RESUME` has Gulf-centric defaults** (`location: "Dubai, UAE"`, `languages: "English, Hindi"`, `references: "References available upon request"`, `availability: "Immediately Available"`, `willingToRelocate: "Yes"`). Indian-market users see "Dubai, UAE" pre-filled.
4. **9 fields in `EMPTY_RESUME` have NO corresponding builder input** (`nationality`, `visaStatus`, `dob`, `gender`, `maritalStatus`, `availability`, `drivingLicense`, `willingToRelocate`, `references`). They always carry the EMPTY_RESUME default into every saved row. Worth flagging during Phase B scoping.
5. **`scripts/probe-rls-candidate-events.js`** is a one-shot Node diagnostic that empirically confirms RLS blocks anon inserts to `candidate_events`. Untracked (never committed). Re-run if RLS policy changes.
