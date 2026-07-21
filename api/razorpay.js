/**
 * /api/razorpay?action=order|verify|webhook
 *
 * Single Razorpay router — merged from razorpay-order, razorpay-verify,
 * and razorpay-webhook to stay under the Vercel Hobby 12-function limit.
 *
 * Webhook URL (Razorpay Dashboard):
 *   https://mycvpassport.com/api/razorpay?action=webhook
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import {
  PAID_TIER_SLUGS,
  TIERS,
  TIER_TO_PROFILE_PLAN,
  currencyForCountry,
  getServerAmount,
  getAlaCarteAmount,
  getAlaCarteAmountByService,
  alaCarteServiceFor,
  VALID_ALACARTE_SERVICES,
} from '../src/config/tierConfig.js';
import { gatewayCurrencyError, assertCurrencyMatch } from '../src/lib/payments/paymentRef.js';
import { grantAlaCarte } from '../src/lib/payments/alaCarteGrant.js';
import { issueDocument } from '../src/invoices/issue.js';
import { capturePostHogServer } from '../src/lib/analytics/posthogServer.js';

export const config = { api: { bodyParser: false } };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_SECRET = process.env.RAZORPAY_SECRET;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

const VALID_PLANS = new Set(PAID_TIER_SLUGS);

// Razorpay is the INR rail. Declared once and validated against the
// gateway policy rather than inlined as a literal at each use site.
const RAZORPAY_CURRENCY = 'INR';

// Currency → invoice entity. A lookup rather than a literal so a new
// currency forces a deliberate entity decision instead of inheriting IN.
const ENTITY_FOR_CURRENCY = { INR: 'IN', AED: 'AE' };

// A-la-carte prices now come from the single table in tierConfig
// (A_LA_CARTE). The former local A_LA_CARTE_INR_PAISE map was a
// hand-synced copy of the same numbers held in two other files; a drift
// between copies was a silently mispriced sale. An item with no INR
// price in the table is simply not sold on this rail and rejects.

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function resolveAction(req, parsedBody) {
  const q = req.query?.action;
  if (q) return String(q);
  if (parsedBody?.action) return String(parsedBody.action);
  return null;
}

async function requireAuth(req, res) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).json({ error: 'Server not configured' });
    return null;
  }
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user } = {}, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !user) {
    res.status(401).json({ error: 'Invalid session' });
    return null;
  }
  return user;
}

function verifyPaymentSignature(orderId, paymentId, signature) {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', RAZORPAY_SECRET)
    .update(body)
    .digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const signatureBuf = Buffer.from(String(signature), 'hex');
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

function verifyWebhookSignature(rawBody, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const signatureBuf = Buffer.from(String(signature), 'hex');
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

// `currency` is a REQUIRED field. The payments table no longer defaults
// it (migration 043), so a caller that omits it fails loudly here rather
// than silently recording the wrong currency.
async function recordPayment(db, fields) {
  if (!fields.currency) {
    console.error('[razorpay] recordPayment called without currency', {
      payment_intent_id: fields.payment_intent_id,
      service: fields.service,
    });
    return;
  }
  try {
    let email = null;
    if (fields.user_id) {
      const { data: prof } = await db
        .from('profiles')
        .select('email')
        .eq('id', fields.user_id)
        .maybeSingle();
      email = prof?.email || null;
    }
    const { error: payErr } = await db.from('payments').insert({
      user_id: fields.user_id || null,
      email,
      amount: Number(fields.amount || 0) / 100,
      currency: fields.currency,
      status: 'succeeded',
      provider: 'razorpay',
      service: fields.service || null,
      external_ref: fields.external_ref || null,
      payment_intent_id: fields.payment_intent_id || null,
    });
    if (payErr) console.error('[razorpay] payments insert skipped', { error: payErr.message });
  } catch (e) {
    console.error('[razorpay] payments insert threw', { error: e?.message || String(e) });
  }
}

async function handleOrder(req, res, body) {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_SECRET) {
    return res.status(500).json({ error: 'Payment gateway not configured' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const { plan, service } = body || {};
  // Razorpay path is INR-only by design — the gateway is only configured
  // for the India market. Currency and amount are NEVER read from the
  // client; both are derived server-side from the single price table.
  const currency = RAZORPAY_CURRENCY;
  const policyError = gatewayCurrencyError('razorpay', currency);
  if (policyError) {
    console.error('[razorpay] gateway currency policy', { policyError });
    return res.status(500).json({ error: 'Payment gateway misconfigured' });
  }

  // Two shapes: a subscription/tier `plan`, or a one-time a-la-carte
  // `service` (e.g. linkedinOptimizer). Exactly one is expected. The
  // currency is written into order notes alongside the product id so the
  // webhook can verify the sale against what was actually quoted.
  let expectedAmount;
  let orderNotes;
  if (service) {
    const permissionService = alaCarteServiceFor(service);
    expectedAmount = getAlaCarteAmount(service, currency);
    if (!permissionService || !expectedAmount) {
      return res.status(400).json({ error: 'Invalid service' });
    }
    // Store the resolved permission-service string; the webhook keys the
    // permissions upsert off this.
    orderNotes = { userId: user.id, service: permissionService, currency };
  } else {
    if (!plan || !VALID_PLANS.has(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    expectedAmount = getServerAmount(plan, currency);
    if (!expectedAmount) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    orderNotes = { userId: user.id, plan, currency };
  }

  try {
    const razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: expectedAmount,
      currency,
      receipt: `cvp_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: orderNotes,
    });

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err) {
    console.error('[razorpay] order failed', err?.message || err);
    return res.status(500).json({ error: 'Failed to create order' });
  }
}

async function handleVerify(req, res, body) {
  if (!RAZORPAY_SECRET) {
    return res.status(500).json({ error: 'Payment gateway not configured' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userId,
    plan,
    service,
  } = body || {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment fields' });
  }

  if (!userId || userId !== user.id) {
    return res.status(403).json({ error: 'User mismatch' });
  }

  // Accept either a tier `plan` or a one-time a-la-carte `service`.
  if (service) {
    if (!alaCarteServiceFor(service)) {
      return res.status(400).json({ error: 'Invalid service' });
    }
  } else if (!plan || !VALID_PLANS.has(plan)) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Verify is UI/return only — the webhook is the sole durable source of
  // truth for access flips and audit rows. Returning success here just
  // confirms to the client that the payment was legitimately signed by
  // Razorpay; the webhook will arrive moments later and apply the
  // access change idempotently.
  return res.status(200).json({ success: true });
}

async function handleWebhook(req, res, rawBody) {
  if (!WEBHOOK_SECRET) {
    console.error('[razorpay] RAZORPAY_WEBHOOK_SECRET missing — failing closed');
    return res.status(500).json({ error: 'Webhook misconfigured' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !supabase) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  const signature = req.headers['x-razorpay-signature'];

  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }

  if (!verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const event = payload.event;

  if (event !== 'payment.captured') {
    return res.status(200).json({ received: true, ignored: true });
  }

  const payment = payload.payload?.payment?.entity;
  if (!payment) {
    return res.status(200).json({ received: true, ignored: true });
  }

  let userId = payment.notes?.userId;
  let plan = payment.notes?.plan;
  let service = payment.notes?.service;
  let quotedCurrency = payment.notes?.currency;

  if ((!userId || (!plan && !service)) && payment.order_id && RAZORPAY_KEY_ID && RAZORPAY_SECRET) {
    try {
      const razorpay = new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_SECRET,
      });
      const order = await razorpay.orders.fetch(payment.order_id);
      userId = userId || order.notes?.userId;
      plan = plan || order.notes?.plan;
      service = service || order.notes?.service;
      quotedCurrency = quotedCurrency || order.notes?.currency;
    } catch (fetchErr) {
      console.error('[razorpay] webhook order fetch failed', { error: fetchErr?.message });
    }
  }

  // ── Currency validation, before any branch grants anything.
  // payment.currency is what Razorpay actually charged. It is read here
  // (it never used to be) and must satisfy the gateway policy, and must
  // agree with the currency quoted in order notes when one is present.
  // Orders created before this deploy carry no notes.currency, so an
  // absent quote is tolerated while a conflicting one rejects.
  const charged = String(payment.currency || '').toUpperCase();
  if (!charged) {
    console.error('[razorpay] webhook payment has no currency — granting nothing', {
      payment_id: payment.id,
    });
    return res.status(400).json({ error: 'Payment has no currency' });
  }
  const policyError = gatewayCurrencyError('razorpay', charged);
  const mismatchError = quotedCurrency
    ? assertCurrencyMatch(String(quotedCurrency).toUpperCase(), charged)
    : null;
  if (policyError || mismatchError) {
    console.error('[razorpay] currency rejected — granting nothing', {
      payment_id: payment.id,
      charged,
      quotedCurrency: quotedCurrency || null,
      reason: policyError || mismatchError,
    });
    return res.status(400).json({ error: policyError || mismatchError });
  }
  const currency = charged;

  // ── A-la-carte one-time unlocks (e.g. linkedin_optimizer). Mirrors the
  // Ziina webhook's permissions branch: upsert `permissions` instead of
  // flipping profiles.plan. No invoice/receipt document is issued for
  // a-la-carte items (matches the Ziina path). Tier purchases fall
  // through to the plan branch below untouched.
  if (service && VALID_ALACARTE_SERVICES.has(service)) {
    if (!userId) {
      console.warn('[razorpay] a-la-carte webhook missing userId', { payment_id: payment.id });
      return res.status(200).json({ received: true, ignored: true });
    }

    // Verify what was charged against the price table for this exact
    // item and currency. Previously the amount was never re-checked at
    // webhook time, so any captured amount granted the unlock.
    const expectedAlc = getAlaCarteAmountByService(service, currency);
    if (expectedAlc == null || Number(payment.amount) !== expectedAlc) {
      console.error('[razorpay] a-la-carte amount mismatch — granting nothing', {
        payment_id: payment.id,
        service,
        currency,
        expected: expectedAlc,
        received: Number(payment.amount),
      });
      return res.status(400).json({ error: 'Amount does not match the price for this item' });
    }

    // Idempotency — Razorpay retries deliveries. If we already audited this
    // payment, the permission is already granted; ack without re-upserting.
    const { data: existingAlc } = await supabase
      .from('payments')
      .select('id')
      .eq('payment_intent_id', payment.id)
      .maybeSingle();
    if (existingAlc) {
      return res.status(200).json({ received: true, idempotent: true });
    }

    // Same shared grant map the Ziina rail uses, so a product is
    // delivered identically whichever gateway sold it.
    const granted = await grantAlaCarte(supabase, { service, userId });
    if (!granted.ok) {
      console.error('[razorpay] a-la-carte grant failed', {
        userId,
        service,
        reason: granted.reason,
        error: granted.error?.message,
      });
      return res.status(500).json({ error: granted.error?.message || 'Grant failed' });
    }

    await recordPayment(supabase, {
      user_id: userId,
      service,
      amount: payment.amount,
      currency,
      external_ref: payment.order_id,
      payment_intent_id: payment.id,
    });

    // purchase_completed fires server-side (webhook = source of truth,
    // ad-blocker-proof) and only on fresh processing — idempotent retries
    // exited above, so PostHog never double-counts revenue.
    await capturePostHogServer(userId, 'purchase_completed', {
      plan: service,
      amount: Number(payment.amount || 0) / 100,
      currency,
      transaction_id: payment.id,
      gateway: 'razorpay',
    });

    console.log('[razorpay] a-la-carte service unlocked', { userId, service, payment_id: payment.id });
    return res.status(200).json({ success: true });
  }

  if (!userId || !plan || !VALID_PLANS.has(plan)) {
    console.warn('[razorpay] webhook missing userId or plan in notes', {
      payment_id: payment.id,
      order_id: payment.order_id,
    });
    return res.status(200).json({ received: true, ignored: true });
  }

  // Verify the captured amount against the price table for the claimed
  // plan and the charged currency. expectedAmount was computed at order
  // creation but never re-checked here, so the grant used to depend
  // entirely on notes.plan with no price agreement at all.
  const expectedPlanAmount = getServerAmount(plan, currency);
  if (expectedPlanAmount == null || Number(payment.amount) !== expectedPlanAmount) {
    console.error('[razorpay] tier amount mismatch — granting nothing', {
      payment_id: payment.id,
      plan,
      currency,
      expected: expectedPlanAmount,
      received: Number(payment.amount),
    });
    return res.status(400).json({ error: 'Amount does not match the price for this plan' });
  }

  const { data: existingAudit } = await supabase
    .from('payments')
    .select('id')
    .eq('payment_intent_id', payment.id)
    .maybeSingle();

  if (existingAudit) {
    // Access-grant + audit-row idempotency holds; do NOT re-run applyPaidTier.
    // But if issueDocument failed on the first delivery (e.g. Resend down,
    // missing RPC pre-migration), the buyer has no invoice. Self-heal here:
    // call issueDocument iff no invoice row exists for this payment_id. The
    // invoices.payment_id UNIQUE constraint is the second-layer guard against
    // any double-issue.
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('payment_id', payment.id)
      .maybeSingle();
    if (!existingInvoice) {
      console.log('[razorpay] retry — payment audited but no invoice; healing', { payment_id: payment.id });
      await issueDocument(supabase, {
        user_id: userId,
        payment_id: payment.id,
        gateway: 'razorpay',
        entity: ENTITY_FOR_CURRENCY[currency],
        kind: 'invoice',
        tier_slug: plan,
        amount_minor: payment.amount,
        currency,
      });
    }
    return res.status(200).json({ received: true, idempotent: true });
  }

  const accessError = await applyPaidTier(supabase, userId, plan);
  if (accessError) {
    console.error('[razorpay] webhook access update failed', {
      error: accessError.message,
      userId,
      plan,
    });
    return res.status(500).json({ error: accessError.message });
  }

  await recordPayment(supabase, {
    user_id: userId,
    service: plan,
    amount: payment.amount,
    currency,
    external_ref: payment.order_id,
    payment_intent_id: payment.id,
  });

  await capturePostHogServer(userId, 'purchase_completed', {
    plan,
    amount: Number(payment.amount || 0) / 100,
    currency,
    transaction_id: payment.id,
    gateway: 'razorpay',
  });

  // Issue invoice + email. Idempotent on payment_id; email is best-effort
  // and does not fail the webhook (the row is durable, the buyer can
  // re-fetch from /account/invoices). Service-role DB client is reused.
  await issueDocument(supabase, {
    user_id: userId,
    payment_id: payment.id,
    gateway: 'razorpay',
    entity: ENTITY_FOR_CURRENCY[currency],
    kind: 'invoice',
    tier_slug: plan,
    amount_minor: payment.amount,
    currency,
  });

  console.log('[razorpay] webhook tier applied', { userId, plan, currency, payment_id: payment.id });
  return res.status(200).json({ success: true });
}

// Applies a paid-tier purchase to the user's profile. Express Pass
// increments download_credits (permanent single-CV unlocks); the
// time-bounded passes (Active Hunter, Career Pro) extend
// pro_access_expires_at by tier.duration_days via the atomic SQL
// function. Returns null on success, or an error-shape on failure.
async function applyPaidTier(db, userId, tierSlug) {
  const tier = TIERS[tierSlug];
  if (!tier) return new Error(`Unknown tier: ${tierSlug}`);

  if (tier.model === 'permanent') {
    // Single-CV Unlock = 3 PDF downloads (consumed via consume_download_credit).
    const { error: creditsErr } = await db.rpc('grant_download_credits', {
      p_user_id: userId,
      p_credits: 3,
    });
    if (creditsErr) return creditsErr;
    // Durable marker so AI metering can grant the Single-CV Unlock monthly
    // AI cap (30/mo). Does NOT touch plan or pro_access_expires_at — the
    // subscription + download-gate logic is unchanged.
    const { error: flagErr } = await db
      .from('profiles')
      .update({ single_cv_unlocked: true })
      .eq('id', userId);
    if (flagErr) return flagErr;
    return null;
  }

  const { error: rpcErr } = await db.rpc('extend_pro_access', {
    p_user_id: userId,
    p_days: tier.duration_days,
  });
  if (rpcErr) return rpcErr;

  // Mirror the tier name onto profiles.plan for the existing UI
  // (PricingPage's "Current Plan" highlight reads from this column).
  const planEnum = TIER_TO_PROFILE_PLAN[tierSlug];
  if (planEnum) {
    const { error: planErr } = await db
      .from('profiles')
      .update({ plan: planEnum })
      .eq('id', userId);
    if (planErr) return planErr;
  }
  return null;
}

// Geo resolution — reads Vercel's edge-injected country header. Cheap
// (header lookup, no upstream call, no rate limit), per-request, and
// far more reliable than the prior client-side ipapi.co fetch. The
// browser calls GET /api/razorpay?action=geo on the pricing page load
// and uses the returned currency to pick the gateway. When the header
// is missing or the country is unknown, currencyForCountry returns
// INR (the cheaper currency) so a misdetect under-charges.
function handleGeo(req, res) {
  const country = String(req.headers['x-vercel-ip-country'] || '').toUpperCase();
  const currency = currencyForCountry(country);
  // Short cache: a user's geo doesn't change within a session, but a
  // fresh resolve on each page load is cheap and avoids stale CDN
  // entries for travelling users.
  res.setHeader('Cache-Control', 'private, max-age=60');
  return res.status(200).json({ country: country || null, currency });
}

export default async function handler(req, res) {
  // Geo is a read-only endpoint and uses GET. Everything else is POST.
  if (req.method === 'GET' && req.query?.action === 'geo') {
    return handleGeo(req, res);
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await getRawBody(req);

  let parsedBody = {};
  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = {};
    }
  }

  const action = resolveAction(req, parsedBody);

  if (action === 'webhook') {
    return handleWebhook(req, res, rawBody);
  }

  if (action === 'geo') {
    return handleGeo(req, res);
  }

  if (action === 'order') {
    return handleOrder(req, res, parsedBody);
  }

  if (action === 'verify') {
    return handleVerify(req, res, parsedBody);
  }

  return res.status(400).json({ error: 'Invalid or missing action' });
}
