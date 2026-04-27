/**
 * Anthropic public pricing (USD per million tokens).
 *
 * Source: https://www.anthropic.com/pricing
 * Captured: 2026-04-28. Re-validate quarterly.
 *
 * Cache-creation tokens are billed at ~1.25× base input.
 * Cache-read tokens are billed at ~0.10× base input (the 90 % savings
 * that prompt caching exists for).
 */

const PRICING = {
  "claude-haiku-4-5": {
    inputPerM: 1.0,
    cacheCreationPerM: 1.25,
    cacheReadPerM: 0.1,
    outputPerM: 5.0,
  },
  "claude-sonnet-4-6": {
    inputPerM: 3.0,
    cacheCreationPerM: 3.75,
    cacheReadPerM: 0.3,
    outputPerM: 15.0,
  },
};

const FALLBACK = PRICING["claude-haiku-4-5"];

/**
 * Estimate USD cost for a single Anthropic call from the response usage block.
 * @param {{
 *   model?: string,
 *   inputTokens?: number,
 *   cacheCreationInputTokens?: number,
 *   cacheReadInputTokens?: number,
 *   outputTokens?: number,
 * }} u
 * @returns {number}
 */
export function estimateCostUsd(u) {
  const p = PRICING[u.model] ?? FALLBACK;
  const it = Number(u.inputTokens ?? 0);
  const cc = Number(u.cacheCreationInputTokens ?? 0);
  const cr = Number(u.cacheReadInputTokens ?? 0);
  const ot = Number(u.outputTokens ?? 0);

  const usd =
    (it * p.inputPerM) / 1e6 +
    (cc * p.cacheCreationPerM) / 1e6 +
    (cr * p.cacheReadPerM) / 1e6 +
    (ot * p.outputPerM) / 1e6;

  return Math.max(0, Number(usd.toFixed(6)));
}

export function pricingFor(model) {
  return PRICING[model] ?? FALLBACK;
}
