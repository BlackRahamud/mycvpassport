/**
 * Adversarial variance: same JD, different CVs, different output?
 *
 * Day 2 reframing: the new pipeline embeds the full CV text in the
 * prompt sent to Claude. So if the prompt-builder is correct, swapping
 * the CV behind a fixed JD must produce different prompts. This is a
 * STRUCTURAL test that flips FAIL → PASS the moment the legacy
 * fileBase64.substring(0, 500) bug is removed.
 *
 * For 5 JDs × 10 CVs each, count distinct prompt hashes per group.
 * Pass condition: every group has 10 distinct hashes (every CV varies
 * the prompt).
 *
 * Behavioral validation ("10 distinct scores AND distinct reason sets")
 * runs only when ANTHROPIC_API_KEY is present — see fieldAccuracy.mjs
 * and scoreBand.mjs.
 */

import { buildPromptFor, hashPrompt } from "../scoring/currentFree.mjs";

const JD_GROUP_SIZE = 5;
const CVS_PER_GROUP = 10;

export function computeAdversarial(fixtures) {
  if (fixtures.length < CVS_PER_GROUP) {
    return {
      totalGroups: 0,
      groupsWithVariance: 0,
      pass: false,
      reason: `need at least ${CVS_PER_GROUP} fixtures, have ${fixtures.length}`,
      perGroup: [],
    };
  }

  const jdSamples = fixtures.slice(0, JD_GROUP_SIZE);
  const cvSamples = fixtures.slice(0, CVS_PER_GROUP);

  const perGroup = jdSamples.map((jdFix) => {
    const hashes = new Set();
    const sample = [];
    for (const cvFix of cvSamples) {
      const { user } = buildPromptFor({ cv: cvFix.cv, jd: jdFix.jd });
      const h = hashPrompt(user);
      hashes.add(h);
      if (sample.length < 3) sample.push({ cvId: cvFix.id, promptHash: h });
    }
    return {
      jdId: jdFix.id,
      jdLabel: jdFix.label,
      cvCount: cvSamples.length,
      distinctPrompts: hashes.size,
      pass: hashes.size === cvSamples.length,
      sample,
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
