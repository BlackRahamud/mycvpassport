import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { PAID_TIER_SLUGS, TIERS, TIER_TO_PROFILE_PLAN, getServerAmount } from '../src/config/tierConfig.js';
import { issueDocument } from '../src/invoices/issue.js';

export const config = { api: { bodyParser: false } };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Tier amounts in fils → tier slug. Built from tierConfig so prices are
// never duplicated. Cover Letter and other a-la-carte unlocks stay
// hardcoded here because they route through the permissions table, not
// profiles.plan.
const PLAN_MAP = PAID_TIER_SLUGS.reduce((acc, slug) => {
  const fils = getServerAmount(slug, 'AED');
  if (fils != null) acc[fils] = { plan: slug, is_pro: true };
  return acc;
}, {
  1000: { plan: 'cover_letter', is_pro: false },
});

// Upload & Transform sessions encode their session id in the
// external_reference as "transform:<uuid>". Used by the transform
// branch below to route the webhook to transform_sessions instead of
// the subscription / permissions paths.
const TRANSFORM_PREFIX = 'transform:';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  // Fail-closed signature verification. Without this every webhook
  // branch (subscriptions, à-la-carte unlocks, transform sessions)
  // could be forged by anyone who can POST to this URL. ZIINA_WEBHOOK_SECRET
  // is required in every environment; if it's missing, we 500 rather
  // than silently accept unsigned webhooks.
  if (!secret) {
    console.error('[ziina-webhook] ZIINA_WEBHOOK_SECRET missing — failing closed');
    return res.status(500).json({ error: 'Webhook misconfigured' });
  }
  if (!signature) {
    console.error('[ziina-webhook] missing x-ziina-signature header');
    return res.status(401).json({ error: 'Missing signature' });
  }
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const signatureBuf = Buffer.from(String(signature), 'hex');
  if (
    expectedBuf.length !== signatureBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, signatureBuf)
  ) {
    return res.status(401).json({ error: 'Invalid signature' });
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
    // Malformed event — there's nothing useful we can do with it. Ack
    // 200 instead of 400 so Ziina doesn't keep retrying the same
    // unprocessable payload.
    console.warn('[ziina-webhook] no external_reference — acking 200', {
      payment_intent_id,
      amount,
    });
    return res.status(200).json({ received: true, ignored: true });
  }

  // Audit-log helper — inserts into the payments table if it exists.
  // Safe to call from either code path; failure is logged but never aborts
  // the webhook (the primary unlock flip must not be blocked by a missing
  // audit table on a fresh environment).
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
        // Ziina amounts come in fils — store the major-unit equivalent.
        amount: Number(amount || 0) / 100,
        currency: 'AED',
        status: 'succeeded',
        provider: 'ziina',
        service: fields.service || null,
        external_ref: external_reference,
        payment_intent_id: payment_intent_id || null,
      });
      if (payErr) console.error('payments insert skipped', { error: payErr.message });
    } catch (e) {
      console.error('payments insert threw', { error: e?.message || String(e) });
    }
  }

  // Upload & Transform per-session payments. external_reference is
  // "transform:<session_uuid>". We flip the matching transform_sessions
  // row from created/awaiting_payment → paid (any other status is
  // treated as an idempotent retry — Ziina re-delivers webhooks; we
  // also don't want to clobber a session that /api/transform-run has
  // already advanced to 'transforming' / 'transformed'). Audit row
  // goes to the same payments table the subscription branch uses.
  if (external_reference.startsWith(TRANSFORM_PREFIX)) {
    const sessionId = external_reference.slice(TRANSFORM_PREFIX.length);
    if (!UUID_RE.test(sessionId)) {
      console.error('[ziina-webhook] transform: invalid session id', { sessionId });
      return res.status(400).json({ error: 'Invalid transform session id' });
    }

    // Conditional UPDATE — the .in('status', ...) predicate is what
    // makes this safe against double-fire. If the session is already
    // past the gate, the predicate matches 0 rows and we ack as a
    // no-op below.
    const { data: updated, error: upErr } = await supabase
      .from('transform_sessions')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_intent_id: payment_intent_id || null,
      })
      .eq('id', sessionId)
      .in('status', ['created', 'awaiting_payment'])
      .select('id, user_id')
      .maybeSingle();

    if (upErr) {
      console.error('[ziina-webhook] transform update failed', {
        sessionId,
        error: upErr.message,
      });
      return res.status(500).json({ error: upErr.message });
    }

    if (!updated) {
      // Two cases collapse here:
      //   (a) Ziina retry of an event we already processed — the first
      //       delivery wrote the audit row, so a second would duplicate.
      //   (b) Session was deleted (cascade from auth.users) between
      //       Ziina charging the card and this webhook firing — we
      //       NEVER wrote an audit row for this real payment.
      // Distinguish by looking up payments.payment_intent_id. If we
      // already recorded it, ack quietly. If not, write an orphan
      // audit row with user_id=null so the founder can reconcile
      // against the Ziina dashboard.
      const { data: existingAudit } = await supabase
        .from('payments')
        .select('id')
        .eq('payment_intent_id', payment_intent_id)
        .maybeSingle();
      if (!existingAudit) {
        await recordPayment({ user_id: null, service: 'transform_orphan' });
        console.warn('[ziina-webhook] transform: orphan payment recorded (session missing)', {
          sessionId,
          payment_intent_id,
        });
      } else {
        console.log('[ziina-webhook] transform: idempotent ack (already processed)', {
          sessionId,
        });
      }
      return res.status(200).json({ received: true, idempotent: true });
    }

    await recordPayment({ user_id: updated.user_id, service: 'transform' });

    console.log('[ziina-webhook] transform session paid', {
      sessionId,
      userId: updated.user_id,
      payment_intent_id,
    });
    return res.status(200).json({ success: true });
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

    await recordPayment({ user_id: userId, service });

    console.log('Service unlocked', { userId, service });
    return res.status(200).json({ success: true });
  }

  const upgrade = PLAN_MAP[amount] || { plan: 'active_hunter', is_pro: true };

  // Idempotency — Ziina retries failed webhook deliveries. Stacking
  // expiry / incrementing download_credits must not double-apply on
  // a retry, so we short-circuit if we've already recorded an audit
  // row for this payment_intent_id.
  if (payment_intent_id) {
    const { data: existingAudit } = await supabase
      .from('payments')
      .select('id')
      .eq('payment_intent_id', payment_intent_id)
      .maybeSingle();
    if (existingAudit) {
      // Access-grant idempotency holds; do NOT re-run applyZiinaPaidTier.
      // But if issueDocument failed on first delivery (Resend down, missing
      // RPC pre-migration), the buyer has no receipt. Self-heal: call
      // issueDocument iff no invoice row exists for this payment_id. The
      // invoices.payment_id UNIQUE constraint is the second-layer guard
      // against any double-issue.
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('payment_id', payment_intent_id)
        .maybeSingle();
      if (!existingInvoice) {
        console.log('[ziina-webhook] retry — payment audited but no receipt; healing', { payment_id: payment_intent_id });
        await issueDocument(supabase, {
          user_id: external_reference,
          payment_id: payment_intent_id,
          gateway: 'ziina',
          entity: 'AE',
          kind: 'receipt',
          tier_slug: upgrade.plan,
          amount_minor: amount,
          currency: 'AED',
        });
      }
      return res.status(200).json({ received: true, idempotent: true });
    }
  }

  const accessError = await applyZiinaPaidTier(external_reference, upgrade.plan);
  if (accessError) {
    console.error('Supabase update failed', {
      error: accessError.message,
      userId: external_reference,
    });
    return res.status(500).json({ error: accessError.message });
  }

  await recordPayment({ user_id: external_reference, service: upgrade.plan });

  // Issue receipt + email (AE entity, RCP-AE-2026-NNNN series). Idempotent
  // on payment_id; email is best-effort and does not fail the webhook.
  await issueDocument(supabase, {
    user_id: external_reference,
    payment_id: payment_intent_id,
    gateway: 'ziina',
    entity: 'AE',
    kind: 'receipt',
    tier_slug: upgrade.plan,
    amount_minor: amount,
    currency: 'AED',
  });

  console.log('User upgraded successfully', {
    userId: external_reference,
    plan: upgrade.plan
  });

  return res.status(200).json({ success: true });
}

// Mirrors the Razorpay webhook's applyPaidTier: express_pass increments
// download_credits, time-bounded passes extend pro_access_expires_at
// atomically via the SQL function. Returns null on success.
async function applyZiinaPaidTier(userId, tierSlug) {
  const tier = TIERS[tierSlug];
  if (!tier) return new Error(`Unknown tier: ${tierSlug}`);

  if (tier.model === 'permanent') {
    const { error: creditsErr } = await supabase.rpc('grant_download_credits', {
      p_user_id: userId,
      p_credits: 1,
    });
    if (creditsErr) return creditsErr;
    return null;
  }

  const { error: rpcErr } = await supabase.rpc('extend_pro_access', {
    p_user_id: userId,
    p_days: tier.duration_days,
  });
  if (rpcErr) return rpcErr;

  const planEnum = TIER_TO_PROFILE_PLAN[tierSlug];
  if (planEnum) {
    const { error: planErr } = await supabase
      .from('profiles')
      .update({ plan: planEnum })
      .eq('id', userId);
    if (planErr) return planErr;
  }
  return null;
}
