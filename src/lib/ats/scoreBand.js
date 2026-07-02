/**
 * scoreBand — single source of truth for "how red/amber/green is this
 * score". Used by both the legacy `/hr` portal (during the unification
 * window) and the new `/hr/jobs/:id` pipeline so a 78 reads identically
 * across surfaces. Phase 1 of the ATS rebuild may revisit thresholds
 * once we have real calibration data — until then these are the
 * working set.
 *
 * Bands:
 *   high  >= 80   strong match
 *   mid   50-79   needs interview to confirm
 *   low   <50     likely off-target
 *   none  source missing  → never scored, render dashed/grey
 */

/* `none` only fires when there's no scorer attribution. A score of 0
   that did come from a scorer ('stopgap_keyword' returning 0 because
   no requirement bullets matched) is still 'low' — it's an honest
   answer, not a missing one. */
export function scoreBand(score, source) {
  if (source === undefined || source === null || source === "") return "none";
  const s = Number(score) || 0;
  if (s >= 80) return "high";
  if (s >= 50) return "mid";
  return "low";
}

/* Hex constants — theme-agnostic. The light HR portal pulls these
   directly; the dark legacy portal does too (the colours read fine on
   both surfaces because they're saturated, not pastel). */
export const BAND_COLORS = {
  high: "#10B981",
  mid:  "#F59E0B",
  low:  "#DC2626",
  none: "#C2C2CC",
};

/* Human tier labels — the ONLY verdict wording any surface may render.
   "PASS" is banned: it reads as both "passes the screen" (good) and
   "we pass on them" (bad), so an 8/100 wearing a PASS chip looked like
   a triumph. Chip text, color and ring must all derive from the same
   band so they can never disagree. */
export const BAND_LABELS = {
  high: "Strong Match",
  mid:  "Maybe",
  low:  "Weak Match",
  none: "Not scored",
};

/* VerdictCard tone class per band (its css tone names predate this). */
export const BAND_TONES = { high: "strong", mid: "maybe", low: "pass", none: "maybe" };

export function bandLabel(score, source) {
  return BAND_LABELS[scoreBand(score, source)];
}
