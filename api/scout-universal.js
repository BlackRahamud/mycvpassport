/**
 * POST /api/scout-universal
 *
 * Pro-only. Generates a polished "universal" CV that is not tied to any single
 * JD. Uses the candidate's source CV + their stated target role / location /
 * market to produce a Gulf-ready or India-ready version intended to apply
 * broadly across the role family. Persists into scout_cvs with cv_type =
 * 'universal' and match_id = NULL.
 *
 * No cover letter is generated — universal CVs are not tied to a specific
 * employer, so a generic cover letter would be a worse artefact than none.
 *
 * Auth:  Authorization: Bearer <user JWT>
 * Body:  { target_role?: string, location?: string, market?: 'Gulf' | 'India' }
 *        Anything missing falls back to the user's scout_preferences row.
 *        target_role MUST resolve from one of: body, prefs row.
 *
 * Responses:
 *   200 { ok: true, scout_cv_id, cv_type: 'universal', tailored_cv }
 *   400 missing target_role / no CV on file / malformed body
 *   401 missing or invalid bearer token
 *   402 not on a paid plan
 *   500 server / Supabase / unexpected
 *   502 Anthropic upstream failed
 *
 * Required env:
 *   - SUPABASE_URL                (or REACT_APP_SUPABASE_URL)
 *   - SUPABASE_ANON_KEY           (or REACT_APP_SUPABASE_ANON_KEY)
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - ANTHROPIC_API_KEY
 *
 * Optional env:
 *   - SCOUT_UNIVERSAL_MODEL       default 'claude-sonnet-4-6'
 */

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 60 };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const UNIVERSAL_MODEL = process.env.SCOUT_UNIVERSAL_MODEL || 'claude-sonnet-4-6';

const VALID_MARKET = new Set(['Gulf', 'India']);

function inferMarketFromLocation(loc) {
  if (!loc || typeof loc !== 'string') return 'Gulf';
  const s = loc.toLowerCase();
  if (/\b(india|bengaluru|bangalore|mumbai|delhi|hyderabad|chennai|pune|kolkata|gurgaon|noida)\b/.test(s)) {
    return 'India';
  }
  return 'Gulf';
}

function buildUniversalPrompt({ cvData, targetRole, location, market }) {
  const toneLine =
    market === 'India'
      ? 'Tone: formal Indian corporate. Lean on credentials, structured progression, traditional phrasing. ATS keywords should reflect Indian recruiter vocabulary.'
      : 'Tone: confident Gulf corporate (UAE/GCC). Surface metrics, multilingual ability, regional experience where present. ATS keywords should reflect Gulf recruiter vocabulary for this role family.';

  return `You are an expert CV editor for the India-to-Gulf migration corridor.

CANDIDATE CV (canonical JSON — preserve this top-level shape exactly in your output):
${JSON.stringify(cvData).slice(0, 12000)}

CANDIDATE INTENT:
- Target role: ${targetRole}
- Preferred location: ${location || 'not specified'}
- Market: ${market}

DIRECTIVE:
Produce a "universal" version of this CV — polished and ATS-friendly across the entire role family for ${targetRole} in the ${market} market. Do NOT over-fit to any single employer or JD. Tighten verbs, surface metrics that already exist in the source bullets, normalise dates, and seed a sensible spread of role-family ATS keywords. ${toneLine}

ANTI-HALLUCINATION RULES:
- Never fabricate employers, titles, dates, qualifications, or certifications not present in the source CV.
- Never rename real employers or institutions.
- Bullet rewrites must stay grounded in the original bullets — sharpen, don't invent.

OUTPUT — return ONE JSON object, no markdown fences, no commentary:
{
  "tailored_cv": <the rewritten CV — same top-level keys and array shapes as the input CV>
}

Output VALID JSON only. No backticks. No leading text.`;
}

async function callClaude(prompt) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: UNIVERSAL_MODEL,
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Anthropic ${r.status}: ${t.slice(0, 300)}`);
  }
  const data = await r.json();
  const raw = (Array.isArray(data.content) && data.content[0]?.text) || '';
  const cleaned = String(raw).replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== 'object' || !parsed.tailored_cv) {
    throw new Error('Claude response missing tailored_cv');
  }
  return parsed;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ ok: false, error: 'Server not configured: Supabase env missing' });
  }
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ ok: false, error: 'Server not configured: ANTHROPIC_API_KEY missing' });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user } = {}, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !user) return res.status(401).json({ ok: false, error: 'Invalid session' });

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profile } = await db
    .from('profiles')
    .select('is_pro')
    .eq('id', user.id)
    .single();
  if (!profile?.is_pro) {
    return res.status(402).json({ ok: false, error: 'Universal CV requires a paid plan' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
  }

  const { data: prefRow } = await db
    .from('scout_preferences')
    .select('target_role, location')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const targetRole = (typeof body.target_role === 'string' && body.target_role.trim())
    || prefRow?.target_role
    || '';
  const location = (typeof body.location === 'string' && body.location.trim())
    || prefRow?.location
    || '';
  const market = VALID_MARKET.has(body.market) ? body.market : inferMarketFromLocation(location);

  if (!targetRole) {
    return res.status(400).json({ ok: false, error: 'target_role required (set scout preferences or pass it in the body)' });
  }

  const { data: cvRow } = await db
    .from('cvs')
    .select('cv_data')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!cvRow?.cv_data) {
    return res.status(400).json({ ok: false, error: 'No CV on file. Build your CV first.' });
  }

  let result;
  try {
    result = await callClaude(
      buildUniversalPrompt({
        cvData: cvRow.cv_data,
        targetRole,
        location,
        market,
      })
    );
  } catch (e) {
    console.error('[scout-universal] Claude failed:', e);
    return res.status(502).json({ ok: false, error: 'AI tailor unavailable' });
  }

  const { data: cvInsert, error: cvInsertErr } = await db
    .from('scout_cvs')
    .insert({
      user_id: user.id,
      match_id: null,
      cv_type: 'universal',
      tailored_cv_blob: JSON.stringify(result.tailored_cv),
      cover_letter: null,
    })
    .select('id')
    .single();
  if (cvInsertErr) {
    console.error('[scout-universal] insert scout_cvs failed:', cvInsertErr);
    return res.status(500).json({ ok: false, error: 'Could not save universal CV' });
  }

  return res.status(200).json({
    ok: true,
    scout_cv_id: cvInsert.id,
    cv_type: 'universal',
    tailored_cv: result.tailored_cv,
  });
}
