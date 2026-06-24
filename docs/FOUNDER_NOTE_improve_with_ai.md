# Founder note — "Improve with AI" rebuilt (direct generate-and-apply)

**Date:** 2026-06-24 · **Branch:** `feat/ai-improve-direct-apply`

## What changed
The over-stepped rewrite flow (pick a bullet → Continue → spinner → choose → "Use
this rewrite", with a broken apply) is gone. One click now does the whole thing.

**New flow (Summary + Experience description editors):**
1. Click **Improve with AI** → fires the rewrite immediately on the *entire*
   description text. No "pick a bullet" step, no Continue button.
2. While generating (~2–4s), an animated amber conic-gradient ring glows around the
   **outside of the field itself** — the same orbiting-ring language as the ATS
   "Analyze My CV" CTA, retuned to the v1.2 amber (`#EF9F27`).
3. Three full rewritten versions come back as click-to-commit cards.
4. **Click a card → it replaces the whole description and closes the panel**
   instantly. Selection commits on click (never hover), so moving the cursor can't
   lose it. A toast shows **"Updated · Undo"**; Undo restores the exact original.
   "Keep original" is a secondary text link.

## How it's built (for future reuse)
- **`src/components/AIWorkingGlow.jsx`** — reusable wrapper:
  `<AIWorkingGlow active={isGenerating}>…</AIWorkingGlow>`. Renders the ring only
  while `active`. Animation is wrapped in `@media (prefers-reduced-motion:
  no-preference)`; reduced-motion users get a **static amber border**. When
  inactive it renders zero visible UI, so it's safe to leave mounted. It already
  wraps the Experience, Education, and Summary boxes identically (Education has no
  free-text field yet, so its ring stays dormant — it lights up for free the moment
  a description field is added there).
- **`src/hooks/useAiImprove.js`** — fires `POST /api/ai?action=tailor`
  (`section: "description"`) through **`safeFetch`** (the boot-captured pristine
  fetch), so a Clarity/analytics `fetch` monkey-patch can't hang the call after a
  200. Returns `{ isGenerating, options, error, improve, reset }`.
- **`src/components/AIRewriteModal.jsx`** — slimmed to a results-only,
  click-to-commit panel (no picker, no loading phase, no confirm button).

## Server (rewrite endpoint only — no new handler)
`api/ai.js` `handleTailor` gained a `description` section that rewrites the whole
block into 3 full alternatives. It samples **hot (temperature 0.95)** with a
per-call random **style angle + nonce**, so re-clicking yields genuinely different
phrasings. The endpoint is **never cached** (no `query_cache` / memo layer), so each
click is a real, paid API call. Each generation still decrements one
`ai_credits_used` credit; free-tier exhaustion returns 402 → the existing upgrade
paywall opens. No schema changes.

## Verify
- Click Improve with AI → ring glows around the box → 3 options return.
- Click a card → cursor can move anywhere → selection holds → description replaced →
  panel closes → toast Undo restores the original.
- Re-click Improve with AI → visibly different options each time.
- Burn the 2 free credits → paywall shows on the next click.
- `from=ats` entry path is untouched; `npm run lint`, `npm run build`, and the 66
  existing tests all pass.
