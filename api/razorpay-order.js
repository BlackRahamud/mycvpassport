import { createClient } from '@supabase/supabase-js';
import Razorpay from 'razorpay';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_SECRET = process.env.RAZORPAY_SECRET;

const PLAN_AMOUNTS = {
  express_pass: 39900,
  active_hunter: 19900,
  career_pro: 99900,
};

const VALID_PLANS = new Set(Object.keys(PLAN_AMOUNTS));

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!RAZORPAY_KEY_ID || !RAZORPAY_SECRET) {
    return res.status(500).json({ error: 'Payment gateway not configured' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const { amount, currency = 'INR', plan } = req.body || {};

  if (!plan || !VALID_PLANS.has(plan)) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  const expectedAmount = PLAN_AMOUNTS[plan];
  if (Number(amount) !== expectedAmount) {
    return res.status(400).json({ error: 'Amount does not match plan' });
  }

  if (currency !== 'INR') {
    return res.status(400).json({ error: 'Only INR is supported' });
  }

  try {
    const razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: expectedAmount,
      currency: 'INR',
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
    console.error('[razorpay-order]', err?.message || err);
    return res.status(500).json({ error: 'Failed to create order' });
  }
}
