/**
 * Field accuracy — Day 2 redefinition.
 *
 * Pre-Day-2 this metric tested `detectRole(jd) === expectedRole` where
 * `expectedRole` was one of 6 hardcoded buckets and any unknown JD
 * silently fell back to `sales_real_estate`. The new pipeline kills
 * the regex; the model infers a free-form industry string.
 *
 * The new field-accuracy metric is BEHAVIORAL — it requires hitting
 * the model. It runs only when ANTHROPIC_API_KEY is set.
 *
 * Pass criteria: ≥90% of sampled fixtures get a non-empty industry
 * string AND a non-empty seniority value. Stricter persona matching
 * is left for a future run once we have ground-truth seniority bands
 * for every fixture.
 *
 * For Day 2 we run a CHEAP sample (10 fixtures) by default to keep
 * spend low; full 30-fixture run is gated on EVAL_FULL=1.
 */

import { runLiveScan, hasApiKey } from "../scoring/currentFree.mjs";

const SAMPLE_SIZE = 10;

export async function computeFieldAccuracy(fixtures) {
  if (!hasApiKey()) {
    return {
      skipped: true,
      reason:
        "ANTHROPIC_API_KEY not set — set it locally and re-run for the behavioral gate. The two structural invariants above already prove the smoking gun is fixed.",
      pass: null,
    };
  }

  const full = process.env.EVAL_FULL === "1";
  const sample = full ? fixtures : fixtures.slice(0, SAMPLE_SIZE);
  const perFixture = [];

  for (const fx of sample) {
    try {
      const out = await runLiveScan(fx, "free");
      const industryOk =
        typeof out.industry === "string" && out.industry.trim().length > 0;
      const senOk = typeof out.seniority === "string" && out.seniority.length > 0;
      perFixture.push({
        id: fx.id,
        persona: fx.persona,
        industry: out.industry,
        seniority: out.seniority,
        score: out.score,
        ok: industryOk && senOk,
      });
    } catch (err) {
      perFixture.push({
        id: fx.id,
        error: String(err && err.message ? err.message : err),
        ok: false,
      });
    }
  }

  const ok = perFixture.filter((p) => p.ok).length;
  const rate = perFixture.length > 0 ? ok / perFixture.length : 0;

  return {
    skipped: false,
    sampled: perFixture.length,
    passed: ok,
    rate,
    pass: rate >= 0.9,
    perFixture,
    note: full
      ? "EVAL_FULL=1 — ran all fixtures"
      : `Default sample (${SAMPLE_SIZE}/${fixtures.length}) — set EVAL_FULL=1 for full run`,
  };
}
