import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const config = { api: { bodyParser: false } };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PLAN_MAP = {
  4900:  { plan: 'express_pass',  is_pro: true },
  2900:  { plan: 'active_hunter', is_pro: true },
  19900: { plan: 'career_pro',    is_pro: true },
  1000:  { plan: 'cover_letter',  is_pro: false },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);
  const signature = req.headers['x-ziina-signature'];
  const secret = process.env.ZIINA_WEBHOOK_SECRET;

  if (secret && signature) {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    if (expected !== signature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { status, amount, external_reference, payment_intent_id } = payload;

  console.log('Ziina webhook received', {
    payment_intent_id,
    status,
    amount,
    userId: external_reference
  });

  if (status !== 'completed') {
    return res.status(200).json({ received: true });
  }

  if (!external_reference) {
    return res.status(400).json({ error: 'No user ID' });
  }

  // A-la-carte unlocks encode service via "userId|service" in external_reference.
  // These flip a row in `permissions` instead of profiles.is_pro so the user can
  // keep a free plan while unlocking a single tool (e.g. linkedin_optimizer).
  const pipeIdx = external_reference.indexOf('|');
  if (pipeIdx !== -1) {
    const userId = external_reference.slice(0, pipeIdx);
    const service = external_reference.slice(pipeIdx + 1);

    const { error: permErr } = await supabase
      .from('permissions')
      .upsert(
        { user_id: userId, service, status: 'unlocked', unlocked_at: new Date().toISOString() },
        { onConflict: 'user_id,service' }
      );

    if (permErr) {
      console.error('Supabase permissions upsert failed', {
        error: permErr.message,
        userId,
        service,
      });
      return res.status(500).json({ error: permErr.message });
    }

    console.log('Service unlocked', { userId, service });
    return res.status(200).json({ success: true });
  }

  const upgrade = PLAN_MAP[amount] || { plan: 'active_hunter', is_pro: true };

  const { error } = await supabase
    .from('profiles')
    .update({ is_pro: upgrade.is_pro, plan: upgrade.plan })
    .eq('id', external_reference);

  if (error) {
    console.error('Supabase update failed', {
      error: error.message,
      userId: external_reference
    });
    return res.status(500).json({ error: error.message });
  }

  console.log('User upgraded successfully', {
    userId: external_reference,
    plan: upgrade.plan
  });

  return res.status(200).json({ success: true });
}
