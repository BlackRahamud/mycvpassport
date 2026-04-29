/**
 * POST /api/transform-upload
 *
 * Creates a new Upload & Transform session. The frontend extracts CV
 * text client-side (unpdf for PDF, mammoth for DOCX) and posts the
 * extracted text plus a five-question regional intake here. We snapshot
 * the user's plan onto the session row, hash the source text for
 * dedup/audit, and decide the next step:
 *
 *   - Pro (active_hunter / career_pro) → status='paid' on insert,
 *     frontend proceeds straight to /api/transform-run.
 *   - Express Pass holders → same: status='paid' on insert, straight to
 *     /api/transform-run. Their AED 49 unlock already covers it.
 *   - Free tier → status='created', frontend calls /api/transform-pay
 *     to spin up a Ziina intent; the webhook flips status='paid' once
 *     the payment completes.
 *
 * Auth:  Authorization: Bearer <user JWT>
 * Body:  { text: string,
 *          intake: { target_market, target_city, target_role,
 *                    language_pref, experience_level },
 *          source_kind?: 'pdf' | 'docx',
 *          source_chars?: int }
 *
 * Responses:
 *   200 { ok: true, session_id, status, user_plan, amount_fils, next }
 *       next === 'pay' for free tier; 'run' for pro / express.
 *   400 malformed body, missing/empty intake field, text too short
 *   401 missing or invalid bearer token
 *   500 server / Supabase / unexpected
 *
 * Required env:
 *   - SUPABASE_URL                (or REACT_APP_SUPABASE_URL)
 *   - SUPABASE_ANON_KEY           (or REACT_APP_SUPABASE_ANON_KEY)
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const config = { maxDuration: 15 };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Ziina-native fils. Mirrored in api/create-ziina-payment.js AMOUNTS.TRANSFORM
// and re-checked by /api/transform-pay before the intent is created.
const TRANSFORM_AMOUNT_FILS = 4900;

// Hard floor / ceiling on extracted text. The floor matches the
// "image_pdf" threshold the existing extractor uses (anything shorter
// is almost certainly a scan we couldn't OCR). The ceiling caps
// downstream Claude token spend for pathological exports.
const MIN_TEXT_CHARS = 200;
const MAX_TEXT_CHARS = 30000;

const VALID_SOURCE_KIND = new Set(['pdf', 'docx']);

// Five intake fields, all required, all stored verbatim into
// transform_sessions.intake (jsonb). The transform-run prompt reads
// them by these exact keys — change here = change there.
const REQUIRED_INTAKE_KEYS = [
  'target_market',
  'target_city',
  'target_role',
  'language_pref',
  'experience_level',
];

// Plan snapshot for the session row. The webhook sets is_pro=true on
// every paid plan (express_pass / active_hunter / career_pro), so we
// need profile.plan as the tiebreaker between 'pro' and 'express'.
// Defensive default: any is_pro=true row with an unknown plan still
// classifies as 'pro' so a future plan addition doesn't accidentally
// route paying users back to the paywall.
function classifyUserPlan(profile) {
  if (!profile?.is_pro) return 'free';
  if (profile.plan === 'express_pass') return 'express';
  return 'pro';
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function validateIntake(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, reason: 'intake must be an object' };
  }
  const out = {};
  for (const key of REQUIRED_INTAKE_KEYS) {
    const v = raw[key];
    if (typeof v !== 'string' || !v.trim()) {
      return { ok: false, reason: `intake.${key} required` };
    }
    out[key] = v.trim();
  }
  return { ok: true, intake: out };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

  // ── Body parse + validation ─────────────────────────────────────────
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
  }

  const rawText = typeof body.text === 'string' ? body.text : '';
  if (rawText.trim().length < MIN_TEXT_CHARS) {
    return res.status(400).json({
      ok: false,
      error: `Extracted text is too short (< ${MIN_TEXT_CHARS} chars). Try a different file.`,
    });
  }
  // Hard cap rather than hard reject — an oversized export still
  // produces a useful transform from the first ~30k chars, which
  // covers any sane CV. Keeps Claude token spend bounded.
  const text = rawText.length > MAX_TEXT_CHARS ? rawText.slice(0, MAX_TEXT_CHARS) : rawText;

  const intakeResult = validateIntake(body.intake);
  if (!intakeResult.ok) {
    return res.status(400).json({ ok: false, error: intakeResult.reason });
  }

  const sourceKind = typeof body.source_kind === 'string' && VALID_SOURCE_KIND.has(body.source_kind)
    ? body.source_kind
    : null;
  const sourceCharsRaw = Number(body.source_chars);
  const sourceChars = Number.isFinite(sourceCharsRaw)
    ? Math.max(0, Math.min(MAX_TEXT_CHARS, Math.trunc(sourceCharsRaw)))
    : text.length;

  // ── Plan classification ─────────────────────────────────────────────
  const { data: profile, error: profErr } = await db
    .from('profiles')
    .select('is_pro, plan')
    .eq('id', user.id)
    .maybeSingle();
  if (profErr) {
    console.error('[transform-upload] profile lookup failed:', JSON.stringify(profErr));
    return res.status(500).json({ ok: false, error: 'Could not load profile' });
  }
  const userPlan = classifyUserPlan(profile);
  const skipPayment = userPlan === 'pro' || userPlan === 'express';

  // ── Session insert ──────────────────────────────────────────────────
  // Pro/Express land on 'paid' immediately so /api/transform-run can
  // proceed without a Ziina round-trip. Free tier sits on 'created'
  // until /api/transform-pay creates the intent and the webhook flips
  // status='paid'.
  const nowIso = new Date().toISOString();
  const insertRow = {
    user_id: user.id,
    status: skipPayment ? 'paid' : 'created',
    user_plan: userPlan,
    intake: intakeResult.intake,
    source_kind: sourceKind,
    source_chars: sourceChars,
    source_sha256: sha256(text),
    raw_extracted_text: text,
    amount_fils: skipPayment ? null : TRANSFORM_AMOUNT_FILS,
    paid_at: skipPayment ? nowIso : null,
  };

  const { data: session, error: insertErr } = await db
    .from('transform_sessions')
    .insert(insertRow)
    .select('id, status, user_plan, amount_fils')
    .single();
  if (insertErr) {
    console.error('[transform-upload] session insert failed:', JSON.stringify(insertErr));
    return res.status(500).json({ ok: false, error: 'Could not create session' });
  }

  console.log('[transform-upload] session created', JSON.stringify({
    session_id: session.id,
    user_id: user.id,
    user_plan: session.user_plan,
    status: session.status,
    source_kind: sourceKind,
    source_chars: sourceChars,
  }));

  return res.status(200).json({
    ok: true,
    session_id: session.id,
    status: session.status,
    user_plan: session.user_plan,
    amount_fils: session.amount_fils,
    // Tells the frontend exactly which endpoint to hit next so it doesn't
    // have to re-implement the gate logic.
    next: skipPayment ? 'run' : 'pay',
  });
}
