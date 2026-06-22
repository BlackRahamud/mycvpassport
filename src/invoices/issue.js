// Shared invoice/receipt issuer. Called from both webhook handlers
// (api/razorpay.js, api/ziina-webhook.js) AFTER applyPaidTier succeeds.
//
// Responsibilities:
//   1. Look up customer details (auth.users + profiles).
//   2. Snapshot seller identity from env vars (IN) or fixed values (AE).
//   3. Allocate next document number via next_invoice_number RPC.
//   4. INSERT into invoices with ON CONFLICT (payment_id) DO NOTHING.
//   5. If the row is new, send a short summary email via Resend with a
//      link back to the in-app /account/invoices/{id} page.
//
// Idempotency is enforced two ways: payment_id UNIQUE NOT NULL at the DB
// level, and the ON CONFLICT DO NOTHING short-circuit here. Email is
// best-effort — a delivery failure logs but does not fail the webhook
// (the row is durable; the buyer can re-fetch from /account/invoices).
//
// Never trust client-sent values. Amount/currency/payment_id come from
// the gateway-signed webhook payload, not the request body.

import { Resend } from 'resend';
import { TIERS } from '../config/tierConfig.js';

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'https://mycvpassport.com';

const COUNTRY_BY_ENTITY = {
  IN: 'India',
  AE: 'United Arab Emirates',
};

function sellerSnapshotForEntity(entity) {
  if (entity === 'IN') {
    const pan = (process.env.INVOICE_SELLER_IN_PAN || '').trim();
    return {
      seller_name: process.env.INVOICE_SELLER_IN_NAME || 'CVPassport',
      seller_address: process.env.INVOICE_SELLER_IN_ADDRESS || null,
      seller_tax_id: pan || null,
      seller_tax_id_label: pan ? 'PAN' : null,
      seller_email: process.env.INVOICE_SELLER_IN_EMAIL || 'billing@mycvpassport.com',
      seller_support_email: process.env.INVOICE_SELLER_IN_SUPPORT_EMAIL || 'billing@mycvpassport.com',
    };
  }
  // AE: fixed values per spec — receipt seller block is intentionally
  // CVPassport + domain + email only (no licence number, no TRN, no address).
  return {
    seller_name: 'CVPassport',
    seller_address: null,
    seller_tax_id: null,
    seller_tax_id_label: null,
    seller_email: 'billing@mycvpassport.com',
    seller_support_email: 'billing@mycvpassport.com',
  };
}

async function fetchCustomer(db, userId) {
  if (!userId) return { name: null, email: null };
  try {
    const { data: { user } = {} } = await db.auth.admin.getUserById(userId);
    if (!user) return { name: null, email: null };
    const meta = user.user_metadata || {};
    const email = user.email || null;
    const name = meta.full_name || meta.name || (email ? email.split('@')[0] : null);
    return { name, email };
  } catch (e) {
    console.error('[invoices/issue] fetchCustomer failed', { userId, error: e?.message });
    return { name: null, email: null };
  }
}

function planDescription(tierSlug) {
  const tier = TIERS[tierSlug];
  if (!tier) return { description: tierSlug || 'Plan', access_days: null };
  return {
    description: tier.displayName,
    access_days: tier.duration_days || null,
  };
}

function emailBodyHTML({ customer_name, description, amount_label, invoice_number, kind, detail_url, support_email }) {
  const docKind = kind === 'receipt' ? 'receipt' : 'invoice';
  const greeting = customer_name ? `Hi ${customer_name},` : 'Hi,';
  return `<!DOCTYPE html><html><body style="margin:0;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#16130f;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
    <div style="width:32px;height:32px;border-radius:8px;background:#C2691A;display:inline-block;"></div>
    <div style="font-size:18px;font-weight:700;letter-spacing:-0.02em;">CV<span style="color:#9a5212;">Passport</span></div>
  </div>
  <h2 style="font-size:20px;font-weight:700;margin:0 0 8px;">Thank you for choosing CVPassport.</h2>
  <p style="font-size:14.5px;line-height:1.6;color:#514c44;margin:0 0 18px;">${esc(greeting)} we've received your payment for <strong style="color:#16130f;">${esc(description)}</strong> — ${esc(amount_label)}.</p>
  <p style="font-size:14.5px;line-height:1.6;color:#514c44;margin:0 0 28px;">Your ${docKind} number is <strong style="font-family:ui-monospace,monospace;color:#16130f;">${esc(invoice_number)}</strong>. The full document is available in your account.</p>
  <div style="margin:0 0 32px;">
    <a href="${esc(detail_url)}" style="display:inline-block;background:#16130f;color:#ffffff;padding:13px 24px;border-radius:9px;text-decoration:none;font-weight:600;font-size:14px;">View ${docKind} →</a>
  </div>
  <hr style="border:0;border-top:1px solid rgba(22,19,15,0.12);margin:0 0 18px;">
  <p style="font-size:12px;color:#8a8378;line-height:1.6;margin:0;">
    Questions? Reply to this email or write to <a href="mailto:${esc(support_email)}" style="color:#514c44;">${esc(support_email)}</a>.<br>
    This is a transactional message about your payment with CVPassport.
  </p>
</div>
</body></html>`;
}

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatAmountLabel(currency, total) {
  const v = Number(total || 0).toFixed(2);
  if (currency === 'INR') return `₹${v}`;
  if (currency === 'AED') return `AED ${v}`;
  return `${currency} ${v}`;
}

export async function issueDocument(db, opts) {
  const {
    user_id,
    payment_id,
    gateway,        // 'razorpay' | 'ziina'
    entity,         // 'IN' | 'AE'
    kind,           // 'invoice' | 'receipt'
    tier_slug,      // 'express_pass' | 'active_hunter' | 'career_pro'
    amount_minor,   // smallest unit from the gateway: paise (INR) or fils (AED)
    currency,       // 'INR' | 'AED'
  } = opts;

  if (!payment_id || !user_id || !gateway || !entity || !kind || !currency) {
    console.error('[invoices/issue] missing required fields', opts);
    return { ok: false, reason: 'missing_fields' };
  }

  const amountMajor = Number(amount_minor || 0) / 100;
  const customer = await fetchCustomer(db, user_id);
  const seller = sellerSnapshotForEntity(entity);
  const { description, access_days } = planDescription(tier_slug);
  const customer_country = COUNTRY_BY_ENTITY[entity] || null;
  const year = new Date().getUTCFullYear();

  // 1. Allocate next number atomically. The RPC is service-role-only and
  //    builds the prefixed string (CVP-IN-2026-NNNN or RCP-AE-2026-NNNN).
  const { data: numberData, error: numberErr } = await db.rpc('next_invoice_number', {
    p_entity: entity,
    p_kind: kind,
    p_year: year,
  });
  if (numberErr) {
    console.error('[invoices/issue] next_invoice_number failed', { error: numberErr.message, entity, kind, year });
    return { ok: false, reason: 'numbering_failed' };
  }
  const invoice_number = numberData;

  // 2. Insert with ON CONFLICT (payment_id) DO NOTHING. supabase-js's
  //    .insert() supports `onConflict` via the second arg of .upsert(),
  //    but for explicit "ignore on conflict" we use .insert(...) and
  //    treat a duplicate-key error or zero-returned-rows as idempotent
  //    short-circuit.
  const row = {
    invoice_number,
    kind,
    entity,
    user_id,
    customer_name: customer.name,
    customer_email: customer.email,
    customer_country,
    plan: tier_slug || null,
    description,
    access_days,
    currency,
    subtotal: amountMajor,
    tax_amount: 0,
    total: amountMajor,
    gateway,
    payment_id,
    status: 'paid',
    seller_name: seller.seller_name,
    seller_address: seller.seller_address,
    seller_tax_id: seller.seller_tax_id,
    seller_tax_id_label: seller.seller_tax_id_label,
    seller_email: seller.seller_email,
    seller_support_email: seller.seller_support_email,
  };

  const { data: inserted, error: insertErr } = await db
    .from('invoices')
    .insert(row)
    .select('id, invoice_number')
    .maybeSingle();

  if (insertErr) {
    // Duplicate payment_id (unique violation) is the expected idempotent
    // outcome on webhook retry. Supabase/PostgREST returns 23505.
    if (insertErr.code === '23505') {
      console.log('[invoices/issue] idempotent — payment_id already invoiced', { payment_id });
      return { ok: true, idempotent: true };
    }
    console.error('[invoices/issue] insert failed', { error: insertErr.message, payment_id });
    return { ok: false, reason: 'insert_failed', error: insertErr.message };
  }

  if (!inserted) {
    // Insert returned no row — treat as idempotent.
    console.log('[invoices/issue] idempotent (no row returned)', { payment_id });
    return { ok: true, idempotent: true };
  }

  // 3. Send email (best-effort). Resend wired via RESEND_API_KEY; if
  //    absent, log the gap and return success — the row persists and the
  //    buyer can still reach the document via the in-app page.
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[invoices/issue] RESEND_API_KEY missing — skipping email', { invoice_number });
    return { ok: true, invoice_id: inserted.id, invoice_number, email_skipped: true };
  }
  if (!customer.email) {
    console.warn('[invoices/issue] no customer email — skipping send', { invoice_number, user_id });
    return { ok: true, invoice_id: inserted.id, invoice_number, email_skipped: true };
  }

  try {
    const resend = new Resend(apiKey);
    const detail_url = `${PUBLIC_BASE_URL}/account/invoices/${inserted.id}`;
    const amount_label = formatAmountLabel(currency, amountMajor);
    const html = emailBodyHTML({
      customer_name: customer.name,
      description,
      amount_label,
      invoice_number,
      kind,
      detail_url,
      support_email: seller.seller_support_email,
    });
    const subjectLabel = kind === 'receipt' ? invoice_number : invoice_number;
    await resend.emails.send({
      from: 'CVPassport <noreply@mycvpassport.com>',
      to: customer.email,
      reply_to: 'billing@mycvpassport.com',
      subject: `Your CVPassport receipt — ${subjectLabel}`,
      html,
    });
    // Mark sent. Failure to record is non-fatal.
    await db
      .from('invoices')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', inserted.id);
    console.log('[invoices/issue] sent', { invoice_number, to: customer.email });
  } catch (e) {
    console.error('[invoices/issue] email send failed', { invoice_number, error: e?.message });
  }

  return { ok: true, invoice_id: inserted.id, invoice_number };
}
