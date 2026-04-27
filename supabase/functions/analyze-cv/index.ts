import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { buildScanPrompt, getSystemPrompt } from "./_prompt.mjs";
import {
  SCAN_TOOL,
  modelForTier,
  ANTHROPIC_VERSION,
  MAX_TOKENS_BY_MODEL,
} from "./_schema.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ScanRequest {
  cvText?: string;
  jobDescription?: string;
  userId?: string;
  tier?: string;
}

const REQUIRED_TOOL_FIELDS = [
  "score",
  "keywordsScore",
  "structureScore",
  "contentScore",
  "industry",
  "seniority",
  "reasons",
  "missingSkills",
  "atsFlags",
  "confidence",
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  let body: ScanRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const cvText = String(body.cvText ?? "").trim();
  if (!cvText) {
    return json(
      {
        error: "missing_cv_text",
        message:
          "Server received an empty CV. Re-upload, or check that the file extracted (encrypted / scanned-image PDFs are rejected client-side).",
      },
      400,
    );
  }
  if (cvText.length > 50000) {
    return json(
      {
        error: "cv_too_long",
        message: "CV exceeds the 50000-char limit. Trim and re-upload.",
      },
      413,
    );
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return json({ error: "anthropic_not_configured" }, 500);
  }

  const model = modelForTier(body.tier);
  const maxTokens = MAX_TOKENS_BY_MODEL[model] ?? 2048;
  const systemPrompt = getSystemPrompt();
  const userPrompt = buildScanPrompt({
    cvText,
    jobDescription: body.jobDescription,
  });

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        tools: [SCAN_TOOL],
        tool_choice: { type: "tool", name: SCAN_TOOL.name },
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
  } catch (err) {
    return json(
      { error: "anthropic_unreachable", message: String(err) },
      502,
    );
  }

  if (!response.ok) {
    const text = await response.text();
    return json(
      {
        error: "anthropic_error",
        status: response.status,
        body: text.slice(0, 800),
      },
      502,
    );
  }

  const ai = await response.json();
  const tool = (ai.content ?? []).find(
    (b: { type?: string }) => b?.type === "tool_use",
  );
  if (!tool || !tool.input || typeof tool.input !== "object") {
    return json({ error: "no_tool_use_in_response", raw: ai }, 502);
  }

  const result = tool.input as Record<string, unknown>;
  for (const k of REQUIRED_TOOL_FIELDS) {
    if (!(k in result)) {
      return json(
        { error: "schema_violation", field: k, raw: result },
        502,
      );
    }
  }

  // Backwards-compat shape so the existing UI keeps working without a
  // simultaneous front-end change. New fields ride alongside the legacy
  // names. Future cleanup PR can drop the legacy synonyms once callers
  // migrate.
  const score = typeof result.score === "number" ? (result.score as number) : 0;
  const compat = {
    score: result.score,
    keywordsScore: result.keywordsScore,
    structureScore: result.structureScore,
    contentScore: result.contentScore,
    industry: result.industry,
    visibilityBoosters: result.visibilityBoosters ?? [],
    rankTriggers: result.rankTriggers ?? [],
    topPercent: Math.max(1, Math.min(99, 100 - score)),
    missingCount: Array.isArray(result.rankTriggers)
      ? (result.rankTriggers as string[]).length
      : 0,
  };

  return json({
    ...compat,
    seniority: result.seniority,
    reasons: result.reasons,
    missingSkills: result.missingSkills,
    atsFlags: result.atsFlags,
    bilingualHeadline: result.bilingualHeadline ?? null,
    missingJd: result.missingJd ?? false,
    confidence: result.confidence,
    model,
    usage: ai.usage ?? null,
  });
});
