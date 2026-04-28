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
import { randomUUID } from 'crypto';

export const config = { maxDuration: 60 };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const JOOBLE_API_KEY = process.env.JOOBLE_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SCOUT_DAILY_LIMIT = parseInt(process.env.SCOUT_DAILY_LIMIT || '3', 10);
// Founder account bypasses the daily run limit entirely — used for live
// QA, eval-fixture sweeps, and demo runs that mustn't trip the same gate
// real users see.
const FOUNDER_USER_ID = 'bc4a800f-0ab7-47d5-85ed-a9e014020c64';
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

// Pipeline filters applied between source fan-out and Claude scoring.
//   - Step 3 (smartDedupKey): collapse the same job appearing on multiple
//     boards (BeBee + Bayt + Workable etc) into one — first occurrence wins.
//   - Step 4 (applyLocationAndAge): country must match the user's selected
//     GCC city; Indian cities are always dropped (JSearch tags India remote
//     roles inconsistently); postings older than 21 days or with no
//     timestamp are dropped — stale listings drive most "ghost job" complaints.
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

// Step 3 — smart hash dedup key. Same job published on BeBee + Bayt +
// Workable lands at slightly different surface text but identical
// (title, company, city) once you strip whitespace and punctuation.
// First occurrence wins; everything else is discarded.
function smartDedupKey(j) {
  return `${j.job_title || ''}${j.employer_name || ''}${j.job_city || ''}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Step 4 — location hard filter + 21-day age cap. No country fallback
// when the GCC slug is unrecognised: we only filter by country when we
// know which country the user picked.
function applyLocationAndAge(jobs, location) {
  const expectedCountry = expectedCountryFor(location);
  const cutoff = Date.now() - GHOST_AGE_MS;
  return jobs.filter((j) => {
    if (expectedCountry && j.job_country && j.job_country !== expectedCountry) {
      return false;
    }
    if (j.job_city) {
      const cityLower = String(j.job_city).toLowerCase();
      if (INDIAN_CITY_NEEDLES.some((n) => cityLower.includes(n))) return false;
    }
    if (!j.job_posted_at_datetime_utc) return false;
    const t = new Date(j.job_posted_at_datetime_utc).getTime();
    if (Number.isNaN(t)) return false;
    if (t < cutoff) return false;
    return true;
  });
}

// Detects "column does not exist" so we can transparently retry inserts
// without optional fields when migration 007/008 hasn't been applied to
// the target environment yet. Module-scoped because Step 7's prefs and
// jobs paths both use it.
function isMissingColumnError(err) {
  return !!err && (
    err.code === 'PGRST204' ||
    err.code === '42703' ||
    /column .* does not exist|Could not find the .* column/i.test(err.message || '')
  );
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

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

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
  const doFetch = () => fetch(url, {
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
    },
  });

  // First attempt. On a 429 we back off 3s and retry exactly once; if the
  // retry is still 429 we fall back gracefully to an empty array so Jooble
  // alone can carry the run. Non-429 failures still throw so allSettled
  // surfaces them.
  let r = await doFetch();
  if (r.status === 429) {
    const text = await r.text().catch(() => '');
    console.error(`[scout-run] JSearch 429 rate-limited — full body: ${text}`);
    await delay(3000);
    r = await doFetch();
    if (r.status === 429) {
      console.error('[scout-run] JSearch rate limited after retry — continuing with Jooble only');
      return [];
    }
  }

  if (!r.ok) {
    const text = await r.text().catch(() => '');
    console.error(`[scout-run] JSearch ${r.status} error — full body: ${text}`);
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

  // ── Body parse + auth ────────────────────────────────────────────────────
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
  }
  // userId is accepted in the contract but we never trust it — auth's
  // user.id is the only writeable identity.
  const role = String(body.role || '').trim();
  const location = String(body.location || '').trim();
  const experience = Number.isFinite(Number(body.experience)) ? Number(body.experience) : null;
  const jobType = body.jobType || 'Any';
  const datePosted = body.datePosted || 'Any time';
  const minSalary = Number.isFinite(Number(body.minSalary)) ? Number(body.minSalary) : null;

  if (!role) {
    return res.status(400).json({ ok: false, error: 'Missing role' });
  }

  const { data: profile } = await db
    .from('profiles')
    .select('is_pro')
    .eq('id', user.id)
    .single();
  if (!profile?.is_pro) {
    return res.status(402).json({ ok: false, error: 'Scout requires a paid plan' });
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

  // Daily-limit gate. Read scout_preferences ONLY for the run counter —
  // filter values come from the request body, not the DB. Founder bypasses
  // the limit and the increment.
  const { data: prefRow } = await db
    .from('scout_preferences')
    .select('id, run_count_today, last_run_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const todayStart = startOfTodayUTCISO();
  const isFounder = user.id === FOUNDER_USER_ID;
  let runsToday = prefRow?.run_count_today || 0;
  if (!prefRow?.last_run_at || new Date(prefRow.last_run_at) < new Date(todayStart)) {
    runsToday = 0;
  }
  if (!isFounder && runsToday >= SCOUT_DAILY_LIMIT) {
    return res.status(429).json({
      ok: false,
      error: `Daily limit reached (${SCOUT_DAILY_LIMIT}/day). Try again tomorrow.`,
    });
  }

  // ── Step 1: parallel fetch JSearch + Jooble ──────────────────────────────
  const expectedCountry = expectedCountryFor(location);
  const [jsearchResult, joobleResult] = await Promise.allSettled([
    fetchJSearchJobs({ role, location, jobType, datePosted }),
    fetchJoobleJobs({ keywords: role, location: joobleLocationFor(location), expectedCountry }),
  ]);

  const jsearchJobs = jsearchResult.status === 'fulfilled' ? jsearchResult.value : [];
  const joobleJobs = joobleResult.status === 'fulfilled' ? joobleResult.value : [];
  if (jsearchResult.status === 'rejected') console.error('[scout-run] JSearch failed:', jsearchResult.reason);
  if (joobleResult.status === 'rejected') console.error('[scout-run] Jooble failed:', joobleResult.reason);

  // Both upstreams empty AND JSearch threw → genuine outage. Empty results
  // with both sources OK (e.g. niche role in Muscat) is not an error — let
  // it through and return an empty array.
  if (jsearchJobs.length === 0 && joobleJobs.length === 0 && jsearchResult.status === 'rejected') {
    return res.status(502).json({ ok: false, error: 'Job source unavailable' });
  }

  // ── Step 2: merge ────────────────────────────────────────────────────────
  const merged = [...jsearchJobs, ...joobleJobs];

  // ── Step 3: smart hash dedup, first occurrence wins ──────────────────────
  const seen = new Map();
  for (const j of merged) {
    const key = smartDedupKey(j);
    if (!seen.has(key)) seen.set(key, j);
  }
  const deduped = Array.from(seen.values());

  // ── Step 4: location hard filter + age cap ───────────────────────────────
  const filtered = applyLocationAndAge(deduped, location);

  console.log(
    `Scout pipeline: ${jsearchJobs.length}+${joobleJobs.length}=${merged.length} merged → ${deduped.length} dedup → ${filtered.length} location+age`
  );

  // Helper that fires the prefs upsert + scout_jobs/matches sync. Defined
  // inline so it closes over user/db/role/.../prefRow without a giant
  // parameter list. Returned promise is awaited AFTER res.json so the
  // function stays alive on Vercel until the writes drain.
  const syncToDb = async (matchesForInsert, jobsForInsert) => {
    const newRunCount = isFounder ? (prefRow?.run_count_today || 0) : runsToday + 1;
    const lastRunAt = new Date().toISOString();

    const baseRow = {
      user_id: user.id,
      target_role: role,
      location,
      experience_years: experience,
      salary_min: minSalary,
      sources: ['all'],
      last_run_at: lastRunAt,
      run_count_today: newRunCount,
    };
    const fullRow = { ...baseRow, job_type: jobType, date_posted_filter: datePosted };

    const prefsTask = (async () => {
      try {
        if (prefRow?.id) {
          let { error } = await db.from('scout_preferences').update(fullRow).eq('id', prefRow.id);
          if (error && isMissingColumnError(error)) {
            ({ error } = await db.from('scout_preferences').update(baseRow).eq('id', prefRow.id));
          }
          if (error) console.error('[scout-run] prefs update failed:', error);
        } else {
          let { error } = await db.from('scout_preferences').insert(fullRow);
          if (error && isMissingColumnError(error)) {
            ({ error } = await db.from('scout_preferences').insert(baseRow));
          }
          if (error) console.error('[scout-run] prefs insert failed:', error);
        }
      } catch (e) {
        console.error('[scout-run] prefs task threw:', e);
      }
    })();

    const matchesTask = (async () => {
      if (matchesForInsert.length === 0) return;
      try {
        // Wipe the user's previous run before inserting the new one. matches
        // are user-scoped so this only clears their own slate.
        const { error: delErr } = await db.from('scout_matches').delete().eq('user_id', user.id);
        if (delErr) console.error('[scout-run] delete old matches failed:', delErr);

        let { error: jobsErr } = await db.from('scout_jobs').insert(jobsForInsert);
        if (jobsErr && isMissingColumnError(jobsErr)) {
          const legacy = jobsForInsert.map(({ salary_min, salary_max, salary_currency, salary_period, ...rest }) => rest);
          ({ error: jobsErr } = await db.from('scout_jobs').insert(legacy));
        }
        if (jobsErr) {
          console.error('[scout-run] insert scout_jobs failed:', jobsErr);
          return;
        }

        const { error: matchErr } = await db.from('scout_matches').insert(matchesForInsert);
        if (matchErr) console.error('[scout-run] insert scout_matches failed:', matchErr);
      } catch (e) {
        console.error('[scout-run] matches task threw:', e);
      }
    })();

    await Promise.allSettled([prefsTask, matchesTask]);
  };

  if (filtered.length === 0) {
    res.status(200).json({
      ok: true,
      matches: [],
      matchesCreated: 0,
      runsRemaining: isFounder ? null : SCOUT_DAILY_LIMIT - runsToday - 1,
    });
    await syncToDb([], []);
    return;
  }

  // ── Step 5: top 20 to Claude ─────────────────────────────────────────────
  const candidates = filtered.slice(0, 20);

  let scores;
  try {
    scores = await scoreWithClaude(cvText, candidates, {
      target_role: role,
      location,
      experience_years: experience,
      salary_min: minSalary,
    });
  } catch (e) {
    console.error('[scout-run] Claude scoring failed:', e);
    return res.status(502).json({ ok: false, error: 'AI scorer unavailable' });
  }
  if (scores.length !== candidates.length) {
    console.warn('[scout-run] score/job count mismatch:', scores.length, candidates.length);
  }

  // ── Step 6: drop scores below 70, build response + DB rows ──────────────
  // IDs are pre-generated so the response can carry real DB ids even
  // though the inserts haven't run yet — Save/Skip/Apply on the freshly
  // returned cards land on the correct rows once the async writes drain.
  const matches = [];
  const jobsForInsert = [];
  const matchesForInsert = [];

  for (let i = 0; i < candidates.length; i++) {
    const j = candidates[i];
    const s = scores[i] || {};
    const score = Math.max(0, Math.min(100, parseInt(s.match_score, 10) || 0));
    if (score < 70) continue;

    const type = ['direct', 'stretch', 'discarded'].includes(s.match_type)
      ? s.match_type
      : score >= 80 ? 'direct' : score >= 50 ? 'stretch' : 'discarded';

    const minNum = Number.isFinite(Number(j.job_min_salary)) ? Number(j.job_min_salary) : null;
    const maxNum = Number.isFinite(Number(j.job_max_salary)) ? Number(j.job_max_salary) : null;
    const currency = j.job_salary_currency || null;
    const period = j.job_salary_period || null;

    const jobId = randomUUID();
    const matchId = randomUUID();
    const fetchedAt = new Date().toISOString();

    const title = j.job_title || '';
    const company = j.employer_name || '';
    const locStr = [j.job_city, j.job_country].filter(Boolean).join(', ');
    const salaryStr = minNum != null || maxNum != null
      ? `${minNum ?? ''}-${maxNum ?? ''} ${currency || ''}`.trim()
      : (j.job_salary || '');
    const jdText = (j.job_description || '').slice(0, 12000);
    const jdSnip = jdSnippet(j.job_description);
    const applyUrl = j.job_apply_link || j.job_google_link || '';
    const sourcePlatform = j.job_publisher || 'JSearch';
    const keyStrengths = Array.isArray(s.key_strengths) ? s.key_strengths : [];
    const missingRequirements = Array.isArray(s.missing_requirements) ? s.missing_requirements : [];
    const tailoringAdvice = typeof s.tailoring_advice === 'string' ? s.tailoring_advice : '';
    const atsKeywords = Array.isArray(s.ats_keywords) ? s.ats_keywords : [];

    matches.push({
      match_id: matchId,
      job_id: jobId,
      title,
      company,
      location: locStr,
      salary: salaryStr,
      salary_min: minNum,
      salary_max: maxNum,
      salary_currency: currency,
      salary_period: period,
      jd_text: jdText,
      jd_snippet: jdSnip,
      apply_url: applyUrl,
      source_platform: sourcePlatform,
      fetched_at: fetchedAt,
      match_score: score,
      match_type: type,
      key_strengths: keyStrengths,
      missing_requirements: missingRequirements,
      tailoring_advice: tailoringAdvice,
      ats_keywords: atsKeywords,
      status: 'new',
      created_at: fetchedAt,
    });

    jobsForInsert.push({
      id: jobId,
      user_id: user.id,
      title,
      company,
      location: locStr,
      salary: salaryStr,
      salary_min: minNum,
      salary_max: maxNum,
      salary_currency: currency,
      salary_period: period,
      jd_text: jdText,
      jd_snippet: jdSnip,
      apply_url: applyUrl,
      source_platform: sourcePlatform,
    });

    matchesForInsert.push({
      id: matchId,
      user_id: user.id,
      job_id: jobId,
      match_score: score,
      match_type: type,
      key_strengths: keyStrengths,
      missing_requirements: missingRequirements,
      tailoring_advice: tailoringAdvice,
      ats_keywords: atsKeywords,
    });
  }

  console.log(`Scout pipeline: ${candidates.length} scored → ${matches.length} kept (≥70)`);

  // ── Step 8: respond first ────────────────────────────────────────────────
  res.status(200).json({
    ok: true,
    matches,
    matchesCreated: matches.length,
    runsRemaining: isFounder ? null : SCOUT_DAILY_LIMIT - runsToday - 1,
  });

  // ── Step 7: DB sync drains after the response has flushed ────────────────
  await syncToDb(matchesForInsert, jobsForInsert);
}
