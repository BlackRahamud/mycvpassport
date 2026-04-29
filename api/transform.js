/**
 * /api/transform?action=upload|update_intake|pay|run|status
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
 * Methods:
 *   - upload | update_intake | pay | run   POST only
 *   - status                                GET or POST (read-only; no-store)
 *
 * Auth:  Authorization: Bearer <user JWT>  (all branches)
 *
 * Body / query (per branch):
 *   - upload         POST { text, intake, source_kind?, source_chars? }
 *   - update_intake  POST { session_id, intake }
 *   - pay            POST { session_id }
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
const TRANSFORM_MAX_TOKENS = 3500;
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

  const intakeResult = validateIntake(body.intake);
  if (!intakeResult.ok) {
    return res.status(400).json({ ok: false, error: intakeResult.reason });
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
  const skipPayment = userPlan === 'pro' || userPlan === 'express';

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
    next: skipPayment ? 'run' : 'pay',
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
  name: '', email: '', phone: '', location: 'Dubai, UAE',
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
You rewrite a candidate's existing CV into a regionally-tuned, ATS-optimised CV in CVPassport's canonical JSON shape.
Output VALID JSON only — no markdown fences, no commentary, no preamble.

HALLUCINATION RULES — NEVER VIOLATE:
- Never invent company names, dates, degrees, or qualifications not in the source.
- Never add certifications (ITIL, PMP, AWS, Six Sigma, Prince2, CFA, etc.) unless they appear verbatim in the source CV.
- Never infer skills not present in the source text.
- Never invent metrics, currency amounts, or percentages.
- If a field is ambiguous or missing, set it to "". Never guess. Omit information rather than fabricate it.`;

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

1. Output ONE JSON object conforming EXACTLY to this canonical shape:
   { name, email, phone, location, title, summary,
     nationality, visaStatus, dob, gender, maritalStatus,
     experience: [...], education: [...],
     skills, languages, certifications: [...],
     technicalSkills, projects, volunteerWork, publications,
     builderExtraSectionIds: [],
     availability, drivingLicense, willingToRelocate, references }
   Use "" for unknown scalar fields. Never null. Never omit a key.

2. experience[i] = { company, role, location, period, points, startDate, endDate, present }.
   - MAXIMUM 5 bullets per role (3–5 ideal).
   - Every bullet starts with a strong action verb (Led, Drove, Delivered, Owned, Built, Reduced,
     Optimised, Launched, Negotiated, Scaled, etc.).
   - Every bullet must read as Action → Result. Surface a metric where the source has one — never
     invent numbers, percentages, or currency amounts.
   - No generic duties repeated across roles. Each role must show its unique contribution.
   - Currency in metrics: use the source's currency. If the source has a number with no currency,
     infer from the role's location: AED for UAE roles, SAR for Saudi Arabia, INR (with Lakhs/Cr
     formatting where natural) for India. Never convert numbers between currencies — that's
     fabrication.
   - Keep each role compact so it fits one PDF block (downstream PDF templates apply
     page-break-inside: avoid on each entry — do not exceed 5 bullets).
   - points = newline-separated bullet sentences, no leading "•" or "-".

3. education[i] = { school, degree, year, fieldOfStudy, startDate, endDate, location }. Source-only.

4. certifications[i] = { name, issuer, year }. SOURCE-ONLY. Never add a certification (ITIL, PMP,
   AWS, Six Sigma, Prince2, CFA, etc.) that is not explicitly named in the source CV.

5. Skills:
   - skills: comma-separated plain-text list. NO bubbles, NO progress bars, NO percentage
     proficiency scores anywhere — output is a flat string.
   - technicalSkills: comma-separated. Group by category when the source supports it
     (e.g. "Frontend: React, Vue, Tailwind | Backend: Node, Python, Postgres").
   - languages: comma-separated.
   - Never infer or add skills not present in the source text.

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

9. Output VALID JSON only. No backticks. No leading text. No commentary.`;
}

function normalizeCvData(raw, intake) {
  const obj = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
  const expArr = Array.isArray(obj.experience) ? obj.experience : [];
  const eduArr = Array.isArray(obj.education) ? obj.education : [];
  const certArr = Array.isArray(obj.certifications) ? obj.certifications : [];

  const merged = { ...EMPTY_RESUME, ...obj };
  merged.experience = expArr.map((e) =>
    ({ ...EMPTY_EXP, ...(e && typeof e === 'object' ? e : {}) })
  );
  merged.education = eduArr.map((e) =>
    ({ ...EMPTY_EDU, ...(e && typeof e === 'object' ? e : {}) })
  );
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

  merged.targetMarket = String(intake?.target_market || '');
  merged.targetCity = String(intake?.target_city || '');
  return merged;
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
  return {
    parsed,
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
    .select('id, user_id, status, intake, raw_extracted_text, cv_data, paid_at')
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
  if (session.status !== 'paid' && session.status !== 'error' && !canReclaimTransforming) {
    return res.status(409).json({ ok: false, error: `Unexpected session status: ${session.status}` });
  }

  const intakeOk = session.intake
    && typeof session.intake === 'object'
    && !Array.isArray(session.intake)
    && Object.keys(session.intake).length > 0;
  if (!session.raw_extracted_text || !intakeOk) {
    const expired = !session.raw_extracted_text
      && (session.status === 'paid' || session.status === 'error' || canReclaimTransforming);
    if (expired) {
      return res.status(410).json({
        ok: false,
        error: 'Session expired. Please upload your CV again.',
        code: 'session_expired',
      });
    }
    return res.status(500).json({ ok: false, error: 'Session is missing source text or intake' });
  }

  const allowedFromStatuses = ['paid', 'error'];
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

  console.log('[transform/run] starting transform', JSON.stringify({
    session_id: sessionId,
    user_id: user.id,
    model: TRANSFORM_MODEL,
    text_chars: session.raw_extracted_text.length,
    intake_keys: Object.keys(session.intake || {}),
  }));

  let parsed;
  let usage;
  try {
    const result = await callClaude({ text: session.raw_extracted_text, intake: session.intake });
    parsed = result.parsed;
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

  const cv_data = normalizeCvData(parsed, session.intake);

  const updateRow = {
    status: 'transformed',
    cv_data,
    model: TRANSFORM_MODEL,
    tokens_in: usage.tokens_in,
    tokens_out: usage.tokens_out,
    error_code: null,
    error_message: null,
  };
  if (!TRANSFORM_RETAIN_RAW) {
    updateRow.raw_extracted_text = null;
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
      warning: 'Transform succeeded but could not be persisted',
    });
  }

  console.log('[transform/run] transform complete', JSON.stringify({
    session_id: sessionId,
    tokens_in: usage.tokens_in,
    tokens_out: usage.tokens_out,
  }));

  return res.status(200).json({
    ok: true,
    session_id: sessionId,
    status: 'transformed',
    cv_data,
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

  // raw_extracted_text is intentionally absent. cv_data is selected
  // but only returned when status='transformed' (the contract: "if you
  // see cv_data, it's final").
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
    .eq('id', sessionId).eq('user_id', user.id).maybeSingle();

  if (loadErr) {
    console.error('[transform/status] load failed:', JSON.stringify(loadErr));
    return res.status(500).json({ ok: false, error: 'Could not load session' });
  }
  if (!session) {
    return res.status(404).json({ ok: false, error: 'Session not found' });
  }

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
        error: 'Missing or unknown action. Use ?action=upload|update_intake|pay|run|status.',
      });
  }
}
