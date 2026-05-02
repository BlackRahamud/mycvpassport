/**
 * POST /api/ai?action=cover_letter|parse_resume|linkedin_headline|tailor
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
 *   POST { section: 'summary' | 'experience_bullet', input: {...} }
 *     summary input:           { summary, target_role?, target_market?, name? }
 *     experience_bullet input: { bullet, role?, company?, target_role? }
 *
 * Tailor response shape:
 *   200 summary:           { ok: true, result: string, credits_remaining: int }
 *   200 experience_bullet: { ok: true, alternatives: string[3], credits_remaining: int }
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

import { createClient } from '@supabase/supabase-js';

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
const BUILDER_TAILOR_FREE_LIMIT = 2;

// Anthropic Sonnet 4.6 rates per 1M tokens (USD). Re-validate quarterly
// against supabase/functions/analyze-cv/_pricing.mjs - that file is the
// project's canonical source of truth for cost estimation.
const SONNET_INPUT_USD_PER_M = 3.0;
const SONNET_OUTPUT_USD_PER_M = 15.0;

// Shared retry helper. cover_letter used 10000ms backoff in the
// legacy file; linkedin_headline used 8000ms — we accept the override
// so each branch keeps its original retry profile.
async function fetchWithRetry(url, options, attempts = 3, backoff = 10000) {
  for (let i = 0; i < attempts; i++) {
    const response = await fetch(url, options);
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
    .select('id, is_pro')
    .eq('id', user.id)
    .single();

  // PGRST116 = "no rows" — treat as "no profile yet", which the
  // is_pro check below will reject. Any other error is a real DB
  // failure and we surface it.
  if (profileError && profileError.code !== 'PGRST116') {
    return res.status(500).json({ error: 'Could not verify subscription.' });
  }
  if (!profile || !profile.is_pro) {
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
//   - Free tier gets BUILDER_TAILOR_FREE_LIMIT (= 2) total credits,
//     tracked atomically via profiles.ai_credits_used + the
//     try_deduct_ai_credit / refund_ai_credit Postgres RPCs.
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

const VALID_TAILOR_SECTIONS = new Set(['summary', 'experience_bullet']);

// Maps profile state to the value space anthropic_calls.tier accepts:
// 'anonymous' | 'free' | 'paid' | 'paid_pro'. Active Hunter / Career
// Pro count as paid_pro; Express Pass (one-off) as paid.
function classifyTier(profile) {
  if (!profile?.is_pro) return 'free';
  if (profile.plan === 'express_pass') return 'paid';
  return 'paid_pro';
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

async function tryDeductCredit(db, userId) {
  const { data, error } = await db.rpc('try_deduct_ai_credit', {
    p_user_id: userId,
    p_limit: BUILDER_TAILOR_FREE_LIMIT,
  });
  if (error) {
    console.error('[ai/tailor] try_deduct_ai_credit failed:', error.message);
    return { ok: false, used: null, dbError: true };
  }
  // RPC returns int (new used count) or null when at limit.
  if (data == null) return { ok: false, used: BUILDER_TAILOR_FREE_LIMIT };
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

async function callAnthropicTailor({ system, userPrompt, isJsonExpected }) {
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
        temperature: 0.4,
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
    .select('id, is_pro, plan, ai_credits_used')
    .eq('id', user.id)
    .maybeSingle();
  if (profileErr) {
    console.error('[ai/tailor] profile lookup failed:', JSON.stringify(profileErr));
    return res.status(500).json({ ok: false, error: 'Could not verify your account.' });
  }
  const tier = classifyTier(profile);
  const isPaid = tier === 'paid' || tier === 'paid_pro';

  // 5. Credit gate (free tier only). Atomic pre-deduct via RPC.
  let creditsRemainingPreDeduct = null;
  if (!isPaid) {
    const before = Number(profile?.ai_credits_used) || 0;
    creditsRemainingPreDeduct = Math.max(0, BUILDER_TAILOR_FREE_LIMIT - before);

    const deduct = await tryDeductCredit(db, user.id);
    if (deduct.dbError) {
      return res.status(500).json({ ok: false, error: 'Could not deduct credit. Please try again.' });
    }
    if (!deduct.ok) {
      // Free-tier exhausted. Audit the blocked attempt + return 402.
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
        error_code: 'free_limit',
        meta: { section, alternative_count: 0, reason: 'free_limit' },
      });
      return res.status(402).json({
        ok: false,
        error: 'Out of free AI rewrites. Upgrade for unlimited.',
        credits_remaining: 0,
        action: 'upgrade',
      });
    }
  }

  const computeRemaining = (usedNow) => Math.max(0, BUILDER_TAILOR_FREE_LIMIT - usedNow);

  // 6. Build prompt + call Anthropic.
  const system = section === 'summary' ? buildSummarySystem() : buildBulletSystem();
  const userPrompt = section === 'summary'
    ? buildSummaryUserPrompt(input)
    : buildBulletUserPrompt(input);
  const isJsonExpected = section === 'experience_bullet';

  let aiResult;
  try {
    aiResult = await callAnthropicTailor({ system, userPrompt, isJsonExpected });
  } catch (e) {
    // 7a. Anthropic upstream failure. Refund the free-tier credit.
    let refundedRemaining = creditsRemainingPreDeduct;
    if (!isPaid) {
      const refund = await refundCredit(db, user.id);
      if (refund.ok) {
        refundedRemaining = computeRemaining(refund.used);
      }
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
        refunded: !isPaid,
      },
    });
    console.error('[ai/tailor] Anthropic call failed:', e?.code, String(e?.message || '').slice(0, 300));
    return res.status(502).json({
      ok: false,
      error: 'AI Engine is busy, please try again.',
      credits_remaining: isPaid ? null : refundedRemaining,
    });
  }

  // 7b. Validate output shape per section.
  let payload;
  if (section === 'summary') {
    const result = String(aiResult.result || '').trim();
    if (!result) {
      // Treat empty as upstream failure for the user (refund + audit).
      if (!isPaid) await refundCredit(db, user.id);
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
        meta: { section, alternative_count: 0, refunded: !isPaid },
      });
      return res.status(502).json({
        ok: false,
        error: 'AI returned an empty summary. Please retry.',
        credits_remaining: isPaid ? null : creditsRemainingPreDeduct,
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
      if (!isPaid) await refundCredit(db, user.id);
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
        meta: { section, alternative_count: uniqueCleaned.length, refunded: !isPaid },
      });
      return res.status(502).json({
        ok: false,
        error: 'AI did not return 3 distinct alternatives. Please retry.',
        credits_remaining: isPaid ? null : creditsRemainingPreDeduct,
      });
    }
    payload = { alternatives: uniqueCleaned.slice(0, 3) };
  }

  // 8. Success: audit + return.
  const usedNow = isPaid
    ? Number(profile?.ai_credits_used) || 0
    : (Number(profile?.ai_credits_used) || 0) + 1;
  const creditsRemaining = isPaid ? null : computeRemaining(usedNow);

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
    default:
      return res.status(400).json({
        error: 'Missing or unknown action. Use ?action=cover_letter|linkedin_headline|parse_resume|tailor.',
      });
  }
}
