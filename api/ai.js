/**
 * POST /api/ai?action=cover_letter|parse_resume|linkedin_headline|tailor|whatsapp_draft|candidate_verdict|import_structure|suggest_skills|linkedin_parse|interview_kit|candidate_match
 *
 * Single Anthropic-helper router. Was three separate functions
 * (api/cover-letter.js, api/parse-resume.js, api/generate-linkedin-headline.js)
 * — merged to bring the project under the Vercel Hobby 12-function
 * limit. Each branch is the previous handler's logic moved verbatim:
 * same model, same max_tokens, same prompts, same auth posture, same
 * error responses. The only contract change is the URL — frontend
 * callers append ?action=... to the existing URL and are otherwise
 * unchanged.
 *
 * Action lookup precedence: query string first, body field second.
 * Query lets logs and curl invocations show the action without
 * parsing the body.
 *
 * Auth (per-branch — matches the legacy endpoints exactly):
 *   - cover_letter:       no server-side auth (UI gates upstream)
 *   - linkedin_headline:  no server-side auth (free first pass)
 *   - parse_resume:       Bearer JWT + profiles.is_pro = true
 *   - tailor:             Bearer JWT + free-tier credit gate via
 *                         profiles.ai_credits_used (Pro/Express skip
 *                         the gate, free users get BUILDER_TAILOR_FREE_LIMIT
 *                         credits total). Pre-deducts atomically; refunds
 *                         on Anthropic upstream failure. Per-call audit
 *                         row written to anthropic_calls.
 *
 * Tailor request shape:
 *   POST { section: 'summary' | 'experience_bullet' | 'description', input: {...} }
 *     summary input:           { summary, target_role?, target_market?, name? }
 *     experience_bullet input: { bullet, role?, company?, target_role? }
 *     description input:       { text, role?, company?, target_role?, target_market? }
 *                              (direct Improve-with-AI: rewrites the WHOLE
 *                               description; hot temperature + per-call style
 *                               seed; never cached, so re-clicks differ)
 *
 * Tailor response shape:
 *   200 summary:               { ok: true, result: string, credits_remaining: int }
 *   200 experience_bullet:     { ok: true, alternatives: string[3], credits_remaining: int }
 *   200 description:           { ok: true, alternatives: string[3], credits_remaining: int }
 *   402 free-tier exhausted: { ok: false, error, credits_remaining: 0, action: 'upgrade' }
 *   502 Anthropic upstream:  { ok: false, error, credits_remaining: int }  (refund honoured for free)
 *
 * Required env:
 *   - ANTHROPIC_API_KEY                                 (all branches)
 *   - SUPABASE_URL / REACT_APP_SUPABASE_URL             (parse_resume, tailor)
 *   - SUPABASE_ANON_KEY / REACT_APP_SUPABASE_ANON_KEY   (parse_resume, tailor)
 *   - SUPABASE_SERVICE_ROLE_KEY                         (tailor: atomic credit RPC + audit insert)
 *
 * Optional env:
 *   - BUILDER_TAILOR_MODEL                              default 'claude-sonnet-4-6'
 */

import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { hasProAccess } from '../src/config/access.js';

export const config = { maxDuration: 60 };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Tailor action (in-builder AI assist) configuration. Free users get
// BUILDER_TAILOR_FREE_LIMIT total credits across both summary and
// experience_bullet sections; Pro/Express bypass the gate.
const BUILDER_TAILOR_MODEL = process.env.BUILDER_TAILOR_MODEL || 'claude-sonnet-4-6';
const BUILDER_TAILOR_MAX_TOKENS = 1500;
// Free tier = 3 AI rewrites PER MONTH. The monthly reset is enforced inside
// the try_deduct_ai_credit RPC (migration 019_ai_credits_monthly_reset.sql):
// the RPC zeroes ai_credits_used when the stored period rolls into a new
// month before applying this cap. Until that migration is run the cap behaves
// as a lifetime counter (still honest — never blocks before the cap).
const BUILDER_TAILOR_FREE_LIMIT = 3;

// Per-tier MONTHLY AI rewrite caps. Every tier is metered through the same
// try_deduct_ai_credit RPC (the binary is_pro bypass is gone). Career Pro is
// an "unlimited" soft cap — an abuse guard that is effectively never reached.
// Migration 019 resets profiles.ai_credits_used at each month boundary so
// these read as per-month. Subscription logic (pro_access_expires_at) is
// untouched — these caps only govern the in-builder AI rewrite action.
const AI_MONTHLY_CAP = {
  free: BUILDER_TAILOR_FREE_LIMIT, // 3
  single_cv: 30,                   // Single-CV Unlock (durable single_cv_unlocked flag)
  active_hunter: 100,              // raised from 60 when candidate_match joined the shared pool (founder call, Jul 2026)
  career_pro: 1000,                // unlimited soft cap
};

// Anthropic Sonnet 4.6 rates per 1M tokens (USD). Re-validate quarterly
// against supabase/functions/analyze-cv/_pricing.mjs - that file is the
// project's canonical source of truth for cost estimation.
const SONNET_INPUT_USD_PER_M = 3.0;
const SONNET_OUTPUT_USD_PER_M = 15.0;

// Shared retry helper. cover_letter used 10000ms backoff in the
// legacy file; linkedin_headline used 8000ms — we accept the override
// so each branch keeps its original retry profile.
//
// Each attempt is bounded by an AbortController timeout (default 30s).
// Without it, a stalled upstream socket (connection open, no response)
// makes `await fetch` hang until the platform kills the function at
// maxDuration (60s) — which surfaces to the client as an indefinite
// spinner. On timeout we DON'T retry: we throw a clean error so the
// caller can return a 5xx fast (well inside the function budget and the
// client's own 45s ceiling). A real overloaded (429/529) response still
// retries with backoff as before.
async function fetchWithRetry(url, options, attempts = 3, backoff = 10000, timeoutMs = 30000) {
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetch(url, { ...options, signal: controller.signal });
    } catch (err) {
      clearTimeout(timer);
      if (err && err.name === 'AbortError') {
        const e = new Error(`Upstream request timed out after ${timeoutMs}ms`);
        e.code = 'upstream_timeout';
        throw e;
      }
      throw err;
    }
    clearTimeout(timer);
    if (response.ok || (response.status !== 529 && response.status !== 429)) {
      return response;
    }
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, backoff));
    } else {
      return response;
    }
  }
}

// =====================================================================
// Branch 1 — cover_letter (was api/cover-letter.js)
// =====================================================================

function buildCoverLetterPrompt({ cvData, jobTitle, companyName, jobDescription, date, market }) {
  const exp = Array.isArray(cvData?.experience)
    ? cvData.experience.join('\n')
    : String(cvData?.experience || '');
  const toneLine =
    market === 'India'
      ? 'Tone: formal, traditional Indian corporate style.'
      : 'Tone: confident Gulf corporate style appropriate for UAE/GCC employers.';
  return `
You are an expert cover letter writer. Write ONLY the body of the cover letter as plain text:
- Exactly 3 paragraphs, separated by a single blank line.
- Do NOT include a salutation (no "Dear"), subject line, date, address block, or sign-off (no "Sincerely").
- Professional tone; align closely with the job description.
- ${toneLine}

Today's date (reference only; do not repeat in output): ${date || ''}

Candidate:
Name: ${cvData?.name || ''}
Current/target role: ${cvData?.role || ''}
Summary: ${cvData?.summary || ''}
Skills: ${cvData?.skills || ''}
Experience highlights:
${exp.slice(0, 6000)}

Job title: ${jobTitle || 'Role'}
${(companyName || '').trim() ? `Company: ${(companyName || '').trim()}` : ''}

Job description:
${String(jobDescription || '').slice(0, 8000)}

Output the 3 paragraphs only.
`.trim();
}

async function handleCoverLetter(req, res, body) {
  const { cvData, jobTitle, companyName, jobDescription, date, market } = body;

  if (!cvData || typeof cvData !== 'object') {
    return res.status(400).json({ error: 'Missing cvData.' });
  }
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'AI Engine is not configured. Please try again later.' });
  }

  const prompt = buildCoverLetterPrompt({ cvData, jobTitle, companyName, jobDescription, date, market });

  try {
    const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 450,
        system: "CRITICAL: The cover letter body must not exceed 225 words. This is a hard layout constraint to ensure the document fits on one page. Prioritize impact over length. If no company name is provided, do not reference the company name anywhere in the letter. Do not use placeholder text such as 'your company', 'the company', or any generic substitute.",
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const responseText = await response.text();
    if (!response.ok) {
      return res.status(502).json({ error: 'AI Engine is busy, please try again in a moment.' });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return res.status(502).json({ error: 'AI Engine is busy, please try again in a moment.' });
    }

    const raw =
      (Array.isArray(data.content) && data.content[0] && data.content[0].text) ||
      data.content ||
      '';
    const coverLetterBody = String(raw).trim();
    if (!coverLetterBody) {
      return res.status(502).json({ error: 'Could not generate cover letter. Please try again.' });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ coverLetterBody });
  } catch (err) {
    console.error('[ai/cover_letter]', err);
    return res.status(502).json({ error: 'AI Engine is busy, please try again in a moment.' });
  }
}

// =====================================================================
// Branch 2 — linkedin_headline (was api/generate-linkedin-headline.js)
// =====================================================================

function buildLinkedInPrompt({ headline, market }) {
  const toneLine =
    market === 'india'
      ? 'Target market: India metros (Bengaluru, Mumbai, Delhi, Hyderabad). Use Indian corporate vocabulary where natural.'
      : 'Target market: Dubai / GCC. Use Gulf-market vocabulary (emirate names, AED salaries, regional employers) where natural.';
  return `
You are an expert LinkedIn headline copywriter for ${market === 'india' ? 'India metros' : 'Dubai / GCC'} recruiters.

Rewrite the following raw LinkedIn headline into EXACTLY three versions. Each must fit in 220 characters.

${toneLine}

Raw input: "${String(headline || '').slice(0, 400)}"

Output STRICT JSON only, no prose, no markdown fences, with these exact keys:
{
  "professional": "clean corporate style — role, years, market signal, seniority",
  "bold": "confident assertive style — outcome-led, numbers-first",
  "storyDriven": "human angle — mission or what drives them, still keyword-dense"
}

Rules:
- Each version must feel distinct in voice.
- Include role, seniority, and a market signal (city or region) in each.
- Do NOT use emoji.
- Do NOT exceed 220 characters per version.
- Return valid JSON only — nothing else.
`.trim();
}

function extractLooseJson(raw) {
  const text = String(raw || '').trim();
  const fenced =
    text.match(/```json\s*([\s\S]*?)\s*```/i) ||
    text.match(/```\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : text;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) return null;
  try {
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

async function handleLinkedInHeadline(req, res, body) {
  const headline = String(body.headline || '').trim();
  const market = body.market === 'india' ? 'india' : 'dubai';

  if (!headline) return res.status(400).json({ error: 'Missing headline.' });
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'AI Engine is not configured.' });

  try {
    // 8s backoff matches the legacy generate-linkedin-headline.js.
    const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: 'Return only valid JSON with keys professional, bold, storyDriven. No prose, no markdown fences, no commentary.',
        messages: [{ role: 'user', content: buildLinkedInPrompt({ headline, market }) }],
      }),
    }, 3, 8000);

    const responseText = await response.text();
    if (!response.ok) {
      return res.status(502).json({ error: 'AI Engine is busy, please try again.' });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return res.status(502).json({ error: 'AI Engine returned an unparseable response.' });
    }

    const raw =
      (Array.isArray(data.content) && data.content[0] && data.content[0].text) ||
      data.content ||
      '';

    const parsed = extractLooseJson(raw);
    if (!parsed || !parsed.professional || !parsed.bold || !parsed.storyDriven) {
      return res.status(502).json({ error: 'AI Engine returned an incomplete result. Please retry.' });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
      professional: String(parsed.professional).slice(0, 280),
      bold: String(parsed.bold).slice(0, 280),
      storyDriven: String(parsed.storyDriven).slice(0, 280),
      market,
    });
  } catch (err) {
    console.error('[ai/linkedin_headline]', err);
    return res.status(502).json({ error: 'AI Engine is busy, please try again.' });
  }
}

// =====================================================================
// Branch 3 — parse_resume (was api/parse-resume.js)
// =====================================================================

function buildParseResumePrompt(cleanedText) {
  return `
You are an institutional-grade resume parsing engine.

Input resume text (already lightly cleaned):
${(cleanedText || '').slice(0, 12000)}

Task:
Return a STRICT JSON object that captures the candidate's profile in three top-level keys:
- "work_experience": an array of objects like
  { "title": string, "company": string, "location": string | null, "start_date": string | null, "end_date": string | null, "bullets": string[] }
- "education": an array of objects like
  { "degree": string | null, "field": string | null, "institution": string, "location": string | null, "graduation_date": string | null }
- "skills": an object like
  { "hard_skills": string[], "soft_skills": string[], "tools": string[] }

Requirements:
- Dates must be human-readable strings (e.g. "Jan 2022" or "Present"), not timestamps.
- If a value is unknown, use null, not an empty string.
- Do not invent jobs or degrees that are clearly not present.
- Do not include any commentary, explanation, or markdown.
- Respond with JSON ONLY, no backticks, no leading text.
`.trim();
}

async function handleParseResume(req, res, body) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user } = {}, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, is_pro, pro_access_expires_at')
    .eq('id', user.id)
    .single();

  // PGRST116 = "no rows" — treat as "no profile yet", which the
  // hasProAccess check below will reject. Any other error is a real DB
  // failure and we surface it.
  if (profileError && profileError.code !== 'PGRST116') {
    return res.status(500).json({ error: 'Could not verify subscription.' });
  }
  if (!hasProAccess(profile)) {
    return res.status(403).json({ error: 'Subscription required for premium AI parsing.' });
  }

  const text = String(body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Missing or empty text in request body.' });
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'AI Engine is not configured. Please try again later.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        messages: [{ role: 'user', content: buildParseResumePrompt(text) }],
      }),
    });

    const responseText = await response.text();
    if (!response.ok) {
      return res.status(502).json({ error: 'AI Engine is busy, please try again in a moment.' });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return res.status(502).json({ error: 'AI Engine is busy, please try again in a moment.' });
    }

    const raw =
      (Array.isArray(data.content) && data.content[0] && data.content[0].text) ||
      data.content ||
      '';
    const jsonString = String(raw).replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(jsonString);

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(parsed);
  } catch (err) {
    console.error('[ai/parse_resume]', err);
    return res.status(502).json({ error: 'AI Engine is busy, please try again in a moment.' });
  }
}

// =====================================================================
// Branch 4 — tailor (in-builder AI assist)
//
// Per-section interactive rewrite for the builder. Two sections in
// Phase 1: 'summary' (single rewrite) and 'experience_bullet' (3
// alternatives). Skills section deferred until the array migration
// lands (see research doc Session 2 lock).
//
// Credit model:
//   - Pro / Express skip the gate (unlimited).
//   - Free tier gets BUILDER_TAILOR_FREE_LIMIT (= 3) credits per month,
//     tracked atomically via profiles.ai_credits_used + the
//     try_deduct_ai_credit / refund_ai_credit Postgres RPCs (the deduct
//     RPC resets the counter at each month boundary — migration 019).
//   - Pre-deduct + refund on Anthropic upstream failure: credit lost
//     only when a successful Anthropic response was actually returned.
//
// Audit:
//   Every call (success or failure) writes one row to anthropic_calls
//   with endpoint='builder_tailor' and a meta jsonb containing section,
//   alternative_count, and (on free-tier upstream errors) refunded:true.
//   The /admin/cost dashboard already reads anthropic_calls so volume
//   and spend show up automatically.
// =====================================================================

const VALID_TAILOR_SECTIONS = new Set(['summary', 'experience_bullet', 'description']);

// Per-section sampling temperature. The 'description' direct-improve flow
// must read as real, paid AI: re-running it should yield genuinely
// different phrasings, so it samples hot (0.95) and the prompt injects a
// per-call style seed. The legacy single-shot sections keep their tuned
// 0.4 (deterministic-ish, fewer surprises).
function temperatureForSection(section) {
  return section === 'description' ? 0.95 : 0.4;
}

// Style angles seeded per 'description' call so the three alternatives
// diverge in voice and re-clicks don't echo the previous run. One angle
// is picked at random and handed to the model as the lens for option 1;
// the model is told to make options 2 and 3 distinct from it.
const DESCRIPTION_STYLE_ANGLES = [
  'outcome-led — lead with the measurable result or business impact',
  'scope-led — emphasise scale, ownership, and breadth of responsibility',
  'skills-led — surface the concrete tools, systems, and methods used',
  'leadership-led — foreground collaboration, mentoring, and stakeholder work',
  'problem-solution — frame each line as a challenge resolved',
  'concise-punch — tightest possible phrasing, every word earning its place',
];

// Maps profile state to the value space anthropic_calls.tier accepts:
// 'anonymous' | 'free' | 'paid' | 'paid_pro'. Active Hunter / Career
// Pro count as paid_pro; Express Pass (one-off) as paid.
function classifyTier(profile) {
  if (!hasProAccess(profile)) return 'free';
  // profiles.plan has historic inconsistency (old rows lowercase, new rows
  // UPPERCASE_SNAKE — see TIER_TO_PROFILE_PLAN). Normalize before matching.
  if (String(profile?.plan || '').toLowerCase() === 'express_pass') return 'paid';
  return 'paid_pro';
}

// Resolves the billing tier -> monthly AI rewrite cap. Subscription passes
// (pro_access_expires_at via hasProAccess) win; then the durable Single-CV
// Unlock flag; else free. Grandfathered/unknown-plan pro access falls through
// to the Career Pro soft cap so we never throttle a paying subscriber.
function aiTierAndCap(profile) {
  if (hasProAccess(profile)) {
    if (String(profile?.plan || '').toUpperCase() === 'ACTIVE_HUNTER') {
      return { aiTier: 'active_hunter', cap: AI_MONTHLY_CAP.active_hunter };
    }
    return { aiTier: 'career_pro', cap: AI_MONTHLY_CAP.career_pro };
  }
  if (profile?.single_cv_unlocked === true) {
    return { aiTier: 'single_cv', cap: AI_MONTHLY_CAP.single_cv };
  }
  return { aiTier: 'free', cap: AI_MONTHLY_CAP.free };
}

function estimateCostUsd(usage) {
  const inTok = Number(usage?.input_tokens) || 0;
  const outTok = Number(usage?.output_tokens) || 0;
  const usd = (inTok / 1e6) * SONNET_INPUT_USD_PER_M
            + (outTok / 1e6) * SONNET_OUTPUT_USD_PER_M;
  return Math.round(usd * 1e6) / 1e6;
}

// Audit-log insert. Wrapped so a DB failure never breaks the
// user-visible response - the AI result already happened, the audit
// row is bookkeeping.
async function logAnthropicCall(db, payload) {
  try {
    const { error } = await db.from('anthropic_calls').insert(payload);
    if (error) {
      console.error('[ai/tailor] anthropic_calls insert failed:', error.message);
    }
  } catch (err) {
    console.error('[ai/tailor] anthropic_calls insert threw:', String(err?.message || err).slice(0, 300));
  }
}

async function tryDeductCredit(db, userId, limit) {
  const { data, error } = await db.rpc('try_deduct_ai_credit', {
    p_user_id: userId,
    p_limit: limit,
  });
  if (error) {
    console.error('[ai/tailor] try_deduct_ai_credit failed:', error.message);
    return { ok: false, used: null, dbError: true };
  }
  // RPC returns int (new used count) or null when at the monthly cap.
  if (data == null) return { ok: false, used: limit };
  return { ok: true, used: Number(data) };
}

async function refundCredit(db, userId) {
  const { data, error } = await db.rpc('refund_ai_credit', {
    p_user_id: userId,
  });
  if (error) {
    console.error('[ai/tailor] refund_ai_credit failed:', error.message);
    return { ok: false, used: null };
  }
  return { ok: true, used: data == null ? 0 : Number(data) };
}

const TAILOR_SYSTEM_RULES = `FORMATTING RULES - NEVER VIOLATE:
1. No emdashes or endashes. Use hyphens, commas, or semicolons instead.
2. No curly/smart quotes. Straight quotes only.
3. No ellipsis character. Use three periods instead.
4. ASCII punctuation only throughout all output.
5. No markdown fences, no commentary, no preamble.

HALLUCINATION RULES - NEVER VIOLATE:
1. Never invent company names, dates, achievements, or qualifications not in the input.
2. Never add certifications (ITIL, PMP, AWS, etc.) not explicitly stated.
3. Never invent metrics, percentages, or currency amounts.
4. Preserve the candidate's actual experience and voice.
5. If a target role / market context is missing, work with what is provided. Do not guess.`;

function buildSummarySystem() {
  return `You are an expert CV writer specialising in the UAE/GCC and Indian job markets.
You rewrite a candidate's professional summary so it reads as a regionally-tuned, ATS-friendly opener.

${TAILOR_SYSTEM_RULES}`;
}

function buildSummaryUserPrompt({ summary, target_role, target_market, name }) {
  return `Rewrite this professional summary.

CURRENT SUMMARY:
<<<
${String(summary || '').slice(0, 4000)}
>>>

CONTEXT:
- Target role:   ${String(target_role || '').trim() || '(not provided)'}
- Target market: ${String(target_market || '').trim() || 'UAE'}
- Candidate:     ${String(name || '').trim() || '(not provided)'}

DIRECTIVES:
- 3 to 4 sentences. No more.
- Lead with target role + years of experience if those are inferable from the source.
- For UAE / GCC market: include visa status / notice period only if the source already mentions them.
- For India market: formal Indian corporate tone, skip Gulf-specific status fields.
- Use strong, specific verbs. No filler ("seasoned professional", "passionate about", "results-driven", "dynamic").
- Never invent companies, achievements, or metrics not in the source.

Output PLAIN TEXT only - the rewritten summary, nothing else. No JSON, no markdown, no preamble, no quotes around it.`;
}

function buildBulletSystem() {
  return `You are an expert CV editor specialising in the UAE/GCC and Indian job markets.
You rewrite a SINGLE experience bullet into 3 distinct alternative versions.

${TAILOR_SYSTEM_RULES}`;
}

function buildBulletUserPrompt({ bullet, role, company, target_role }) {
  return `Rewrite this single experience bullet into 3 distinct alternative versions.

CURRENT BULLET:
<<<
${String(bullet || '').slice(0, 1000)}
>>>

CONTEXT:
- Role:        ${String(role || '').trim() || '(not provided)'}
- Company:     ${String(company || '').trim() || '(not provided)'}
- Target role: ${String(target_role || '').trim() || '(not provided)'}

DIRECTIVES per alternative:
- Start with a strong action verb. Each alternative uses a DIFFERENT verb.
- Read as Action -> Result.
- Maximum 25 words per bullet.
- Preserve the candidate's actual achievement. Never invent metrics, numbers, or outcomes not implied by the original.
- If a metric exists in the original, surface it. If it does not, do not fabricate one.
- Three alternatives must feel distinct in angle (e.g. one outcome-led, one process-led, one team / scale-led - whatever fits the source).

Output STRICT JSON only, no markdown, no commentary:
{ "alternatives": ["bullet v1", "bullet v2", "bullet v3"] }

Exactly 3 strings. Each non-empty. Each unique.`;
}

function buildDescriptionSystem() {
  return `You are an expert CV editor specialising in the UAE/GCC and Indian job markets.
You rewrite an entire experience/role description (which may contain several bullet lines) into 3 distinct, complete alternative versions. Each alternative is a full replacement for the whole description, not a single line.

${TAILOR_SYSTEM_RULES}`;
}

function buildDescriptionUserPrompt({ text, role, company, target_role, target_market, seedAngle, seedNonce }) {
  return `Rewrite this ENTIRE experience description into 3 distinct, complete alternative versions. Each alternative replaces the whole description.

CURRENT DESCRIPTION:
<<<
${String(text || '').slice(0, 4000)}
>>>

CONTEXT:
- Role:          ${String(role || '').trim() || '(not provided)'}
- Company:       ${String(company || '').trim() || '(not provided)'}
- Target role:   ${String(target_role || '').trim() || '(not provided)'}
- Target market: ${String(target_market || '').trim() || 'UAE'}

DIRECTIVES per alternative:
- Preserve the same set of bullet lines / paragraphs as the source. If the source is bulleted, keep it bulleted (one achievement per line). If it is prose, keep it prose.
- Start each bullet with a strong action verb. Read as Action -> Result.
- Keep each bullet tight (aim for 25 words or fewer).
- Preserve the candidate's actual achievements. Never invent metrics, numbers, dates, employers, or outcomes not implied by the original. If a metric exists, surface it; if not, do not fabricate one.
- Make the three alternatives feel genuinely different in angle and word choice — do not return three near-identical versions.
- For alternative 1, lean into this lens: ${String(seedAngle || 'outcome-led')}. Make alternatives 2 and 3 take clearly different lenses from it and from each other.

Variation token (ignore in output, it only seeds fresh phrasing): ${String(seedNonce || '')}

Output STRICT JSON only, no markdown, no commentary:
{ "alternatives": ["full description v1", "full description v2", "full description v3"] }

Exactly 3 strings. Each non-empty. Each meaningfully distinct. Newlines inside a string are allowed for multi-bullet descriptions.`;
}

async function callAnthropicTailor({ system, userPrompt, isJsonExpected, temperature = 0.4 }) {
  const response = await fetchWithRetry(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: BUILDER_TAILOR_MODEL,
        max_tokens: BUILDER_TAILOR_MAX_TOKENS,
        temperature,
        system,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    },
    3,
    8000,
  );

  const responseText = await response.text();
  if (!response.ok) {
    const err = new Error(`Anthropic ${response.status}`);
    err.code = 'anthropic_' + response.status;
    err.bodyPreview = responseText.slice(0, 300);
    throw err;
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    const err = new Error('Anthropic envelope parse failed');
    err.code = 'envelope_parse_failed';
    throw err;
  }

  const raw =
    (Array.isArray(data.content) && data.content[0] && data.content[0].text) ||
    data.content ||
    '';
  const text = String(raw).trim();
  if (!text) {
    const err = new Error('Anthropic returned empty content');
    err.code = 'empty_content';
    throw err;
  }

  const usage = {
    input_tokens: data?.usage?.input_tokens ?? null,
    output_tokens: data?.usage?.output_tokens ?? null,
  };

  if (!isJsonExpected) {
    return { result: text, usage };
  }

  // JSON-expected branch: strip any stray code fences, parse, validate.
  const cleaned = text.replace(/```json|```/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    const err = new Error('Tailor JSON parse failed');
    err.code = 'json_parse_failed';
    throw err;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    const err = new Error('Tailor JSON shape invalid');
    err.code = 'json_shape_invalid';
    throw err;
  }
  return { parsed, usage };
}

async function handleTailor(req, res, body) {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ ok: false, error: 'AI Engine is not configured.' });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ ok: false, error: 'Server not configured: Supabase env missing.' });
  }

  // 1. Body validation.
  const section = typeof body.section === 'string' ? body.section.trim() : '';
  if (!VALID_TAILOR_SECTIONS.has(section)) {
    return res.status(400).json({ ok: false, error: 'Invalid section. Use summary or experience_bullet.' });
  }
  const input = (body.input && typeof body.input === 'object' && !Array.isArray(body.input)) ? body.input : null;
  if (!input) {
    return res.status(400).json({ ok: false, error: 'Missing input object.' });
  }
  if (section === 'summary' && !String(input.summary || '').trim()) {
    return res.status(400).json({ ok: false, error: 'Missing input.summary.' });
  }
  if (section === 'experience_bullet' && !String(input.bullet || '').trim()) {
    return res.status(400).json({ ok: false, error: 'Missing input.bullet.' });
  }
  if (section === 'description' && !String(input.text || '').trim()) {
    return res.status(400).json({ ok: false, error: 'Missing input.text.' });
  }

  // 2. Auth (Bearer JWT via anon client - mirrors parse_resume).
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Unauthorized. Please sign in.' });
  }
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user } = {}, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !user) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired session.' });
  }

  // 3. Service-role client for atomic credit RPCs and the audit insert.
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 4. Profile + tier classification (re-classified live every call).
  const { data: profile, error: profileErr } = await db
    .from('profiles')
    .select('id, is_pro, plan, ai_credits_used, pro_access_expires_at, single_cv_unlocked')
    .eq('id', user.id)
    .maybeSingle();
  if (profileErr) {
    console.error('[ai/tailor] profile lookup failed:', JSON.stringify(profileErr));
    return res.status(500).json({ ok: false, error: 'Could not verify your account.' });
  }
  const tier = classifyTier(profile);
  // Per-tier MONTHLY cap. Every tier is metered now (no is_pro bypass); the
  // RPC resets the counter each month (migration 019). Career Pro's cap is a
  // very high soft cap, so it is effectively unlimited.
  const { aiTier, cap } = aiTierAndCap(profile);

  // 5. Monthly AI credit gate. Atomic pre-deduct via RPC for every tier.
  const before = Number(profile?.ai_credits_used) || 0;
  const creditsRemainingPreDeduct = Math.max(0, cap - before);

  const deduct = await tryDeductCredit(db, user.id, cap);
  if (deduct.dbError) {
    return res.status(500).json({ ok: false, error: 'Could not deduct credit. Please try again.' });
  }
  if (!deduct.ok) {
    // Monthly cap reached for this tier. Audit the blocked attempt + 402.
    await logAnthropicCall(db, {
      user_id: user.id,
      ip_hash: null,
      tier,
      endpoint: 'builder_tailor',
      model: BUILDER_TAILOR_MODEL,
      input_tokens: null,
      output_tokens: null,
      estimated_cost_usd: 0,
      status: 'spend_capped',
      error_code: 'monthly_cap',
      meta: { section, alternative_count: 0, reason: 'monthly_cap', ai_tier: aiTier, cap },
    });
    return res.status(402).json({
      ok: false,
      error: 'You have used your AI rewrites for this month. Upgrade for a higher monthly limit.',
      credits_remaining: 0,
      action: 'upgrade',
    });
  }

  const computeRemaining = (usedNow) => Math.max(0, cap - usedNow);

  // 6. Build prompt + call Anthropic.
  //    'description' samples hot with a per-call style seed so the three
  //    options diverge and re-clicks return fresh phrasings (uncached by
  //    design — this handler never reads/writes query_cache).
  let system;
  let userPrompt;
  if (section === 'summary') {
    system = buildSummarySystem();
    userPrompt = buildSummaryUserPrompt(input);
  } else if (section === 'description') {
    const seedAngle = DESCRIPTION_STYLE_ANGLES[Math.floor(Math.random() * DESCRIPTION_STYLE_ANGLES.length)];
    const seedNonce = Math.random().toString(36).slice(2, 10);
    system = buildDescriptionSystem();
    userPrompt = buildDescriptionUserPrompt({ ...input, seedAngle, seedNonce });
  } else {
    system = buildBulletSystem();
    userPrompt = buildBulletUserPrompt(input);
  }
  // summary returns plain text; bullet + description return JSON alternatives.
  const isJsonExpected = section !== 'summary';
  const temperature = temperatureForSection(section);

  let aiResult;
  try {
    aiResult = await callAnthropicTailor({ system, userPrompt, isJsonExpected, temperature });
  } catch (e) {
    // 7a. Anthropic upstream failure. Refund the just-deducted credit (all
    // tiers are metered, so always refund).
    let refundedRemaining = creditsRemainingPreDeduct;
    const refund = await refundCredit(db, user.id);
    if (refund.ok) {
      refundedRemaining = computeRemaining(refund.used);
    }
    await logAnthropicCall(db, {
      user_id: user.id,
      ip_hash: null,
      tier,
      endpoint: 'builder_tailor',
      model: BUILDER_TAILOR_MODEL,
      input_tokens: null,
      output_tokens: null,
      estimated_cost_usd: 0,
      status: 'error',
      error_code: e?.code || 'anthropic_unknown',
      meta: {
        section,
        alternative_count: 0,
        refunded: true,
        ai_tier: aiTier,
      },
    });
    console.error('[ai/tailor] Anthropic call failed:', e?.code, String(e?.message || '').slice(0, 300));
    return res.status(502).json({
      ok: false,
      error: 'AI Engine is busy, please try again.',
      credits_remaining: refundedRemaining,
    });
  }

  // 7b. Validate output shape per section.
  let payload;
  if (section === 'summary') {
    const result = String(aiResult.result || '').trim();
    if (!result) {
      // Treat empty as upstream failure for the user (refund + audit).
      await refundCredit(db, user.id);
      await logAnthropicCall(db, {
        user_id: user.id,
        ip_hash: null,
        tier,
        endpoint: 'builder_tailor',
        model: BUILDER_TAILOR_MODEL,
        input_tokens: aiResult.usage?.input_tokens ?? null,
        output_tokens: aiResult.usage?.output_tokens ?? null,
        estimated_cost_usd: estimateCostUsd(aiResult.usage),
        status: 'error',
        error_code: 'empty_summary',
        meta: { section, alternative_count: 0, refunded: true, ai_tier: aiTier },
      });
      return res.status(502).json({
        ok: false,
        error: 'AI returned an empty summary. Please retry.',
        credits_remaining: creditsRemainingPreDeduct,
      });
    }
    payload = { result };
  } else {
    // experience_bullet: must be { alternatives: [str, str, str] }, all non-empty + unique.
    const alts = Array.isArray(aiResult.parsed?.alternatives) ? aiResult.parsed.alternatives : null;
    const cleaned = alts
      ? alts.map((s) => String(s || '').trim()).filter(Boolean)
      : [];
    const uniqueCleaned = Array.from(new Set(cleaned));
    if (uniqueCleaned.length < 3) {
      await refundCredit(db, user.id);
      await logAnthropicCall(db, {
        user_id: user.id,
        ip_hash: null,
        tier,
        endpoint: 'builder_tailor',
        model: BUILDER_TAILOR_MODEL,
        input_tokens: aiResult.usage?.input_tokens ?? null,
        output_tokens: aiResult.usage?.output_tokens ?? null,
        estimated_cost_usd: estimateCostUsd(aiResult.usage),
        status: 'error',
        error_code: 'bullet_alternatives_short',
        meta: { section, alternative_count: uniqueCleaned.length, refunded: true, ai_tier: aiTier },
      });
      return res.status(502).json({
        ok: false,
        error: 'AI did not return 3 distinct alternatives. Please retry.',
        credits_remaining: creditsRemainingPreDeduct,
      });
    }
    payload = { alternatives: uniqueCleaned.slice(0, 3) };
  }

  // 8. Success: audit + return. Every tier is metered, so the deducted
  // credit stands and remaining is reported numerically.
  const usedNow = (Number(profile?.ai_credits_used) || 0) + 1;
  const creditsRemaining = computeRemaining(usedNow);

  await logAnthropicCall(db, {
    user_id: user.id,
    ip_hash: null,
    tier,
    endpoint: 'builder_tailor',
    model: BUILDER_TAILOR_MODEL,
    input_tokens: aiResult.usage?.input_tokens ?? null,
    output_tokens: aiResult.usage?.output_tokens ?? null,
    estimated_cost_usd: estimateCostUsd(aiResult.usage),
    status: 'ok',
    error_code: null,
    meta: {
      section,
      alternative_count: section === 'summary' ? 1 : 3,
    },
  });

  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json({
    ok: true,
    ...payload,
    credits_remaining: creditsRemaining,
  });
}

// =====================================================================
// Branch 5 — whatsapp_draft (HR smart outreach composer)
//
// Drafts ONE short, warm, professional WhatsApp message for an HR to send
// a candidate. Lives here (not as a standalone api/whatsapp-draft.js)
// because the project is at the Vercel Hobby 12-function ceiling — the
// same reason the cover_letter / linkedin / parse endpoints were merged.
//
// Auth: Bearer JWT (any signed-in user) — mirrors parse_resume.
// Request:  { cvSnapshot?, jobTitle?, tone?: 'gulf'|'india' }
// Response: 200 { message }
// =====================================================================

const WHATSAPP_DRAFT_MODEL = process.env.WHATSAPP_DRAFT_MODEL || 'claude-haiku-4-5-20251001';

function summariseCvForOutreach(cv) {
  if (!cv || typeof cv !== 'object') return '';
  const personal = cv.personal || cv.basics || {};
  const name = cv.name || personal.name || '';
  const role = cv.desired_job || cv.target_role || personal.headline || '';
  const skillsRaw = cv.skills || cv.skill_list || cv.tools || [];
  const skills = Array.isArray(skillsRaw)
    ? skillsRaw.map((s) => (typeof s === 'string' ? s : s?.name || s?.label)).filter(Boolean).slice(0, 10).join(', ')
    : '';
  const exp = Array.isArray(cv.experience)
    ? cv.experience.slice(0, 3).map((e) => [e.title || e.role, e.company || e.employer].filter(Boolean).join(' at ')).filter(Boolean).join('; ')
    : '';
  return [
    name && `Name: ${name}`,
    role && `Target role: ${role}`,
    skills && `Skills: ${skills}`,
    exp && `Recent experience: ${exp}`,
  ].filter(Boolean).join('\n').slice(0, 1500);
}

function buildWhatsappDraftPrompt({ cvSnapshot, jobTitle, tone }) {
  const toneLine = tone === 'india'
    ? 'Tone: formal, respectful Indian corporate style.'
    : 'Tone: warm, confident Gulf corporate style appropriate for UAE/GCC.';
  const cvText = summariseCvForOutreach(cvSnapshot);
  return `Write ONE short WhatsApp message from a recruiter to a candidate about a role.

${toneLine}

Role: ${String(jobTitle || '').trim() || 'the role'}
Candidate profile (optional context - do not list it back verbatim):
${cvText || '(not provided)'}

RULES:
- 1 to 3 sentences. Conversational, professional, plain text.
- Greet the candidate by first name if a name is present; otherwise a neutral greeting.
- Invite a next step (a quick call or their availability).
- No emoji. No markdown. No subject line. No sign-off block.
- Do not invent facts, employer names, salaries, or guarantees.
- No superlatives or unverifiable claims.

Output only the message text.`;
}

async function handleWhatsappDraft(req, res, body) {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'AI Engine is not configured.' });
  }
  // Light auth — any signed-in user (mirrors parse_resume).
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: { user } = {}, error } = await authClient.auth.getUser(token);
      if (error || !user) return res.status(401).json({ error: 'Invalid or expired session.' });
    } catch {
      return res.status(401).json({ error: 'Could not verify session.' });
    }
  }

  const prompt = buildWhatsappDraftPrompt({
    cvSnapshot: body.cvSnapshot,
    jobTitle: body.jobTitle,
    tone: body.tone === 'india' ? 'india' : 'gulf',
  });

  try {
    const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: WHATSAPP_DRAFT_MODEL,
        max_tokens: 300,
        temperature: 0.7,
        system: 'You are a recruiter writing concise, professional WhatsApp messages. Output one message, plain text, no emoji unless asked.',
        messages: [{ role: 'user', content: prompt }],
      }),
    }, 3, 8000);

    const responseText = await response.text();
    if (!response.ok) {
      return res.status(502).json({ error: 'AI Engine is busy, please try again.' });
    }
    let data;
    try { data = JSON.parse(responseText); } catch { return res.status(502).json({ error: 'AI Engine is busy, please try again.' }); }
    const raw = (Array.isArray(data.content) && data.content[0] && data.content[0].text) || '';
    const message = String(raw).trim();
    if (!message) return res.status(502).json({ error: 'AI returned an empty draft. Please retry.' });

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ message });
  } catch (err) {
    console.error('[ai/whatsapp_draft]', String(err?.message || err).slice(0, 200));
    return res.status(502).json({ error: 'AI Engine is busy, please try again.' });
  }
}

// =====================================================================
// Branch — suggest_skills (role-aware quick-pick chips for the Post-a-Job
// wizard). Replaces the hardcoded dev-stack chip list with 8 chips derived
// from the job title. Cached in query_cache (same table/pattern Scout uses)
// keyed by "skills::<normalized lowercased title>" with a 30-day TTL, so
// repeat titles never re-hit the model. Folded in here (no new serverless
// function) — the project is at the Vercel Hobby 12-function ceiling.
//
// Request:  { jobTitle }            Bearer-auth'd (any signed-in user)
// Response: { skills: string[8] }   (no prose, no markdown)
// =====================================================================

const SUGGEST_SKILLS_MODEL = process.env.SUGGEST_SKILLS_MODEL || 'claude-haiku-4-5';
const SUGGEST_SKILLS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Pull a clean string[] out of the model output. Tolerates a stray code
// fence or surrounding prose by extracting the first JSON array.
function parseSkillsArray(raw) {
  if (!raw) return [];
  let text = String(raw).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  let arr = null;
  try { arr = JSON.parse(text); } catch {
    const m = text.match(/\[[\s\S]*\]/);
    if (m) { try { arr = JSON.parse(m[0]); } catch { /* give up */ } }
  }
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  for (const s of arr) {
    const v = String(s == null ? '' : s).trim();
    if (!v || v.length > 40) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
    if (out.length === 8) break;
  }
  return out;
}

async function handleSuggestSkills(req, res, body) {
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'AI Engine is not configured.' });

  // Light auth — any signed-in user (mirrors whatsapp_draft).
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: { user } = {}, error } = await authClient.auth.getUser(token);
      if (error || !user) return res.status(401).json({ error: 'Invalid or expired session.' });
    } catch {
      return res.status(401).json({ error: 'Could not verify session.' });
    }
  }

  const jobTitle = (typeof body.jobTitle === 'string' ? body.jobTitle : '').trim();
  if (!jobTitle) return res.status(400).json({ error: 'jobTitle is required.' });

  const cacheKey = `skills::${jobTitle.toLowerCase().replace(/\s+/g, ' ').trim()}`;
  const db = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;

  // 1) Cache lookup — best-effort; a missing table never blocks a fresh call.
  if (db) {
    try {
      const { data: cached } = await db
        .from('query_cache')
        .select('enriched_payload, created_at')
        .eq('normalized_title', cacheKey)
        .maybeSingle();
      const cachedSkills = cached?.enriched_payload?.skills;
      if (Array.isArray(cachedSkills) && cachedSkills.length && cached.created_at) {
        const age = Date.now() - new Date(cached.created_at).getTime();
        if (age < SUGGEST_SKILLS_TTL_MS) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          return res.status(200).json({ skills: cachedSkills.slice(0, 8), cached: true });
        }
      }
    } catch (e) {
      console.warn('[ai/suggest_skills] cache lookup failed:', e?.message || e);
    }
  }

  // 2) Fresh model call.
  try {
    const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: SUGGEST_SKILLS_MODEL,
        max_tokens: 220,
        temperature: 0.3,
        system: 'You suggest concise, role-appropriate hiring skill tags for a job posting. Output ONLY a JSON array of exactly 8 short skill strings (1-3 words each), most important first. No prose, no explanation, no markdown, no code fences.',
        messages: [{ role: 'user', content: `Job title: "${jobTitle}". Return the 8 most relevant skills, tools, or competencies a recruiter would shortlist for this exact role, as a JSON array of strings.` }],
      }),
    }, 3, 8000);

    const responseText = await response.text();
    if (!response.ok) return res.status(502).json({ error: 'AI Engine is busy, please try again.' });
    let data;
    try { data = JSON.parse(responseText); } catch { return res.status(502).json({ error: 'AI Engine is busy, please try again.' }); }
    const raw = (Array.isArray(data.content) && data.content[0] && data.content[0].text) || '';
    const skills = parseSkillsArray(raw);
    if (!skills.length) return res.status(502).json({ error: 'AI returned no skills. Please retry.' });

    // 3) Cache upsert — best-effort; created_at refreshed so the TTL is honoured.
    if (db) {
      try {
        await db.from('query_cache').upsert(
          { normalized_title: cacheKey, enriched_payload: { skills }, created_at: new Date().toISOString() },
          { onConflict: 'normalized_title' },
        );
      } catch (e) {
        console.warn('[ai/suggest_skills] cache upsert failed:', e?.message || e);
      }
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ skills });
  } catch (err) {
    console.error('[ai/suggest_skills]', String(err?.message || err).slice(0, 200));
    return res.status(502).json({ error: 'AI Engine is busy, please try again.' });
  }
}

// =====================================================================
// Branch 6 — candidate_verdict (corridor-aware match verdict)
//
// Upgraded, semantic match score for the HR candidate detail. Replaces
// the untrustworthy keyword overlap with an LLM that credits EQUIVALENT
// real experience (not literal keyword hits), so strong candidates stop
// scoring ~22%. Trust-critical -> claude-sonnet-4-6 (overridable),
// low temperature. Server-side only. Folded in here (no new function)
// because the project is at the Vercel Hobby 12-function ceiling.
//
// Request:  { cvSnapshot, job: { title, description, skills, requirements } }
// Response: { verdict, score, two_second_why[3], whatsapp_cta_template,
//             strengths?[2-3], gaps?[2-3] }   (arrays are additive + best
//             effort; clients must tolerate their absence — old cached
//             verdicts predate them)
// =====================================================================

const VERDICT_MODEL = process.env.VERDICT_MODEL || 'claude-sonnet-4-6';

function summariseCvForVerdict(cv) {
  if (!cv || typeof cv !== 'object') return '(no CV provided)';
  const personal = cv.personal || cv.basics || {};
  const name = cv.name || personal.name || '';
  const role = cv.desired_job || cv.target_role || personal.headline || '';
  const location = personal.location || cv.location || '';
  const visa = cv.visa_status || personal.visa_status || '';
  const notice = cv.notice_period || personal.notice_period || cv.availability || '';
  const skillsRaw = cv.skills || cv.skill_list || cv.tools || [];
  const skills = Array.isArray(skillsRaw)
    ? skillsRaw.map((s) => (typeof s === 'string' ? s : s?.name || s?.label)).filter(Boolean).join(', ')
    : '';
  const exp = Array.isArray(cv.experience)
    ? cv.experience.slice(0, 6).map((e) => {
        const head = [e.title || e.role, e.company || e.employer].filter(Boolean).join(' at ');
        const dates = [e.start_date, e.end_date].filter(Boolean).join(' - ');
        const detail = Array.isArray(e.bullets) ? e.bullets.slice(0, 4).join('; ') : (e.description || e.summary || '');
        return `- ${head}${dates ? ` (${dates})` : ''}: ${String(detail).slice(0, 400)}`;
      }).join('\n')
    : '';
  const edu = Array.isArray(cv.education)
    ? cv.education.slice(0, 3).map((e) => [e.degree, e.field, e.school || e.institution].filter(Boolean).join(', ')).filter(Boolean).join('; ')
    : '';
  return [
    name && `Name: ${name}`,
    role && `Current/target role: ${role}`,
    location && `Location: ${location}`,
    visa && `Visa status: ${visa}`,
    notice && `Availability/notice: ${notice}`,
    skills && `Skills: ${skills}`,
    exp && `Experience:\n${exp}`,
    edu && `Education: ${edu}`,
  ].filter(Boolean).join('\n').slice(0, 6000) || '(no CV provided)';
}

function buildVerdictSystem() {
  return `You are a corridor-aware HR matching engine for the India -> Gulf (UAE/GCC) recruitment corridor. You decide whether a candidate fits a specific role and return a calibrated verdict.

SCORING WEIGHTS (sum to 100):
- Core technical skills / non-negotiables: 50%
- Domain-specific experience (same field/industry): 25%
- Corridor logistics (visa status, location, notice period, GCC experience): 15%
- Soft skills / secondary certifications: 10%

CRITICAL - SEMANTIC EQUIVALENCE, NOT KEYWORD MATCHING:
Credit real, equivalent experience even when the CV does not use the JD's exact words. Examples:
- "IT Service Desk L2 / enterprise infrastructure support" SATISFIES a JD asking for "Windows Server / Active Directory".
- "managed virtualised servers" SATISFIES "VMware / Hyper-V administration".
Reward genuine capability. Only count a true GAP when the capability is genuinely absent from the CV - never penalise a strong candidate merely for missing an exact phrase. Do not inflate either: if a real non-negotiable is genuinely absent, reflect it in the score.

VERDICT MUST MATCH SCORE:
- score >= 80 -> "STRONG FIT"
- score 50-79 -> "MAYBE"
- score < 50 -> "PASS"

OUTPUT - STRICT JSON ONLY, no markdown, no prose, no preamble:
{
  "verdict": "STRONG FIT" | "MAYBE" | "PASS",
  "score": <integer 0-100>,
  "two_second_why": ["Match: <strongest alignment to the JD>", "Corridor: <visa/location/notice/GCC-experience read>", "Gap: <single biggest risk or omission>"],
  "strengths": ["<2 to 3 items: real capabilities ON THIS CV that matter for THIS role>"],
  "gaps": ["<2 to 3 items: capabilities genuinely absent from the CV, or corridor risks, for THIS role>"],
  "whatsapp_cta_template": "<one short, warm, professional WhatsApp message to the candidate referencing a real strength and the role>"
}

two_second_why MUST be exactly 3 strings, each starting with "Match:", "Corridor:", "Gap:" in that order, each under 18 words. strengths and gaps MUST each contain 2 to 3 strings, each under 12 words, grounded in the same semantic-equivalence rules (a strength must exist on the CV; a gap must be genuinely absent, never a missing exact phrase). No emoji. ASCII punctuation only. Never use dash characters in any output string; use commas or periods instead.`;
}

function buildVerdictUserPrompt({ cvSnapshot, job }) {
  const j = job && typeof job === 'object' ? job : {};
  const skills = Array.isArray(j.skills) ? j.skills.join(', ') : String(j.skills || '');
  const reqs = Array.isArray(j.requirements)
    ? j.requirements.map((r) => `- ${typeof r === 'string' ? r : (r?.label || r?.text || '')}`).filter((s) => s.trim() !== '-').join('\n')
    : String(j.requirements || '');
  return `ROLE:
Title: ${String(j.title || '').slice(0, 200) || '(untitled)'}
Required skills: ${skills.slice(0, 1000) || '(none listed)'}
Requirements:
${reqs.slice(0, 2000) || '(none listed)'}
Description:
${String(j.description || '').slice(0, 3000) || '(none)'}

CANDIDATE CV:
${summariseCvForVerdict(cvSnapshot)}

Return the strict JSON verdict now.`;
}

function verdictFromScore(s) {
  return s >= 80 ? 'STRONG FIT' : s >= 50 ? 'MAYBE' : 'PASS';
}

// Dash-free interface copy is a product-wide rule. The prompts forbid dash
// characters, but models drift, and verdicts persisted before the rule (036
// stores them forever) would otherwise carry dashes into the UI — so every
// user-facing string is scrubbed server-side too. En/em dashes are replaced
// anywhere; hyphens only when spaced, so hyphenated names like "Al-Balushi"
// survive.
function scrubDashes(s) {
  return String(s || '')
    .replace(/\s*[–—]+\s*/g, ', ')
    .replace(/\s+-{1,2}\s+/g, ', ')
    .replace(/,\s*,+/g, ',')
    .trim();
}

// Enforce the score<->verdict invariant + the exactly-3 prefixed bullets
// server-side so the UI can trust the shape unconditionally.
//
// strengths/gaps are ADDITIVE and best-effort: 2-3 short items each when
// the model returns them cleanly, silently omitted otherwise. They must
// never fail an otherwise-valid verdict — old clients ignore them and the
// UI falls back to the two_second_why Gap line when absent.
function normaliseStrengthGapList(v) {
  if (!Array.isArray(v)) return null;
  const out = v
    .map((x) => scrubDashes(x).slice(0, 140))
    .filter(Boolean)
    .slice(0, 3);
  return out.length >= 2 ? out : null;
}

function normaliseVerdict(p) {
  if (!p || typeof p !== 'object') return null;
  let score = Math.round(Number(p.score));
  if (!Number.isFinite(score)) return null;
  score = Math.max(0, Math.min(100, score));
  const verdict = verdictFromScore(score);
  const why = Array.isArray(p.two_second_why) ? p.two_second_why.map((x) => String(x || '').trim()) : [];
  const labels = ['Match', 'Corridor', 'Gap'];
  const two_second_why = labels.map((lab, i) => {
    let line = why[i] || '';
    if (!new RegExp(`^${lab}\\s*:`, 'i').test(line)) line = `${lab}: ${line || 'Not noted'}`;
    return scrubDashes(line);
  });
  const cta = scrubDashes(p.whatsapp_cta_template);
  if (!cta) return null;
  const out = { verdict, score, two_second_why, whatsapp_cta_template: cta };
  const strengths = normaliseStrengthGapList(p.strengths);
  const gaps = normaliseStrengthGapList(p.gaps);
  if (strengths) out.strengths = strengths;
  if (gaps) out.gaps = gaps;
  return out;
}

async function handleCandidateVerdict(req, res, body) {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'AI Engine is not configured.' });
  }
  // Light auth — any signed-in user (mirrors parse_resume / whatsapp_draft).
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: { user } = {}, error } = await authClient.auth.getUser(token);
      if (error || !user) return res.status(401).json({ error: 'Invalid or expired session.' });
    } catch {
      return res.status(401).json({ error: 'Could not verify session.' });
    }
  }

  const prompt = buildVerdictUserPrompt({ cvSnapshot: body.cvSnapshot, job: body.job });

  try {
    const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: VERDICT_MODEL,
        max_tokens: 900,
        temperature: 0.2,
        system: buildVerdictSystem(),
        messages: [{ role: 'user', content: prompt }],
      }),
    }, 3, 8000);

    const responseText = await response.text();
    if (!response.ok) {
      return res.status(502).json({ error: 'AI Engine is busy, please try again.' });
    }
    let data;
    try { data = JSON.parse(responseText); } catch { return res.status(502).json({ error: 'AI Engine is busy, please try again.' }); }
    const raw = (Array.isArray(data.content) && data.content[0] && data.content[0].text) || '';
    const cleaned = String(raw).replace(/```json|```/g, '').trim();
    let parsed;
    try { parsed = JSON.parse(cleaned); } catch { return res.status(502).json({ error: 'AI returned an unparseable verdict. Please retry.' }); }
    const out = normaliseVerdict(parsed);
    if (!out) return res.status(502).json({ error: 'AI returned an incomplete verdict. Please retry.' });

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(out);
  } catch (err) {
    console.error('[ai/candidate_verdict]', String(err?.message || err).slice(0, 200));
    return res.status(502).json({ error: 'AI Engine is busy, please try again.' });
  }
}

// =====================================================================
// Branch 11 — candidate_match (candidate-side Job Match, one engine both sides)
//
// The candidate Job Match tab scores the SAME Sonnet rubric the recruiter
// candidate_verdict uses (same model, same weights, same semantic
// equivalence rule), so the number a candidate sees is the number a
// recruiter running that CV against that job would see. Replaces the
// client-side keyword-overlap score as the primary engine; the keyword
// bank survives client-side as the offline/error fallback only.
//
// Request:  { cvSnapshot, jobDescription }   (raw pasted JD text, no job row)
// Response: { ok, score, verdict, matched[], missing[], suggestion,
//             credits_remaining, cached? }
//
// Cost guards (this action is self-serve, so both are new here):
//   1. Warm-instance dedupe keyed by sha1(userId + cvSnapshot + normalized
//      JD), 15 min TTL. Identical repeats return the cached verdict and do
//      NOT re-bill. Best effort by design (module scope survives warm
//      serverless invocations only) — the client sessionStorage cache is
//      the first line, this is defense in depth.
//   2. Metered through the SAME monthly pool as builder tailor rewrites
//      (try_deduct_ai_credit / refund_ai_credit, migration 019). Active
//      Hunter cap raised 60 -> 100 to make room. Every call audits one
//      row to anthropic_calls with endpoint='job_match'.
// =====================================================================

const MATCH_DEDUPE_TTL_MS = 15 * 60 * 1000;
const MATCH_DEDUPE_MAX = 200;
const matchDedupe = new Map(); // key -> { out, ts }

function matchDedupeKey(userId, cvSnapshot, jd) {
  const norm = String(jd || '').toLowerCase().replace(/\s+/g, ' ').trim();
  return createHash('sha1')
    .update(String(userId))
    .update(JSON.stringify(cvSnapshot || {}))
    .update(norm)
    .digest('hex');
}

function matchDedupeGet(key) {
  const hit = matchDedupe.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > MATCH_DEDUPE_TTL_MS) { matchDedupe.delete(key); return null; }
  return hit.out;
}

function matchDedupeSet(key, out) {
  if (matchDedupe.size >= MATCH_DEDUPE_MAX) {
    const oldest = matchDedupe.keys().next().value;
    if (oldest !== undefined) matchDedupe.delete(oldest);
  }
  matchDedupe.set(key, { out, ts: Date.now() });
}

function buildMatchSystem() {
  return `You are a corridor-aware match engine for the India -> Gulf (UAE/GCC) recruitment corridor. You score how well a candidate's CV fits a specific job description, speaking TO THE CANDIDATE. You apply exactly the same rubric a recruiter-side verdict uses, so both sides of the product see one number.

SCORING WEIGHTS (sum to 100):
- Core technical skills / non-negotiables: 50%
- Domain-specific experience (same field/industry): 25%
- Corridor logistics (visa status, location, notice period, GCC experience): 15%
- Soft skills / secondary certifications: 10%

CRITICAL - SEMANTIC EQUIVALENCE, NOT KEYWORD MATCHING:
Credit real, equivalent experience even when the CV does not use the JD's exact words. Examples:
- "IT Service Desk L2 / enterprise infrastructure support" SATISFIES a JD asking for "Windows Server / Active Directory".
- "managed virtualised servers" SATISFIES "VMware / Hyper-V administration".
Reward genuine capability. Only count a true GAP when the capability is genuinely absent from the CV - never penalise merely for a missing exact phrase. Do not inflate either: if a real non-negotiable is genuinely absent, reflect it in the score.

VERDICT MUST MATCH SCORE:
- score >= 80 -> "STRONG FIT"
- score 50-79 -> "MAYBE"
- score < 50 -> "PASS"

OUTPUT - STRICT JSON ONLY, no markdown, no prose, no preamble:
{
  "score": <integer 0-100>,
  "verdict": "STRONG FIT" | "MAYBE" | "PASS",
  "matched": ["<skills or requirements from the JD this CV genuinely covers, judged semantically>"],
  "missing": ["<capabilities the JD needs that are genuinely absent from the CV>"],
  "suggestion": "<one honest, specific improvement tip in second person, under 40 words>"
}

matched MUST contain 4 to 14 short labels, missing 0 to 10, each label 1 to 4 words, concrete and JD-grounded (e.g. "Active Directory", "GCC banking experience", not sentences). A label appears in matched only if the CV demonstrates it; in missing only if it is genuinely absent. No emoji. ASCII punctuation only. Never use dash characters in any output string; use commas or periods instead.`;
}

function buildMatchUserPrompt({ cvSnapshot, jobDescription }) {
  return `JOB DESCRIPTION (pasted by the candidate):
${String(jobDescription || '').slice(0, 5000)}

CANDIDATE CV:
${summariseCvForVerdict(cvSnapshot)}

Return the strict JSON match now.`;
}

function normaliseChipList(v, max) {
  if (!Array.isArray(v)) return [];
  const seen = new Set();
  const out = [];
  for (const x of v) {
    const s = String(x || '').trim().replace(/\s*[-–—]+\s*/g, ', ').slice(0, 60);
    const key = s.toLowerCase();
    if (!s || seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function normaliseMatch(p) {
  if (!p || typeof p !== 'object') return null;
  let score = Math.round(Number(p.score));
  if (!Number.isFinite(score)) return null;
  score = Math.max(0, Math.min(100, score));
  const matched = normaliseChipList(p.matched, 20);
  const missing = normaliseChipList(p.missing, 15);
  if (!matched.length && !missing.length) return null;
  const suggestion = String(p.suggestion || '').trim().replace(/\s*[-–—]+\s*/g, ', ').slice(0, 300)
    || 'Weave two or three of the missing capabilities you genuinely have into your summary and latest role bullets.';
  return { score, verdict: verdictFromScore(score), matched, missing, suggestion };
}

async function handleCandidateMatch(req, res, body) {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ ok: false, error: 'AI Engine is not configured.' });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ ok: false, error: 'Server not configured: Supabase env missing.' });
  }

  const jobDescription = typeof body.jobDescription === 'string' ? body.jobDescription.trim() : '';
  if (jobDescription.length < 40) {
    return res.status(400).json({ ok: false, error: 'Paste a fuller job description to analyse.' });
  }
  const cvSnapshot = (body.cvSnapshot && typeof body.cvSnapshot === 'object' && !Array.isArray(body.cvSnapshot)) ? body.cvSnapshot : null;
  if (!cvSnapshot) {
    return res.status(400).json({ ok: false, error: 'Missing cvSnapshot.' });
  }

  // Auth (Bearer JWT via anon client — mirrors tailor).
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized. Please sign in.' });
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user } = {}, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !user) return res.status(401).json({ ok: false, error: 'Invalid or expired session.' });

  // Dedupe BEFORE the credit gate: identical repeats never re-bill.
  const dedupeKey = matchDedupeKey(user.id, cvSnapshot, jobDescription);
  const cachedOut = matchDedupeGet(dedupeKey);
  if (cachedOut) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ ...cachedOut, cached: true });
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profile, error: profileErr } = await db
    .from('profiles')
    .select('id, is_pro, plan, ai_credits_used, pro_access_expires_at, single_cv_unlocked')
    .eq('id', user.id)
    .maybeSingle();
  if (profileErr) {
    console.error('[ai/candidate_match] profile lookup failed:', JSON.stringify(profileErr));
    return res.status(500).json({ ok: false, error: 'Could not verify your account.' });
  }
  const tier = classifyTier(profile);
  const { aiTier, cap } = aiTierAndCap(profile);
  const before = Number(profile?.ai_credits_used) || 0;
  const creditsRemainingPreDeduct = Math.max(0, cap - before);

  const deduct = await tryDeductCredit(db, user.id, cap);
  if (deduct.dbError) {
    return res.status(500).json({ ok: false, error: 'Could not deduct credit. Please try again.' });
  }
  if (!deduct.ok) {
    await logAnthropicCall(db, {
      user_id: user.id,
      ip_hash: null,
      tier,
      endpoint: 'job_match',
      model: VERDICT_MODEL,
      input_tokens: null,
      output_tokens: null,
      estimated_cost_usd: 0,
      status: 'spend_capped',
      error_code: 'monthly_cap',
      meta: { reason: 'monthly_cap', ai_tier: aiTier, cap },
    });
    return res.status(402).json({
      ok: false,
      error: 'You have used your AI analyses for this month. Your limit resets next month.',
      credits_remaining: 0,
      action: 'upgrade',
    });
  }
  const computeRemaining = (usedNow) => Math.max(0, cap - usedNow);

  const failAndRefund = async (status, message, errorCode, usage) => {
    let refundedRemaining = creditsRemainingPreDeduct;
    const refund = await refundCredit(db, user.id);
    if (refund.ok) refundedRemaining = computeRemaining(refund.used);
    await logAnthropicCall(db, {
      user_id: user.id,
      ip_hash: null,
      tier,
      endpoint: 'job_match',
      model: VERDICT_MODEL,
      input_tokens: usage?.input_tokens ?? null,
      output_tokens: usage?.output_tokens ?? null,
      estimated_cost_usd: usage ? estimateCostUsd(usage) : 0,
      status: 'error',
      error_code: errorCode,
      meta: { refunded: true, ai_tier: aiTier },
    });
    return res.status(status).json({ ok: false, error: message, credits_remaining: refundedRemaining });
  };

  let data;
  try {
    const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: VERDICT_MODEL,
        max_tokens: 900,
        temperature: 0.2,
        system: buildMatchSystem(),
        messages: [{ role: 'user', content: buildMatchUserPrompt({ cvSnapshot, jobDescription }) }],
      }),
    }, 3, 8000);
    const responseText = await response.text();
    if (!response.ok) {
      return failAndRefund(502, 'AI Engine is busy, please try again.', `anthropic_${response.status}`);
    }
    try { data = JSON.parse(responseText); } catch {
      return failAndRefund(502, 'AI Engine is busy, please try again.', 'anthropic_bad_json');
    }
  } catch (err) {
    console.error('[ai/candidate_match]', String(err?.message || err).slice(0, 200));
    return failAndRefund(502, 'AI Engine is busy, please try again.', 'anthropic_network');
  }

  const raw = (Array.isArray(data.content) && data.content[0] && data.content[0].text) || '';
  const cleaned = String(raw).replace(/```json|```/g, '').trim();
  let parsed;
  try { parsed = JSON.parse(cleaned); } catch {
    return failAndRefund(502, 'AI returned an unparseable result. Please retry.', 'unparseable_match', data.usage);
  }
  const out = normaliseMatch(parsed);
  if (!out) {
    return failAndRefund(502, 'AI returned an incomplete result. Please retry.', 'incomplete_match', data.usage);
  }

  await logAnthropicCall(db, {
    user_id: user.id,
    ip_hash: null,
    tier,
    endpoint: 'job_match',
    model: VERDICT_MODEL,
    input_tokens: data.usage?.input_tokens ?? null,
    output_tokens: data.usage?.output_tokens ?? null,
    estimated_cost_usd: estimateCostUsd(data.usage),
    status: 'ok',
    error_code: null,
    meta: { ai_tier: aiTier, matched_count: out.matched.length, missing_count: out.missing.length },
  });

  const payload = { ok: true, ...out, credits_remaining: computeRemaining(deduct.used) };
  matchDedupeSet(dedupeKey, payload);
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json(payload);
}

// =====================================================================
// Branch 7 — import_structure (HR bulk CV import parser)
//
// Structures browser-extracted CV plain text into a candidate snapshot for
// the HR bulk-import flow. Real text in, structured JSON out — this is the
// Phase-1-aligned parser CONTRACT, NOT the deprecated hardcoded scan. When
// the canonical Phase-1 parser module lands it should back this action; until
// then, import scoring quality is bounded by this prompt's parse fidelity.
//
// Folded in here (no new function) because the project is at the Vercel Hobby
// 12-function ceiling — same reason verdict / whatsapp_draft live here.
//
// Auth: light — any signed-in user (mirrors candidate_verdict / whatsapp_draft;
// the HR's job ownership is enforced at INSERT time by RLS, not here). Cheap
// model (Haiku) because a batch is up to 20 calls.
//
// Request:  { text }                       (plain text from services/cvExtraction)
// Response: { ok: true, snapshot: {...} }   (cv_snapshot shape the pipeline +
//                                            candidate_verdict already read)
// =====================================================================

const IMPORT_STRUCTURE_MODEL = process.env.IMPORT_STRUCTURE_MODEL || 'claude-haiku-4-5-20251001';

function buildImportStructureSystem() {
  return `You are an institutional-grade CV parsing engine for the India -> Gulf (UAE/GCC) recruitment corridor. You convert raw CV text into a single strict JSON candidate snapshot. You never invent data: if a field is not present in the text, omit it or use null. ASCII punctuation only. No commentary, no markdown, JSON only.`;
}

function buildImportStructurePrompt(text) {
  return `Parse the following CV text into ONE strict JSON object with EXACTLY these keys:

{
  "name": string | null,
  "email": string | null,
  "phone": string | null,
  "location": string | null,
  "desired_job": string | null,
  "summary": string | null,
  "visa_status": string | null,
  "notice_period": string | null,
  "skills": string[],
  "experience": [
    { "title": string | null, "company": string | null, "location": string | null, "start_date": string | null, "end_date": string | null, "bullets": string[] }
  ],
  "education": [
    { "degree": string | null, "field": string | null, "school": string | null, "location": string | null, "start_date": string | null, "end_date": string | null }
  ]
}

RULES:
- Dates are human-readable strings (e.g. "Jan 2022", "Present"), never timestamps.
- "name" is the candidate's full name from the header. "email" / "phone" are the candidate's own contact details if present.
- "desired_job" is the current or target role/headline.
- "visa_status" / "notice_period" only if the CV states them (common in Gulf CVs); else null.
- "skills" is a flat array of distinct skill / tool strings (max 25). Empty array if none.
- Preserve the candidate's real achievements in "bullets". Never fabricate metrics, employers, dates, or qualifications.
- If the text is too garbled to parse, return the object with name null and empty arrays.

CV TEXT:
<<<
${String(text || '').slice(0, 14000)}
>>>

Return the JSON object only.`;
}

// Coerce the model output into the exact snapshot shape, dropping anything
// malformed so the client + DB never see surprises. Mirrors the field names
// the pipeline (getCv/deriveSkills) and candidate_verdict already read, and
// also nests personal.location so the "Looking for Position" grid populates.
function normaliseImportSnapshot(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
  const str = (v) => {
    const s = v == null ? '' : String(v).trim();
    return s ? s.slice(0, 400) : null;
  };
  const arrStr = (a, max) => (Array.isArray(a)
    ? a.map((x) => String(x == null ? '' : (typeof x === 'string' ? x : (x.name || x.label || ''))).trim()).filter(Boolean).slice(0, max)
    : []);
  const experience = Array.isArray(p.experience) ? p.experience.slice(0, 12).map((e) => ({
    title: str(e?.title || e?.role),
    company: str(e?.company || e?.employer),
    location: str(e?.location),
    start_date: str(e?.start_date),
    end_date: str(e?.end_date),
    bullets: Array.isArray(e?.bullets)
      ? e.bullets.map((b) => String(b || '').trim()).filter(Boolean).slice(0, 12)
      : (str(e?.description) ? [str(e.description)] : []),
  })) : [];
  const education = Array.isArray(p.education) ? p.education.slice(0, 8).map((e) => ({
    degree: str(e?.degree),
    field: str(e?.field),
    school: str(e?.school || e?.institution),
    location: str(e?.location),
    start_date: str(e?.start_date),
    end_date: str(e?.end_date),
  })) : [];
  const location = str(p.location);
  const desired_job = str(p.desired_job || p.target_role);
  return {
    name: str(p.name),
    email: str(p.email),
    phone: str(p.phone),
    location,
    desired_job,
    summary: str(p.summary),
    visa_status: str(p.visa_status),
    notice_period: str(p.notice_period),
    skills: arrStr(p.skills, 25),
    experience,
    education,
    // Nested mirror so the pipeline detail grid (cv.personal.*) populates
    // without the client having to reshape.
    personal: { location, headline: desired_job, job_type: str(p.job_type) },
  };
}

async function handleImportStructure(req, res, body) {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ ok: false, error: 'AI Engine is not configured.' });
  }
  // Light auth — any signed-in user (mirrors candidate_verdict).
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized. Please sign in.' });
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: { user } = {}, error } = await authClient.auth.getUser(token);
      if (error || !user) return res.status(401).json({ ok: false, error: 'Invalid or expired session.' });
    } catch {
      return res.status(401).json({ ok: false, error: 'Could not verify session.' });
    }
  }

  const text = String(body.text || '').trim();
  if (text.length < 30) {
    return res.status(400).json({ ok: false, error: 'CV text is missing or too short to parse.' });
  }

  try {
    const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: IMPORT_STRUCTURE_MODEL,
        max_tokens: 2000,
        temperature: 0.2,
        system: buildImportStructureSystem(),
        messages: [{ role: 'user', content: buildImportStructurePrompt(text) }],
      }),
    }, 3, 8000);

    const responseText = await response.text();
    if (!response.ok) {
      return res.status(502).json({ ok: false, error: 'AI Engine is busy, please try again.' });
    }
    let data;
    try { data = JSON.parse(responseText); } catch { return res.status(502).json({ ok: false, error: 'AI Engine is busy, please try again.' }); }
    const raw = (Array.isArray(data.content) && data.content[0] && data.content[0].text) || '';
    const cleaned = String(raw).replace(/```json|```/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    let parsed;
    try {
      parsed = JSON.parse(firstBrace > -1 && lastBrace > -1 ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned);
    } catch {
      return res.status(502).json({ ok: false, error: 'AI returned an unparseable CV. Please retry.' });
    }
    const snapshot = normaliseImportSnapshot(parsed);
    if (!snapshot) return res.status(502).json({ ok: false, error: 'AI returned an incomplete CV. Please retry.' });

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ ok: true, snapshot });
  } catch (err) {
    console.error('[ai/import_structure]', String(err?.message || err).slice(0, 200));
    return res.status(502).json({ ok: false, error: 'AI Engine is busy, please try again.' });
  }
}

// =====================================================================
// Branch 9 — linkedin_parse (LinkedIn Optimizer, Step 2 intake)
//
// Turns a LinkedIn profile supplied as extracted PDF text OR a
// screenshot image into the raw_profile shape the optimizer scores.
// This is the CHEAP extraction step — it does NOT rewrite or score.
// The expensive scan runs later (supabase/functions/linkedin-optimize)
// only after the user confirms the parsed fields.
//
// PRIVACY: a screenshot is read once here and never stored. It lives in
// the request body, is passed straight to the vision model, and is
// dropped when this function returns — nothing is written to disk or a
// bucket. That is the whole implementation of "your screenshot is
// deleted after we read it".
//
// Auth: light — any signed-in user (Step 2 is behind the account gate).
// Model: Haiku (cheap; vision-capable).
//
// Request:  { text?: string, imageBase64?: string, imageMediaType?: string }
// Response: { ok: true, raw_profile: { headline, about, experience_blocks[] } }
// =====================================================================

const LINKEDIN_PARSE_MODEL = process.env.LINKEDIN_PARSE_MODEL || 'claude-haiku-4-5-20251001';
const LI_HEADLINE_MAX = 220;
const LI_ABOUT_MAX = 2600;
const LI_DESC_MAX = 2000;
const LI_BLOCKS_MAX = 15;
const LI_ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

function buildLinkedInParseSystem() {
  return `You are a parsing engine for LinkedIn profiles in the India -> Gulf (UAE/GCC) job market. You extract what is present in the source into one strict JSON object. You NEVER invent data: if a field is absent, use an empty string or empty array. ASCII punctuation only. No commentary, no markdown, JSON only.`;
}

function buildLinkedInParsePrompt(hasImage) {
  return `Read the ${hasImage ? 'LinkedIn profile screenshot' : 'LinkedIn profile export text below'} and return ONE strict JSON object with EXACTLY these keys:

{
  "headline": string,
  "about": string,
  "experience_blocks": [
    { "role": string, "company": string, "duration": string, "description": string }
  ]
}

RULES:
- "headline" is the short line under the name (max 220 characters).
- "about" is the full About / summary section verbatim as written.
- Each experience entry becomes one block: "role" (title), "company", "duration" (e.g. "2021 - present"), and "description" (the bullets or paragraph for that role, joined with newlines).
- Copy the person's real words. Never fabricate roles, employers, dates, metrics, or achievements.
- If a section is missing, use "" for strings and [] for experience_blocks. Do not guess.
- Return the JSON object only.`;
}

// Coerce model output into the raw_profile contract, capping lengths and
// assigning stable block ids the optimizer + wizard key off.
function normaliseLinkedInProfile(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
  const str = (v, max) => {
    const s = v == null ? '' : String(v).trim();
    return max ? s.slice(0, max) : s;
  };
  const blocks = Array.isArray(p.experience_blocks) ? p.experience_blocks : [];
  const experience_blocks = blocks.slice(0, LI_BLOCKS_MAX).map((e, i) => ({
    id: `exp-${i}`,
    role: str(e?.role || e?.title, 200),
    company: str(e?.company || e?.employer, 200),
    duration: str(e?.duration || e?.period, 120),
    description: str(
      e?.description || (Array.isArray(e?.bullets) ? e.bullets.join('\n') : ''),
      LI_DESC_MAX,
    ),
  })).filter((b) => b.role || b.company || b.description);
  return {
    headline: str(p.headline, LI_HEADLINE_MAX),
    about: str(p.about, LI_ABOUT_MAX),
    experience_blocks,
  };
}

async function handleLinkedInParse(req, res, body) {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ ok: false, error: 'AI Engine is not configured.' });
  }
  // Light auth — Step 2 sits behind the account gate.
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized. Please sign in.' });
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: { user } = {}, error } = await authClient.auth.getUser(token);
      if (error || !user) return res.status(401).json({ ok: false, error: 'Invalid or expired session.' });
    } catch {
      return res.status(401).json({ ok: false, error: 'Could not verify session.' });
    }
  }

  const text = String(body.text || '').trim();
  const rawImage = String(body.imageBase64 || '');
  // Accept either a bare base64 string or a data: URL; keep only the payload.
  const imageData = rawImage.includes('base64,') ? rawImage.split('base64,')[1] : rawImage;
  const imageMediaType = LI_ALLOWED_IMAGE_TYPES.has(body.imageMediaType) ? body.imageMediaType : 'image/png';
  const hasImage = imageData.length > 0;

  if (!hasImage && text.length < 30) {
    // Nothing usable — the client falls back to the manual paste path.
    return res.status(400).json({ ok: false, error: 'no_usable_input', message: 'We could not read a profile from that. Type it in instead.' });
  }

  // Build the user message: an image block for screenshots, else the text.
  const userContent = hasImage
    ? [
        { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: imageData } },
        { type: 'text', text: buildLinkedInParsePrompt(true) },
      ]
    : [
        { type: 'text', text: `${buildLinkedInParsePrompt(false)}\n\nPROFILE TEXT:\n<<<\n${text.slice(0, 14000)}\n>>>` },
      ];

  try {
    const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: LINKEDIN_PARSE_MODEL,
        max_tokens: 2000,
        temperature: 0.2,
        system: buildLinkedInParseSystem(),
        messages: [{ role: 'user', content: userContent }],
      }),
    }, 3, 8000);

    const responseText = await response.text();
    if (!response.ok) {
      return res.status(502).json({ ok: false, error: 'AI Engine is busy, please try again.' });
    }
    let data;
    try { data = JSON.parse(responseText); } catch { return res.status(502).json({ ok: false, error: 'AI Engine is busy, please try again.' }); }
    const raw = (Array.isArray(data.content) && data.content[0] && data.content[0].text) || '';
    const parsed = extractLooseJson(raw);
    const profile = normaliseLinkedInProfile(parsed);
    if (!profile || (!profile.headline && !profile.about && profile.experience_blocks.length === 0)) {
      return res.status(422).json({ ok: false, error: 'unreadable', message: 'We could not read a profile from that. Type it in instead.' });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ ok: true, raw_profile: profile });
  } catch (err) {
    console.error('[ai/linkedin_parse]', String(err?.message || err).slice(0, 200));
    return res.status(502).json({ ok: false, error: 'AI Engine is busy, please try again.' });
  }
}

// =====================================================================
// Branch 10 — interview_kit (HR interview question generator)
//
// Generates 6-8 tailored interview questions (with what-to-listen-for
// notes) for a specific candidate against a specific job. Grounded in
// the same cvSnapshot + job shape candidate_verdict reads, and reuses
// summariseCvForVerdict so both features see the identical CV text.
// Generative, not trust-critical scoring -> Haiku (cheap), warm-ish
// temperature so "Regenerate" returns fresh questions.
//
// Folded in here (no new function) — the project is at the Vercel Hobby
// 12-function ceiling, same as verdict / whatsapp_draft.
//
// Auth: light — any signed-in user (mirrors candidate_verdict; job
// ownership is enforced by RLS at read time, not here).
//
// Request:  { cvSnapshot, job: { title, description, skills, requirements },
//             verdictGap?: string,    (the verdict's "Gap:" line, if the
//                                      client already has it cached — lets
//                                      the questions probe the flagged risk)
//             tailored?: boolean }    (Regenerate, tailored to this CV:
//                                      Sonnet + 1 shared-pool credit,
//                                      deducted/refunded like candidate_match.
//                                      The base Haiku generation stays free.)
// Response: { ok: true, questions: [{ category, question, listen_for }],
//             credits_remaining? }    (only on the tailored path)
// =====================================================================

const INTERVIEW_KIT_MODEL = process.env.INTERVIEW_KIT_MODEL || 'claude-haiku-4-5-20251001';
const INTERVIEW_KIT_TAILOR_MODEL = process.env.INTERVIEW_KIT_TAILOR_MODEL || 'claude-sonnet-4-6';
const IK_CATEGORIES = new Set(['technical', 'experience', 'corridor', 'behavioral']);

function buildInterviewKitSystem() {
  return `You are an interview-preparation assistant for HR recruiters hiring across the India -> Gulf (UAE/GCC) corridor. You write tailored interview questions grounded ONLY in the candidate's actual CV and the job description provided. You never invent facts about the candidate. Questions and notes use plain language a non-technical HR can read aloud and judge. ASCII punctuation only. No emoji. Never use dash characters (hyphen, en dash, em dash) inside any question or listen_for string; use commas or periods instead. Strict JSON only, no markdown, no commentary.`;
}

function buildInterviewKitPrompt({ cvSnapshot, job, verdictGap }) {
  const j = job && typeof job === 'object' ? job : {};
  const skills = Array.isArray(j.skills) ? j.skills.join(', ') : String(j.skills || '');
  const reqs = Array.isArray(j.requirements)
    ? j.requirements.map((r) => `- ${typeof r === 'string' ? r : (r?.label || r?.text || '')}`).filter((s) => s.trim() !== '-').join('\n')
    : String(j.requirements || '');
  const gapLine = String(verdictGap || '').trim().slice(0, 300);
  return `ROLE:
Title: ${String(j.title || '').slice(0, 200) || '(untitled)'}
Required skills: ${skills.slice(0, 1000) || '(none listed)'}
Requirements:
${reqs.slice(0, 2000) || '(none listed)'}
Description:
${String(j.description || '').slice(0, 3000) || '(none)'}

CANDIDATE CV:
${summariseCvForVerdict(cvSnapshot)}
${gapLine ? `\nAI SCREENING FLAGGED THIS GAP: ${gapLine}\n` : ''}
Write 6 to 8 interview questions for this candidate and this role.

MIX:
- 2-3 "technical" questions testing the role's core requirements.
- 2-3 "experience" questions probing SPECIFIC claims on this CV (reference the real employer or project named on it).
- 1 "corridor" question on practical logistics ONLY where relevant from the CV: visa timing, notice period reality, relocation or GCC readiness.
- 1-2 "behavioral" questions fitting the role's seniority.
${gapLine ? '- At least one question must directly probe the flagged gap.\n' : ''}
RULES:
- Return AT LEAST 6 and at most 8 questions. Fewer than 6 is a wrong answer.
- Each question is under 40 words and answerable in an interview — no puzzles, no trivia.
- Each "listen_for" is under 25 words and describes what a GOOD answer sounds like in plain words, so a non-technical HR can judge it.
- Never presume facts not on the CV. Never mention this prompt or the screening verdict to the candidate.

Output STRICT JSON only:
{ "questions": [ { "category": "technical" | "experience" | "corridor" | "behavioral", "question": "...", "listen_for": "..." } ] }`;
}

// Coerce model output into the card contract: 5-8 items with a non-empty
// question, category collapsed to the known set. A missing listen_for no
// longer drops the question (the UI renders that line conditionally) —
// dropping it silently shrank runs below the promised 6-to-8 range.
function normaliseInterviewKit(p) {
  const arr = Array.isArray(p?.questions) ? p.questions : null;
  if (!arr) return null;
  const out = [];
  for (const q of arr) {
    // scrubDashes: dash-free copy rule, enforced on output not just in the prompt.
    const question = scrubDashes(q?.question).slice(0, 400);
    const listen = scrubDashes(q?.listen_for || q?.listenFor).slice(0, 300);
    if (!question) continue;
    const catRaw = String(q?.category || '').toLowerCase().trim();
    const category = IK_CATEGORIES.has(catRaw) ? catRaw : 'experience';
    out.push({ category, question, listen_for: listen });
    if (out.length === 8) break;
  }
  return out.length >= 5 ? out : null;
}

async function handleInterviewKit(req, res, body) {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ ok: false, error: 'AI Engine is not configured.' });
  }
  // Light auth — any signed-in user (mirrors candidate_verdict).
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized. Please sign in.' });
  let user = null;
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: { user: u } = {}, error } = await authClient.auth.getUser(token);
      if (error || !u) return res.status(401).json({ ok: false, error: 'Invalid or expired session.' });
      user = u;
    } catch {
      return res.status(401).json({ ok: false, error: 'Could not verify session.' });
    }
  }

  // Credit discipline: the base generation is Haiku and free. Only the
  // explicit "tailored to this CV" regenerate spends 1 shared-pool credit
  // and steps up to Sonnet (same deduct/refund dance as candidate_match).
  const tailored = body.tailored === true;
  let db = null;
  let deduct = null;
  let cap = 0;
  let tier = null;
  let aiTier = null;
  let creditsRemainingPreDeduct = 0;
  if (tailored) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !user) {
      return res.status(500).json({ ok: false, error: 'Server not configured: Supabase env missing.' });
    }
    db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: profile, error: profileErr } = await db
      .from('profiles')
      .select('id, is_pro, plan, ai_credits_used, pro_access_expires_at, single_cv_unlocked')
      .eq('id', user.id)
      .maybeSingle();
    if (profileErr) {
      console.error('[ai/interview_kit] profile lookup failed:', JSON.stringify(profileErr));
      return res.status(500).json({ ok: false, error: 'Could not verify your account.' });
    }
    tier = classifyTier(profile);
    ({ aiTier, cap } = aiTierAndCap(profile));
    creditsRemainingPreDeduct = Math.max(0, cap - (Number(profile?.ai_credits_used) || 0));
    deduct = await tryDeductCredit(db, user.id, cap);
    if (deduct.dbError) {
      return res.status(500).json({ ok: false, error: 'Could not deduct credit. Please try again.' });
    }
    if (!deduct.ok) {
      await logAnthropicCall(db, {
        user_id: user.id,
        ip_hash: null,
        tier,
        endpoint: 'interview_kit',
        model: INTERVIEW_KIT_TAILOR_MODEL,
        input_tokens: null,
        output_tokens: null,
        estimated_cost_usd: 0,
        status: 'spend_capped',
        error_code: 'monthly_cap',
        meta: { reason: 'monthly_cap', ai_tier: aiTier, cap, tailored: true },
      });
      return res.status(402).json({
        ok: false,
        error: 'You have used your AI credits for this month. Your limit resets next month.',
        credits_remaining: 0,
        action: 'upgrade',
      });
    }
  }
  const failTailored = async (status, message, errorCode, usage) => {
    let refundedRemaining = creditsRemainingPreDeduct;
    const refund = await refundCredit(db, user.id);
    if (refund.ok) refundedRemaining = Math.max(0, cap - refund.used);
    await logAnthropicCall(db, {
      user_id: user.id,
      ip_hash: null,
      tier,
      endpoint: 'interview_kit',
      model: INTERVIEW_KIT_TAILOR_MODEL,
      input_tokens: usage?.input_tokens ?? null,
      output_tokens: usage?.output_tokens ?? null,
      estimated_cost_usd: usage ? estimateCostUsd(usage) : 0,
      status: 'error',
      error_code: errorCode,
      meta: { refunded: true, ai_tier: aiTier, tailored: true },
    });
    return res.status(status).json({ ok: false, error: message, credits_remaining: refundedRemaining });
  };
  const fail = (status, message, errorCode, usage) => (
    tailored
      ? failTailored(status, message, errorCode, usage)
      : res.status(status).json({ ok: false, error: message })
  );

  const prompt = buildInterviewKitPrompt({
    cvSnapshot: body.cvSnapshot,
    job: body.job,
    verdictGap: body.verdictGap,
  });
  const model = tailored ? INTERVIEW_KIT_TAILOR_MODEL : INTERVIEW_KIT_MODEL;

  try {
    const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1400,
        // Warm enough that "Regenerate" yields fresh questions; cool enough
        // to stay grounded in the CV.
        temperature: 0.6,
        system: buildInterviewKitSystem(),
        messages: [{ role: 'user', content: prompt }],
      }),
    }, 3, 8000);

    const responseText = await response.text();
    if (!response.ok) {
      return fail(502, 'AI Engine is busy, please try again.', `anthropic_${response.status}`);
    }
    let data;
    try { data = JSON.parse(responseText); } catch { return fail(502, 'AI Engine is busy, please try again.', 'anthropic_bad_json'); }
    const raw = (Array.isArray(data.content) && data.content[0] && data.content[0].text) || '';
    const parsed = extractLooseJson(raw);
    const questions = normaliseInterviewKit(parsed);
    if (!questions) return fail(502, 'AI returned an incomplete question set. Please retry.', 'incomplete_kit', data.usage);

    if (tailored) {
      await logAnthropicCall(db, {
        user_id: user.id,
        ip_hash: null,
        tier,
        endpoint: 'interview_kit',
        model,
        input_tokens: data.usage?.input_tokens ?? null,
        output_tokens: data.usage?.output_tokens ?? null,
        estimated_cost_usd: estimateCostUsd(data.usage),
        status: 'ok',
        error_code: null,
        meta: { ai_tier: aiTier, tailored: true, question_count: questions.length },
      });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
      ok: true,
      questions,
      ...(tailored ? { credits_remaining: Math.max(0, cap - deduct.used) } : {}),
    });
  } catch (err) {
    console.error('[ai/interview_kit]', String(err?.message || err).slice(0, 200));
    return fail(502, 'AI Engine is busy, please try again.', 'anthropic_network');
  }
}

// =====================================================================
// Router
// =====================================================================

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  // Query string wins over body field — keeps the action visible in
  // logs and curl without inspecting the JSON.
  const queryAction = typeof req.query?.action === 'string' ? req.query.action.trim() : '';
  const action = queryAction || (typeof body.action === 'string' ? body.action.trim() : '');

  switch (action) {
    case 'cover_letter':       return handleCoverLetter(req, res, body);
    case 'linkedin_headline':  return handleLinkedInHeadline(req, res, body);
    case 'parse_resume':       return handleParseResume(req, res, body);
    case 'tailor':             return handleTailor(req, res, body);
    case 'whatsapp_draft':     return handleWhatsappDraft(req, res, body);
    case 'candidate_verdict':  return handleCandidateVerdict(req, res, body);
    case 'candidate_match':    return handleCandidateMatch(req, res, body);
    case 'import_structure':   return handleImportStructure(req, res, body);
    case 'suggest_skills':     return handleSuggestSkills(req, res, body);
    case 'linkedin_parse':     return handleLinkedInParse(req, res, body);
    case 'interview_kit':      return handleInterviewKit(req, res, body);
    default:
      return res.status(400).json({
        error: 'Missing or unknown action. Use ?action=cover_letter|linkedin_headline|parse_resume|tailor|whatsapp_draft|candidate_verdict|import_structure|suggest_skills|linkedin_parse|interview_kit|candidate_match.',
      });
  }
}
