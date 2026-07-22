// ============================================================================
// src/lib/admin/money.js — Admin Command Center, Phase 2: money actions.
//
// Dependency-injected like adminCore: every function takes a service-role
// `db`, an injected `gateways` object (the actual Ziina/Razorpay calls, which
// need env + SDK, live in api/admin.js), and plain params. No env, no req/res.
// That keeps orchestration unit-testable with mock gateways (see
// scripts/verify-admin-backend.mjs) and — crucially — means NO real gateway
// call ever fires during verification.
//
// MONEY-SAFE:
//   * `mode` defaults to 'test' at the call site. Live requires mode==='live'
//     AND an explicit confirm:'LIVE'. Gateways use TEST credentials / test
//     flag in test mode and FAIL CLOSED if test creds are missing.
//   * Admin-created links carry the SAME signed reference / order notes the
//     existing webhooks decode, so a paid link provisions + records a payment
//     through the live path — admin never re-implements granting.
//   * Payment amounts are ALWAYS derived from the price table for the chosen
//     product + currency, never from a client-supplied amount, so a link can
//     never quote a price the webhook's amount-check would reject.
//
// Every write funnels through writeAudit(). Revenue is reported per-currency
// (AED and INR separate, never FX-converted or summed) with a data_state flag.
// ============================================================================

import {
  getServerAmount,
  getAlaCarteAmountByService,
  TIERS,
  PROFILE_PLAN_TO_TIER,
  gatewayForCurrency,
} from '../../config/tierConfig.js';
import { encodePaymentRef, gatewayCurrencyError } from '../payments/paymentRef.js';
import { grantAlaCarte } from '../payments/alaCarteGrant.js';
import { writeAudit, normEmail } from './adminCore.js';

const CURRENCIES = new Set(['AED', 'INR']);
const REAL_PROVIDERS = new Set(['ziina', 'razorpay']);
const SUCCEEDED = new Set(['succeeded', 'success', 'completed', 'paid']);

// Resolve the admin's requested product to a priced, webhook-identifiable
// item. Throws on anything not sellable in the chosen currency.
function resolveProduct({ portal, plan, service, currency }) {
  if (service) {
    const amountMinor = getAlaCarteAmountByService(service, currency);
    if (amountMinor == null) throw new Error(`service "${service}" is not sold in ${currency}`);
    return { kind: 'svc', id: service, amountMinor };
  }
  let slug;
  if (portal === 'hr') {
    if (plan !== 'foundation') throw new Error('hr payment link supports the foundation plan only');
    slug = 'foundation';
  } else {
    slug = PROFILE_PLAN_TO_TIER[plan];
    if (!slug || slug === 'explorer') throw new Error(`plan "${plan}" is not a payable plan`);
  }
  const amountMinor = getServerAmount(slug, currency);
  if (amountMinor == null) throw new Error(`plan "${slug}" is not sold in ${currency}`);
  return { kind: 'tier', id: slug, amountMinor };
}

async function findProfileByEmail(db, email) {
  const { data, error } = await db.from('profiles').select('id, email').eq('email', normEmail(email)).maybeSingle();
  if (error) throw new Error(`profile lookup failed: ${error.message}`);
  return data || null;
}

// #4 Generate a manual payment link for a user + product. Test-mode default.
export async function createPaymentLink(db, gateways, params) {
  const { actor, currency, portal, plan, service } = params;
  const mode = params.mode || 'test';
  const test = mode !== 'live';

  const email = normEmail(params.email);
  if (!email) return { ok: false, reason: 'email_required' };
  if (!CURRENCIES.has(currency)) return { ok: false, reason: 'invalid_currency' };
  if (!test && params.confirm !== 'LIVE') return { ok: false, reason: 'live_requires_confirm' };

  const provider = gatewayForCurrency(currency); // AED→ziina, INR→razorpay
  const policy = gatewayCurrencyError(provider, currency);
  if (policy) return { ok: false, reason: 'gateway_policy', error: policy };

  let profile;
  try { profile = await findProfileByEmail(db, email); }
  catch (e) { return { ok: false, reason: 'lookup_failed', error: e.message }; }
  if (!profile) return { ok: false, reason: 'user_not_found' };

  let product;
  try { product = resolveProduct({ portal, plan, service, currency }); }
  catch (e) { return { ok: false, reason: 'invalid_product', error: e.message }; }

  let link;
  try {
    if (provider === 'ziina') {
      const ref = encodePaymentRef({ kind: product.kind, id: product.id, currency, userId: profile.id });
      link = await gateways.ziinaLink({ amountMinor: product.amountMinor, ref, message: `CVPassport ${product.id}`, test });
    } else {
      const notes = { userId: profile.id, currency };
      if (product.kind === 'tier') notes.plan = product.id; else notes.service = product.id;
      link = await gateways.razorpayLink({ amountMinor: product.amountMinor, notes, description: `CVPassport ${product.id}`, email, test });
    }
  } catch (e) {
    return { ok: false, reason: 'gateway_error', error: e.message };
  }

  const audit = await writeAudit(db, {
    actor, action: 'payment_link', targetType: 'user', targetId: profile.id, targetEmail: email, portal: portal || 'candidate',
    after: { provider, product: product.id, amount_minor: product.amountMinor, currency, mode: test ? 'test' : 'live', link_id: link.id || null },
    metadata: { note: params.note || null },
  });
  return {
    ok: true, url: link.url, provider, product: product.id,
    amount_minor: product.amountMinor, currency, mode: test ? 'test' : 'live',
    data_state: 'real', audit: audit.ok ? 'ok' : 'failed',
  };
}

// #6 Refund a recorded payment. Test-mode default; live requires confirm.
// Records a negative 'refunded' ledger row so revenue nets it out.
export async function refundPayment(db, gateways, params) {
  const { actor } = params;
  const mode = params.mode || 'test';
  const live = mode === 'live';
  if (live && params.confirm !== 'LIVE') return { ok: false, reason: 'live_requires_confirm' };

  let q = db.from('payments').select('id, user_id, email, amount, currency, status, provider, service, payment_intent_id');
  q = params.paymentId ? q.eq('id', params.paymentId) : q.eq('payment_intent_id', params.paymentIntentId);
  const { data: pay, error } = await q.maybeSingle();
  if (error) return { ok: false, reason: 'lookup_failed', error: error.message };
  if (!pay) return { ok: false, reason: 'payment_not_found' };
  if (!pay.payment_intent_id) return { ok: false, reason: 'no_payment_intent_id' };
  if (String(pay.status).toLowerCase() === 'refunded' || Number(pay.amount) < 0) {
    return { ok: false, reason: 'already_refunded' };
  }

  const amountMinor = params.amountMinor != null ? Number(params.amountMinor) : Math.round(Number(pay.amount) * 100);

  let refund;
  try {
    refund = await gateways.refund({ provider: pay.provider, paymentIntentId: pay.payment_intent_id, amountMinor, test: !live });
  } catch (e) {
    return { ok: false, reason: 'gateway_error', error: e.message };
  }

  const { error: insErr } = await db.from('payments').insert({
    user_id: pay.user_id, email: pay.email, amount: -(amountMinor / 100), currency: pay.currency,
    status: 'refunded', provider: pay.provider, service: pay.service,
    external_ref: pay.payment_intent_id, payment_intent_id: refund.refundId || null,
  });

  const audit = await writeAudit(db, {
    actor, action: 'refund', targetType: 'payment', targetId: pay.id, targetEmail: pay.email,
    before: { amount: pay.amount, currency: pay.currency, status: pay.status },
    after: { refunded_minor: amountMinor, refund_id: refund.refundId || null, status: refund.status || null, mode: live ? 'live' : 'test' },
    metadata: { ledger: insErr ? 'failed' : 'ok', ledger_error: insErr?.message || null },
  });
  return {
    ok: true, refund_id: refund.refundId || null, status: refund.status || null,
    amount_minor: amountMinor, currency: pay.currency, mode: live ? 'live' : 'test',
    ledger: insErr ? 'failed' : 'ok', audit: audit.ok ? 'ok' : 'failed',
  };
}

// #5 Reconcile a paid-but-not-provisioned payment: provision access via the
// same grant primitives, then record the payment row. No gateway call.
export async function reconcilePayment(db, params) {
  const { actor, portal, plan, service, currency } = params;
  if (!CURRENCIES.has(currency)) return { ok: false, reason: 'invalid_currency' };
  const email = normEmail(params.email);
  if (!email) return { ok: false, reason: 'email_required' };

  let profile;
  try { profile = await findProfileByEmail(db, email); }
  catch (e) { return { ok: false, reason: 'lookup_failed', error: e.message }; }
  if (!profile) return { ok: false, reason: 'user_not_found' };
  const userId = profile.id;

  try {
    if (service) {
      const g = await grantAlaCarte(db, { service, userId });
      if (!g.ok) return { ok: false, reason: 'grant_failed', error: g.error?.message || g.reason };
    } else if (portal === 'hr') {
      const days = TIERS.foundation?.duration_days || 30;
      const { error } = await db.rpc('grant_hr_foundation', { p_user_id: userId, p_days: days, p_source: 'manual' });
      if (error) return { ok: false, reason: 'grant_failed', error: error.message };
    } else {
      const slug = PROFILE_PLAN_TO_TIER[plan];
      const tier = TIERS[slug];
      if (!tier || slug === 'explorer') return { ok: false, reason: 'invalid_plan' };
      if (tier.model === 'permanent') {
        const { error } = await db.rpc('grant_download_credits', { p_user_id: userId, p_credits: 3 });
        if (error) return { ok: false, reason: 'grant_failed', error: error.message };
        await db.from('profiles').update({ single_cv_unlocked: true }).eq('id', userId);
      } else {
        const { error } = await db.rpc('extend_pro_access', { p_user_id: userId, p_days: tier.duration_days });
        if (error) return { ok: false, reason: 'grant_failed', error: error.message };
        await db.from('profiles').update({ plan, is_pro: true }).eq('id', userId);
      }
    }
  } catch (e) {
    return { ok: false, reason: 'grant_exception', error: e.message };
  }

  // provider must satisfy the payments CHECK (ziina|razorpay); infer from currency.
  const provider = REAL_PROVIDERS.has(params.provider) ? params.provider : gatewayForCurrency(currency);
  const amountMajor = params.amountMinor != null ? Number(params.amountMinor) / 100 : 0;
  const { error: payErr } = await db.from('payments').insert({
    user_id: userId, email: profile.email, amount: amountMajor, currency,
    status: 'succeeded', provider, service: service || plan || (portal === 'hr' ? 'foundation' : null),
    external_ref: params.externalRef || null, payment_intent_id: params.paymentIntentId || null,
  });

  const audit = await writeAudit(db, {
    actor, action: 'reconcile', targetType: 'user', targetId: userId, targetEmail: profile.email, portal: portal || 'candidate',
    after: { product: service || plan || 'foundation', amount_minor: params.amountMinor ?? null, currency, provider },
    metadata: { note: params.note || null, payment_row: payErr ? 'failed' : 'ok' },
  });
  return { ok: true, user_id: userId, payment_row: payErr ? 'failed' : 'ok', audit: audit.ok ? 'ok' : 'failed' };
}

// #10 Dual-currency revenue. AED and INR reported SEPARATELY, net of refunds,
// never summed or FX-converted. data_state tells the UI how to badge it.
export async function revenueSummary(db, params = {}) {
  let q = db.from('payments').select('amount, currency, status, provider, created_at');
  if (params.from) q = q.gte('created_at', new Date(params.from).toISOString());
  if (params.to) q = q.lte('created_at', new Date(params.to).toISOString());
  const { data, error } = await q;

  if (error) {
    return {
      ok: true, data_state: 'needs_wiring',
      reason: `payments query failed: ${error.message}. Confirm migration 045_payments_table is applied.`,
      byCurrency: {},
    };
  }
  if (!data || data.length === 0) {
    const est = await estimateRevenue(db);
    return {
      ok: true, data_state: 'estimated',
      reason: 'payments table is empty. The webhooks DO insert real rows (recordPayment in api/ziina-webhook.js and api/razorpay.js), but the insert is best-effort/non-fatal — it console.errors and continues so a missing table never blocks an access grant. Real rows appear once a live payment captures with migration 045 applied. Estimate below is a rough floor, not the ledger.',
      byCurrency: est,
    };
  }

  const acc = {
    AED: { gross: 0, refunds: 0, net: 0, count: 0 },
    INR: { gross: 0, refunds: 0, net: 0, count: 0 },
  };
  for (const r of data) {
    const cur = String(r.currency || '').toUpperCase();
    if (!acc[cur]) continue;
    const amt = Number(r.amount || 0);
    const st = String(r.status || '').toLowerCase();
    if (st === 'refunded' || amt < 0) {
      acc[cur].refunds += Math.abs(amt);
    } else if (SUCCEEDED.has(st)) {
      acc[cur].gross += amt;
      acc[cur].count += 1;
    }
  }
  acc.AED.net = acc.AED.gross - acc.AED.refunds;
  acc.INR.net = acc.INR.gross - acc.INR.refunds;

  return {
    ok: true, data_state: 'real', byCurrency: acc,
    note: 'AED and INR are separate markets — never FX-converted or summed.',
  };
}

// Rough estimated floor when the ledger is empty. Labeled 'estimated'; not a
// substitute for the payments table.
async function estimateRevenue(db) {
  try {
    const { count } = await db
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gt('pro_access_expires_at', new Date().toISOString());
    const pro = count || 0;
    const aedPrice = TIERS.active_hunter?.prices?.AED || 0;
    const inrPrice = TIERS.active_hunter?.prices?.INR || 0;
    return {
      AED: { estimate: aedPrice * pro, basis: `${pro} active pro accesses × AED ${aedPrice} (Active Hunter)` },
      INR: { estimate: inrPrice * pro, basis: `${pro} active pro accesses × INR ${inrPrice} (Active Hunter)` },
    };
  } catch (e) {
    return { AED: { estimate: null }, INR: { estimate: null }, error: e.message };
  }
}
