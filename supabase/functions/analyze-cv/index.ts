import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

import { buildScanPromptBlocks, getSystemPrompt } from "./_prompt.mjs";
import {
  SCAN_TOOL,
  modelForTier,
  ANTHROPIC_VERSION,
  MAX_TOKENS_BY_MODEL,
} from "./_schema.mjs";
import { estimateCostUsd } from "./_pricing.mjs";
import { checkRateLimit, getLimit } from "./_rateLimit.mjs";
import { checkSpendCap, getDailyCapUsd } from "./_spendCap.mjs";
import { verifyTurnstile } from "./_turnstile.mjs";
import { hashIp, getCallerIp, logCall } from "./_logging.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ScanRequest {
  cvText?: string;
  jobDescription?: string;
  userId?: string;
  tier?: string;
  turnstileToken?: string;
  bypassToken?: string;
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

function isPaid(tier: string): boolean {
  return tier === "paid" || tier === "paid_pro";
}

function normaliseTier(raw: unknown): "anonymous" | "free" | "paid" | "paid_pro" {
  const v = String(raw ?? "").toLowerCase();
  if (v === "paid_pro" || v === "career_pro" || v === "max_pro") return "paid_pro";
  if (v === "paid" || v === "active_hunter" || v === "express_pass" || v === "pro") return "paid";
  if (v === "free") return "free";
  return "anonymous";
}

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
  const tier = normaliseTier(body.tier);
  const userId = body.userId && body.userId !== "anon" ? String(body.userId) : null;

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

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabase =
    supabaseUrl && serviceKey
      ? createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;

  const callerIp = getCallerIp(req);
  const ipHash = await hashIp(callerIp);
  const identityArgs = { userId, ipHash, tier };

  // ── Turnstile ────────────────────────────────────────────────────────────
  // Only enforced for anonymous + free callers. Paid scans skip the
  // captcha because they're already authenticated and rate-limited.
  if (tier === "anonymous" || tier === "free") {
    const ts = await verifyTurnstile({
      token: body.turnstileToken,
      bypassToken: body.bypassToken,
      remoteIp: callerIp ?? undefined,
    });
    if (!ts.ok) {
      if (supabase) {
        await logCall(supabase, {
          user_id: userId,
          ip_hash: ipHash,
          tier,
          endpoint: "analyze-cv",
          status: "turnstile_blocked",
          error_code: ts.mode,
          meta: { reason: ts.reason ?? null, errorCodes: ts.errorCodes ?? null },
        });
      }
      return json(
        {
          error: "turnstile_blocked",
          mode: ts.mode,
          message:
            "Captcha verification failed. Refresh the page and try again — if it keeps failing, you may be behind a strict network.",
        },
        403,
      );
    }
  }

  // ── Rate limit ───────────────────────────────────────────────────────────
  let rate = { allowed: true, remaining: getLimit(tier).count, used: 0, limit: getLimit(tier).count, windowHours: 24, degraded: false };
  if (supabase) {
    rate = await checkRateLimit(supabase, identityArgs);
  }
  if (!rate.allowed) {
    if (supabase) {
      await logCall(supabase, {
        user_id: userId,
        ip_hash: ipHash,
        tier,
        endpoint: "analyze-cv",
        status: "rate_limited",
        meta: { used: rate.used, limit: rate.limit, windowHours: rate.windowHours },
      });
    }
    return json(
      {
        error: "rate_limited",
        message: `Daily limit reached for the ${tier} tier (${rate.limit} scans per ${rate.windowHours}h). Wait or upgrade.`,
        used: rate.used,
        limit: rate.limit,
        remaining: 0,
        resetsInHours: rate.windowHours,
      },
      429,
    );
  }

  // ── Spend cap ────────────────────────────────────────────────────────────
  const cap = supabase
    ? await checkSpendCap(supabase, identityArgs)
    : { allowed: true, spentUsd: 0, capUsd: getDailyCapUsd(tier), fraction: 0, alertThresholdHit: false };
  if (!cap.allowed) {
    if (supabase) {
      await logCall(supabase, {
        user_id: userId,
        ip_hash: ipHash,
        tier,
        endpoint: "analyze-cv",
        status: "spend_capped",
        meta: { spentUsd: cap.spentUsd, capUsd: cap.capUsd },
      });
    }
    return json(
      {
        error: "spend_capped",
        message: `Daily Anthropic spend cap hit for the ${tier} tier ($${cap.capUsd.toFixed(2)}). Resets at UTC midnight.`,
        spentUsd: cap.spentUsd,
        capUsd: cap.capUsd,
      },
      402,
    );
  }

  // ── Anthropic call ───────────────────────────────────────────────────────
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return json({ error: "anthropic_not_configured" }, 500);
  }

  const model = modelForTier(tier);
  const maxTokens =
    (MAX_TOKENS_BY_MODEL as Record<string, number>)[model] ?? 2048;

  const userBlocks = buildScanPromptBlocks({
    cvText,
    jobDescription: body.jobDescription,
  });
  const systemBlocks = [
    {
      type: "text",
      text: getSystemPrompt(),
      cache_control: { type: "ephemeral" },
    },
  ];

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
        system: systemBlocks,
        tools: [SCAN_TOOL],
        tool_choice: { type: "tool", name: SCAN_TOOL.name },
        messages: [{ role: "user", content: userBlocks }],
      }),
    });
  } catch (err) {
    if (supabase) {
      await logCall(supabase, {
        user_id: userId,
        ip_hash: ipHash,
        tier,
        endpoint: "analyze-cv",
        model,
        status: "error",
        error_code: "anthropic_unreachable",
        meta: { message: String(err) },
      });
    }
    return json({ error: "anthropic_unreachable", message: String(err) }, 502);
  }

  if (!response.ok) {
    const text = await response.text();
    if (supabase) {
      await logCall(supabase, {
        user_id: userId,
        ip_hash: ipHash,
        tier,
        endpoint: "analyze-cv",
        model,
        status: "error",
        error_code: `anthropic_http_${response.status}`,
        meta: { body: text.slice(0, 500) },
      });
    }
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
    if (supabase) {
      await logCall(supabase, {
        user_id: userId,
        ip_hash: ipHash,
        tier,
        endpoint: "analyze-cv",
        model,
        status: "error",
        error_code: "no_tool_use_in_response",
      });
    }
    return json({ error: "no_tool_use_in_response", raw: ai }, 502);
  }

  const result = tool.input as Record<string, unknown>;
  for (const k of REQUIRED_TOOL_FIELDS) {
    if (!(k in result)) {
      if (supabase) {
        await logCall(supabase, {
          user_id: userId,
          ip_hash: ipHash,
          tier,
          endpoint: "analyze-cv",
          model,
          status: "error",
          error_code: "schema_violation",
          meta: { field: k },
        });
      }
      return json(
        { error: "schema_violation", field: k, raw: result },
        502,
      );
    }
  }

  // ── Cost + log ───────────────────────────────────────────────────────────
  const usage = ai.usage ?? {};
  const inputTokens = usage.input_tokens ?? 0;
  const cacheCreate = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;

  const estimatedCost = estimateCostUsd({
    model,
    inputTokens,
    cacheCreationInputTokens: cacheCreate,
    cacheReadInputTokens: cacheRead,
    outputTokens,
  });

  if (supabase) {
    await logCall(supabase, {
      user_id: userId,
      ip_hash: ipHash,
      tier,
      endpoint: "analyze-cv",
      model,
      input_tokens: inputTokens,
      cache_creation_input_tokens: cacheCreate,
      cache_read_input_tokens: cacheRead,
      output_tokens: outputTokens,
      estimated_cost_usd: estimatedCost,
      status: "ok",
      meta: cap.alertThresholdHit
        ? {
            soft_alert: true,
            spentUsd: Number((cap.spentUsd + estimatedCost).toFixed(6)),
            capUsd: cap.capUsd,
          }
        : null,
    });
  }

  // After this call, deduct the new use from the rate budget.
  const remainingAfter = Math.max(0, (rate.remaining ?? rate.limit) - 1);

  // ── Response ─────────────────────────────────────────────────────────────
  const score =
    typeof result.score === "number" ? (result.score as number) : 0;
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
    usage,
    cost: {
      estimatedUsd: estimatedCost,
      cacheReadInputTokens: cacheRead,
      cacheCreationInputTokens: cacheCreate,
    },
    quota: {
      tier,
      used: rate.used + 1,
      remaining: remainingAfter,
      limit: rate.limit,
      windowHours: rate.windowHours,
      isPaid: isPaid(tier),
    },
    spend: {
      spentUsdToday: Number((cap.spentUsd + estimatedCost).toFixed(6)),
      capUsd: cap.capUsd,
      alertThresholdHit: cap.alertThresholdHit,
    },
  });
});
