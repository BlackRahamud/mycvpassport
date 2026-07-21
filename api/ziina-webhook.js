import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import {
  PAID_TIER_SLUGS,
  TIERS,
  TIER_TO_PROFILE_PLAN,
  getServerAmount,
  getAlaCarteAmountByService,
  VALID_ALACARTE_SERVICES,
} from '../src/config/tierConfig.js';
import {
  decodePaymentRef,
  gatewayCurrencyError,
  assertCurrencyMatch,
} from '../src/lib/payments/paymentRef.js';
import { grantAlaCarte } from '../src/lib/payments/alaCarteGrant.js';
import { issueDocument } from '../src/invoices/issue.js';
import { capturePostHogServer } from '../src/lib/analytics/posthogServer.js';

export const config = { api: { bodyParser: false } };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Ziina is the AED rail. The webhook never assumes this — it reads the
// currency stated in the signed reference and checks it against the
// gateway policy, so an AED-only account can never record an INR sale.
const ZIINA_GATEWAY = 'ziina';

// Currency → invoice entity. Kept as a lookup so a new currency forces a
// deliberate entity decision instead of inheriting a hardcoded 'AE'.
const ENTITY_FOR_CURRENCY = { AED: 'AE', INR: 'IN' };

// NOTE: the old PLAN_MAP (amount-in-fils → tier) is deliberately gone.
// Identifying a product by its price is what allowed two same-priced
// products to be confused, and what made an unrecognised amount fall
// through to a free Active Hunter grant. Product identity now arrives
// explicitly in external_reference; the amount is only ever used to
// verify that stated identity against the price table.

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
  // Ziina's own currency field, when it sends one. Treated as a
  // cross-check against the reference, never as the source of truth,
  // because we cannot guarantee the field is present on every event.
  const reportedCurrency = payload.currency_code || payload.currency || null;

  console.log('Ziina webhook received', {
    payment_intent_id,
    status,
    amount,
    reportedCurrency,
    external_reference,
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

  const ref = decodePaymentRef(external_reference);
  if (!ref) {
    console.error('[ziina-webhook] undecodable external_reference — granting nothing', {
      payment_intent_id,
      amount,
      external_reference,
    });
    return res.status(400).json({ error: 'Invalid payment reference' });
  }

  // Audit-log helper — inserts into the payments table if it exists.
  // Safe to call from either code path; failure is logged but never aborts
  // the webhook (the primary unlock flip must not be blocked by a missing
  // audit table on a fresh environment).
  // `currency` is a REQUIRED field on every call. The payments table no
  // longer defaults it (migration 043), so a caller that forgets it now
  // fails loudly at insert instead of silently recording AED.
  async function recordPayment(fields) {
    if (!fields.currency) {
      console.error('[ziina-webhook] recordPayment called without currency', {
        payment_intent_id,
        service: fields.service,
      });
      return;
    }
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
        currency: fields.currency,
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
  if (ref.kind === 'transform') {
    const sessionId = ref.sessionId;
    // Transform references predate the currency-carrying format and are
    // AED-only. State it explicitly and run it through the same gateway
    // policy check rather than letting an untagged currency through.
    const transformCurrency = 'AED';
    const txPolicyError = gatewayCurrencyError(ZIINA_GATEWAY, transformCurrency);
    const txMismatch = assertCurrencyMatch(transformCurrency, reportedCurrency);
    if (txPolicyError || txMismatch) {
      console.error('[ziina-webhook] transform: currency rejected', {
        sessionId,
        payment_intent_id,
        reason: txPolicyError || txMismatch,
      });
      return res.status(400).json({ error: txPolicyError || txMismatch });
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
        await recordPayment({ user_id: null, service: 'transform_orphan', currency: transformCurrency });
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

    await recordPayment({ user_id: updated.user_id, service: 'transform', currency: transformCurrency });

    // purchase_completed fires server-side (webhook = source of truth,
    // ad-blocker-proof) and only on fresh processing — idempotent retries
    // exited above, so PostHog never double-counts revenue.
    await capturePostHogServer(updated.user_id, 'purchase_completed', {
      plan: 'transform',
      amount: Number(amount || 0) / 100,
      currency: transformCurrency,
      transaction_id: payment_intent_id || null,
      gateway: 'ziina',
    });

    console.log('[ziina-webhook] transform session paid', {
      sessionId,
      userId: updated.user_id,
      payment_intent_id,
    });
    return res.status(200).json({ success: true });
  }

  // A pre-migration reference (bare user id, or "userId|service"). The
  // product is not stated and we refuse to infer it from the amount, so
  // nothing is granted. This is reachable only by a payment that was
  // already in flight when this code deployed; the founder reconciles it
  // by hand from the Ziina dashboard using the payment_intent_id logged
  // here. 400 so Ziina retries and the event stays visible rather than
  // being silently acked away.
  if (ref.kind === 'legacy') {
    console.error('[ziina-webhook] LEGACY REFERENCE — manual reconciliation required', {
      payment_intent_id,
      amount,
      external_reference,
    });
    return res.status(400).json({ error: 'Unidentifiable payment reference' });
  }

  // Shared currency validation for both grant branches below. The
  // reference states the currency; the gateway policy says whether this
  // rail may charge it; the gateway's own field (when present) must
  // agree. Any disagreement rejects before a single row is written.
  const currency = ref.currency;
  const policyError = gatewayCurrencyError(ZIINA_GATEWAY, currency);
  const mismatchError = assertCurrencyMatch(currency, reportedCurrency);
  if (policyError || mismatchError) {
    console.error('[ziina-webhook] currency rejected — granting nothing', {
      payment_intent_id,
      external_reference,
      reportedCurrency,
      reason: policyError || mismatchError,
    });
    return res.status(400).json({ error: policyError || mismatchError });
  }

  const entity = ENTITY_FOR_CURRENCY[currency];
  if (!entity) {
    console.error('[ziina-webhook] no invoice entity for currency', { currency });
    return res.status(400).json({ error: `No invoice entity for ${currency}` });
  }

  // ── A-la-carte unlocks. Flip a row in `permissions` instead of
  // profiles.is_pro so the user can keep a free plan while unlocking a
  // single tool. The amount is checked against the a-la-carte price
  // table for the stated service before anything is granted.
  if (ref.kind === 'svc') {
    const { service, userId } = ref;

    if (!VALID_ALACARTE_SERVICES.has(service)) {
      console.error('[ziina-webhook] unknown a-la-carte service — granting nothing', {
        payment_intent_id,
        service,
      });
      return res.status(400).json({ error: 'Unknown service' });
    }

    const expected = getAlaCarteAmountByService(service, currency);
    if (expected == null || Number(amount) !== expected) {
      console.error('[ziina-webhook] a-la-carte amount mismatch — granting nothing', {
        payment_intent_id,
        service,
        currency,
        expected,
        received: Number(amount),
      });
      return res.status(400).json({ error: 'Amount does not match the price for this item' });
    }

    // Idempotency — Ziina retries deliveries. The permissions upsert is
    // naturally idempotent but recordPayment is not, so short-circuit on
    // an existing audit row (mirrors the Razorpay a-la-carte branch).
    if (payment_intent_id) {
      const { data: existingAlc } = await supabase
        .from('payments')
        .select('id')
        .eq('payment_intent_id', payment_intent_id)
        .maybeSingle();
      if (existingAlc) {
        return res.status(200).json({ received: true, idempotent: true });
      }
    }

    // Deliver the product. grantAlaCarte decides HOW from one shared
    // map: a permanent permissions row for linkedin_optimizer, a
    // consumable credit for cover_letter. A service with no declared
    // grant fails here rather than recording a payment that unlocks
    // nothing.
    const granted = await grantAlaCarte(supabase, { service, userId });
    if (!granted.ok) {
      console.error('[ziina-webhook] a-la-carte grant failed', {
        userId,
        service,
        reason: granted.reason,
        error: granted.error?.message,
      });
      return res.status(500).json({ error: granted.error?.message || 'Grant failed' });
    }

    await recordPayment({ user_id: userId, service, currency });

    await capturePostHogServer(userId, 'purchase_completed', {
      plan: service,
      amount: Number(amount || 0) / 100,
      currency,
      transaction_id: payment_intent_id || null,
      gateway: 'ziina',
    });

    console.log('Service unlocked', { userId, service, currency });
    return res.status(200).json({ success: true });
  }

  // ── Paid tier. Identity is stated in the reference; the amount only
  // verifies it. An unknown slug or a price that does not match the
  // table rejects outright — there is no fallback plan.
  const tierSlug = ref.slug;
  const userId = ref.userId;

  if (!PAID_TIER_SLUGS.includes(tierSlug)) {
    console.error('[ziina-webhook] unknown tier slug — granting nothing', {
      payment_intent_id,
      tierSlug,
    });
    return res.status(400).json({ error: 'Unknown plan' });
  }

  const expectedAmount = getServerAmount(tierSlug, currency);
  if (expectedAmount == null || Number(amount) !== expectedAmount) {
    console.error('[ziina-webhook] tier amount mismatch — granting nothing', {
      payment_intent_id,
      tierSlug,
      currency,
      expected: expectedAmount,
      received: Number(amount),
    });
    return res.status(400).json({ error: 'Amount does not match the price for this plan' });
  }

  const upgrade = { plan: tierSlug };

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
          user_id: userId,
          payment_id: payment_intent_id,
          gateway: 'ziina',
          entity,
          kind: 'receipt',
          tier_slug: upgrade.plan,
          amount_minor: amount,
          currency,
        });
      }
      return res.status(200).json({ received: true, idempotent: true });
    }
  }

  const accessError = await applyZiinaPaidTier(userId, upgrade.plan);
  if (accessError) {
    console.error('Supabase update failed', {
      error: accessError.message,
      userId,
    });
    return res.status(500).json({ error: accessError.message });
  }

  await recordPayment({ user_id: userId, service: upgrade.plan, currency });

  await capturePostHogServer(userId, 'purchase_completed', {
    plan: upgrade.plan,
    amount: Number(amount || 0) / 100,
    currency,
    transaction_id: payment_intent_id || null,
    gateway: 'ziina',
  });

  // Issue receipt + email (entity derived from the validated currency).
  // Idempotent on payment_id; email is best-effort and does not fail the
  // webhook.
  await issueDocument(supabase, {
    user_id: userId,
    payment_id: payment_intent_id,
    gateway: 'ziina',
    entity,
    kind: 'receipt',
    tier_slug: upgrade.plan,
    amount_minor: amount,
    currency,
  });

  console.log('User upgraded successfully', {
    userId,
    plan: upgrade.plan,
    currency,
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
    // Single-CV Unlock = 3 PDF downloads (consumed via consume_download_credit).
    const { error: creditsErr } = await supabase.rpc('grant_download_credits', {
      p_user_id: userId,
      p_credits: 3,
    });
    if (creditsErr) return creditsErr;
    // Durable marker so AI metering can grant the Single-CV Unlock monthly
    // AI cap (30/mo). Does NOT touch plan or pro_access_expires_at — the
    // subscription + download-gate logic is unchanged.
    const { error: flagErr } = await supabase
      .from('profiles')
      .update({ single_cv_unlocked: true })
      .eq('id', userId);
    if (flagErr) return flagErr;
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
