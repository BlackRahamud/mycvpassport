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
} from '../src/config/tierConfig.js';
import { issueDocument } from '../src/invoices/issue.js';

export const config = { api: { bodyParser: false } };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_SECRET = process.env.RAZORPAY_SECRET;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

const VALID_PLANS = new Set(PAID_TIER_SLUGS);

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

async function recordPayment(db, fields) {
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
      currency: 'INR',
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

  const { plan } = body || {};
  // Razorpay path is INR-only by design — the gateway is only configured
  // for the India market. Currency and amount are NEVER read from the
  // client; both are derived from tierConfig server-side.
  const currency = 'INR';

  if (!plan || !VALID_PLANS.has(plan)) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  const expectedAmount = getServerAmount(plan, currency);
  if (!expectedAmount) {
    return res.status(400).json({ error: 'Invalid plan' });
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
      notes: {
        userId: user.id,
        plan,
      },
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
  } = body || {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment fields' });
  }

  if (!userId || userId !== user.id) {
    return res.status(403).json({ error: 'User mismatch' });
  }

  if (!plan || !VALID_PLANS.has(plan)) {
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

  if ((!userId || !plan) && payment.order_id && RAZORPAY_KEY_ID && RAZORPAY_SECRET) {
    try {
      const razorpay = new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_SECRET,
      });
      const order = await razorpay.orders.fetch(payment.order_id);
      userId = userId || order.notes?.userId;
      plan = plan || order.notes?.plan;
    } catch (fetchErr) {
      console.error('[razorpay] webhook order fetch failed', { error: fetchErr?.message });
    }
  }

  if (!userId || !plan || !VALID_PLANS.has(plan)) {
    console.warn('[razorpay] webhook missing userId or plan in notes', {
      payment_id: payment.id,
      order_id: payment.order_id,
    });
    return res.status(200).json({ received: true, ignored: true });
  }

  const { data: existingAudit } = await supabase
    .from('payments')
    .select('id')
    .eq('payment_intent_id', payment.id)
    .maybeSingle();

  if (existingAudit) {
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
    external_ref: payment.order_id,
    payment_intent_id: payment.id,
  });

  // Issue invoice + email. Idempotent on payment_id; email is best-effort
  // and does not fail the webhook (the row is durable, the buyer can
  // re-fetch from /account/invoices). Service-role DB client is reused.
  await issueDocument(supabase, {
    user_id: userId,
    payment_id: payment.id,
    gateway: 'razorpay',
    entity: 'IN',
    kind: 'invoice',
    tier_slug: plan,
    amount_minor: payment.amount,
    currency: 'INR',
  });

  console.log('[razorpay] webhook tier applied', { userId, plan, payment_id: payment.id });
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
    const { error: creditsErr } = await db.rpc('grant_download_credits', {
      p_user_id: userId,
      p_credits: 1,
    });
    if (creditsErr) return creditsErr;
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
