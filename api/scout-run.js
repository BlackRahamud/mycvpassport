/**
 * POST /api/scout-run
 *
 * Pro-only Scout endpoint. Fetches fresh job postings from JSearch (RapidAPI)
 * and Jooble in parallel, merges + dedups them, scores them against the user's
 * most recent CV with Claude, and persists scout_jobs + scout_matches rows
 * under the user's id. Daily run count is enforced via scout_preferences.
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
 *   - JOOBLE_API_KEY              jooble.org/api — second source. Skipped if unset.
 *   - SCOUT_DAILY_LIMIT           default 3
 *   - SCOUT_JSEARCH_PAGE_SIZE     default 10
 *   - SCOUT_JOOBLE_PAGE_SIZE      default 10
 *   - SCOUT_JOOBLE_TIMEOUT_MS     default 8000
 *   - SCOUT_CLAUDE_MODEL          default 'claude-haiku-4-5-20251001'
 */

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 60 };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const JOOBLE_API_KEY = process.env.JOOBLE_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SCOUT_DAILY_LIMIT = parseInt(process.env.SCOUT_DAILY_LIMIT || '3', 10);
const JSEARCH_PAGE_SIZE = parseInt(process.env.SCOUT_JSEARCH_PAGE_SIZE || '10', 10);
const JOOBLE_PAGE_SIZE = parseInt(process.env.SCOUT_JOOBLE_PAGE_SIZE || '10', 10);
const JOOBLE_TIMEOUT_MS = parseInt(process.env.SCOUT_JOOBLE_TIMEOUT_MS || '8000', 10);
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

// Frontend filter labels → JSearch employment_types codes. JSearch treats
// "Remote" via a separate remote_jobs_only flag — we still send a base
// employment_type for it. "Hybrid" has no JSearch enum so we let it ride
// as FULLTIME and rely on JD text to surface hybrid roles.
const EMPLOYMENT_TYPE_MAP = {
  'Full Time': 'FULLTIME',
  'Part Time': 'PARTTIME',
  'Contract': 'CONTRACTOR',
  'Remote': 'FULLTIME',
  'Hybrid': 'FULLTIME',
};

const DATE_POSTED_MAP = {
  'Last 24 hours': 'today',
  'Last 3 days': '3days',
  'Last week': 'week',
  'Last month': 'month',
  'Any time': 'all',
};

// Post-fetch hard filters applied to JSearch results before scoring.
// Scope:
//   - Location: country must match the user's selected GCC city; Indian
//     cities are dropped regardless of the country field (JSearch tags
//     India-based remote roles inconsistently).
//   - Age: anything older than 21 days, or with no timestamp at all,
//     is dropped — stale postings are the #1 source of "ghost job" complaints.
//   - Dedup: same (title, employer) → keep the most recently posted; tie
//     goes to LinkedIn, then first-seen.
//   - Ghost: known-dead URL patterns and empty apply links.
const GCC_LOCATION_COUNTRY = [
  { needles: ['dubai'], country: 'United Arab Emirates' },
  { needles: ['abu dhabi', 'abu-dhabi'], country: 'United Arab Emirates' },
  { needles: ['riyadh'], country: 'Saudi Arabia' },
  { needles: ['qatar', 'doha'], country: 'Qatar' },
  { needles: ['oman', 'muscat'], country: 'Oman' },
];
const INDIAN_CITY_NEEDLES = [
  'india', 'bangalore', 'bengaluru', 'mumbai', 'delhi',
  'chennai', 'hyderabad', 'pune', 'kolkata',
];
const GHOST_AGE_MS = 21 * 24 * 60 * 60 * 1000;

function expectedCountryFor(location) {
  const s = String(location || '').toLowerCase();
  for (const entry of GCC_LOCATION_COUNTRY) {
    if (entry.needles.some((n) => s.includes(n))) return entry.country;
  }
  return null;
}

// Normalised key for the (title, employer) dedup. Lowercase + trim alone
// missed real duplicates because the two sources serialise the same role
// slightly differently — non-breaking spaces, "Inc." vs "Inc", em-dashes,
// trailing "(Hybrid)" punctuation, etc. Stripping everything that isn't
// a Unicode letter or digit and collapsing whitespace produces a stable
// fingerprint regardless of source.
function dedupKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function applyScoutFilters(rawJobs, prefs) {
  const total = rawJobs.length;
  const expectedCountry = expectedCountryFor(prefs.location);

  const afterLocation = rawJobs.filter((j) => {
    if (expectedCountry && j.job_country && j.job_country !== expectedCountry) {
      return false;
    }
    if (j.job_city) {
      const cityLower = String(j.job_city).toLowerCase();
      if (INDIAN_CITY_NEEDLES.some((n) => cityLower.includes(n))) return false;
    }
    return true;
  });

  const cutoff = Date.now() - GHOST_AGE_MS;
  const afterAge = afterLocation.filter((j) => {
    if (!j.job_posted_at_datetime_utc) return false;
    const t = new Date(j.job_posted_at_datetime_utc).getTime();
    if (Number.isNaN(t)) return false;
    return t >= cutoff;
  });

  const groups = new Map();
  afterAge.forEach((j) => {
    const key = `${dedupKey(j.job_title)}|${dedupKey(j.employer_name)}`;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, j);
      return;
    }
    const eTime = new Date(existing.job_posted_at_datetime_utc).getTime();
    const jTime = new Date(j.job_posted_at_datetime_utc).getTime();
    if (jTime > eTime) {
      groups.set(key, j);
    } else if (jTime === eTime) {
      const jIsLinkedIn = String(j.job_publisher || '').toLowerCase().includes('linkedin');
      const eIsLinkedIn = String(existing.job_publisher || '').toLowerCase().includes('linkedin');
      if (jIsLinkedIn && !eIsLinkedIn) groups.set(key, j);
    }
  });
  const afterDedup = Array.from(groups.values());

  const afterGhost = afterDedup.filter((j) => {
    const url = j.job_apply_link;
    if (!url || url === '') return false;
    const lowerUrl = String(url).toLowerCase();
    if (lowerUrl.includes('workable.com') && (lowerUrl.includes('not-available') || lowerUrl.includes('expired'))) {
      return false;
    }
    if (lowerUrl === 'https://www.linkedin.com/jobs/') return false;
    return true;
  });

  console.log(
    `Scout filter summary: ${total} fetched → ${afterLocation.length} location → ${afterAge.length} age → ${afterDedup.length} dedup → ${afterGhost.length} ghost → ${afterGhost.length} returned`
  );

  return afterGhost;
}

// Jooble accepts a free-text "location" string; we map the user's GCC slug
// to a "City, Country" form that Jooble reliably parses. expectedCountryFor()
// stays the source of truth for the post-fetch country filter.
const JOOBLE_LOCATION_FULL = [
  { needles: ['dubai'], full: 'Dubai, United Arab Emirates' },
  { needles: ['abu dhabi', 'abu-dhabi'], full: 'Abu Dhabi, United Arab Emirates' },
  { needles: ['riyadh'], full: 'Riyadh, Saudi Arabia' },
  { needles: ['qatar', 'doha'], full: 'Doha, Qatar' },
  { needles: ['oman', 'muscat'], full: 'Muscat, Oman' },
];

function joobleLocationFor(location) {
  const s = String(location || '').toLowerCase();
  for (const entry of JOOBLE_LOCATION_FULL) {
    if (entry.needles.some((n) => s.includes(n))) return entry.full;
  }
  return location || '';
}

// Normalises a Jooble job into the JSearch shape the rest of the pipeline
// already understands. job_country is set to the user's intended country
// (Jooble's location string is free-text and inconsistent), but job_city
// is populated from Jooble's `location` so the Indian-city drop in
// applyScoutFilters can still catch leakage of remote India roles.
function normaliseJoobleJob(j, expectedCountry) {
  return {
    job_title: j.title || '',
    employer_name: j.company || '',
    job_apply_link: j.link || '',
    job_description: j.snippet || '',
    job_posted_at_datetime_utc: j.updated || null,
    job_country: expectedCountry || null,
    job_city: j.location || '',
    job_publisher: 'Jooble',
    job_id: `jooble-${j.id || ''}`,
    job_salary: j.salary || '',
  };
}

async function fetchJoobleJobs({ keywords, location, expectedCountry }) {
  if (!JOOBLE_API_KEY) {
    console.warn('[scout-run] JOOBLE_API_KEY not set — skipping Jooble fetch');
    return [];
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), JOOBLE_TIMEOUT_MS);
  try {
    const r = await fetch(`https://jooble.org/api/${JOOBLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords, location }),
      signal: controller.signal,
    });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      console.error(`[scout-run] Jooble ${r.status}: ${text.slice(0, 200)}`);
      return [];
    }
    const json = await r.json();
    const jobs = Array.isArray(json?.jobs) ? json.jobs.slice(0, JOOBLE_PAGE_SIZE) : [];
    return jobs.map((j) => normaliseJoobleJob(j, expectedCountry));
  } catch (e) {
    if (e.name === 'AbortError') {
      console.error(`[scout-run] Jooble timed out after ${JOOBLE_TIMEOUT_MS}ms`);
    } else {
      console.error('[scout-run] Jooble fetch failed:', e.message || e);
    }
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJSearchJobs({ role, location, jobType, datePosted }) {
  const query = `${role}${location ? ` in ${location}` : ''}`.trim();
  const params = new URLSearchParams({
    query,
    page: '1',
    num_pages: '1',
  });

  const empCode = jobType && jobType !== 'Any' ? EMPLOYMENT_TYPE_MAP[jobType] : null;
  if (empCode) params.set('employment_types', empCode);
  if (jobType === 'Remote') params.set('remote_jobs_only', 'true');

  const dateCode = DATE_POSTED_MAP[datePosted] || 'all';
  if (dateCode !== 'all') params.set('date_posted', dateCode);

  const url = `https://jsearch.p.rapidapi.com/search?${params.toString()}`;
  const r = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
    },
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    if (r.status === 429) {
      console.error(`[scout-run] JSearch 429 rate-limited — full body: ${text}`);
    } else {
      console.error(`[scout-run] JSearch ${r.status} error — full body: ${text}`);
    }
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
  console.log(`Scout-run started - JOOBLE_KEY present: ${!!JOOBLE_API_KEY}`);

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
        job_type: bodyPrefs.job_type || prefRow?.job_type || 'Any',
        date_posted_filter: bodyPrefs.date_posted_filter || prefRow?.date_posted_filter || 'Any time',
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

  // Helper: detect "column does not exist" so we can transparently retry
  // without optional fields when a migration hasn't been applied yet.
  const isMissingColumnError = (err) =>
    !!err && (
      err.code === 'PGRST204' ||
      err.code === '42703' ||
      /column .* does not exist|Could not find the .* column/i.test(err.message || '')
    );

  if (!prefRow) {
    const baseRow = {
      user_id: user.id,
      target_role: prefs.target_role,
      location: prefs.location,
      experience_years: prefs.experience_years,
      salary_min: prefs.salary_min,
      sources: prefs.sources,
    };
    const fullRow = {
      ...baseRow,
      job_type: prefs.job_type,
      date_posted_filter: prefs.date_posted_filter,
    };
    let ins = await db.from('scout_preferences').insert(fullRow).select().single();
    if (ins.error && isMissingColumnError(ins.error)) {
      console.warn('[scout-run] scout_preferences missing migration 007 columns — retrying without them');
      ins = await db.from('scout_preferences').insert(baseRow).select().single();
    }
    if (ins.error) {
      console.error('[scout-run] insert scout_preferences failed:', ins.error);
      return res.status(500).json({ ok: false, error: 'Could not save preferences' });
    }
    prefRow = ins.data;
  } else if (bodyPrefs) {
    const baseUpdate = {
      target_role: prefs.target_role,
      location: prefs.location,
      experience_years: prefs.experience_years,
      salary_min: prefs.salary_min,
      sources: prefs.sources,
    };
    const fullUpdate = {
      ...baseUpdate,
      job_type: prefs.job_type,
      date_posted_filter: prefs.date_posted_filter,
    };
    const upd = await db.from('scout_preferences').update(fullUpdate).eq('id', prefRow.id);
    if (upd.error && isMissingColumnError(upd.error)) {
      console.warn('[scout-run] scout_preferences update missing migration 007 columns — retrying without them');
      await db.from('scout_preferences').update(baseUpdate).eq('id', prefRow.id);
    }
  }

  // Fan out JSearch + Jooble in parallel. allSettled means one upstream
  // failure (or timeout, in Jooble's case) can't sink the whole run — the
  // other source still fills the slate. Only return 502 if both come back empty.
  const expectedCountry = expectedCountryFor(prefs.location);
  const [jsearchResult, joobleResult] = await Promise.allSettled([
    fetchJSearchJobs({
      role: prefs.target_role,
      location: prefs.location,
      jobType: prefs.job_type,
      datePosted: prefs.date_posted_filter,
    }),
    fetchJoobleJobs({
      keywords: prefs.target_role,
      location: joobleLocationFor(prefs.location),
      expectedCountry,
    }),
  ]);

  let jsearchJobs = [];
  let joobleJobs = [];
  if (jsearchResult.status === 'fulfilled') {
    jsearchJobs = jsearchResult.value;
  } else {
    console.error('[scout-run] JSearch failed:', jsearchResult.reason);
  }
  if (joobleResult.status === 'fulfilled') {
    joobleJobs = joobleResult.value;
  } else {
    console.error('[scout-run] Jooble failed:', joobleResult.reason);
  }

  if (jsearchJobs.length === 0 && joobleJobs.length === 0 && jsearchResult.status === 'rejected') {
    return res.status(502).json({ ok: false, error: 'Job source unavailable' });
  }

  const jsearchCount = jsearchJobs.length;
  const joobleCount = joobleJobs.length;
  let rawJobs = [...jsearchJobs, ...joobleJobs];
  rawJobs = applyScoutFilters(rawJobs, prefs);
  console.log(
    `Scout sources: ${jsearchCount} from JSearch, ${joobleCount} from Jooble → ${rawJobs.length} after merge/dedup`
  );

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

  const jobRows = rawJobs.map((j) => {
    // Structured salary fields per migration 008. salary_min/max are
    // numeric, currency + period are text. The legacy `salary` text
    // column stays populated (denormalised) for back-compat with any
    // older read paths but new code formats from the structured fields.
    const minNum = Number.isFinite(Number(j.job_min_salary)) ? Number(j.job_min_salary) : null;
    const maxNum = Number.isFinite(Number(j.job_max_salary)) ? Number(j.job_max_salary) : null;
    const currency = j.job_salary_currency || null;
    const period = j.job_salary_period || null;
    return {
      user_id: user.id,
      title: j.job_title || '',
      company: j.employer_name || '',
      location: [j.job_city, j.job_country].filter(Boolean).join(', '),
      salary:
        minNum != null || maxNum != null
          ? `${minNum ?? ''}-${maxNum ?? ''} ${currency || ''}`.trim()
          : (j.job_salary || ''),
      salary_min: minNum,
      salary_max: maxNum,
      salary_currency: currency,
      salary_period: period,
      jd_text: (j.job_description || '').slice(0, 12000),
      jd_snippet: jdSnippet(j.job_description),
      apply_url: j.job_apply_link || j.job_google_link || '',
      source_platform: j.job_publisher || 'JSearch',
    };
  });

  // First-pass insert with structured salary columns (migration 008). If
  // those columns aren't present yet, retry with the legacy `salary` text
  // field only — keeps Scout running until 008 is applied.
  let insertedJobs;
  let jobsErr;
  ({ data: insertedJobs, error: jobsErr } = await db
    .from('scout_jobs')
    .insert(jobRows)
    .select('id'));
  if (jobsErr && isMissingColumnError(jobsErr)) {
    console.warn('[scout-run] scout_jobs missing migration 008 columns — retrying without structured salary');
    const legacyJobRows = jobRows.map(({ salary_min, salary_max, salary_currency, salary_period, ...rest }) => rest);
    ({ data: insertedJobs, error: jobsErr } = await db
      .from('scout_jobs')
      .insert(legacyJobRows)
      .select('id'));
  }
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
