// supabase/functions/linkedin-optimize
//
// Deep-scan + rewrite for the LinkedIn Optimizer (Step 3/4). Two modes:
//   POST { input_method, target_role?, market?, raw_profile }  -> scan
//   POST { mode: "get", id }                                   -> re-serve
//
// SECURITY (the whole point of this function):
//   - JWT is required (deploy with verify_jwt = true; we also re-verify
//     here). The free anonymous headline check (Step 1) does NOT hit this
//     function — it uses /api/ai?action=linkedin_headline.
//   - The FULL result (about_full + every locked experience block's
//     bullets) is stored split across two tables: the free-safe part in
//     public.linkedin_optimizations.result, the locked part in
//     public.linkedin_optimizations_private (service-role only, no RLS
//     policy). This function is the ONLY reader of the locked table.
//   - The HTTP response is STRIPPED unless the caller is unlocked. A
//     locked response literally does not contain about_full or the locked
//     bullets — they are never serialized into the payload. There is no
//     code path where full copy reaches the client and is merely hidden.
//   - Unlock is server-authoritative: decided from the `permissions` row
//     (service='linkedin_optimizer', flipped by the Ziina/Razorpay
//     webhooks) OR the user's pro access. The is_unlocked column is a
//     snapshot only and is never trusted for access.
//   - Metrics are never fabricated: the model is told to emit bracketed
//     placeholders like [Number] for any figure absent from the source.
//
// Free allowance: headline + about_preview + the FIRST experience block
// are free; the full About and the remaining experience blocks are locked.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_VERSION = "2023-06-01";
const PERMISSION_SERVICE = "linkedin_optimizer";

// Server-side caps (re-applied on top of the intake caps).
const HEADLINE_MAX = 220;
const ABOUT_PREVIEW_MAX = 200;
const ABOUT_FULL_MAX = 2600;
const DESC_MAX = 2000;
const BULLET_MAX = 300;
const BLOCKS_MAX = 15;

// Light per-user abuse guards (fail-open). Deep scans are expensive, so a
// modest daily ceiling per account is plenty for a real job seeker.
const DAILY_SCAN_LIMIT = 25;
const DAILY_USD_CAP = 3.0;

// Anthropic per-1M-token USD rates (mirror analyze-cv/_pricing.mjs).
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-haiku-4-5": { in: 1.0, out: 5.0 },
  "claude-sonnet-4-6": { in: 3.0, out: 15.0 },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function str(v: unknown, max?: number): string {
  const s = v == null ? "" : String(v).trim();
  return max ? s.slice(0, max) : s;
}

function modelForPro(isPro: boolean): string {
  return isPro ? "claude-sonnet-4-6" : "claude-haiku-4-5";
}

function estimateCostUsd(model: string, inTok: number, outTok: number): number {
  const p = PRICING[model] ?? PRICING["claude-haiku-4-5"];
  const usd = (inTok / 1e6) * p.in + (outTok / 1e6) * p.out;
  return Math.max(0, Number(usd.toFixed(6)));
}

// ── Structured-output tool ──────────────────────────────────────────────────
const CATEGORY_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    grade: { type: "string" },
    feedback: { type: "string" },
  },
  required: ["score", "grade", "feedback"],
};

const LINKEDIN_TOOL = {
  name: "emit_linkedin_optimization",
  description:
    "Emit the profile score and the rewritten LinkedIn copy in one structured object.",
  input_schema: {
    type: "object",
    properties: {
      score: {
        type: "object",
        properties: {
          overall: { type: "integer", minimum: 0, maximum: 100 },
          categories: {
            type: "object",
            properties: {
              headline: CATEGORY_SCHEMA,
              about_narrative: CATEGORY_SCHEMA,
              impact_metrics: CATEGORY_SCHEMA,
              search_visibility: CATEGORY_SCHEMA,
            },
            required: [
              "headline",
              "about_narrative",
              "impact_metrics",
              "search_visibility",
            ],
          },
          top_three_fixes: {
            type: "array",
            items: { type: "string" },
            minItems: 3,
            maxItems: 3,
          },
        },
        required: ["overall", "categories", "top_three_fixes"],
      },
      optimized: {
        type: "object",
        properties: {
          headline: { type: "string" },
          about_preview: { type: "string" },
          about_full: { type: "string" },
          experience_blocks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                role: { type: "string" },
                company: { type: "string" },
                period: { type: "string" },
                optimized_bullets: { type: "array", items: { type: "string" } },
              },
              required: ["id", "role", "company", "optimized_bullets"],
            },
          },
        },
        required: [
          "headline",
          "about_preview",
          "about_full",
          "experience_blocks",
        ],
      },
    },
    required: ["score", "optimized"],
  },
};

function systemPrompt(): string {
  return [
    "You are a LinkedIn profile optimizer for the India to Gulf (UAE/GCC) job market.",
    "You score a profile honestly on four categories and rewrite it to how recruiters actually skim.",
    "Grades use the A+ to F scale and must track the numeric score.",
    "NEVER fabricate metrics. If a specific figure (budget, growth %, team size, timeline) is not present in the source, write a bracketed placeholder such as [Number], [%], or [team size]. Do not invent employers, dates, or achievements.",
    "Keep to the LinkedIn limits: headline at most 220 characters, About at most 2600 characters.",
    "ASCII punctuation only. Do not use em dashes.",
    "You must respond by calling the emit_linkedin_optimization tool.",
  ].join(" ");
}

function userPrompt(
  rawProfile: RawProfile,
  targetRole: string,
  market: string,
): string {
  const marketLine =
    market === "india"
      ? "Target market: India metros and India-to-Gulf corridor."
      : market === "gulf"
      ? "Target market: Dubai / GCC."
      : "Target market: India to Gulf corridor (India metros and the GCC).";
  return [
    marketLine,
    targetRole ? `Target role: ${targetRole}` : "Target role: not specified.",
    "",
    "Score these four categories 0-100 with a letter grade and one honest sentence of feedback each: headline, about_narrative, impact_metrics, search_visibility. Roll them up into an overall 0-100. Give exactly three top_three_fixes, each a single actionable sentence.",
    "",
    "Then rewrite the profile:",
    "- headline: one line, at most 220 characters, with seniority, scope, and a region signal.",
    "- about_preview: a tight hook of roughly 140 to 160 characters drawn from the opening of about_full.",
    "- about_full: about four short paragraphs, at most 2600 characters total.",
    "- experience_blocks: for EACH block below, keep its id, role, company, and period, and write exactly three recruiter-ready optimized_bullets that quantify impact (use bracketed placeholders where a number is missing).",
    "",
    "PROFILE JSON:",
    JSON.stringify(rawProfile),
  ].join("\n");
}

// ── Types ─────────────────────────────────────────────────────────────────
interface RawBlock {
  id: string;
  role: string;
  company: string;
  duration: string;
  description: string;
}
interface RawProfile {
  headline: string;
  about: string;
  experience_blocks: RawBlock[];
}

function normaliseRawProfile(p: unknown): RawProfile | null {
  if (!p || typeof p !== "object" || Array.isArray(p)) return null;
  const o = p as Record<string, unknown>;
  const blocks = Array.isArray(o.experience_blocks) ? o.experience_blocks : [];
  const experience_blocks: RawBlock[] = blocks
    .slice(0, BLOCKS_MAX)
    .map((b, i) => {
      const e = (b ?? {}) as Record<string, unknown>;
      return {
        id: str(e.id) || `exp-${i}`,
        role: str(e.role, 200),
        company: str(e.company, 200),
        duration: str(e.duration, 120),
        description: str(e.description, DESC_MAX),
      };
    })
    .filter((b) => b.role || b.company || b.description);
  const headline = str(o.headline, HEADLINE_MAX);
  const about = str(o.about, ABOUT_FULL_MAX);
  if (!headline && !about && experience_blocks.length === 0) return null;
  return { headline, about, experience_blocks };
}

// Decide unlock authoritatively: a permissions row OR pro access.
async function isUnlockedFor(
  // deno-lint-ignore no-explicit-any
  admin: any,
  userId: string,
): Promise<{ unlocked: boolean; isPro: boolean }> {
  let isPro = false;
  try {
    const { data: prof } = await admin
      .from("profiles")
      .select("is_pro, pro_access_expires_at")
      .eq("id", userId)
      .maybeSingle();
    const notExpired =
      prof?.pro_access_expires_at &&
      new Date(prof.pro_access_expires_at).getTime() > Date.now();
    isPro = prof?.is_pro === true || !!notExpired;
  } catch {
    /* fail closed on pro, still allow permission check */
  }
  if (isPro) return { unlocked: true, isPro: true };
  try {
    const { data: perm } = await admin
      .from("permissions")
      .select("status")
      .eq("user_id", userId)
      .eq("service", PERMISSION_SERVICE)
      .maybeSingle();
    return { unlocked: perm?.status === "unlocked", isPro: false };
  } catch {
    return { unlocked: false, isPro: false };
  }
}

// Build the stripped (or full) client payload from stored parts.
// deno-lint-ignore no-explicit-any
function serveResult(base: any, priv: any, unlocked: boolean): any {
  const result = base.result ?? {};
  const optimized = result.optimized ?? {};
  const blocks = Array.isArray(optimized.experience_blocks)
    ? optimized.experience_blocks
    : [];
  const lockedBullets = (priv?.locked_bullets ?? {}) as Record<string, string[]>;

  const experience_blocks = blocks.map((b: Record<string, unknown>) => {
    const id = String(b.id);
    const isLocked = b.is_locked === true;
    if (unlocked && isLocked) {
      // Merge the locked bullets back in for an unlocked viewer.
      return {
        id,
        role: b.role,
        company: b.company,
        period: b.period,
        optimized_bullets: lockedBullets[id] ?? [],
        is_locked: false,
      };
    }
    return b;
  });

  const out = {
    ...result,
    optimized: {
      ...optimized,
      experience_blocks,
      ...(unlocked && priv?.about_full
        ? { about_full: priv.about_full }
        : {}),
    },
  };
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    return json({ error: "server_not_configured" }, 500);
  }

  // ── JWT verify ──
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return json({ error: "unauthorized" }, 401);

  const authClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: userData, error: userErr } = await authClient.auth.getUser(token);
  const user = userData?.user;
  if (userErr || !user) return json({ error: "invalid_session" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  // ── Mode: re-serve a stored optimization (post-unlock) ──
  if (body.mode === "get") {
    const id = str(body.id);
    if (!id) return json({ error: "missing_id" }, 400);
    const { data: base } = await admin
      .from("linkedin_optimizations")
      .select("id, user_id, overall_score, result")
      .eq("id", id)
      .maybeSingle();
    if (!base || base.user_id !== user.id) return json({ error: "not_found" }, 404);
    const { data: priv } = await admin
      .from("linkedin_optimizations_private")
      .select("about_full, locked_bullets")
      .eq("optimization_id", id)
      .maybeSingle();
    const { unlocked } = await isUnlockedFor(admin, user.id);
    return json({
      id: base.id,
      overall_score: base.overall_score,
      is_unlocked: unlocked,
      result: serveResult(base, priv, unlocked),
    });
  }

  // ── Mode: run a scan ──
  const inputMethod = body.input_method === "paste" ? "paste" : "pdf";
  const targetRole = str(body.target_role, 200);
  const market =
    body.market === "gulf" || body.market === "india"
      ? (body.market as string)
      : null;
  const rawProfile = normaliseRawProfile(body.raw_profile);
  if (!rawProfile) {
    return json({ error: "invalid_profile", message: "Profile is empty or unreadable." }, 400);
  }

  const { unlocked, isPro } = await isUnlockedFor(admin, user.id);

  // ── Abuse guards (per user, today; fail-open) ──
  const sinceIso = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString();
  try {
    const { count } = await admin
      .from("anthropic_calls")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("endpoint", "linkedin-optimize")
      .eq("status", "ok")
      .gte("occurred_at", sinceIso);
    if ((count ?? 0) >= DAILY_SCAN_LIMIT) {
      return json({ error: "rate_limited", message: "Daily scan limit reached. Try again tomorrow." }, 429);
    }
    const { data: spendRows } = await admin
      .from("anthropic_calls")
      .select("estimated_cost_usd")
      .eq("user_id", user.id)
      .eq("status", "ok")
      .gte("occurred_at", sinceIso);
    const spent = (spendRows ?? []).reduce(
      (s: number, r: { estimated_cost_usd?: number }) => s + Number(r.estimated_cost_usd || 0),
      0,
    );
    if (spent >= DAILY_USD_CAP) {
      return json({ error: "spend_capped", message: "Daily limit reached. Try again tomorrow." }, 402);
    }
  } catch {
    /* fail open */
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "anthropic_not_configured" }, 500);

  const model = modelForPro(isPro);

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
        max_tokens: 4096,
        temperature: 0.4,
        system: systemPrompt(),
        tools: [LINKEDIN_TOOL],
        tool_choice: { type: "tool", name: LINKEDIN_TOOL.name },
        messages: [
          { role: "user", content: userPrompt(rawProfile, targetRole, market ?? "") },
        ],
      }),
    });
  } catch (err) {
    return json({ error: "anthropic_unreachable", message: String(err) }, 502);
  }
  if (!response.ok) {
    const text = await response.text();
    return json({ error: "anthropic_error", status: response.status, body: text.slice(0, 500) }, 502);
  }

  const ai = await response.json();
  const toolUse = (ai.content ?? []).find(
    (b: { type?: string }) => b?.type === "tool_use",
  );
  if (!toolUse || !toolUse.input || typeof toolUse.input !== "object") {
    return json({ error: "no_tool_use_in_response" }, 502);
  }
  const out = toolUse.input as Record<string, any>; // deno-lint-ignore no-explicit-any
  const score = out.score;
  const optimized = out.optimized;
  if (!score || !optimized || !Array.isArray(optimized.experience_blocks)) {
    return json({ error: "schema_violation" }, 502);
  }

  const overall = Math.max(0, Math.min(100, Math.round(Number(score.overall) || 0)));

  // Map the model's optimized blocks back onto the real block ids/metadata,
  // in the SAME order as the confirmed raw profile.
  // deno-lint-ignore no-explicit-any
  const modelBlocks: any[] = optimized.experience_blocks;
  const fullBlocks = rawProfile.experience_blocks.map((rb, i) => {
    const mb = modelBlocks[i] ?? {};
    const bullets = (Array.isArray(mb.optimized_bullets) ? mb.optimized_bullets : [])
      .map((x: unknown) => str(x, BULLET_MAX))
      .filter(Boolean)
      .slice(0, 6);
    return {
      id: rb.id,
      role: rb.role || str(mb.role, 200),
      company: rb.company || str(mb.company, 200),
      period: rb.duration || str(mb.period, 120),
      optimized_bullets: bullets,
    };
  });

  const aboutFull = str(optimized.about_full, ABOUT_FULL_MAX);
  const aboutPreview = str(optimized.about_preview, ABOUT_PREVIEW_MAX) ||
    aboutFull.slice(0, 150);
  const optHeadline = str(optimized.headline, HEADLINE_MAX);

  // ── Split into free-safe (public) + locked (private) ──
  // Free allowance: block index 0 unlocked; the rest locked.
  const publicBlocks = fullBlocks.map((b, i) => {
    if (i === 0) {
      return { ...b, is_locked: false };
    }
    // Locked: keep metadata, drop the bullets from the public row.
    return { id: b.id, role: b.role, company: b.company, period: b.period, is_locked: true };
  });
  const lockedBullets: Record<string, string[]> = {};
  fullBlocks.forEach((b, i) => {
    if (i > 0) lockedBullets[b.id] = b.optimized_bullets;
  });

  const publicResult = {
    raw_profile: rawProfile,
    score: {
      overall,
      categories: score.categories,
      top_three_fixes: Array.isArray(score.top_three_fixes)
        ? score.top_three_fixes.slice(0, 3).map((x: unknown) => str(x, 400))
        : [],
    },
    optimized: {
      headline: optHeadline,
      about_preview: aboutPreview,
      experience_blocks: publicBlocks,
      // about_full deliberately absent from the public row.
    },
  };

  // ── Persist (service role) ──
  const { data: inserted, error: insErr } = await admin
    .from("linkedin_optimizations")
    .insert({
      user_id: user.id,
      input_method: inputMethod,
      target_role: targetRole || null,
      market,
      overall_score: overall,
      is_unlocked: unlocked,
      result: publicResult,
    })
    .select("id")
    .single();
  if (insErr || !inserted) {
    return json({ error: "persist_failed", message: insErr?.message }, 500);
  }
  const optimizationId = inserted.id as string;

  const { error: privErr } = await admin
    .from("linkedin_optimizations_private")
    .insert({
      optimization_id: optimizationId,
      about_full: aboutFull,
      locked_bullets: lockedBullets,
    });
  if (privErr) {
    // Roll back the base row so we never leave a half-stored scan.
    await admin.from("linkedin_optimizations").delete().eq("id", optimizationId);
    return json({ error: "persist_failed", message: privErr.message }, 500);
  }

  // ── Cost log (best-effort) ──
  const usage = ai.usage ?? {};
  const inTok = Number(usage.input_tokens ?? 0);
  const outTok = Number(usage.output_tokens ?? 0);
  try {
    await admin.from("anthropic_calls").insert({
      user_id: user.id,
      tier: isPro ? "paid" : "free",
      endpoint: "linkedin-optimize",
      model,
      input_tokens: inTok,
      output_tokens: outTok,
      estimated_cost_usd: estimateCostUsd(model, inTok, outTok),
      status: "ok",
      meta: { input_method: inputMethod, market, blocks: fullBlocks.length },
    });
  } catch {
    /* logging is non-fatal */
  }

  // ── Respond with the stripped-or-full view ──
  return json({
    id: optimizationId,
    overall_score: overall,
    is_unlocked: unlocked,
    result: serveResult({ result: publicResult }, { about_full: aboutFull, locked_bullets: lockedBullets }, unlocked),
  });
});
