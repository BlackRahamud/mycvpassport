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
