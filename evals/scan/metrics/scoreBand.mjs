/**
 * Score band — Day 2: model-derived score must land in the persona-
 * aligned expected band.
 *
 * Behavioral metric: requires ANTHROPIC_API_KEY. Reuses the same
 * sampling rules as fieldAccuracy.
 */

import { runLiveScan, hasApiKey } from "../scoring/currentFree.mjs";

const SAMPLE_SIZE = 10;

export async function computeScoreBand(fixtures) {
  if (!hasApiKey()) {
    return {
      skipped: true,
      reason:
        "ANTHROPIC_API_KEY not set — set it locally and re-run for the behavioral gate.",
      pass: null,
    };
  }

  const full = process.env.EVAL_FULL === "1";
  const sample = full ? fixtures : fixtures.slice(0, SAMPLE_SIZE);
  const perFixture = [];

  for (const fx of sample) {
    const band = fx.groundTruth?.expectedScoreBand ?? null;
    if (!Array.isArray(band)) {
      perFixture.push({ id: fx.id, band: null, inBand: null, ok: true });
      continue;
    }
    try {
      const out = await runLiveScan(fx, "free");
      const score = typeof out.score === "number" ? out.score : null;
      const inBand = score != null && score >= band[0] && score <= band[1];
      perFixture.push({ id: fx.id, score, band, inBand, ok: inBand === true });
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
