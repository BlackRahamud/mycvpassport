/**
 * Day 2: free + paid paths now share the same prompt + Edge Function;
 * the only difference is tier→model routing (Haiku vs Sonnet). This
 * file re-exports from currentFree.mjs and provides a paid-tier
 * convenience builder.
 */

export { buildPromptFor, hashPrompt, hasApiKey, runLiveScan } from "./currentFree.mjs";

import { buildPromptFor as _buildPromptFor } from "./currentFree.mjs";

export function buildPaidPromptFor(fixture) {
  return _buildPromptFor(fixture, "paid");
}
