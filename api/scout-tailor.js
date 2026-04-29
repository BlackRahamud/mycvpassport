/**
 * POST /api/scout-tailor
 *
 * Pro-only. Generates a JD-tailored CV and matching cover letter for a single
 * scout_matches row. Persists the artefact in scout_cvs so the dashboard can
 * show "already tailored" without re-spending Claude credits on every view.
 *
 * Auth:  Authorization: Bearer <user JWT>
 * Body:  { match_id: string, cv_type?: 'specific' | 'universal',
 *          fallback?: { title, company, location, description|jd_text,
 *                       key_strengths, missing_requirements,
 *                       tailoring_advice, ats_keywords, match_score } }
 *        cv_type defaults to 'specific'. Source CV is always the user's
 *        most recent stored CV — uploaded-CV path no longer hits this
 *        endpoint (Apply modal Path B opens the job page directly).
 *        fallback is the resilience payload: when the DB lookup misses
 *        (race after a fresh run wipes/re-inserts matches, transient
 *        Supabase error, stale match_id in client state) we tailor
 *        from the fallback shape instead of returning 404. scout_cvs
 *        is only persisted when the DB row exists — the FK to
 *        scout_matches.id would break otherwise.
 *
 * Responses:
 *   200 { ok: true, scout_cv_id, cv_type, tailored_cv, cover_letter }
 *       scout_cv_id is null when the response came from the fallback
 *       path — caller should treat null as "tailored CV available, not
 *       persisted to scout_cvs" and not retry.
 *   400 malformed body, no CV on file, no match data anywhere (no DB row
 *       AND no usable fallback), match has no JD to tailor against
 *   401 missing or invalid bearer token
 *   402 not on a paid plan
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

  const sourceBlock = `SOURCE CV (canonical JSON from the candidate's CVPassport account):
${JSON.stringify(cvData).slice(0, 12000)}`;

  return `You are an expert CV editor for the India-to-Gulf migration corridor.

${sourceBlock}

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
  "tailored_cv": {
    "name": string, "email": string, "phone": string, "location": string,
    "title": string, "summary": string,
    "experience": [
      { "company": string, "role": string, "location": string, "period": string, "points": string,
        "startDate": string, "endDate": string, "present": boolean }
    ],
    "education": [
      { "school": string, "degree": string, "year": string, "fieldOfStudy": string,
        "startDate": string, "endDate": string, "location": string }
    ],
    "skills": string,
    "languages": string,
    "certifications": [{ "name": string, "issuer": string, "year": string }],
    "technicalSkills": string,
    "projects": string,
    "volunteerWork": string,
    "publications": string
  },
  "cover_letter": <plain text body, 3 short paragraphs, no salutation, no sign-off, no date>
}

Rules:
- Output MUST conform exactly to the canonical shape above — those keys, those types.
- Never fabricate employers, titles, dates, qualifications, or certifications not present in the source CV.
- Do not change names of real employers or institutions.
- Keep bullet rewrites grounded in the original bullets — sharpen verbs, surface metrics that are already there.
- experience[].points = newline-separated bullet sentences (no leading "•" or "-"). Keep 3–5 per role.
- skills + technicalSkills + languages = comma-separated strings.
- For unknown fields, use "" (empty string) — never null, never omit the key.
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
  const cvType = VALID_CV_TYPE.has(body.cv_type) ? body.cv_type : 'specific';
  const fallback = body.fallback && typeof body.fallback === 'object' ? body.fallback : null;
  const matchIdIsUuid = !!matchId && UUID_RE.test(matchId);

  console.log('[scout-tailor] request:', JSON.stringify({
    match_id: matchId,
    match_id_is_uuid: matchIdIsUuid,
    user_id: user.id,
    cv_type: cvType,
    has_fallback: !!fallback,
    fallback_keys: fallback ? Object.keys(fallback) : [],
  }));

  // DB lookup is best-effort. Any miss (invalid match_id, query error,
  // no row) falls through to the fallback path silently — we do NOT
  // surface a 404/500 to the user when fallback can carry the request.
  let matchRow = null;
  if (matchIdIsUuid) {
    const { data, error } = await db
      .from('scout_matches')
      .select(`
        id, user_id, key_strengths, missing_requirements, tailoring_advice, ats_keywords,
        scout_jobs ( id, title, company, location, jd_text )
      `)
      .eq('id', matchId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) {
      console.error('[scout-tailor] match lookup error (full):', JSON.stringify(error));
    } else if (!data) {
      console.warn(`[scout-tailor] no match row for match_id=${matchId} user_id=${user.id} — will try fallback`);
    } else {
      matchRow = data;
      console.log('[scout-tailor] DB hit — using canonical match row');
    }
  } else {
    console.log('[scout-tailor] match_id missing or non-UUID — going straight to fallback');
  }

  // Pick the source-of-truth for the prompt: DB row preferred (canonical),
  // otherwise the fallback payload the dashboard ships with every Apply
  // click. Both shapes get coerced into a uniform { job, match } pair so
  // buildTailorPrompt is none the wiser.
  let job;
  let match;
  if (matchRow) {
    job = matchRow.scout_jobs || {};
    match = matchRow;
  } else if (fallback) {
    console.log('[scout-tailor] using fallback payload — DB row unavailable');
    job = {
      title: typeof fallback.title === 'string' ? fallback.title : '',
      company: typeof fallback.company === 'string' ? fallback.company : '',
      location: typeof fallback.location === 'string' ? fallback.location : '',
      jd_text: typeof fallback.description === 'string' && fallback.description
        ? fallback.description
        : (typeof fallback.jd_text === 'string' ? fallback.jd_text : ''),
    };
    match = {
      key_strengths: Array.isArray(fallback.key_strengths) ? fallback.key_strengths : [],
      missing_requirements: Array.isArray(fallback.missing_requirements) ? fallback.missing_requirements : [],
      tailoring_advice: typeof fallback.tailoring_advice === 'string' ? fallback.tailoring_advice : '',
      ats_keywords: Array.isArray(fallback.ats_keywords) ? fallback.ats_keywords : [],
    };
  } else {
    // No DB row AND no fallback. Genuinely cannot tailor — this is the
    // only hard failure path that survives. The frontend should never
    // reach this branch in the new flow because it always sends fallback.
    console.error('[scout-tailor] hard fail — no DB row and no fallback payload');
    return res.status(400).json({
      ok: false,
      error: 'Could not locate match details. Refresh and try again.',
    });
  }
  if (!job.jd_text) {
    return res.status(400).json({ ok: false, error: 'Match has no JD text to tailor against' });
  }

  // Load the user's most recent CV. template_id is returned so the client
  // can render the tailored CV through generate-pdf with the same template
  // the user already chose.
  const { data: cvRow } = await db
    .from('cvs')
    .select('cv_data, template_id')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!cvRow?.cv_data) {
    return res.status(400).json({ ok: false, error: 'No CV on file. Build your CV first.' });
  }
  const sourceTemplateId = Number.isFinite(Number(cvRow.template_id)) ? Number(cvRow.template_id) : null;

  let result;
  try {
    result = await callClaude(
      buildTailorPrompt({
        cvData: cvRow.cv_data,
        job,
        match,
        cvType,
      })
    );
  } catch (e) {
    console.error('[scout-tailor] Claude failed:', e);
    return res.status(502).json({ ok: false, error: 'AI tailor unavailable' });
  }

  // Persist scout_cvs ONLY when we have a verified DB-resident match_id.
  // Inserting with a bogus match_id would either hit the FK to
  // scout_matches.id and 500 us, or (in environments without the FK)
  // create an orphan row. In fallback mode we just skip the insert —
  // the user still gets the tailored CV in the response.
  let scoutCvId = null;
  if (matchRow) {
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
      // Persist failures are NON-FATAL — the user gets their tailored
      // CV regardless. Logged for debugging; "save tailored CV for next
      // time" is a nice-to-have, not a hard requirement.
      console.error('[scout-tailor] insert scout_cvs failed (non-fatal):', JSON.stringify(cvInsertErr));
    } else {
      scoutCvId = cvInsert.id;
    }
  } else {
    console.log('[scout-tailor] skipping scout_cvs insert (fallback mode — no canonical match_id)');
  }

  return res.status(200).json({
    ok: true,
    scout_cv_id: scoutCvId,
    cv_type: cvType,
    tailored_cv: result.tailored_cv,
    cover_letter: result.cover_letter,
    template_id: sourceTemplateId,
  });
}
