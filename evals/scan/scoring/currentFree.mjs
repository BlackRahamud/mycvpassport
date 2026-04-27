/**
 * Eval-time wrapper around the real Day-2 scan pipeline.
 *
 * Pre-Day-2 this file replicated the legacy ATSChecker.jsx free path
 * (hardcoded scores, JD-only keyword matching). That path is gone. The
 * file now exposes:
 *   - buildPromptFor(fixture, tier)  — pure, deterministic, used by
 *     structural invariants (adversarial variance, prompt integrity).
 *   - runLiveScan(fixture, tier)     — gated on ANTHROPIC_API_KEY; calls
 *     Anthropic with the real prompt + tool, returns the parsed result.
 *     Used by behavioral metrics (field accuracy, score band).
 */

import {
  buildScanPrompt,
  getSystemPrompt,
} from "../../../supabase/functions/analyze-cv/_prompt.mjs";
import {
  SCAN_TOOL,
  modelForTier,
  ANTHROPIC_VERSION,
  MAX_TOKENS_BY_MODEL,
} from "../../../supabase/functions/analyze-cv/_schema.mjs";

export function buildPromptFor(fixture, tier = "free") {
  return {
    system: getSystemPrompt(),
    user: buildScanPrompt({ cvText: fixture.cv, jobDescription: fixture.jd }),
    model: modelForTier(tier),
  };
}

export function hashPrompt(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}

export function hasApiKey() {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function runLiveScan(fixture, tier = "free") {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  const prompts = buildPromptFor(fixture, tier);
  const maxTokens = MAX_TOKENS_BY_MODEL[prompts.model] ?? 2048;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: prompts.model,
      max_tokens: maxTokens,
      system: prompts.system,
      tools: [SCAN_TOOL],
      tool_choice: { type: "tool", name: SCAN_TOOL.name },
      messages: [{ role: "user", content: prompts.user }],
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic ${response.status}: ${text.slice(0, 300)}`);
  }
  const data = await response.json();
  const tool = (data.content ?? []).find((b) => b?.type === "tool_use");
  if (!tool || !tool.input) {
    throw new Error("no tool_use in response");
  }
  return tool.input;
}
