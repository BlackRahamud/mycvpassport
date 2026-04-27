/**
 * Score band hit rate: does the produced score land in the persona-aligned
 * expected band?
 *
 * Bands are deliberately wide (e.g. [40, 75]) so that a CV-aware scanner
 * has plenty of room to land. The CURRENT free-tier scorer collapses to
 * a small set of values (always 70 with no JD; with a JD, only a function
 * of JD↔role keyword overlap, ignoring the CV). For matching JD/persona,
 * scores often DO land inside the band, so this metric ALONE will not
 * expose the bug — the adversarial variance check is the headline.
 *
 * Score band stays in the suite because once Phase 1 lands, narrower
 * persona-aware bands will become meaningful and we want the slot wired.
 */

export function computeScoreBand(fixtures, runFreeScan) {
  const perFixture = fixtures.map((fx) => {
    const out = runFreeScan(fx.cv, fx.jd);
    const band = fx.groundTruth?.expectedScoreBand ?? null;
    const inBand = Array.isArray(band)
      ? out.score >= band[0] && out.score <= band[1]
      : null;
    return {
      id: fx.id,
      score: out.score,
      band,
      inBand,
    };
  });

  const labelled = perFixture.filter((p) => p.band != null);
  const hit = labelled.filter((p) => p.inBand === true).length;
  const rate = labelled.length > 0 ? hit / labelled.length : 0;

  return {
    totalLabelled: labelled.length,
    hit,
    rate,
    pass: rate >= 0.9,
    perFixture,
  };
}
