/**
 * POST /api/scout-run
 *
 * Pro-only Scout endpoint. Fetches fresh job postings from JSearch (RapidAPI)
 * matching the user's stated preferences, scores them against the user's most
 * recent CV with Claude, and persists scout_jobs + scout_matches rows under
 * the user's id. Daily run count is enforced via scout_preferences.
 *
 * Auth:  Authorization: Bearer <user JWT>
 * Body:  { preferences?: { target_role, location, experience_years, salary_min, sources } }
 *        If `preferences` is omitted the existing scout_preferences row is used;
 *        if it's present it overwrites that row.
 *
 * Responses:
 *   200 { ok: true, jobsFetched, matchesCreated, runsRemaining }
 *   400 missing target_role / no CV on file / bad body
 *   401 missing or invalid bearer token
 *   402 not on a paid plan
 *   429 daily run limit reached
 *   500 server / Supabase / unexpected
 *   502 JSearch or Anthropic upstream failed
 *
 * Required env (Vercel project settings):
 *   - SUPABASE_URL                (or REACT_APP_SUPABASE_URL)
 *   - SUPABASE_ANON_KEY           (or REACT_APP_SUPABASE_ANON_KEY)
 *   - SUPABASE_SERVICE_ROLE_KEY   server-only; bypasses RLS but every write is scoped to user.id
 *   - RAPIDAPI_KEY                jsearch.p.rapidapi.com
 *   - ANTHROPIC_API_KEY
 *
 * Optional env:
 *   - SCOUT_DAILY_LIMIT           default 3
 *   - SCOUT_JSEARCH_PAGE_SIZE     default 10
 *   - SCOUT_CLAUDE_MODEL          default 'claude-haiku-4-5-20251001'
 */

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 60 };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SCOUT_DAILY_LIMIT = parseInt(process.env.SCOUT_DAILY_LIMIT || '3', 10);
const JSEARCH_PAGE_SIZE = parseInt(process.env.SCOUT_JSEARCH_PAGE_SIZE || '10', 10);
const CLAUDE_MODEL = process.env.SCOUT_CLAUDE_MODEL || 'claude-haiku-4-5-20251001';

function startOfTodayUTCISO() {
  const x = new Date();
  x.setUTCHours(0, 0, 0, 0);
  return x.toISOString();
}

function jdSnippet(text, n = 280) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

function flattenCv(cvData) {
  if (!cvData || typeof cvData !== 'object') return '';
  const parts = [];
  if (cvData.name) parts.push(`Name: ${cvData.name}`);
  if (cvData.title) parts.push(`Title: ${cvData.title}`);
  if (cvData.summary) parts.push(`Summary: ${cvData.summary}`);
  if (Array.isArray(cvData.experience)) {
    parts.push('Experience:');
    cvData.experience.forEach((e, i) => {
      const line = typeof e === 'string'
        ? e
        : `${e?.title || ''} at ${e?.company || ''} (${e?.startDate || ''} – ${e?.endDate || ''}): ${
            Array.isArray(e?.bullets) ? e.bullets.join('; ') : (e?.description || '')
          }`;
      parts.push(`  ${i + 1}. ${line}`);
    });
  }
  if (Array.isArray(cvData.education)) {
    parts.push('Education:');
    cvData.education.forEach((e, i) => {
      const line = typeof e === 'string'
        ? e
        : `${e?.degree || ''} ${e?.field ? `— ${e.field}` : ''} at ${e?.institution || ''} (${e?.graduationDate || ''})`;
      parts.push(`  ${i + 1}. ${line.trim()}`);
    });
  }
  if (Array.isArray(cvData.skills)) {
    parts.push(`Skills: ${cvData.skills.join(', ')}`);
  } else if (cvData.skills && typeof cvData.skills === 'object') {
    const s = cvData.skills;
    const flat = [...(s.hard_skills || []), ...(s.tools || []), ...(s.soft_skills || [])];
    if (flat.length) parts.push(`Skills: ${flat.join(', ')}`);
  }
  return parts.join('\n').slice(0, 8000);
}

async function fetchJSearchJobs({ role, location }) {
  const query = `${role}${location ? ` in ${location}` : ''}`.trim();
  const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=1&num_pages=1`;
  const r = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
    },
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`JSearch ${r.status}: ${text.slice(0, 300)}`);
  }
  const json = await r.json();
  return Array.isArray(json?.data) ? json.data.slice(0, JSEARCH_PAGE_SIZE) : [];
}

function buildScoringPrompt(cvText, jobs, prefs) {
  const jobBlocks = jobs.map((j, i) => `=== JOB ${i + 1} ===
Title: ${j.job_title || ''}
Company: ${j.employer_name || ''}
Location: ${[j.job_city, j.job_country].filter(Boolean).join(', ')}
Salary: ${
    j.job_min_salary || j.job_max_salary
      ? `${j.job_min_salary ?? ''} – ${j.job_max_salary ?? ''} ${j.job_salary_currency || ''}`.trim()
      : (j.job_salary || 'not stated')
  }
Description: ${(j.job_description || '').slice(0, 2400)}`).join('\n\n');

  return `You are a senior recruiter scoring how well a candidate matches each job below.

CANDIDATE CV:
${cvText}

CANDIDATE PREFERENCES:
- Target role: ${prefs.target_role || ''}
- Preferred location: ${prefs.location || ''}
- Years of experience: ${prefs.experience_years ?? 'unspecified'}
- Salary minimum: ${prefs.salary_min ?? 'unspecified'}

JOBS:
${jobBlocks}

For each job (1..${jobs.length}), return a STRICT JSON array with one entry per job IN THE SAME ORDER. Each entry must be:
{
  "match_score": <integer 0-100>,
  "match_type": "direct" | "stretch" | "discarded",
  "key_strengths": [string, ...],
  "missing_requirements": [string, ...],
  "tailoring_advice": string,
  "ats_keywords": [string, ...]
}

Rules:
- "direct" = score >= 80, "stretch" = 50-79, "discarded" = < 50.
- key_strengths: 2–4 specific reasons the CV fits — reference actual experience, no platitudes.
- missing_requirements: real gaps the CV does not cover.
- tailoring_advice: one paragraph, 2–3 sentences, plain text.
- ats_keywords: 5–10 JD keywords the candidate should add to their CV.
- Output ONLY a JSON array. No commentary. No markdown fences.`;
}

async function scoreWithClaude(cvText, jobs, prefs) {
  const prompt = buildScoringPrompt(cvText, jobs, prefs);
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
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
  if (!Array.isArray(parsed)) throw new Error('Claude returned non-array');
  return parsed;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ ok: false, error: 'Server not configured: Supabase env missing' });
  }
  if (!RAPIDAPI_KEY) {
    return res.status(500).json({ ok: false, error: 'Server not configured: RAPIDAPI_KEY missing' });
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
    return res.status(402).json({ ok: false, error: 'Scout requires a paid plan' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
  }
  const bodyPrefs = body.preferences;

  let { data: prefRow } = await db
    .from('scout_preferences')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const prefs = bodyPrefs
    ? {
        target_role: bodyPrefs.target_role || prefRow?.target_role || '',
        location: bodyPrefs.location || prefRow?.location || '',
        experience_years: bodyPrefs.experience_years ?? prefRow?.experience_years ?? null,
        salary_min: bodyPrefs.salary_min ?? prefRow?.salary_min ?? null,
        sources: bodyPrefs.sources || prefRow?.sources || ['all'],
      }
    : (prefRow || {});

  if (!prefs.target_role) {
    return res.status(400).json({ ok: false, error: 'Missing target_role. Set scout preferences first.' });
  }

  const todayStart = startOfTodayUTCISO();
  let runsToday = prefRow?.run_count_today || 0;
  if (!prefRow?.last_run_at || new Date(prefRow.last_run_at) < new Date(todayStart)) {
    runsToday = 0;
  }
  if (runsToday >= SCOUT_DAILY_LIMIT) {
    return res.status(429).json({
      ok: false,
      error: `Daily limit reached (${SCOUT_DAILY_LIMIT}/day). Try again tomorrow.`,
    });
  }

  const { data: cvRow } = await db
    .from('cvs')
    .select('cv_data')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!cvRow?.cv_data) {
    return res.status(400).json({ ok: false, error: 'No CV on file. Build your CV before running Scout.' });
  }
  const cvText = flattenCv(cvRow.cv_data);

  if (!prefRow) {
    const ins = await db
      .from('scout_preferences')
      .insert({
        user_id: user.id,
        target_role: prefs.target_role,
        location: prefs.location,
        experience_years: prefs.experience_years,
        salary_min: prefs.salary_min,
        sources: prefs.sources,
      })
      .select()
      .single();
    if (ins.error) {
      console.error('[scout-run] insert scout_preferences failed:', ins.error);
      return res.status(500).json({ ok: false, error: 'Could not save preferences' });
    }
    prefRow = ins.data;
  } else if (bodyPrefs) {
    await db
      .from('scout_preferences')
      .update({
        target_role: prefs.target_role,
        location: prefs.location,
        experience_years: prefs.experience_years,
        salary_min: prefs.salary_min,
        sources: prefs.sources,
      })
      .eq('id', prefRow.id);
  }

  let rawJobs = [];
  try {
    rawJobs = await fetchJSearchJobs({ role: prefs.target_role, location: prefs.location });
  } catch (e) {
    console.error('[scout-run] JSearch failed:', e);
    return res.status(502).json({ ok: false, error: 'Job source unavailable' });
  }

  if (rawJobs.length === 0) {
    await db
      .from('scout_preferences')
      .update({ last_run_at: new Date().toISOString(), run_count_today: runsToday + 1 })
      .eq('id', prefRow.id);
    return res.status(200).json({
      ok: true,
      jobsFetched: 0,
      matchesCreated: 0,
      runsRemaining: SCOUT_DAILY_LIMIT - runsToday - 1,
    });
  }

  let scores;
  try {
    scores = await scoreWithClaude(cvText, rawJobs, prefs);
  } catch (e) {
    console.error('[scout-run] Claude scoring failed:', e);
    return res.status(502).json({ ok: false, error: 'AI scorer unavailable' });
  }
  if (scores.length !== rawJobs.length) {
    console.warn('[scout-run] score/job count mismatch:', scores.length, rawJobs.length);
  }

  const jobRows = rawJobs.map((j) => ({
    user_id: user.id,
    title: j.job_title || '',
    company: j.employer_name || '',
    location: [j.job_city, j.job_country].filter(Boolean).join(', '),
    salary:
      j.job_min_salary || j.job_max_salary
        ? `${j.job_min_salary ?? ''}-${j.job_max_salary ?? ''} ${j.job_salary_currency || ''}`.trim()
        : (j.job_salary || ''),
    jd_text: (j.job_description || '').slice(0, 12000),
    jd_snippet: jdSnippet(j.job_description),
    apply_url: j.job_apply_link || j.job_google_link || '',
    source_platform: j.job_publisher || 'JSearch',
  }));

  const { data: insertedJobs, error: jobsErr } = await db
    .from('scout_jobs')
    .insert(jobRows)
    .select('id');
  if (jobsErr || !Array.isArray(insertedJobs)) {
    console.error('[scout-run] insert scout_jobs failed:', jobsErr);
    return res.status(500).json({ ok: false, error: 'Could not save jobs' });
  }

  const matchRows = insertedJobs.map((row, i) => {
    const s = scores[i] || {};
    const score = Math.max(0, Math.min(100, parseInt(s.match_score, 10) || 0));
    const type = ['direct', 'stretch', 'discarded'].includes(s.match_type)
      ? s.match_type
      : score >= 80
        ? 'direct'
        : score >= 50
          ? 'stretch'
          : 'discarded';
    return {
      user_id: user.id,
      job_id: row.id,
      match_score: score,
      match_type: type,
      key_strengths: Array.isArray(s.key_strengths) ? s.key_strengths : [],
      missing_requirements: Array.isArray(s.missing_requirements) ? s.missing_requirements : [],
      tailoring_advice: typeof s.tailoring_advice === 'string' ? s.tailoring_advice : '',
      ats_keywords: Array.isArray(s.ats_keywords) ? s.ats_keywords : [],
    };
  });

  const { error: matchErr } = await db.from('scout_matches').insert(matchRows);
  if (matchErr) {
    console.error('[scout-run] insert scout_matches failed:', matchErr);
    return res.status(500).json({ ok: false, error: 'Could not save matches' });
  }

  await db
    .from('scout_preferences')
    .update({ last_run_at: new Date().toISOString(), run_count_today: runsToday + 1 })
    .eq('id', prefRow.id);

  return res.status(200).json({
    ok: true,
    jobsFetched: rawJobs.length,
    matchesCreated: matchRows.length,
    runsRemaining: SCOUT_DAILY_LIMIT - runsToday - 1,
  });
}
