/**
 * POST /api/transform-pay
 *
 * The payment gate for Upload & Transform. Loads the session, re-checks
 * the user's plan against the live profile (the upload-time snapshot
 * may be stale if the user upgraded mid-flow), and either:
 *
 *   - Flips the session straight to 'paid' for Pro / Express Pass
 *     holders and returns { authorized: true, next: 'run' }.
 *   - Creates a Ziina intent for AED 49 (4900 fils) for Free tier and
 *     returns { authorized: false, next: 'pay', payment_url, ... }.
 *     The webhook (api/ziina-webhook.js) flips status='paid' once
 *     payment completes.
 *
 * Idempotency: if the session already has payment_intent_id +
 * payment_url, we return the existing URL instead of creating a second
 * intent. Re-clicks during checkout never produce a fresh charge link.
 *
 * Privacy: this endpoint never reads raw_extracted_text or cv_data
 * from the session. Error logs carry session metadata only — no CV
 * content is logged or returned, ever.
 *
 * Auth:  Authorization: Bearer <user JWT>
 * Body:  { session_id: uuid }
 *
 * Responses:
 *   200 (authorized)
 *     { ok: true, authorized: true, session_id, status, user_plan,
 *       next: 'run' }
 *   200 (payment required)
 *     { ok: true, authorized: false, session_id, status, user_plan,
 *       amount_fils, payment_url, payment_intent_id, next: 'pay' }
 *   400 missing/malformed session_id
 *   401 missing or invalid bearer token
 *   404 session not found OR not owned by user
 *   502 Ziina unavailable (transient — { action: 'retry' })
 *   500 server / Supabase / unexpected
 *
 * Required env:
 *   - SUPABASE_URL                (or REACT_APP_SUPABASE_URL)
 *   - SUPABASE_ANON_KEY           (or REACT_APP_SUPABASE_ANON_KEY)
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - ZIINA_API_TOKEN
 *
 * Optional env:
 *   - TRANSFORM_SUCCESS_URL_BASE   default 'https://mycvpassport.com'
 */

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 15 };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ZIINA_API_TOKEN = process.env.ZIINA_API_TOKEN;

const SUCCESS_URL_BASE = process.env.TRANSFORM_SUCCESS_URL_BASE || 'https://mycvpassport.com';

// Mirrored from /api/transform-upload and /api/create-ziina-payment.
// All three must agree — change here = change there.
const TRANSFORM_AMOUNT_FILS = 4900;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Same predicate as transform-upload — mirrored deliberately. The
// founder's spec requires both is_pro and express_pass to skip
// payment; in the current schema is_pro=true covers express_pass
// (webhook PLAN_MAP at amount=4900 sets is_pro=true), but we keep the
// branches separate so a future schema split doesn't accidentally
// route paying users back to the paywall.
function classifyUserPlan(profile) {
  if (!profile?.is_pro) return 'free';
  if (profile.plan === 'express_pass') return 'express';
  return 'pro';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({
      ok: false,
      error: 'Server not configured. Please try again shortly.',
      action: 'retry',
    });
  }
  if (!ZIINA_API_TOKEN) {
    return res.status(500).json({
      ok: false,
      error: 'Payment provider not configured. Please contact support.',
      action: 'contact_support',
    });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Sign in to continue.', action: 'login' });
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user } = {}, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !user) {
    return res.status(401).json({ ok: false, error: 'Your session has expired. Sign in again.', action: 'login' });
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── Body parse ──────────────────────────────────────────────────────
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid request.', action: 'restart' });
  }
  const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : '';
  if (!sessionId || !UUID_RE.test(sessionId)) {
    return res.status(400).json({
      ok: false,
      error: 'Missing or malformed session id.',
      action: 'restart',
    });
  }

  // ── Load session ────────────────────────────────────────────────────
  // NOTE: deliberately does NOT select raw_extracted_text or cv_data —
  // this endpoint has no business reading either, and excluding them
  // means an accidental log of the loaded row could never leak CV
  // content.
  const { data: session, error: loadErr } = await db
    .from('transform_sessions')
    .select('id, user_id, status, user_plan, payment_intent_id, payment_url, source_kind, source_chars')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (loadErr) {
    console.error('[transform-pay] session load failed:', JSON.stringify(loadErr));
    return res.status(500).json({
      ok: false,
      error: 'Could not load your session. Please try again.',
      action: 'retry',
    });
  }
  if (!session) {
    // 404 covers both "no row" and "wrong owner" — same response so we
    // don't leak existence of other users' sessions.
    return res.status(404).json({
      ok: false,
      error: 'Session not found. Please start a new upload.',
      action: 'restart',
    });
  }

  // ── Past-the-gate fast path ─────────────────────────────────────────
  // If the session already cleared the payment gate (paid / transforming
  // / transformed / error), no work to do here. The frontend should be
  // calling /api/transform-run, not /api/transform-pay.
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

  // ── Re-classify user plan (live, not the upload-time snapshot) ─────
  const { data: profile, error: profErr } = await db
    .from('profiles')
    .select('is_pro, plan')
    .eq('id', user.id)
    .maybeSingle();
  if (profErr) {
    console.error('[transform-pay] profile lookup failed:', JSON.stringify(profErr));
    return res.status(500).json({
      ok: false,
      error: 'Could not check your plan. Please try again.',
      action: 'retry',
    });
  }
  const liveUserPlan = classifyUserPlan(profile);
  const skipPayment = liveUserPlan === 'pro' || liveUserPlan === 'express';

  // ── Pro / Express path — flip session straight to 'paid' ────────────
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
      .eq('id', sessionId)
      .eq('user_id', user.id);
    if (upErr) {
      console.error('[transform-pay] entitled-flip update failed:', JSON.stringify(upErr));
      return res.status(500).json({
        ok: false,
        error: 'Could not unlock your transform. Please try again.',
        action: 'retry',
      });
    }
    console.log('[transform-pay] entitled, skipped Ziina', JSON.stringify({
      session_id: sessionId,
      user_id: user.id,
      user_plan: liveUserPlan,
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

  // ── Free path — Ziina intent ────────────────────────────────────────

  // Idempotency: if we've already minted an intent for this session
  // and stored the redirect URL, hand back the same URL. Prevents
  // double-charge concerns and gives the user a stable checkout link
  // across re-clicks.
  if (session.payment_intent_id && session.payment_url) {
    console.log('[transform-pay] returning existing payment intent', JSON.stringify({
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

  // Create a fresh Ziina intent. external_reference is the session id
  // namespaced with 'transform:' so the webhook can route it to the
  // session row (rather than the existing user-id / userId|service
  // patterns that flip is_pro or upsert permissions).
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
    // Network-level failure — don't poison the session. Leaving
    // status='created' lets the user retry without re-uploading.
    // Log metadata only — no CV content.
    console.error('[transform-pay] Ziina fetch threw', JSON.stringify({
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
    console.error('[transform-pay] Ziina create failed', JSON.stringify({
      session_id: sessionId,
      user_id: user.id,
      source_kind: session.source_kind,
      source_chars: session.source_chars,
      status: ziinaResp.status,
      body: errText.slice(0, 300),
    }));
    return res.status(502).json({
      ok: false,
      error: 'Could not initialise payment. Please try again.',
      action: 'retry',
    });
  }

  let ziinaData;
  try {
    ziinaData = await ziinaResp.json();
  } catch (e) {
    console.error('[transform-pay] Ziina JSON parse failed:', e?.message || e);
    return res.status(502).json({
      ok: false,
      error: 'Payment provider returned an unexpected response. Please try again.',
      action: 'retry',
    });
  }

  const paymentUrl = ziinaData?.redirect_url;
  const paymentIntentId = ziinaData?.id;
  if (!paymentUrl || !paymentIntentId) {
    console.error('[transform-pay] Ziina missing redirect_url or id', JSON.stringify({
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

  // Persist intent id + URL on the session, flip to awaiting_payment.
  // The .is('payment_intent_id', null) predicate is the concurrent-
  // intent guard: if a parallel transform-pay call has already minted
  // an intent and stored it (rare double-click race), our UPDATE
  // matches 0 rows and we return THAT call's URL instead of ours. The
  // intent we created here is abandoned at Ziina (no charge until a
  // user actually completes checkout). Without this predicate, two
  // tabs could trigger two intents and the user could pay twice.
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
    // The intent exists at Ziina, but we couldn't tie it to the
    // session. Webhook will still fire on payment and find the session
    // via external_reference, so the user can pay safely. Hand back
    // the URL with a soft warning rather than stranding them.
    console.error('[transform-pay] session update after intent failed', JSON.stringify({
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
    // Concurrent caller beat us. Their intent is canonical; ours is
    // abandoned (Ziina won't charge it unless someone completes
    // checkout, and no one will because we're returning the other
    // URL). Refetch and return whatever's now on the session row.
    const { data: existing } = await db
      .from('transform_sessions')
      .select('payment_intent_id, payment_url')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (existing?.payment_intent_id && existing?.payment_url) {
      console.log('[transform-pay] concurrent winner — returning their intent', JSON.stringify({
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
    // Defensive: predicate didn't match but no row found either —
    // session was deleted between Ziina create and our UPDATE.
    console.error('[transform-pay] post-intent UPDATE matched no row and refetch is empty', JSON.stringify({
      session_id: sessionId,
      payment_intent_id: paymentIntentId,
    }));
    return res.status(500).json({
      ok: false,
      error: 'Could not finalise payment setup. Please try again.',
      action: 'retry',
    });
  }

  console.log('[transform-pay] Ziina intent created', JSON.stringify({
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
