/**
 * /api/transform?action=upload|update_intake|pay|parse|run|status
 *
 * Single Upload & Transform router. Was four separate functions
 * (transform-upload, transform-pay, transform-run, transform-session/[id])
 * — merged to bring the project under the Vercel Hobby 12-function
 * limit. Each branch is the previous handler's logic moved verbatim,
 * including the security hardening from the pre-commit audit:
 *   - C1 (RLS SELECT-only)         — server-side only; nothing here changes
 *   - H1 (stale-transforming retry) — preserved in the run branch
 *   - M1 (is_null intent guard)     — preserved in the pay branch
 *   - M2 (orphan audit row)         — handled by the webhook, not here
 *   - M3 (raw_extracted_text expiry)— preserved in run + status (cv_data
 *                                     gated, raw text never returned)
 *
 * Two-stage Claude pipeline (research doc sections 4, 7, 8):
 *   parse  — strict source-fidelity extraction of raw OCR text into
 *            canonical resume JSON. Stored in transform_sessions.parsed_cv.
 *   run    — regional rewrite/tailor of parsed_cv (or raw_extracted_text
 *            when parsed_cv is null, for legacy sessions and
 *            backwards compatibility).
 *
 * Methods:
 *   - upload | update_intake | pay | parse | run   POST only
 *   - status                                        GET or POST (read-only; no-store)
 *
 * Auth:  Authorization: Bearer <user JWT>  (all branches)
 *
 * Body / query (per branch):
 *   - upload         POST { text, intake, source_kind?, source_chars? }
 *   - update_intake  POST { session_id, intake }
 *   - pay            POST { session_id }
 *   - parse          POST { session_id }
 *   - run            POST { session_id }
 *   - status         GET  ?action=status&session_id=<uuid>
 *                    POST { action:'status', session_id }
 *
 * Required env (any branch):
 *   - SUPABASE_URL                (or REACT_APP_SUPABASE_URL)
 *   - SUPABASE_ANON_KEY           (or REACT_APP_SUPABASE_ANON_KEY)
 *   - SUPABASE_SERVICE_ROLE_KEY
 * Required env (run only):
 *   - ANTHROPIC_API_KEY
 * Required env (pay only):
 *   - ZIINA_API_TOKEN
 *
 * Optional env:
 *   - TRANSFORM_MODEL              default 'claude-sonnet-4-6'
 *   - TRANSFORM_RETAIN_RAW         default '0' (privacy default; set to
 *                                  '1' to retain raw_extracted_text after
 *                                  a successful transform for eval runs)
 *   - TRANSFORM_SUCCESS_URL_BASE   default 'https://mycvpassport.com'
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const config = { maxDuration: 60 };

// =====================================================================
// Shared config
// =====================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ZIINA_API_TOKEN = process.env.ZIINA_API_TOKEN;

const SUCCESS_URL_BASE = process.env.TRANSFORM_SUCCESS_URL_BASE || 'https://mycvpassport.com';

// Mirrored values — must agree across upload/pay branches and the
// AMOUNTS map in api/create-ziina-payment.js.
const TRANSFORM_AMOUNT_FILS = 4900;
const MIN_TEXT_CHARS = 200;
const MAX_TEXT_CHARS = 30000;
const VALID_SOURCE_KIND = new Set(['pdf', 'docx']);
const REQUIRED_INTAKE_KEYS = [
  'target_market',
  'target_city',
  'target_role',
  'language_pref',
  'experience_level',
];

const TRANSFORM_MODEL = process.env.TRANSFORM_MODEL || 'claude-sonnet-4-6';
// Import-only mode (mode=import-only on upload + parse) uses a cheaper,
// faster model with a Sonnet fallback on transient failures. Parse is
// pure structured extraction — Haiku is sufficient for the happy path.
const IMPORT_PARSE_MODEL_PRIMARY = process.env.IMPORT_PARSE_MODEL_PRIMARY || 'claude-haiku-4-5';
const IMPORT_PARSE_MODEL_FALLBACK = process.env.IMPORT_PARSE_MODEL_FALLBACK || 'claude-sonnet-4-5';
// Bumped from 3500 to 6000 when run started emitting { cv, analysis } in
// one response. Worst-case payload (long CV rewrite + 10 suggestions +
// scorecard + strengths) lands around 4-5k tokens; 6000 gives margin so
// truncation never produces a half-parsed JSON.
const TRANSFORM_MAX_TOKENS = 6000;
const TRANSFORM_RETAIN_RAW = (process.env.TRANSFORM_RETAIN_RAW || '0') === '1';
const TRANSFORM_STALE_MS = 5 * 60 * 1000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// =====================================================================
// Shared helpers
// =====================================================================

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

// Handles the auth + service-role clients each branch needs. Returns
// null and writes the 401/500 response if auth fails — caller just
// `if (!ctx) return;`.
async function requireAuthAndDb(req, res) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).json({ ok: false, error: 'Server not configured: Supabase env missing' });
    return null;
  }
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return null;
  }
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user } = {}, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !user) {
    res.status(401).json({ ok: false, error: 'Invalid session' });
    return null;
  }
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { user, db };
}

// =====================================================================
// Branch 1 — upload (was api/transform-upload.js)
// =====================================================================

async function handleUpload(req, res, body) {
  const ctx = await requireAuthAndDb(req, res);
  if (!ctx) return;
  const { user, db } = ctx;

  const rawText = typeof body.text === 'string' ? body.text : '';
  if (rawText.trim().length < MIN_TEXT_CHARS) {
    return res.status(400).json({
      ok: false,
      error: `Extracted text is too short (< ${MIN_TEXT_CHARS} chars). Try a different file.`,
    });
  }
  const text = rawText.length > MAX_TEXT_CHARS ? rawText.slice(0, MAX_TEXT_CHARS) : rawText;

  // Import-only mode: parse the user's CV into the canonical builder shape
  // and write directly to cv_data. Skips payment, skips regional tailoring,
  // skips the run stage. Intake is synthetic — never goes to run.
  const importMode = body.mode === 'import-only';

  let intakeForRow;
  if (importMode) {
    intakeForRow = { import_mode: true };
  } else {
    const intakeResult = validateIntake(body.intake);
    if (!intakeResult.ok) {
      return res.status(400).json({ ok: false, error: intakeResult.reason });
    }
    intakeForRow = intakeResult.intake;
  }

  const sourceKind = typeof body.source_kind === 'string' && VALID_SOURCE_KIND.has(body.source_kind)
    ? body.source_kind : null;
  const sourceCharsRaw = Number(body.source_chars);
  const sourceChars = Number.isFinite(sourceCharsRaw)
    ? Math.max(0, Math.min(MAX_TEXT_CHARS, Math.trunc(sourceCharsRaw)))
    : text.length;

  const { data: profile, error: profErr } = await db
    .from('profiles').select('is_pro, plan').eq('id', user.id).maybeSingle();
  if (profErr) {
    console.error('[transform/upload] profile lookup failed:', JSON.stringify(profErr));
    return res.status(500).json({ ok: false, error: 'Could not load profile' });
  }
  const userPlan = classifyUserPlan(profile);
  // Import mode bypasses payment unconditionally — Haiku is cheap, the
  // paywall on transform/run still gates the regional rewrite product.
  const skipPayment = importMode || userPlan === 'pro' || userPlan === 'express';

  const nowIso = new Date().toISOString();
  const insertRow = {
    user_id: user.id,
    status: skipPayment ? 'paid' : 'created',
    user_plan: userPlan,
    intake: intakeForRow,
    source_kind: sourceKind,
    source_chars: sourceChars,
    source_sha256: sha256(text),
    raw_extracted_text: text,
    amount_fils: skipPayment ? null : TRANSFORM_AMOUNT_FILS,
    paid_at: skipPayment ? nowIso : null,
  };

  const { data: session, error: insertErr } = await db
    .from('transform_sessions').insert(insertRow)
    .select('id, status, user_plan, amount_fils').single();
  if (insertErr) {
    console.error('[transform/upload] session insert failed:', JSON.stringify(insertErr));
    return res.status(500).json({ ok: false, error: 'Could not create session' });
  }

  console.log('[transform/upload] session created', JSON.stringify({
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
    next: importMode ? 'parse' : (skipPayment ? 'run' : 'pay'),
  });
}

// =====================================================================
// Branch 1b — update_intake (refine intake post-upload)
//
// Landing-page upload sends placeholder intake (DEFAULT_INTAKE in
// UploadTransformSection.jsx) so the friction-free CTA never asks 5
// questions inline. The /transform page then collects the real answers
// and PATCHes them in here before run kicks Claude. RLS on
// transform_sessions is SELECT-only by design (010_transform_sessions.sql)
// — every write must be service-role-keyed and gated, exactly like the
// other branches.
//
// We gate to pre-run statuses (created / awaiting_payment / paid). Once a
// session is transforming or transformed, the intake is locked. We MERGE
// the new intake with whatever's already in the row so required keys
// (target_city, language_pref) inherited from upload defaults can't be
// dropped by a partial PATCH from the /transform page form.
// =====================================================================

async function handleUpdateIntake(req, res, body) {
  const ctx = await requireAuthAndDb(req, res);
  if (!ctx) return;
  const { user, db } = ctx;

  const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : '';
  if (!sessionId || !UUID_RE.test(sessionId)) {
    return res.status(400).json({ ok: false, error: 'session_id (uuid) required' });
  }
  if (!body.intake || typeof body.intake !== 'object' || Array.isArray(body.intake)) {
    return res.status(400).json({ ok: false, error: 'intake must be an object' });
  }

  const { data: session, error: loadErr } = await db
    .from('transform_sessions')
    .select('id, user_id, status, intake')
    .eq('id', sessionId).eq('user_id', user.id).maybeSingle();
  if (loadErr) {
    console.error('[transform/update_intake] load failed:', JSON.stringify(loadErr));
    return res.status(500).json({ ok: false, error: 'Could not load session' });
  }
  if (!session) {
    return res.status(404).json({ ok: false, error: 'Session not found' });
  }
  const ALLOWED_FROM = ['created', 'awaiting_payment', 'paid'];
  if (!ALLOWED_FROM.includes(session.status)) {
    return res.status(409).json({
      ok: false,
      error: `Intake is locked once a session reaches ${session.status}.`,
    });
  }

  const existing = (session.intake && typeof session.intake === 'object' && !Array.isArray(session.intake))
    ? session.intake : {};
  const merged = { ...existing };
  for (const [k, v] of Object.entries(body.intake)) {
    if (typeof v === 'string' && v.trim()) merged[k] = v.trim();
  }
  const validation = validateIntake(merged);
  if (!validation.ok) {
    return res.status(400).json({ ok: false, error: validation.reason });
  }

  const { error: upErr } = await db
    .from('transform_sessions')
    .update({ intake: merged })
    .eq('id', sessionId).eq('user_id', user.id)
    .in('status', ALLOWED_FROM);
  if (upErr) {
    console.error('[transform/update_intake] update failed:', JSON.stringify(upErr));
    return res.status(500).json({ ok: false, error: 'Could not update intake' });
  }

  console.log('[transform/update_intake] intake refined', JSON.stringify({
    session_id: sessionId,
    user_id: user.id,
    keys: Object.keys(merged),
  }));

  return res.status(200).json({ ok: true, session_id: sessionId, intake: merged });
}

// =====================================================================
// Branch 2 — pay (was api/transform-pay.js)
// =====================================================================

async function handlePay(req, res, body) {
  if (!ZIINA_API_TOKEN) {
    return res.status(500).json({
      ok: false,
      error: 'Payment provider not configured. Please contact support.',
      action: 'contact_support',
    });
  }
  const ctx = await requireAuthAndDb(req, res);
  if (!ctx) return;
  const { user, db } = ctx;

  const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : '';
  if (!sessionId || !UUID_RE.test(sessionId)) {
    return res.status(400).json({
      ok: false,
      error: 'Missing or malformed session id.',
      action: 'restart',
    });
  }

  // Deliberately omits raw_extracted_text and cv_data — pay endpoint
  // has no business reading either. Excluding them means an accidental
  // log of the loaded row could never leak CV content.
  const { data: session, error: loadErr } = await db
    .from('transform_sessions')
    .select('id, user_id, status, user_plan, payment_intent_id, payment_url, source_kind, source_chars')
    .eq('id', sessionId).eq('user_id', user.id).maybeSingle();
  if (loadErr) {
    console.error('[transform/pay] session load failed:', JSON.stringify(loadErr));
    return res.status(500).json({
      ok: false, error: 'Could not load your session. Please try again.', action: 'retry',
    });
  }
  if (!session) {
    return res.status(404).json({
      ok: false, error: 'Session not found. Please start a new upload.', action: 'restart',
    });
  }

  // Past-the-gate fast path.
  if (session.status !== 'created' && session.status !== 'awaiting_payment') {
    return res.status(200).json({
      ok: true,
      authorized: true,
      session_id: session.id,
      status: session.status,
      user_plan: session.user_plan,
      next: 'run',
    });
  }

  // Re-classify live (the upload-time snapshot may be stale if the
  // user upgraded mid-flow).
  const { data: profile, error: profErr } = await db
    .from('profiles').select('is_pro, plan').eq('id', user.id).maybeSingle();
  if (profErr) {
    console.error('[transform/pay] profile lookup failed:', JSON.stringify(profErr));
    return res.status(500).json({
      ok: false, error: 'Could not check your plan. Please try again.', action: 'retry',
    });
  }
  const liveUserPlan = classifyUserPlan(profile);
  const skipPayment = liveUserPlan === 'pro' || liveUserPlan === 'express';

  if (skipPayment) {
    const nowIso = new Date().toISOString();
    const { error: upErr } = await db
      .from('transform_sessions')
      .update({
        status: 'paid',
        user_plan: liveUserPlan,
        amount_fils: null,
        paid_at: nowIso,
      })
      .eq('id', sessionId).eq('user_id', user.id);
    if (upErr) {
      console.error('[transform/pay] entitled-flip update failed:', JSON.stringify(upErr));
      return res.status(500).json({
        ok: false, error: 'Could not unlock your transform. Please try again.', action: 'retry',
      });
    }
    console.log('[transform/pay] entitled, skipped Ziina', JSON.stringify({
      session_id: sessionId, user_id: user.id, user_plan: liveUserPlan,
    }));
    return res.status(200).json({
      ok: true,
      authorized: true,
      session_id: sessionId,
      status: 'paid',
      user_plan: liveUserPlan,
      next: 'run',
    });
  }

  // Idempotency: if we've already minted an intent for this session
  // and stored the redirect URL, hand back the same URL. Prevents
  // double-charge concerns and gives a stable checkout link across
  // re-clicks.
  if (session.payment_intent_id && session.payment_url) {
    console.log('[transform/pay] returning existing payment intent', JSON.stringify({
      session_id: sessionId,
      user_id: user.id,
      payment_intent_id: session.payment_intent_id,
    }));
    return res.status(200).json({
      ok: true,
      authorized: false,
      session_id: sessionId,
      status: 'awaiting_payment',
      user_plan: 'free',
      amount_fils: TRANSFORM_AMOUNT_FILS,
      payment_url: session.payment_url,
      payment_intent_id: session.payment_intent_id,
      next: 'pay',
    });
  }

  const successUrl = `${SUCCESS_URL_BASE}/transform/success?session_id=${sessionId}`;
  const cancelUrl = `${SUCCESS_URL_BASE}/transform/cancel?session_id=${sessionId}`;

  let ziinaResp;
  try {
    ziinaResp = await fetch('https://api-v2.ziina.com/api/payment_intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZIINA_API_TOKEN}`,
      },
      body: JSON.stringify({
        amount: TRANSFORM_AMOUNT_FILS,
        currency_code: 'AED',
        message: 'CVPassport — Upload & Transform',
        success_url: successUrl,
        cancel_url: cancelUrl,
        external_reference: `transform:${sessionId}`,
        test: false,
      }),
    });
  } catch (e) {
    console.error('[transform/pay] Ziina fetch threw', JSON.stringify({
      session_id: sessionId,
      user_id: user.id,
      source_kind: session.source_kind,
      source_chars: session.source_chars,
      message: String(e?.message || e).slice(0, 300),
    }));
    return res.status(502).json({
      ok: false,
      error: 'Payment provider unreachable. Please try again in a moment.',
      action: 'retry',
    });
  }

  if (!ziinaResp.ok) {
    const errText = await ziinaResp.text().catch(() => '');
    console.error('[transform/pay] Ziina create failed', JSON.stringify({
      session_id: sessionId,
      user_id: user.id,
      source_kind: session.source_kind,
      source_chars: session.source_chars,
      status: ziinaResp.status,
      body: errText.slice(0, 300),
    }));
    return res.status(502).json({
      ok: false, error: 'Could not initialise payment. Please try again.', action: 'retry',
    });
  }

  let ziinaData;
  try {
    ziinaData = await ziinaResp.json();
  } catch (e) {
    console.error('[transform/pay] Ziina JSON parse failed:', e?.message || e);
    return res.status(502).json({
      ok: false,
      error: 'Payment provider returned an unexpected response. Please try again.',
      action: 'retry',
    });
  }

  const paymentUrl = ziinaData?.redirect_url;
  const paymentIntentId = ziinaData?.id;
  if (!paymentUrl || !paymentIntentId) {
    console.error('[transform/pay] Ziina missing redirect_url or id', JSON.stringify({
      session_id: sessionId,
      has_url: !!paymentUrl,
      has_id: !!paymentIntentId,
    }));
    return res.status(502).json({
      ok: false,
      error: 'Payment provider did not return a checkout link. Please try again.',
      action: 'retry',
    });
  }

  // M1 fix preserved — concurrent-intent guard via .is(payment_intent_id, null).
  // If a parallel pay call has already stored an intent, our UPDATE
  // matches 0 rows and we hand back THAT call's URL instead of ours.
  // Our orphaned intent is never given to a user; Ziina expires it.
  const { data: locked, error: upErr } = await db
    .from('transform_sessions')
    .update({
      status: 'awaiting_payment',
      payment_intent_id: paymentIntentId,
      payment_url: paymentUrl,
    })
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .is('payment_intent_id', null)
    .select('id')
    .maybeSingle();

  if (upErr) {
    console.error('[transform/pay] session update after intent failed', JSON.stringify({
      session_id: sessionId,
      payment_intent_id: paymentIntentId,
      error: upErr.message,
    }));
    return res.status(200).json({
      ok: true,
      authorized: false,
      session_id: sessionId,
      status: 'awaiting_payment',
      user_plan: 'free',
      amount_fils: TRANSFORM_AMOUNT_FILS,
      payment_url: paymentUrl,
      payment_intent_id: paymentIntentId,
      next: 'pay',
      warning: 'Session not updated; webhook will reconcile on payment.',
    });
  }

  if (!locked) {
    const { data: existing } = await db
      .from('transform_sessions')
      .select('payment_intent_id, payment_url')
      .eq('id', sessionId).eq('user_id', user.id).maybeSingle();
    if (existing?.payment_intent_id && existing?.payment_url) {
      console.log('[transform/pay] concurrent winner — returning their intent', JSON.stringify({
        session_id: sessionId,
        winner_intent_id: existing.payment_intent_id,
        abandoned_intent_id: paymentIntentId,
      }));
      return res.status(200).json({
        ok: true,
        authorized: false,
        session_id: sessionId,
        status: 'awaiting_payment',
        user_plan: 'free',
        amount_fils: TRANSFORM_AMOUNT_FILS,
        payment_url: existing.payment_url,
        payment_intent_id: existing.payment_intent_id,
        next: 'pay',
      });
    }
    console.error('[transform/pay] post-intent UPDATE matched no row and refetch is empty', JSON.stringify({
      session_id: sessionId,
      payment_intent_id: paymentIntentId,
    }));
    return res.status(500).json({
      ok: false,
      error: 'Could not finalise payment setup. Please try again.',
      action: 'retry',
    });
  }

  console.log('[transform/pay] Ziina intent created', JSON.stringify({
    session_id: sessionId,
    user_id: user.id,
    payment_intent_id: paymentIntentId,
  }));

  return res.status(200).json({
    ok: true,
    authorized: false,
    session_id: sessionId,
    status: 'awaiting_payment',
    user_plan: 'free',
    amount_fils: TRANSFORM_AMOUNT_FILS,
    payment_url: paymentUrl,
    payment_intent_id: paymentIntentId,
    next: 'pay',
  });
}

// =====================================================================
// Branch 3 — run (was api/transform-run.js)
// =====================================================================

// Canonical Builder shape — mirrored from src/cvShared.js EMPTY_RESUME /
// EMPTY_EXP / EMPTY_EDU. Inlined here so api/ stays self-contained.
// If cvShared.js changes, update these too.
const EMPTY_RESUME = {
  name: '', email: '', phone: '', linkedin: '', location: 'Dubai, UAE',
  title: '', summary: '',
  nationality: '', visaStatus: '', dob: '', gender: '', maritalStatus: '',
  experience: [],
  education: [],
  skills: '',
  languages: 'English, Hindi',
  certifications: [],
  technicalSkills: '',
  projects: '',
  volunteerWork: '',
  publications: '',
  builderExtraSectionIds: [],
  customFields: [],
  availability: 'Immediately Available',
  drivingLicense: '',
  willingToRelocate: 'Yes',
  references: 'References available upon request',
};
const EMPTY_EXP = {
  company: '', role: '', location: '', period: '',
  points: '', startDate: '', endDate: '', present: false,
};
const EMPTY_EDU = {
  school: '', degree: '', year: '', fieldOfStudy: '',
  startDate: '', endDate: '', location: '',
};

const SYSTEM_PROMPT = `You are an expert CV writer specialising in the UAE/GCC and Indian job markets.
You rewrite a candidate's existing CV into a regionally-tuned, ATS-optimised CV in CVPassport's canonical JSON shape, AND produce a structured analysis of the ORIGINAL CV (before rewrite).
Output is rendered on A4 page (794px wide, 1123px per page). Keep content density appropriate for A4.
Output VALID JSON only - one object with two top-level keys: "cv" and "analysis". No markdown fences, no commentary, no preamble.

FORMATTING RULES - NEVER VIOLATE:
1. No emdashes or endashes. Use hyphens, commas, or semicolons instead.
2. No curly/smart quotes. Straight quotes only.
3. No ellipsis character. Use three periods instead.
4. ASCII punctuation only throughout all output.
5. No markdown. All description fields are plain text or HTML only.

HALLUCINATION RULES - NEVER VIOLATE:
1. Never invent company names, dates, or degrees not in the original CV.
2. Never add certifications not explicitly stated.
3. Never infer skills not present in original CV text.
4. If a required field is missing from intake: omit it, never guess.
5. If data is ambiguous: use what is there, do not normalize or improve it.
6. Output is rendered on A4 page (794px wide). Keep content density appropriate.

ANALYSIS RULES - NEVER VIOLATE:
1. The analysis object scores the ORIGINAL CV (the source text) before rewrite, not the rewrite itself.
2. overallScore: integer 0-100. Be honest. Do not inflate. A weak CV scores low.
3. scorecard: 4-6 dimensions drawn from {Clarity, Impact & Quantification, ATS Compatibility, Structure & Completeness, Regional Fit, Language Quality}. Each rationale is one sentence, evidence-based on the original CV's actual content.
4. suggestions: maximum 10. Order by impact (high first, then medium, then low). Each suggestion is actionable and specific to the candidate's CV, not generic advice.
5. strengths: maximum 5. What the original CV already does well.
6. Never invent facts in the analysis. Quote or paraphrase only what the original CV states.
7. If data is missing in the original CV, call it out explicitly in suggestions rather than fabricating coverage.`;

function buildUserPrompt({ text, intake }) {
  return `SOURCE CV TEXT (raw extracted, may be noisy):
<<<
${text}
>>>

REGIONAL INTAKE:
- Target market:    ${intake.target_market}
- Target city:      ${intake.target_city}
- Target role:      ${intake.target_role}
- Experience level: ${intake.experience_level}
- Language pref:    ${intake.language_pref}
- Visa status:      ${intake.visa_status || '(not provided)'}
- Driving license:  ${intake.driving_license || '(not provided)'}
- Target industry:  ${intake.target_industry || '(not provided)'}

DIRECTIVES (apply ALL):

1. Output ONE JSON object with EXACTLY two top-level keys: "cv" and "analysis".

   "cv" is the rewritten resume conforming EXACTLY to this canonical shape:
   { name, email, phone, location, title, summary,
     nationality, visaStatus, dob, gender, maritalStatus,
     experience: [...], education: [...],
     skills, languages, certifications: [...],
     technicalSkills, projects, volunteerWork, publications,
     builderExtraSectionIds: [],
     customFields: [...],
     availability, drivingLicense, willingToRelocate, references }
   Inside "cv": use "" for unknown scalar fields. Never null. Never omit a key.

   "analysis" is the structured analysis object specified in directive 10.
   Inside "analysis": use null where specified (e.g. exampleRewrite when not applicable).
   Never inflate scores. Never fabricate facts. Score the ORIGINAL CV, not the rewrite.

2. experience[i] = { company, role, location, period, points, startDate, endDate, present }.
   - MAXIMUM 5 bullets per role. No exceptions (3-5 ideal).
   - Every bullet must start with a strong action verb (Led, Drove, Delivered, Owned, Built,
     Reduced, Optimised, Launched, Negotiated, Scaled, etc.).
   - Every bullet must read as Action -> Result. Include metrics where they exist in the original
     CV. Never fabricate numbers, percentages, or currency amounts.
   - Do not repeat generic duties across roles. Each role must show its unique contribution.
   - Currency: AED for UAE roles, SAR for Saudi Arabia, INR (with Lakhs/Cr formatting where
     natural) for India. Use the source's currency where stated; otherwise infer from the role's
     location. Never convert between currencies (that is fabrication).
   - period: keep date ranges on a single string (e.g. "Oct 2025 - Present"). Do not split or
     reformat the date string - it must render on one line.
   - Keep each role compact so it fits one PDF block (downstream PDF templates apply
     page-break-inside: avoid on each entry - do not exceed 5 bullets).
   - points = newline-separated bullet sentences, no leading bullets or dashes.

3. education[i] = { school, degree, year, fieldOfStudy, startDate, endDate, location }. Source-only.

4. certifications[i] = { name, issuer, year }. SOURCE-ONLY. Never add a certification (ITIL, PMP,
   AWS, Six Sigma, Prince2, CFA, etc.) that is not explicitly named in the source CV.

5. Skills:
   - skills: comma-separated plain-text list of 6-10 skill items maximum. Curate, do not dump.
     NO bubbles, NO progress bars, NO percentage proficiency scores. Output is a flat string.
   - technicalSkills: comma-separated. Group by category when the source supports it
     (e.g. "Frontend: React, Vue, Tailwind | Backend: Node, Python, Postgres").
   - languages: comma-separated.
   - Never infer or add skills not present in the source text.
   - Never add certifications (ITIL, PMP, AWS, Six Sigma, Prince2, CFA, etc.) unless they appear
     verbatim in the original CV.

6. summary = 3–4 sentences, regionally tuned:
   - 'UAE' or 'GCC': lead with target role + years of experience, then visa status + notice period,
     then target city. Recruiters in UAE/GCC filter on visa + notice period FIRST — make these
     unmissable. Mention driving license only if relevant to the target role (sales, field ops,
     logistics, healthcare).
   - 'India': formal Indian corporate tone. Skip Gulf-specific status fields.

7. Status row prominence (top of CV, never buried):
   - 'UAE' / 'GCC': make visa, notice period, and driving license front-and-centre.
       * visaStatus: copy intake.visa_status verbatim if provided; else use the source if present;
         else "". (intake.visa_status may already include notice period — preserve verbatim.)
       * drivingLicense: copy intake.driving_license verbatim if provided; else the source; else "".
       * nationality, dob, gender, maritalStatus: from source only. Otherwise "".
   - 'India': leave Gulf-only fields as "" unless the source already includes them.

8. NEVER fabricate. If a field can't be inferred from the source, set "". Omit rather than guess.
   No invented certifications. No inferred skills. No guessed dates. No placeholder companies.
   No fabricated metrics or currency conversions.

9. customFields[]: structured regional metadata array. Each entry: { id, icon, name, value }.
   Populate when source data is available. Keep the existing flat fields (visaStatus,
   drivingLicense) populated as well - customFields[] is additive, not a replacement.
   - { id: "visa_status",      icon: "shield", name: "Visa Status",      value }
       Use intake.visa_status verbatim if provided; else the source. intake.visa_status may
       bundle notice period in the same string - split into a separate notice_period entry
       if cleanly separable, otherwise keep the combined value here.
   - { id: "notice_period",    icon: "clock",  name: "Notice Period",    value }
       From intake.visa_status when it cleanly contains a notice period; else from source.
   - { id: "driving_license",  icon: "car",    name: "Driving License",  value }
       Use intake.driving_license verbatim if provided; else the source.
   - { id: "nafis_registered", icon: "check",  name: "Nafis Registered", value: "Yes" }
       Only when explicitly stated in the source CV. Never infer.
   Omit entries with no value. customFields = [] if no regional data is present.

10. analysis object - score the ORIGINAL CV (the source text), NOT the rewrite. Shape:
    {
      "overallScore": 0-100 integer,
      "scorecard": [
        { "dimension": "...", "score": 0-100 integer, "rationale": "one sentence" }
      ],
      "suggestions": [
        {
          "title": "short clear label",
          "impact": "high" | "medium" | "low",
          "why": "one sentence on why this matters for ATS or recruiter scan",
          "exampleRewrite": "actual before/after string" | null,
          "copyPrompt": "ready-to-use prompt the user can paste into another LLM"
        }
      ],
      "strengths": ["string", "string"]
    }
    - overallScore: honest assessment of the original CV. A weak source scores low.
    - scorecard: 4-6 dimensions from {Clarity, Impact & Quantification, ATS Compatibility,
      Structure & Completeness, Regional Fit, Language Quality}. Rationales evidence-based.
    - suggestions: maximum 10, sorted by impact descending. exampleRewrite is the actual
      before/after content when applicable; null when the suggestion is structural advice.
      copyPrompt is one paste-ready prompt the user can fire at any LLM to fix that specific
      section (e.g. "Rewrite my experience bullets to emphasize measurable outcomes...").
    - strengths: maximum 5, specific to this candidate's CV. No generic praise.
    - Never invent achievements, certifications, or metrics in the analysis.

11. Output VALID JSON only. No backticks. No leading text. No commentary.`;
}

// Defensive coercion mirrored from src/cvShared.js. Templates assume
// scalar fields are strings; Haiku occasionally returns arrays or nulls,
// which crash render (e.g. `cv.skills.split` in Template1ModernEmerald).
function toStrField(v, joinWith = ', ') {
  if (typeof v === 'string') return v;
  if (v == null) return '';
  if (Array.isArray(v)) return v.filter((x) => x != null && x !== '').map((x) => String(x)).join(joinWith);
  return String(v);
}

const RESUME_STRING_FIELDS = [
  'name', 'email', 'phone', 'linkedin', 'location', 'title', 'summary',
  'nationality', 'visaStatus', 'dob', 'gender', 'maritalStatus',
  'skills', 'languages', 'technicalSkills',
  'projects', 'volunteerWork', 'publications',
  'availability', 'drivingLicense', 'willingToRelocate', 'references',
];
const EXP_STRING_FIELDS = ['company', 'role', 'location', 'period', 'startDate', 'endDate'];
const EDU_STRING_FIELDS = ['school', 'degree', 'year', 'fieldOfStudy', 'startDate', 'endDate', 'location'];

function normalizeCvData(raw, intake) {
  const obj = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
  const expArr = Array.isArray(obj.experience) ? obj.experience : [];
  const eduArr = Array.isArray(obj.education) ? obj.education : [];
  const certArr = Array.isArray(obj.certifications) ? obj.certifications : [];

  const merged = { ...EMPTY_RESUME, ...obj };
  merged.experience = expArr.map((e) => {
    const base = { ...EMPTY_EXP, ...(e && typeof e === 'object' ? e : {}) };
    for (const k of EXP_STRING_FIELDS) base[k] = toStrField(base[k]);
    base.points = toStrField(base.points, '\n');
    base.present = Boolean(base.present);
    return base;
  });
  merged.education = eduArr.map((e) => {
    const base = { ...EMPTY_EDU, ...(e && typeof e === 'object' ? e : {}) };
    for (const k of EDU_STRING_FIELDS) base[k] = toStrField(base[k]);
    return base;
  });
  for (const k of RESUME_STRING_FIELDS) merged[k] = toStrField(merged[k]);
  merged.certifications = certArr
    .map((c) => {
      if (typeof c === 'string') {
        const n = c.trim();
        return n ? { name: n, issuer: '', year: '' } : null;
      }
      if (!c || typeof c !== 'object') return null;
      const name = String(c.name || '').trim();
      if (!name) return null;
      return {
        name,
        issuer: String(c.issuer || '').trim(),
        year: String(c.year || '').trim(),
      };
    })
    .filter(Boolean);
  merged.builderExtraSectionIds = Array.isArray(obj.builderExtraSectionIds)
    ? obj.builderExtraSectionIds : [];

  // customFields[] - generic regional-fields escape hatch. Mirrors
  // src/cvShared.js normalizeCustomFieldsArray; inlined here so api/
  // stays self-contained (matches the existing comment on EMPTY_RESUME).
  const cfArr = Array.isArray(obj.customFields) ? obj.customFields : [];
  merged.customFields = cfArr
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const name = String(item.name || '').trim();
      const value = String(item.value || '').trim();
      if (!name || !value) return null;
      const id = String(item.id || '').trim() || null;
      const icon = item.icon == null ? null : (String(item.icon).trim() || null);
      const link = item.link == null ? null : (String(item.link).trim() || null);
      return { id, icon, name, value, link };
    })
    .filter(Boolean);

  merged.targetMarket = String(intake?.target_market || '');
  merged.targetCity = String(intake?.target_city || '');
  return merged;
}

// Coerces Claude's analysis block into a stable shape for storage and
// frontend rendering (research doc sections 2, 10). Anything malformed
// is dropped rather than rejected - the contract is "if you see analysis,
// each field is well-typed". Returns null when the input is unusable; a
// null analysis must never fail the whole transform.
const VALID_IMPACTS = new Set(['high', 'medium', 'low']);
const MAX_SUGGESTIONS = 10;
const MAX_STRENGTHS = 5;
const MAX_SCORECARD = 6;

function clampScore(n) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

function normalizeAnalysis(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const overallScore = clampScore(raw.overallScore);

  const scorecard = (Array.isArray(raw.scorecard) ? raw.scorecard : [])
    .slice(0, MAX_SCORECARD)
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const dimension = String(item.dimension || '').trim();
      if (!dimension) return null;
      return {
        dimension,
        score: clampScore(item.score),
        rationale: String(item.rationale || '').trim(),
      };
    })
    .filter(Boolean);

  const suggestions = (Array.isArray(raw.suggestions) ? raw.suggestions : [])
    .slice(0, MAX_SUGGESTIONS)
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const title = String(item.title || '').trim();
      if (!title) return null;
      const impact = VALID_IMPACTS.has(item.impact) ? item.impact : 'low';
      const why = String(item.why || '').trim();
      const rawExample = item.exampleRewrite;
      const exampleRewrite = (rawExample == null) ? null
        : (String(rawExample).trim() || null);
      const copyPrompt = String(item.copyPrompt || '').trim();
      return { title, impact, why, exampleRewrite, copyPrompt };
    })
    .filter(Boolean);

  const strengths = (Array.isArray(raw.strengths) ? raw.strengths : [])
    .slice(0, MAX_STRENGTHS)
    .map((s) => String(s || '').trim())
    .filter(Boolean);

  return { overallScore, scorecard, suggestions, strengths };
}

async function callClaude({ text, intake }) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: TRANSFORM_MODEL,
      max_tokens: TRANSFORM_MAX_TOKENS,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt({ text, intake }) }],
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    const err = new Error(`Anthropic ${r.status}: ${t.slice(0, 300)}`);
    err.code = 'claude_http_' + r.status;
    throw err;
  }
  const data = await r.json();
  const raw = (Array.isArray(data.content) && data.content[0]?.text) || '';
  const cleaned = String(raw).replace(/```json|```/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    const err = new Error(`JSON parse failed: ${e.message}`);
    err.code = 'json_parse_failed';
    throw err;
  }
  // Run output is { cv, analysis }. Legacy fallback: a bare resume object
  // (pre-Session-3 prompt) is treated as cv with no analysis. The analysis
  // block is best-effort: if Claude omits it, we surface null and never
  // fail the whole transform on its account.
  let cv;
  let analysis = null;
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      && parsed.cv && typeof parsed.cv === 'object' && !Array.isArray(parsed.cv)) {
    cv = parsed.cv;
    if (parsed.analysis && typeof parsed.analysis === 'object' && !Array.isArray(parsed.analysis)) {
      analysis = parsed.analysis;
    }
  } else {
    cv = parsed;
  }
  return {
    cv,
    analysis,
    usage: {
      tokens_in: data?.usage?.input_tokens ?? null,
      tokens_out: data?.usage?.output_tokens ?? null,
    },
  };
}

async function handleRun(req, res, body) {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ ok: false, error: 'Server not configured: ANTHROPIC_API_KEY missing' });
  }
  const ctx = await requireAuthAndDb(req, res);
  if (!ctx) return;
  const { user, db } = ctx;

  const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : '';
  if (!sessionId || !UUID_RE.test(sessionId)) {
    return res.status(400).json({ ok: false, error: 'session_id (uuid) required' });
  }

  const { data: session, error: loadErr } = await db
    .from('transform_sessions')
    .select('id, user_id, status, intake, raw_extracted_text, parsed_cv, cv_data, analysis, paid_at')
    .eq('id', sessionId).eq('user_id', user.id).maybeSingle();
  if (loadErr) {
    console.error('[transform/run] session load failed:', JSON.stringify(loadErr));
    return res.status(500).json({ ok: false, error: 'Could not load session' });
  }
  if (!session) {
    return res.status(404).json({ ok: false, error: 'Session not found' });
  }

  if (session.status === 'transformed') {
    return res.status(200).json({
      ok: true,
      session_id: session.id,
      status: 'transformed',
      cv_data: session.cv_data,
      analysis: session.analysis ?? null,
    });
  }

  // H1 fix preserved — stale-lock recovery via paid_at + 5-minute proxy.
  let canReclaimTransforming = false;
  if (session.status === 'transforming') {
    const paidAt = session.paid_at ? new Date(session.paid_at).getTime() : null;
    const isStale = paidAt && (Date.now() - paidAt) > TRANSFORM_STALE_MS;
    if (!isStale) {
      return res.status(409).json({ ok: false, error: 'Transform already in flight' });
    }
    console.warn('[transform/run] reclaiming stale transforming session', JSON.stringify({
      session_id: sessionId,
      paid_at: session.paid_at,
      age_ms: paidAt ? (Date.now() - paidAt) : null,
    }));
    canReclaimTransforming = true;
  }

  if (session.status === 'created' || session.status === 'awaiting_payment') {
    return res.status(402).json({
      ok: false,
      error: 'Session unpaid',
      status: session.status,
    });
  }
  if (session.status !== 'paid' && session.status !== 'parsed' && session.status !== 'error'
      && !canReclaimTransforming) {
    return res.status(409).json({ ok: false, error: `Unexpected session status: ${session.status}` });
  }

  const intakeOk = session.intake
    && typeof session.intake === 'object'
    && !Array.isArray(session.intake)
    && Object.keys(session.intake).length > 0;
  const hasSourceData = !!session.parsed_cv || !!session.raw_extracted_text;
  if (!hasSourceData || !intakeOk) {
    const expired = !hasSourceData
      && (session.status === 'paid' || session.status === 'parsed'
          || session.status === 'error' || canReclaimTransforming);
    if (expired) {
      return res.status(410).json({
        ok: false,
        error: 'Session expired. Please upload your CV again.',
        code: 'session_expired',
      });
    }
    return res.status(500).json({ ok: false, error: 'Session is missing source text or intake' });
  }

  const allowedFromStatuses = ['paid', 'parsed', 'error'];
  if (canReclaimTransforming) allowedFromStatuses.push('transforming');

  const { data: locked, error: lockErr } = await db
    .from('transform_sessions')
    .update({
      status: 'transforming',
      error_code: null,
      error_message: null,
    })
    .eq('id', sessionId).eq('user_id', user.id)
    .in('status', allowedFromStatuses)
    .select('id').maybeSingle();
  if (lockErr) {
    console.error('[transform/run] lock update failed:', JSON.stringify(lockErr));
    return res.status(500).json({ ok: false, error: 'Could not lock session' });
  }
  if (!locked) {
    return res.status(409).json({ ok: false, error: 'Session is no longer ready to run' });
  }

  // Two-stage pipeline: prefer the parse stage's structured output; fall
  // back to raw OCR text for legacy sessions and pre-parse callers.
  const sourceForClaude = session.parsed_cv
    ? JSON.stringify(session.parsed_cv, null, 2)
    : session.raw_extracted_text;
  const sourceMode = session.parsed_cv ? 'parsed_cv' : 'raw_extracted_text';

  console.log('[transform/run] starting transform', JSON.stringify({
    session_id: sessionId,
    user_id: user.id,
    model: TRANSFORM_MODEL,
    source_mode: sourceMode,
    source_chars: sourceForClaude.length,
    intake_keys: Object.keys(session.intake || {}),
  }));

  let cvParsed;
  let analysisParsed;
  let usage;
  try {
    const result = await callClaude({ text: sourceForClaude, intake: session.intake });
    cvParsed = result.cv;
    analysisParsed = result.analysis;
    usage = result.usage;
  } catch (e) {
    const code = e?.code || 'claude_failed';
    const msg = String(e?.message || e).slice(0, 1000);
    console.error('[transform/run] Claude failed:', code, msg);
    await db.from('transform_sessions')
      .update({ status: 'error', error_code: code, error_message: msg })
      .eq('id', sessionId);
    return res.status(502).json({
      ok: false,
      error: 'AI transform unavailable',
      code,
    });
  }

  const cv_data = normalizeCvData(cvParsed, session.intake);

  // Analysis is best-effort. Bad/missing analysis must never fail the
  // transform - the rewrite is the primary product, the analysis panel
  // is value-add. Wrap normalization in try/catch defensively even
  // though normalizeAnalysis itself returns null for unusable input.
  let analysis = null;
  try {
    analysis = normalizeAnalysis(analysisParsed);
  } catch (e) {
    console.warn('[transform/run] analysis normalization failed:', String(e?.message || e).slice(0, 300));
    analysis = null;
  }

  const updateRow = {
    status: 'transformed',
    cv_data,
    analysis,
    model: TRANSFORM_MODEL,
    tokens_in: usage.tokens_in,
    tokens_out: usage.tokens_out,
    error_code: null,
    error_message: null,
  };
  if (!TRANSFORM_RETAIN_RAW) {
    updateRow.raw_extracted_text = null;
    updateRow.parsed_cv = null;
  }

  const { error: saveErr } = await db
    .from('transform_sessions').update(updateRow).eq('id', sessionId);
  if (saveErr) {
    console.error('[transform/run] save failed (cv returned anyway):', JSON.stringify(saveErr));
    return res.status(200).json({
      ok: true,
      session_id: sessionId,
      status: 'transformed',
      cv_data,
      analysis,
      warning: 'Transform succeeded but could not be persisted',
    });
  }

  console.log('[transform/run] transform complete', JSON.stringify({
    session_id: sessionId,
    tokens_in: usage.tokens_in,
    tokens_out: usage.tokens_out,
    analysis_present: analysis !== null,
    suggestion_count: analysis ? analysis.suggestions.length : 0,
  }));

  return res.status(200).json({
    ok: true,
    session_id: sessionId,
    status: 'transformed',
    cv_data,
    analysis,
  });
}

// =====================================================================
// Branch 3b — parse (strict source-fidelity extraction)
//
// Stage 1 of the two-stage Claude pipeline (research doc sections 4, 7,
// 8). Cleans noisy OCR text into the canonical resume JSON shape with
// source-only values and nulls for anything not explicitly stated. The
// run branch then consumes parsed_cv as structured input instead of the
// raw OCR dump, preventing Claude from hallucinating off PDF noise.
//
// Lifecycle: paid -> parsed -> (run) -> transforming -> transformed.
// Backwards-compatible: parse is optional. Sessions without parsed_cv
// fall through to raw_extracted_text in handleRun.
//
// No status lock here. Parse is fast (~5-10s) and idempotent at
// temperature=0; the idempotency check at the top short-circuits a
// second call once parsed_cv is persisted. A user double-click before
// the first response lands could fire two Claude requests; treated as
// acceptable single-user billing risk vs. the extra state machinery a
// 'parsing' lock would require.
// =====================================================================

const PARSE_SYSTEM_PROMPT = `You are a strict resume extraction engine.

CONFLICT RESOLUTION ORDER:
1. Schema validity - must return valid JSON matching our resume shape
2. Source fidelity - exactly what the CV states
3. Omit uncertain values - never guess

HARD CONSTRAINTS:
1. Extract only explicitly stated information
2. Never fabricate, infer, or normalize missing data
3. Keep original wording and original language
4. When uncertain, omit the field entirely - leave null
5. Do not use external knowledge

EXTRACTION RULES:
- Ignore OCR noise, watermarks, repeated headers/footers, broken line wraps
- Dates: preserve exactly as written
- URLs: include only full URLs explicitly present
- Contact data: copy as-is, do not reformat
- Skills: include only explicitly stated skills - never infer
- Descriptions: preserve original bullet structure
- Regional metadata: capture visa status, notice period, driving license, and Nafis
  registration as customFields entries when explicitly present in the CV. Never
  infer Nafis registration. Omit any field with no source value.
- If PDF is low quality or partially unreadable: return best-effort for readable parts only

OUTPUT CONTRACT:
- Return only one raw JSON object
- No markdown, no commentary, no extra keys
- Missing fields return null, never a guessed value`;

function buildParseUserPrompt({ text }) {
  return `RAW EXTRACTED CV TEXT (may contain OCR noise, broken line wraps, watermarks):
<<<
${text}
>>>

Extract into the canonical CVPassport resume shape:
{ name, email, phone, linkedin, location, title, summary,
  nationality, visaStatus, dob, gender, maritalStatus,
  experience: [...], education: [...],
  skills, languages, certifications: [...],
  technicalSkills, projects, volunteerWork, publications,
  customFields: [...],
  availability, drivingLicense, willingToRelocate, references }

experience[i] = { company, role, location, period, points, startDate, endDate, present }
education[i]  = { school, degree, year, fieldOfStudy, startDate, endDate, location }
certifications[i] = { name, issuer, year }
customFields[i] = { id, icon, name, value }

Regional fields - if explicitly stated in the CV, add as customFields entries:
  - visa_status      -> { id: "visa_status",      icon: "shield", name: "Visa Status",       value: "..." }
  - notice_period    -> { id: "notice_period",    icon: "clock",  name: "Notice Period",     value: "..." }
  - driving_license  -> { id: "driving_license",  icon: "car",    name: "Driving License",   value: "..." }
  - nafis_registered -> { id: "nafis_registered", icon: "check",  name: "Nafis Registered",  value: "Yes" }
                        Only include if the CV explicitly states Nafis registration. Never infer.
Omit entries with no source value. customFields = [] if no regional data present.

Rules:
- points = newline-separated bullet sentences as written, no leading bullets or dashes.
- linkedin = full profile URL only (e.g. "https://linkedin.com/in/jane-doe"). Omit short handles or partial URLs.
- Missing scalar fields = null. Empty arrays = [].
- Preserve dates verbatim (do not normalize formats).
- Output ONE JSON object only, no markdown, no commentary.`;
}

async function callClaudeParse({ text, model = TRANSFORM_MODEL }) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: TRANSFORM_MAX_TOKENS,
      temperature: 0,
      system: PARSE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildParseUserPrompt({ text }) }],
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    const err = new Error(`Anthropic ${r.status}: ${t.slice(0, 300)}`);
    err.code = 'claude_http_' + r.status;
    err.status = r.status;
    throw err;
  }
  const data = await r.json();
  const raw = (Array.isArray(data.content) && data.content[0]?.text) || '';
  const cleaned = String(raw).replace(/```json|```/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    const err = new Error(`Parse JSON failed: ${e.message}`);
    err.code = 'parse_json_failed';
    throw err;
  }
  return {
    parsed,
    model,
    usage: {
      tokens_in: data?.usage?.input_tokens ?? null,
      tokens_out: data?.usage?.output_tokens ?? null,
    },
  };
}

// Haiku-primary, Sonnet-fallback cascade for import-only parsing. Falls
// back on HTTP 5xx (incl. 529 overload) or JSON parse failure. Client-side
// (4xx) errors do NOT trigger fallback - those are user-input issues that
// won't fix themselves with a different model.
async function callClaudeParseWithCascade({ text }) {
  const shouldFallback = (err) => {
    if (!err) return false;
    if (err.code === 'parse_json_failed') return true;
    if (typeof err.status === 'number' && err.status >= 500) return true;
    return false;
  };
  try {
    return await callClaudeParse({ text, model: IMPORT_PARSE_MODEL_PRIMARY });
  } catch (primaryErr) {
    if (!shouldFallback(primaryErr)) throw primaryErr;
    console.warn('[transform/parse] primary model failed, falling back', JSON.stringify({
      primary_model: IMPORT_PARSE_MODEL_PRIMARY,
      fallback_model: IMPORT_PARSE_MODEL_FALLBACK,
      code: primaryErr.code,
      status: primaryErr.status ?? null,
    }));
    return callClaudeParse({ text, model: IMPORT_PARSE_MODEL_FALLBACK });
  }
}

async function handleParse(req, res, body) {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ ok: false, error: 'Server not configured: ANTHROPIC_API_KEY missing' });
  }
  const ctx = await requireAuthAndDb(req, res);
  if (!ctx) return;
  const { user, db } = ctx;

  const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : '';
  if (!sessionId || !UUID_RE.test(sessionId)) {
    return res.status(400).json({ ok: false, error: 'session_id (uuid) required' });
  }

  const { data: session, error: loadErr } = await db
    .from('transform_sessions')
    .select('id, user_id, status, intake, raw_extracted_text, parsed_cv, cv_data')
    .eq('id', sessionId).eq('user_id', user.id).maybeSingle();
  if (loadErr) {
    console.error('[transform/parse] session load failed:', JSON.stringify(loadErr));
    return res.status(500).json({ ok: false, error: 'Could not load session' });
  }
  if (!session) {
    return res.status(404).json({ ok: false, error: 'Session not found' });
  }

  const importMode = session.intake?.import_mode === true;

  // Idempotency: parse already complete (or further along the pipeline).
  // Import mode short-circuits to status='transformed' on its first parse,
  // so the relevant idempotency signal is cv_data (not parsed_cv).
  if (importMode) {
    if (session.status === 'transformed' && session.cv_data) {
      return res.status(200).json({
        ok: true,
        session_id: session.id,
        status: 'transformed',
        cv_data: session.cv_data,
        next: 'done',
      });
    }
  } else if ((session.status === 'parsed' || session.status === 'transforming' || session.status === 'transformed')
      && session.parsed_cv) {
    return res.status(200).json({
      ok: true,
      session_id: session.id,
      status: session.status,
      next: nextHintFor(session.status),
    });
  }

  if (session.status === 'created' || session.status === 'awaiting_payment') {
    return res.status(402).json({
      ok: false,
      error: 'Session unpaid',
      status: session.status,
    });
  }

  // 'parsed' without parsed_cv is anomalous (e.g. row state drift) - allow re-parse.
  if (session.status !== 'paid' && session.status !== 'error' && session.status !== 'parsed') {
    return res.status(409).json({ ok: false, error: `Unexpected session status: ${session.status}` });
  }

  if (!session.raw_extracted_text) {
    return res.status(410).json({
      ok: false,
      error: 'Session expired. Please upload your CV again.',
      code: 'session_expired',
    });
  }

  console.log('[transform/parse] starting parse', JSON.stringify({
    session_id: sessionId,
    user_id: user.id,
    mode: importMode ? 'import-only' : 'transform',
    text_chars: session.raw_extracted_text.length,
  }));

  let parsedCv;
  let usage;
  let modelUsed;
  try {
    const result = importMode
      ? await callClaudeParseWithCascade({ text: session.raw_extracted_text })
      : await callClaudeParse({ text: session.raw_extracted_text });
    parsedCv = result.parsed;
    usage = result.usage;
    modelUsed = result.model;
  } catch (e) {
    const code = e?.code || 'parse_failed';
    const msg = String(e?.message || e).slice(0, 1000);
    console.error('[transform/parse] Claude failed:', code, msg);
    await db.from('transform_sessions')
      .update({ status: 'error', error_code: code, error_message: msg })
      .eq('id', sessionId);
    return res.status(502).json({
      ok: false,
      error: 'AI parse unavailable',
      code,
    });
  }

  // Import mode: normalize to canonical builder shape and write straight
  // to cv_data with status='transformed'. No regional rewrite, no analysis,
  // no run stage. The client navigates to /builder with cv_data and the
  // banner renders immediately.
  if (importMode) {
    const cvData = normalizeCvData(parsedCv, null);
    const updateRow = {
      status: 'transformed',
      cv_data: cvData,
      parsed_cv: parsedCv,
      model: modelUsed,
      tokens_in: usage.tokens_in,
      tokens_out: usage.tokens_out,
      error_code: null,
      error_message: null,
    };
    if (!TRANSFORM_RETAIN_RAW) {
      updateRow.raw_extracted_text = null;
    }
    const { error: saveErr } = await db
      .from('transform_sessions')
      .update(updateRow)
      .eq('id', sessionId).eq('user_id', user.id);
    if (saveErr) {
      console.error('[transform/parse] import save failed:', JSON.stringify(saveErr));
      return res.status(500).json({ ok: false, error: 'Could not persist imported CV' });
    }

    console.log('[transform/parse] import complete', JSON.stringify({
      session_id: sessionId,
      model: modelUsed,
      tokens_in: usage.tokens_in,
      tokens_out: usage.tokens_out,
    }));

    return res.status(200).json({
      ok: true,
      session_id: sessionId,
      status: 'transformed',
      cv_data: cvData,
      next: 'done',
    });
  }

  const { error: saveErr } = await db
    .from('transform_sessions')
    .update({
      status: 'parsed',
      parsed_cv: parsedCv,
      error_code: null,
      error_message: null,
    })
    .eq('id', sessionId).eq('user_id', user.id);
  if (saveErr) {
    console.error('[transform/parse] save failed:', JSON.stringify(saveErr));
    return res.status(500).json({ ok: false, error: 'Could not persist parsed CV' });
  }

  console.log('[transform/parse] parse complete', JSON.stringify({
    session_id: sessionId,
    tokens_in: usage.tokens_in,
    tokens_out: usage.tokens_out,
  }));

  return res.status(200).json({
    ok: true,
    session_id: sessionId,
    status: 'parsed',
    next: 'run',
  });
}

// =====================================================================
// Branch 4 — status (was api/transform-session/[id].js)
// =====================================================================

function nextHintFor(status) {
  switch (status) {
    case 'created':           return 'pay';
    case 'awaiting_payment':  return 'wait';
    case 'paid':              return 'run';
    case 'parsed':            return 'run';
    case 'transforming':      return 'wait';
    case 'transformed':       return 'done';
    case 'error':             return 'error';
    default:                  return null;
  }
}

async function handleStatus(req, res, sessionId) {
  if (!sessionId || !UUID_RE.test(sessionId)) {
    return res.status(400).json({ ok: false, error: 'Invalid session id' });
  }
  const ctx = await requireAuthAndDb(req, res);
  if (!ctx) return;
  const { user, db } = ctx;

  // raw_extracted_text is intentionally absent. cv_data and analysis are
  // selected but only returned when status='transformed' (the contract:
  // "if you see cv_data, it's final"; analysis follows the same gate).
  const { data: session, error: loadErr } = await db
    .from('transform_sessions')
    .select(`
      id, user_id, status, user_plan, intake,
      source_kind, source_chars,
      cv_data, analysis, model, tokens_in, tokens_out,
      amount_fils, payment_intent_id, payment_url, paid_at,
      error_code, error_message,
      created_at
    `)
    .eq('id', sessionId).eq('user_id', user.id).maybeSingle();

  if (loadErr) {
    console.error('[transform/status] load failed:', JSON.stringify(loadErr));
    return res.status(500).json({ ok: false, error: 'Could not load session' });
  }
  if (!session) {
    return res.status(404).json({ ok: false, error: 'Session not found' });
  }

  const cvData = session.status === 'transformed' ? session.cv_data : null;
  const analysisData = session.status === 'transformed' ? (session.analysis ?? null) : null;

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
    analysis: analysisData,
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

// =====================================================================
// Router
// =====================================================================

export default async function handler(req, res) {
  // Preflight + method gate. status accepts GET; everything else POST.
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  let body = {};
  if (req.method === 'POST') {
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    } catch {
      return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
    }
  }

  const queryAction = typeof req.query?.action === 'string' ? req.query.action.trim() : '';
  const action = queryAction || (typeof body.action === 'string' ? body.action.trim() : '');

  switch (action) {
    case 'upload':
      if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST required for upload' });
      return handleUpload(req, res, body);

    case 'update_intake':
      if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST required for update_intake' });
      return handleUpdateIntake(req, res, body);

    case 'pay':
      if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST required for pay' });
      return handlePay(req, res, body);

    case 'parse':
      if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST required for parse' });
      return handleParse(req, res, body);

    case 'run':
      if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST required for run' });
      return handleRun(req, res, body);

    case 'status': {
      // Polling endpoint — must never be cached. Set before dispatch
      // so even early-exit paths (404, 401) carry the header.
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      const sid =
        (typeof req.query?.session_id === 'string' && req.query.session_id.trim()) ||
        (typeof body.session_id === 'string' && body.session_id.trim()) ||
        '';
      return handleStatus(req, res, sid);
    }

    default:
      return res.status(400).json({
        ok: false,
        error: 'Missing or unknown action. Use ?action=upload|update_intake|pay|parse|run|status.',
      });
  }
}
