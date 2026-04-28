/**
 * GET /api/scout-matches
 *
 * Returns the signed-in user's scout matches joined with their underlying job
 * rows, ready for the Scout Dashboard to render. RLS is bypassed via the
 * service role key but every read is scoped to the verified user.id, so the
 * trust boundary stays at the JWT.
 *
 * Auth:  Authorization: Bearer <user JWT>
 *
 * Query (all optional):
 *   - status   "new" | "saved" | "applied" | "ignored"   filter on scout_matches.status
 *   - type     "direct" | "stretch" | "discarded"        filter on scout_matches.match_type
 *   - limit    integer 1-200, default 50
 *   - since    ISO timestamp; only matches with created_at >= since
 *
 * Response:
 *   200 { ok: true, matches: [{ match_id, job_id, title, company, location, salary,
 *                                jd_text, jd_snippet, apply_url, source_platform, fetched_at,
 *                                match_score, match_type, key_strengths, missing_requirements,
 *                                tailoring_advice, ats_keywords, status, created_at }] }
 *   401 missing or invalid bearer token
 *   500 server / Supabase
 *
 * Required env:
 *   - SUPABASE_URL                (or REACT_APP_SUPABASE_URL)
 *   - SUPABASE_ANON_KEY           (or REACT_APP_SUPABASE_ANON_KEY)
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 15 };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const VALID_STATUS = new Set(['new', 'saved', 'applied', 'ignored']);
const VALID_TYPE = new Set(['direct', 'stretch', 'discarded']);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ ok: false, error: 'Server not configured: Supabase env missing' });
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

  const q = req.query || {};
  const status = typeof q.status === 'string' && VALID_STATUS.has(q.status) ? q.status : null;
  const type = typeof q.type === 'string' && VALID_TYPE.has(q.type) ? q.type : null;
  const since = typeof q.since === 'string' && !Number.isNaN(Date.parse(q.since)) ? q.since : null;
  let limit = parseInt(q.limit, 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 50;
  if (limit > 200) limit = 200;

  let query = db
    .from('scout_matches')
    .select(`
      id, job_id, match_score, match_type, key_strengths, missing_requirements,
      tailoring_advice, ats_keywords, status, created_at,
      scout_jobs (
        title, company, location, salary, jd_text, jd_snippet, apply_url,
        source_platform, fetched_at
      )
    `)
    .eq('user_id', user.id)
    .order('match_score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) query = query.eq('status', status);
  if (type) query = query.eq('match_type', type);
  if (since) query = query.gte('created_at', since);

  const { data, error } = await query;
  if (error) {
    console.error('[scout-matches] query failed:', error);
    return res.status(500).json({ ok: false, error: 'Could not load matches' });
  }

  const matches = (data || []).map((row) => {
    const job = row.scout_jobs || {};
    return {
      match_id: row.id,
      job_id: row.job_id,
      title: job.title || '',
      company: job.company || '',
      location: job.location || '',
      salary: job.salary || '',
      jd_text: job.jd_text || '',
      jd_snippet: job.jd_snippet || '',
      apply_url: job.apply_url || '',
      source_platform: job.source_platform || '',
      fetched_at: job.fetched_at || null,
      match_score: row.match_score,
      match_type: row.match_type,
      key_strengths: Array.isArray(row.key_strengths) ? row.key_strengths : [],
      missing_requirements: Array.isArray(row.missing_requirements) ? row.missing_requirements : [],
      tailoring_advice: row.tailoring_advice || '',
      ats_keywords: Array.isArray(row.ats_keywords) ? row.ats_keywords : [],
      status: row.status,
      created_at: row.created_at,
    };
  });

  return res.status(200).json({ ok: true, matches });
}
