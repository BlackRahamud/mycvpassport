# Visual changes — eclipse-halo regression fix (cv-only result page)

*2026-04-28. Regression fix: the previous sprint's `ScannerRing` (visible 0%→score% progress arc with start/end caps) was the wrong visual treatment. This sprint replaces it with `EclipseHalo` and restores the full surrounding composition matching the spec reference image.*

I work in a CLI without a browser, so no PNGs attached. This doc describes the changes pixel-by-pixel and lists manual verification steps to run after Vercel deploys.

---

## What was wrong

The previous `ScannerRing` rendered:
- An SVG progress arc filling 0%→`score`% of the circle via `stroke-dasharray` + `stroke-dashoffset`.
- A separate rotating conic-gradient sweep on top.
- Visible start cap at 12 o'clock and visible end cap at the score% mark.
- "Looks like a loading spinner."

The reference image shows a **uniformly glowing eclipse** — solid black disc, single 3 px ring around the entire circumference, no caps, no rotation, no sweeping arc. The corona pulses, the disc and ring are solid.

---

## What's now on `/ats` when the user uploads a CV without a JD

### The eclipse halo (centered, 260 px on desktop)

Three layers, bottom to top:

1. **Outer pulsing glow.** Multi-layer CSS `box-shadow: 0 0 20px <band@70%>, 0 0 40px <band@45%>, 0 0 80px <band@22%>` on a separate underlay div. Pulses `opacity 0.7 → 1 → 0.7` over 3 s ease-in-out infinite. Pulse hits the glow only — the disc and ring stay at full opacity.
2. **SVG soft-glow ring.** Single SVG `<circle>` with `stroke-width: 5`, `feGaussianBlur stdDeviation=4`, `opacity=0.55`. Bridges the gap between the sharp ring and the box-shadow corona.
3. **Solid black disc with 3 px ring border.** `background: #000`, `border: 3px solid <band hex>`, `box-shadow: 0 0 14px <band@55%>, inset 0 0 24px <band@18%>`. Centre stack: large band-coloured score number (32% of size, `text-shadow: 0 0 16px <band@55%>`), 9-10 px muted "SCORE" caption, 11-12 px band-coloured status word.

**Color bands (4, per spec):**
| Score | Hex | Status word | Page headline |
| --- | --- | --- | --- |
| ≥ 85 | `#10b981` emerald | "Market Ready" | "Your CV is Market Ready" |
| 70-84 | `#f59e0b` amber | "Solid Foundation" | "Your Foundation is Solid" |
| 60-69 | `#f97316` orange | "Almost There" | "Your Foundation is Forming" |
| < 60 | `#ef4444` red | "Needs Work" | "Your CV Needs Work" |

### Below the ring (in this exact order)

1. **Headline** — band-aware, 28 px / 800 weight / centered / `letter-spacing: -0.02em`.
2. **Pill** — "+X Points within reach" where X = points to next band ceiling. Examples: score 70 → +15, score 65 → +5, score 90 → +10. Dark pill, white text, 12 px / 700 weight.
3. **Subtitle** — "Analyzed against real GCC & India hiring data", 12 px muted, centered.
4. **Industry chip-text** (optional) — "Inferred: Software Engineering / Cloud Backend Development · mid", 12 px muted.
5. **Horizontal gradient progress bar** — 4 px high, full-width, `linear-gradient(90deg, #ef4444 0%, #f97316 33%, #f59e0b 66%, #10b981 100%)`. White 16 px indicator dot at `left: <score>%`, with `border: 2px solid #0A0A0A` and `box-shadow: 0 2px 6px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.12)` so it pops on any band. Three muted-caps labels below: "NEEDS WORK" (left), "ON TRACK" (center), "MARKET READY" (right).
6. **Three sub-score cards** — equal-width grid:
   - **Keywords** — number colored `#3b82f6` blue, 32 px / 800 weight, with 12 px text-shadow glow.
   - **Structure** — `#f59e0b` amber, same treatment.
   - **Content** — `#10b981` emerald, same treatment.
   Each card: 70 % wide colored underline below the number with 8 px box-shadow glow, then 10 px muted caps label.

The sub-score colors are **fixed by slot**, not by value — Keywords stays blue whether it's 12 or 95.

### Reduced motion

`prefers-reduced-motion: reduce` → outer glow stops pulsing (pinned at `opacity: 0.85`). Static eclipse + ring + disc + numbers all preserved at full fidelity. No other animations exist on this view.

---

## Backend change

The cv_only Edge Function response now returns four scores instead of one:

```json
{
  "mode": "cv_only",
  "cvHealthScore": 62,
  "keywordsScore": 78,
  "structureScore": 55,
  "contentScore": 48,
  "topSkills": [...],
  "structureIssues": [...],
  ...
}
```

`cvHealthScore` is still the headline — the model is instructed to read it holistically, NOT just average the three sub-scores. Verified live: fixture 06 (Indian SWE in Dubai) returns `cvHealthScore: 62, keywordsScore: 78, structureScore: 55, contentScore: 48` — the model rated keywords high (specific tech terms), structure middling (one-line role bullets, dense), content low (no quantification, recency thin).

Schema change in `supabase/functions/analyze-cv/_schema.mjs::CV_ONLY_TOOL`:
- `keywordsScore`, `structureScore`, `contentScore` added to `properties` and to `required`.
- Prompt updated in `_prompt.mjs::CV_ONLY_SYSTEM_PROMPT`.
- `index.ts` extends `CV_ONLY_REQUIRED_FIELDS` and passes the new fields through.

Edge Function redeployed: `supabase functions deploy analyze-cv --project-ref evihcqpvoorsdmzjnvjz`. Verified end-to-end via the inline test (HTTP 200, all four scores typed-checked).

---

## Files

- `src/components/EclipseHalo.jsx` — **new**. Default export `EclipseHalo`. Named exports `getBand(score)`, `pointsToNextBand(score)`, `withAlpha(hex, alpha)`.
- `src/components/CvOnlyResult.jsx` — modified. Imports from `EclipseHalo` (was `ScannerRing`). New layout: ring → headline → pill → subtitle → industry chip → gradient progress bar → 3 sub-score cards. New sub-components `ProgressGradientBar` and `SubScoreCard`.
- `src/components/ScannerRing.jsx` — **deleted**. Was the regression. Not used anywhere else (verified via `grep ScannerRing src/`).
- `supabase/functions/analyze-cv/_schema.mjs` — `CV_ONLY_TOOL` gains 3 sub-scores.
- `supabase/functions/analyze-cv/_prompt.mjs` — system prompt updated to instruct holistic + sub-score generation.
- `supabase/functions/analyze-cv/index.ts` — required-field list + response payload extended.
- `docs/visual-changes-eclipse-restore.md` — this file.

No new deps. The earlier `react-app-rewired` + `framer-motion` stay as-is.

---

## Manual verification steps

After Vercel deploys (sometimes ~1 minute):

1. Open `/ats` in production, upload any CV, **don't** paste a JD, click Analyze.
2. **Eclipse halo:**
   - The ring's colour should match the band: ≥85 emerald, 70-84 amber, 60-69 orange, <60 red.
   - The score number, "SCORE" label, and status word are all centred inside a SOLID BLACK disc.
   - The corona around the disc visibly pulses (~3 s period). The disc itself does not change.
   - **No** progress arc, **no** rotating sweep, **no** start/end caps.
3. **Below the ring:**
   - Headline matches band: "Your CV is Market Ready" / "Your Foundation is Solid" / "Your Foundation is Forming" / "Your CV Needs Work".
   - "+X Points within reach" pill, where X = points to next band ceiling (e.g. score 70 → +15, score 65 → +5, score 90 → +10).
   - "Analyzed against real GCC & India hiring data" subtitle in muted gray.
   - Horizontal gradient bar with white indicator dot at the right horizontal position; "NEEDS WORK / ON TRACK / MARKET READY" labels underneath.
   - Three sub-score cards: Keywords (blue), Structure (amber), Content (emerald). Numbers, underline, label.
4. **Reduced motion:** DevTools → Rendering → Emulate `prefers-reduced-motion: reduce` → reload. The corona stops pulsing but the eclipse, ring, numbers, and layout are all preserved.
5. **Mobile (DevTools → toggle device → iPhone 14 / Pixel 7):** the ring is still 260 px wide and the section padding holds the layout. (If you want a 220 px ring on mobile specifically, say so — easy follow-up.)

If the screenshots match the spec reference image (1:25 mobile screen with score 70, "Your Foundation is Solid", +15 Points within reach, Keywords/Structure/Content sub-cards), drop them at `docs/visual-changes/eclipse-restore-mobile.png` and `docs/visual-changes/eclipse-restore-desktop.png` and I'll wire them in on the next sprint.
