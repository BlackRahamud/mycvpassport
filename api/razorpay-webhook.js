import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import Razorpay from 'razorpay';

export const config = { api: { bodyParser: false } };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_SECRET = process.env.RAZORPAY_SECRET;

const VALID_PLANS = new Set(['express_pass', 'active_hunter', 'career_pro']);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
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

async function recordPayment(fields) {
  try {
    let email = null;
    if (fields.user_id) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', fields.user_id)
        .maybeSingle();
      email = prof?.email || null;
    }
    const { error: payErr } = await supabase.from('payments').insert({
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
    if (payErr) console.error('[razorpay-webhook] payments insert skipped', { error: payErr.message });
  } catch (e) {
    console.error('[razorpay-webhook] payments insert threw', { error: e?.message || String(e) });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!WEBHOOK_SECRET) {
    console.error('[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET missing — failing closed');
    return res.status(500).json({ error: 'Webhook misconfigured' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  const rawBody = await getRawBody(req);
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
      console.error('[razorpay-webhook] order fetch failed', { error: fetchErr?.message });
    }
  }

  if (!userId || !plan || !VALID_PLANS.has(plan)) {
    console.warn('[razorpay-webhook] missing userId or plan in notes', {
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

  const { error } = await supabase
    .from('profiles')
    .update({ is_pro: true, plan })
    .eq('id', userId);

  if (error) {
    console.error('[razorpay-webhook] profile update failed', {
      error: error.message,
      userId,
      plan,
    });
    return res.status(500).json({ error: error.message });
  }

  await recordPayment({
    user_id: userId,
    service: plan,
    amount: payment.amount,
    external_ref: payment.order_id,
    payment_intent_id: payment.id,
  });

  console.log('[razorpay-webhook] user upgraded', { userId, plan, payment_id: payment.id });
  return res.status(200).json({ success: true });
}
