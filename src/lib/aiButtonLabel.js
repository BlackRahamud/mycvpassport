/**
 * Single source of truth for the in-builder "AI assist" button label.
 *
 * Used by both AI surfaces in the builder so they cannot drift:
 *   - ProfessionalSummaryField (Summary section) — idleLabel "Write with AI"
 *   - Experience editor "Improve with AI" entry  — idleLabel "Improve with AI"
 *
 * Server contract: POST /api/ai?action=tailor returns credits_remaining:
 *   null     → paid tier (Pro / Express)             → no counter
 *   0..2     → free tier; 0 means free quota burned  → upgrade CTA
 *
 * The 0-state intentionally short-circuits to the upgrade modal instead
 * of POSTing to /api/ai. The server would just return 402 — calling it
 * adds a round-trip and lets users sit on a spinner before the paywall
 * shows. isAiExhausted() exists so call sites can wire that branch
 * symmetrically.
 *
 * Word "free" is intentional: surfacing it keeps users aware they are
 * on a free trial before they hit the paywall, instead of feeling
 * ambushed at attempt 3.
 */

const UPGRADE_LABEL = "Upgrade for unlimited AI";

export function deriveAiButtonLabel({
  aiLoading = false,
  creditsRemaining = null,
  idleLabel,
  loadingLabel = null,
}) {
  if (aiLoading && loadingLabel) return loadingLabel;
  if (creditsRemaining === 0) return UPGRADE_LABEL;
  if (creditsRemaining == null) return idleLabel;
  return `${idleLabel} (${creditsRemaining} free left)`;
}

export function isAiExhausted(creditsRemaining) {
  return creditsRemaining === 0;
}
