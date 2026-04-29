/**
 * GET /api/transform-session/:id
 *
 * Polled by the frontend to track an Upload & Transform session
 * through its lifecycle (created → awaiting_payment → paid →
 * transforming → transformed | error). Returns everything the UI
 * needs to render the right step plus a derived `next` hint that
 * tells the caller which endpoint to hit next so the frontend
 * doesn't reimplement the gate logic.
 *
 * Privacy:
 *   - raw_extracted_text is NEVER selected from the DB and NEVER
 *     returned, by design. Reading the source CV from this endpoint
 *     is impossible.
 *   - cv_data is only returned when status='transformed'. Earlier
 *     states get null in that field — even on a stale row.
 *
 * Auth:  Authorization: Bearer <user JWT>
 * Path:  /api/transform-session/<uuid>
 *
 * Responses:
 *   200 { ok: true, session_id, status, user_plan, intake,
 *         source_kind, source_chars,
 *         amount_fils, payment_url, payment_intent_id,
 *         cv_data, model, tokens_in, tokens_out,
 *         error_code, error_message,
 *         paid_at, created_at, next }
 *   400 missing/malformed id
 *   401 missing or invalid bearer token
 *   404 session not found OR not owned by user
 *   500 server / Supabase
 *
 * Required env:
 *   - SUPABASE_URL                (or REACT_APP_SUPABASE_URL)
 *   - SUPABASE_ANON_KEY           (or REACT_APP_SUPABASE_ANON_KEY)
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 10 };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Derived hint for the frontend — saves the caller from switching on
// status in two places. 'wait' = keep polling; 'pay'/'run' = call
// the matching endpoint; 'done' = terminal success; 'error' = terminal
// failure (frontend may offer a retry which routes back to /transform-run).
function nextHintFor(status) {
  switch (status) {
    case 'created':           return 'pay';
    case 'awaiting_payment':  return 'wait';
    case 'paid':              return 'run';
    case 'transforming':      return 'wait';
    case 'transformed':       return 'done';
    case 'error':             return 'error';
    default:                  return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Polling endpoint — must never be cached. Browsers, intermediaries,
  // and Vercel's edge will all happily serve stale status without this.
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ ok: false, error: 'Server not configured: Supabase env missing' });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user } = {}, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !user) return res.status(401).json({ ok: false, error: 'Invalid session' });

  // Vercel populates req.query.id from the [id].js filename. Defensive
  // string coercion + UUID validation rejects anything that doesn't
  // look like one of our session ids before it touches the DB.
  const rawId = req.query?.id;
  const sessionId = typeof rawId === 'string' ? rawId.trim() : '';
  if (!sessionId || !UUID_RE.test(sessionId)) {
    return res.status(400).json({ ok: false, error: 'Invalid session id' });
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Explicit field list — raw_extracted_text is intentionally absent.
  // The select can never return source CV text, full stop.
  const { data: session, error: loadErr } = await db
    .from('transform_sessions')
    .select(`
      id, user_id, status, user_plan, intake,
      source_kind, source_chars,
      cv_data, model, tokens_in, tokens_out,
      amount_fils, payment_intent_id, payment_url, paid_at,
      error_code, error_message,
      created_at
    `)
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (loadErr) {
    console.error('[transform-session] load failed:', JSON.stringify(loadErr));
    return res.status(500).json({ ok: false, error: 'Could not load session' });
  }
  if (!session) {
    // 404 covers both "no row" and "wrong owner" — same response so
    // we don't leak the existence of other users' sessions to a
    // probing client.
    return res.status(404).json({ ok: false, error: 'Session not found' });
  }

  // cv_data only ships when the transform actually completed. Mid-flight
  // states get null even if a prior failed run left a stale blob on
  // the row — the contract is "if you see cv_data, it's final."
  const cvData = session.status === 'transformed' ? session.cv_data : null;

  return res.status(200).json({
    ok: true,
    session_id: session.id,
    status: session.status,
    user_plan: session.user_plan,
    intake: session.intake,
    source_kind: session.source_kind,
    source_chars: session.source_chars,
    amount_fils: session.amount_fils,
    payment_url: session.payment_url,
    payment_intent_id: session.payment_intent_id,
    cv_data: cvData,
    model: session.model,
    tokens_in: session.tokens_in,
    tokens_out: session.tokens_out,
    error_code: session.error_code,
    error_message: session.error_message,
    paid_at: session.paid_at,
    created_at: session.created_at,
    next: nextHintFor(session.status),
  });
}
