/**
 * Paid prompt integrity: does the prompt actually carry the CV into the
 * model? Implemented by building the legacy prompt and asserting either
 * (a) raw CV text is present, or (b) the truncated base64 segment, when
 * decoded, recovers the full CV.
 *
 * The current code at supabase/functions/analyze-cv/index.ts:23 fails
 * both — that's the smoking gun.
 */

import { checkPaidPromptIntegrity } from "../scoring/currentPaid.mjs";

export function computePaidPromptIntegrity(fixtures) {
  const perFixture = fixtures.map((fx) => ({
    id: fx.id,
    persona: fx.persona,
    ...checkPaidPromptIntegrity(fx),
  }));

  const passed = perFixture.filter((p) => p.pass).length;
  const rate = fixtures.length > 0 ? passed / fixtures.length : 0;

  return {
    total: fixtures.length,
    passed,
    rate,
    pass: rate >= 1.0,
    sampleFailure: perFixture.find((p) => !p.pass) ?? null,
  };
}
