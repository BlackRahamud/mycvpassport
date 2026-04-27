/**
 * Adversarial variance: same JD, different CVs, different output?
 *
 * If the scanner reads the CV, swapping the CV behind a fixed JD must
 * produce different output. We pick K JDs and score N CVs against each.
 * Each group should yield > 1 distinct (score, boosters, triggers).
 *
 * Current code: each group yields exactly 1 distinct output, because
 * free-tier scoring is a function of JD only.
 */

const JD_GROUP_SIZE = 5;
const CVS_PER_GROUP = 10;

export function computeAdversarial(fixtures, runFreeScan) {
  if (fixtures.length < CVS_PER_GROUP) {
    return {
      totalGroups: 0,
      groupsWithVariance: 0,
      perGroup: [],
      pass: false,
      reason: `need at least ${CVS_PER_GROUP} fixtures, have ${fixtures.length}`,
    };
  }

  const jdSamples = fixtures.slice(0, JD_GROUP_SIZE);
  const cvSamples = fixtures.slice(0, CVS_PER_GROUP);

  const perGroup = jdSamples.map((jdFix) => {
    const outputs = cvSamples.map((cvFix) => {
      const out = runFreeScan(cvFix.cv, jdFix.jd);
      return {
        cvId: cvFix.id,
        score: out.score,
        keywordsScore: out.keywordsScore,
        boostersFingerprint: (out.visibilityBoosters || []).slice(0, 5).join("|"),
      };
    });
    const distinctScores = new Set(outputs.map((o) => o.score));
    const distinctFingerprints = new Set(
      outputs.map((o) => `${o.score}::${o.boostersFingerprint}`),
    );
    return {
      jdId: jdFix.id,
      jdLabel: jdFix.label,
      cvCount: outputs.length,
      distinctScores: distinctScores.size,
      distinctOutputs: distinctFingerprints.size,
      pass: distinctScores.size > 1,
      sample: outputs.slice(0, 3),
    };
  });

  const groupsWithVariance = perGroup.filter((g) => g.pass).length;

  return {
    totalGroups: perGroup.length,
    groupsWithVariance,
    pass: groupsWithVariance === perGroup.length,
    perGroup,
  };
}
