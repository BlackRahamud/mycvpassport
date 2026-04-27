/**
 * Paid prompt integrity: does the prompt actually carry the CV into
 * the model? Pre-Day-2, no — the legacy prompt sent only
 * fileBase64.substring(0, 500) (Phase 0 smoking gun). Post-Day-2 the
 * full CV text is embedded in the user message.
 *
 * Test: take a distinctive substring from the middle of the CV (away
 * from likely prompt headers) and assert it appears verbatim in the
 * built prompt. PASS for every fixture.
 */

import { buildPromptFor } from "../scoring/currentFree.mjs";

const FINGERPRINT_OFFSET = 60;
const FINGERPRINT_LENGTH = 80;

export function computePaidPromptIntegrity(fixtures) {
  const perFixture = fixtures.map((fx) => {
    const cv = String(fx.cv ?? "");
    const fingerprint = cv.slice(
      FINGERPRINT_OFFSET,
      FINGERPRINT_OFFSET + FINGERPRINT_LENGTH,
    );
    const { user } = buildPromptFor({ cv, jd: fx.jd }, "paid");
    const contains = fingerprint.length > 0 && user.includes(fingerprint);
    return {
      id: fx.id,
      persona: fx.persona,
      cvLength: cv.length,
      promptLength: user.length,
      fingerprintLength: fingerprint.length,
      pass: contains,
    };
  });

  const passed = perFixture.filter((p) => p.pass).length;
  const sampleFailure = perFixture.find((p) => !p.pass) ?? null;

  return {
    total: fixtures.length,
    passed,
    pass: passed === fixtures.length,
    sampleFailure,
    failureReason: sampleFailure
      ? "buildScanPrompt did not include the CV fingerprint substring in the user message"
      : null,
  };
}
