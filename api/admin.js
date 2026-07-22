/**
 * /api/admin?action=ping|grant_access|set_plan|suspend|unsuspend|audit_query
 *
 * Single owner-gated admin endpoint. Multiplexed via ?action= (same pattern
 * as api/razorpay.js) to stay within the Vercel Hobby serverless-function
 * budget — this is the 12th and final serverless function.
 *
 * Auth: Bearer Supabase JWT, verified server-side and gated to the owner
 * email (ADMIN_OWNER_EMAIL, defaulting to the founder). The gate is
 * structured (resolveAdminRole) so more roles can be added later without
 * touching call sites; today it is owner-or-nothing.
 *
 * Every write action is audited by src/lib/admin/adminCore.js. All logic
 * lives in that dependency-injected module; this file only wires
 * auth → service client → dispatch → response.
 */

import { createClient } from '@supabase/supabase-js';
import Razorpay from 'razorpay';
import {
  resolveAdminRole,
  grantAccess,
  setPlan,
  suspendAccount,
  unsuspendAccount,
  queryAudit,
  DEFAULT_OWNER_EMAIL,
} from '../src/lib/admin/adminCore.js';
import {
  createPaymentLink,
  refundPayment,
  reconcilePayment,
  revenueSummary,
} from '../src/lib/admin/money.js';
import {
  resetPassword,
  resendVerification,
  viewAsUser,
  deleteOrAnonymize,
  manualUnlock,
  addCredits,
} from '../src/lib/admin/lifecycle.js';
import { plansList, planUpsert, planDelete } from '../src/lib/admin/plans.js';

export const config = { api: { bodyParser: false } };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER_EMAIL = process.env.ADMIN_OWNER_EMAIL || DEFAULT_OWNER_EMAIL;

// Money-safety: TEST/sandbox unless explicitly flipped. No live-money
// capability ships enabled — set ADMIN_PAYMENTS_MODE=live AND pass
// confirm:'LIVE' per request to touch real money.
const MONEY_MODE = process.env.ADMIN_PAYMENTS_MODE === 'live' ? 'live' : 'test';

const db = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

// ── Gateway calls (need env + SDK, so they live here, not in money.js).
// Injected into money.js so its orchestration stays gateway-agnostic and
// testable. In test mode Ziina sets test:true and Razorpay uses TEST keys;
// both FAIL CLOSED when the required credentials are absent.
async function ziinaLink({ amountMinor, ref, message, test }) {
  if (!process.env.ZIINA_API_TOKEN) throw new Error('ZIINA_API_TOKEN not set');
  const resp = await fetch('https://api-v2.ziina.com/api/payment_intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ZIINA_API_TOKEN}` },
    body: JSON.stringify({
      amount: amountMinor,
      currency_code: 'AED',
      message: message || 'CVPassport',
      success_url: 'https://www.mycvpassport.com/payment-success',
      cancel_url: 'https://www.mycvpassport.com/pricing',
      external_reference: ref,
      test: !!test,
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`ziina: ${JSON.stringify(data)}`);
  return { url: data.redirect_url, id: data.id || null };
}

function razorpayClient(test) {
  const keyId = test ? process.env.RAZORPAY_TEST_KEY_ID : process.env.RAZORPAY_KEY_ID;
  const secret = test ? process.env.RAZORPAY_TEST_SECRET : process.env.RAZORPAY_SECRET;
  if (!keyId || !secret) {
    throw new Error(test
      ? 'Razorpay TEST keys not set (RAZORPAY_TEST_KEY_ID / RAZORPAY_TEST_SECRET)'
      : 'Razorpay live keys not set (RAZORPAY_KEY_ID / RAZORPAY_SECRET)');
  }
  return new Razorpay({ key_id: keyId, key_secret: secret });
}

async function razorpayLink({ amountMinor, notes, description, email, test }) {
  const rp = razorpayClient(test);
  const link = await rp.paymentLink.create({
    amount: amountMinor,
    currency: 'INR',
    description: description || 'CVPassport',
    customer: email ? { email } : undefined,
    notify: { email: false, sms: false },
    notes,
  });
  return { url: link.short_url, id: link.id };
}

async function gatewayRefund({ provider, paymentIntentId, amountMinor, test }) {
  if (provider === 'razorpay') {
    const rp = razorpayClient(test);
    const r = await rp.payments.refund(paymentIntentId, amountMinor ? { amount: amountMinor } : {});
    return { refundId: r.id, status: r.status };
  }
  if (provider === 'ziina') {
    if (!process.env.ZIINA_API_TOKEN) throw new Error('ZIINA_API_TOKEN not set');
    // NOTE: Ziina refund endpoint shape is best-effort here — confirm against
    // Ziina's current API docs before relying on live refunds.
    const resp = await fetch(`https://api-v2.ziina.com/api/payment_intent/${paymentIntentId}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ZIINA_API_TOKEN}` },
      body: JSON.stringify(amountMinor ? { amount: amountMinor } : {}),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(`ziina refund: ${JSON.stringify(data)}`);
    return { refundId: data.id || null, status: data.status || 'refunded' };
  }
  throw new Error(`unknown provider "${provider}"`);
}

const gateways = { ziinaLink, razorpayLink, refund: gatewayRefund };

// ── Auth calls (Supabase auth-admin + anon) injected into lifecycle.js.
// resetPassword/resendSignup use the anon client so Supabase sends the email
// via its configured SMTP; generateMagicLink/deleteUser/updateUser use the
// service-role admin API.
const anonClient = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const auth = {
  resetPassword: (email) => anonClient.auth.resetPasswordForEmail(email, { redirectTo: 'https://www.mycvpassport.com/reset-password' }),
  resendSignup: (email) => anonClient.auth.resend({ type: 'signup', email }),
  generateMagicLink: (email) => db.auth.admin.generateLink({ type: 'magiclink', email }),
  deleteUser: (userId) => db.auth.admin.deleteUser(userId),
  updateUser: (userId, attrs) => db.auth.admin.updateUserById(userId, attrs),
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// Owner gate — verifies the caller's Supabase session and confirms the owner
// role. Sends the response itself on failure and returns null.
async function requireOwner(req, res) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !db) {
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
  const { data: { user } = {}, error } = await authClient.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'Invalid session' });
    return null;
  }
  const role = resolveAdminRole(user, OWNER_EMAIL);
  if (role !== 'owner') {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return { id: user.id, email: user.email, role };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const actor = await requireOwner(req, res);
  if (!actor) return; // response already sent by the gate

  const raw = await getRawBody(req);
  let body = {};
  if (raw) {
    try { body = JSON.parse(raw); } catch { body = {}; }
  }
  const action = String(req.query?.action || body.action || '');

  try {
    switch (action) {
      case 'ping':
        return res.status(200).json({ ok: true, role: actor.role, email: actor.email });
      case 'grant_access':
        return res.status(200).json(await grantAccess(db, { ...body, actor }));
      case 'set_plan':
        return res.status(200).json(await setPlan(db, { ...body, actor }));
      case 'suspend':
        return res.status(200).json(await suspendAccount(db, { ...body, actor, ownerEmail: OWNER_EMAIL }));
      case 'unsuspend':
        return res.status(200).json(await unsuspendAccount(db, { ...body, actor }));
      case 'audit_query':
        return res.status(200).json(await queryAudit(db, body));
      // ── Phase 2: money (test-mode by default) ──
      case 'payment_link':
        return res.status(200).json(await createPaymentLink(db, gateways, { ...body, actor, mode: MONEY_MODE }));
      case 'refund':
        return res.status(200).json(await refundPayment(db, gateways, { ...body, actor, mode: MONEY_MODE }));
      case 'reconcile':
        return res.status(200).json(await reconcilePayment(db, { ...body, actor }));
      case 'revenue':
        return res.status(200).json(await revenueSummary(db, body));
      // ── Phase 3: account lifecycle + plan builder ──
      case 'reset_password':
        return res.status(200).json(await resetPassword(db, auth, { ...body, actor }));
      case 'resend_verification':
        return res.status(200).json(await resendVerification(db, auth, { ...body, actor }));
      case 'view_as':
        return res.status(200).json(await viewAsUser(db, auth, { ...body, actor }));
      case 'delete_or_anonymize':
        return res.status(200).json(await deleteOrAnonymize(db, auth, { ...body, actor, ownerEmail: OWNER_EMAIL }));
      case 'manual_unlock':
        return res.status(200).json(await manualUnlock(db, { ...body, actor }));
      case 'add_credits':
        return res.status(200).json(await addCredits(db, { ...body, actor }));
      case 'plans_list':
        return res.status(200).json(await plansList(db));
      case 'plan_upsert':
        return res.status(200).json(await planUpsert(db, { ...body, actor }));
      case 'plan_delete':
        return res.status(200).json(await planDelete(db, { ...body, actor }));
      default:
        return res.status(400).json({ error: 'Invalid or missing action' });
    }
  } catch (e) {
    console.error('[admin] handler error', { action, error: e?.message || String(e) });
    return res.status(500).json({ ok: false, error: e?.message || 'Internal error' });
  }
}
