/**
 * Field accuracy: did detectRole(jd) return the persona-aligned role,
 * or did the silent fallback to "sales_real_estate" kick in?
 *
 * The fallback at ATSChecker.jsx:443 (`detectRole(jd) || "sales_real_estate"`)
 * is the second-tier smoking gun: any unrecognised JD (most blue-collar
 * trades, healthcare specialisations, regulated professions) is silently
 * scored against a real-estate-sales keyword pack.
 *
 * Phase 1 must replace the 6-role hardcoded detector with something that
 * either covers Gulf trades + healthcare or fails loudly with a "we
 * don't yet support this role" surface.
 */

export function computeFieldAccuracy(fixtures, runFreeScan) {
  const perFixture = fixtures.map((fx) => {
    const out = runFreeScan(fx.cv, fx.jd);
    const expected = fx.groundTruth?.expectedDetectedRole ?? null;
    const actual = out.detectedRoleKey;
    const fallbackUsed = out.fallbackRoleUsed;

    // expected === null means "the JD is out of the current 6-role taxonomy"
    // (e.g. blue-collar trades, healthcare specialisations). The system
    // should NOT silently fall back to a wrong role — it should either
    // surface "unsupported" or fail loudly.
    const correct =
      expected == null
        ? actual == null && !fallbackUsed
        : actual === expected && !fallbackUsed;
    const silentFallback =
      fallbackUsed && (expected == null || expected !== "sales_real_estate");

    return {
      id: fx.id,
      persona: fx.persona,
      expected,
      actual,
      fallbackUsed,
      correct,
      silentFallback,
    };
  });

  const totalLabelled = perFixture.length;
  const correct = perFixture.filter((p) => p.correct).length;
  const silentFallbacks = perFixture.filter((p) => p.silentFallback).length;
  const rate = totalLabelled > 0 ? correct / totalLabelled : 0;

  return {
    totalLabelled,
    correct,
    silentFallbacks,
    rate,
    pass: rate >= 0.9,
    perFixture,
  };
}
