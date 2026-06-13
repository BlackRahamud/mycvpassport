import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAZORPAY_SECRET = process.env.RAZORPAY_SECRET;

const VALID_PLANS = new Set(['express_pass', 'active_hunter', 'career_pro']);

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
    if (payErr) console.error('[razorpay-verify] payments insert skipped', { error: payErr.message });
  } catch (e) {
    console.error('[razorpay-verify] payments insert threw', { error: e?.message || String(e) });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
  } = req.body || {};

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

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await db
    .from('profiles')
    .update({ is_pro: true, plan })
    .eq('id', userId);

  if (error) {
    console.error('[razorpay-verify] profile update failed', { error: error.message, userId });
    return res.status(500).json({ error: 'Failed to activate plan' });
  }

  await recordPayment(db, {
    user_id: userId,
    service: plan,
    external_ref: razorpay_order_id,
    payment_intent_id: razorpay_payment_id,
  });

  return res.status(200).json({ success: true });
}
