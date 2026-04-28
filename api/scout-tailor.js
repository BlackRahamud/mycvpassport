/**
 * POST /api/scout-tailor
 *
 * Pro-only. Generates a JD-tailored CV and matching cover letter for a single
 * scout_matches row. Persists the artefact in scout_cvs so the dashboard can
 * show "already tailored" without re-spending Claude credits on every view.
 *
 * Auth:  Authorization: Bearer <user JWT>
 * Body:  { match_id: string, cv_type?: 'specific' | 'universal' }
 *        cv_type defaults to 'specific'.
 *
 * Responses:
 *   200 { ok: true, scout_cv_id, cv_type, tailored_cv, cover_letter }
 *   400 missing/invalid match_id, no CV on file, malformed body
 *   401 missing or invalid bearer token
 *   402 not on a paid plan
 *   404 match_id does not belong to this user
 *   500 server / Supabase / unexpected
 *   502 Anthropic upstream failed
 *
 * Schema note: scout_cvs.tailored_cv_blob holds serialized cv_data JSON until
 * PDF storage is wired; scout_cvs.tailored_cv_url stays null and will hold the
 * Supabase Storage URL once the render pipeline ships (see migration 006).
 *
 * Required env:
 *   - SUPABASE_URL                (or REACT_APP_SUPABASE_URL)
 *   - SUPABASE_ANON_KEY           (or REACT_APP_SUPABASE_ANON_KEY)
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - ANTHROPIC_API_KEY
 *
 * Optional env:
 *   - SCOUT_TAILOR_MODEL          default 'claude-sonnet-4-6'
 */

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 60 };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const TAILOR_MODEL = process.env.SCOUT_TAILOR_MODEL || 'claude-sonnet-4-6';

const VALID_CV_TYPE = new Set(['specific', 'universal']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildTailorPrompt({ cvData, job, match, cvType }) {
  const directive =
    cvType === 'universal'
      ? `Rewrite the CV as a polished "universal" version for the candidate's target role. Do NOT over-fit to this specific JD — instead make it strong across the role family. Use the JD only as a sanity check for what's broadly expected. Bias toward concise, ATS-friendly phrasing.`
      : `Rewrite the CV so it is tightly tailored to THIS specific job. Reorder, rephrase, and re-emphasise existing experience to mirror the JD's language. Insert the supplied ATS keywords naturally where they fit the candidate's real history. Do NOT invent jobs, employers, dates, or qualifications that aren't in the source CV.`;

  return `You are an expert CV editor for the India-to-Gulf migration corridor.

CANDIDATE CV (canonical JSON — preserve this top-level shape exactly in your output):
${JSON.stringify(cvData).slice(0, 12000)}

TARGET JOB:
- Title: ${job.title || ''}
- Company: ${job.company || ''}
- Location: ${job.location || ''}
- JD: ${(job.jd_text || '').slice(0, 4000)}

MATCH INTEL (from the prior scout scoring step):
- Key strengths to lean into: ${(match.key_strengths || []).join(' | ') || 'none provided'}
- Gaps the CV does not cover: ${(match.missing_requirements || []).join(' | ') || 'none provided'}
- Tailoring advice: ${match.tailoring_advice || 'none provided'}
- ATS keywords to surface: ${(match.ats_keywords || []).join(', ') || 'none provided'}

DIRECTIVE:
${directive}

OUTPUT — return ONE JSON object, no markdown fences, no commentary:
{
  "tailored_cv": <the rewritten CV — same top-level keys and array shapes as the input CV>,
  "cover_letter": <plain text body, 3 short paragraphs, no salutation, no sign-off, no date>
}

Rules:
- Never fabricate employers, titles, dates, qualifications, or certifications not present in the source CV.
- Do not change names of real employers or institutions.
- Keep bullet rewrites grounded in the original bullets — sharpen verbs, surface metrics that are already there.
- Cover letter tone: confident Gulf corporate when the job location is UAE/GCC, formal Indian corporate when it is India.
- Output VALID JSON only. No backticks. No leading text.`;
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
      model: TAILOR_MODEL,
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
  if (!parsed || typeof parsed !== 'object') throw new Error('Claude returned non-object');
  if (!parsed.tailored_cv || typeof parsed.cover_letter !== 'string') {
    throw new Error('Claude response missing tailored_cv or cover_letter');
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
    return res.status(402).json({ ok: false, error: 'Tailoring requires a paid plan' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
  }
  const matchId = typeof body.match_id === 'string' ? body.match_id.trim() : '';
  if (!matchId || !UUID_RE.test(matchId)) {
    return res.status(400).json({ ok: false, error: 'match_id (uuid) required' });
  }
  const cvType = VALID_CV_TYPE.has(body.cv_type) ? body.cv_type : 'specific';

  const { data: matchRow, error: matchErr } = await db
    .from('scout_matches')
    .select(`
      id, user_id, key_strengths, missing_requirements, tailoring_advice, ats_keywords,
      scout_jobs ( id, title, company, location, jd_text )
    `)
    .eq('id', matchId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (matchErr) {
    console.error('[scout-tailor] match lookup failed:', matchErr);
    return res.status(500).json({ ok: false, error: 'Could not load match' });
  }
  if (!matchRow) {
    return res.status(404).json({ ok: false, error: 'Match not found' });
  }
  const job = matchRow.scout_jobs || {};
  if (!job.jd_text) {
    return res.status(400).json({ ok: false, error: 'Match has no JD text to tailor against' });
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
      buildTailorPrompt({
        cvData: cvRow.cv_data,
        job,
        match: matchRow,
        cvType,
      })
    );
  } catch (e) {
    console.error('[scout-tailor] Claude failed:', e);
    return res.status(502).json({ ok: false, error: 'AI tailor unavailable' });
  }

  const { data: cvInsert, error: cvInsertErr } = await db
    .from('scout_cvs')
    .insert({
      user_id: user.id,
      match_id: matchId,
      cv_type: cvType,
      tailored_cv_blob: JSON.stringify(result.tailored_cv),
      cover_letter: result.cover_letter,
    })
    .select('id')
    .single();
  if (cvInsertErr) {
    console.error('[scout-tailor] insert scout_cvs failed:', cvInsertErr);
    return res.status(500).json({ ok: false, error: 'Could not save tailored CV' });
  }

  return res.status(200).json({
    ok: true,
    scout_cv_id: cvInsert.id,
    cv_type: cvType,
    tailored_cv: result.tailored_cv,
    cover_letter: result.cover_letter,
  });
}
