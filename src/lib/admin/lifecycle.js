// ============================================================================
// src/lib/admin/lifecycle.js — Admin Command Center, Phase 3: account lifecycle.
//
// Dependency-injected: each function takes the service-role `db`, an injected
// `auth` object (the Supabase auth-admin / anon calls, which need clients +
// keys, live in api/admin.js), and plain params. Testable with mocks; no real
// email/auth call fires during verification.
//
// Actions: reset_password, resend_verification, view_as (time-boxed
// impersonation link), delete_or_anonymize, manual_unlock, add_credits.
// Every write funnels through writeAudit(). Owner is protected from deletion.
// ============================================================================

import { grantAlaCarte } from '../payments/alaCarteGrant.js';
import { writeAudit, normEmail, DEFAULT_OWNER_EMAIL } from './adminCore.js';

async function findUser(db, { userId, email }) {
  let q = db.from('profiles').select('id, email, account_status');
  q = userId ? q.eq('id', userId) : q.eq('email', normEmail(email));
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(`user lookup failed: ${error.message}`);
  return data || null;
}

// #7a Send a password-reset email (Supabase sends it via the configured SMTP).
export async function resetPassword(db, auth, params) {
  const email = params.userId ? null : normEmail(params.email);
  const user = await findUser(db, { userId: params.userId, email: params.email });
  const target = user?.email || email;
  if (!target) return { ok: false, reason: 'email_required' };
  const { error } = await auth.resetPassword(target);
  if (error) return { ok: false, reason: 'send_failed', error: error.message };
  const audit = await writeAudit(db, {
    actor: params.actor, action: 'reset_password', targetType: 'user', targetId: user?.id || null, targetEmail: target, portal: 'both',
  });
  return { ok: true, sent: true, email: target, audit: audit.ok ? 'ok' : 'failed' };
}

// #7b Resend the signup verification email.
export async function resendVerification(db, auth, params) {
  const user = await findUser(db, { userId: params.userId, email: params.email });
  const target = user?.email || normEmail(params.email);
  if (!target) return { ok: false, reason: 'email_required' };
  const { error } = await auth.resendSignup(target);
  if (error) return { ok: false, reason: 'send_failed', error: error.message };
  const audit = await writeAudit(db, {
    actor: params.actor, action: 'resend_verification', targetType: 'user', targetId: user?.id || null, targetEmail: target, portal: 'both',
  });
  return { ok: true, sent: true, email: target, audit: audit.ok ? 'ok' : 'failed' };
}

// #7c View as user — a time-boxed magic link that signs in as the target.
// Sensitive: owner-only, heavily audited. The link expires per the project's
// Supabase OTP TTL. Returned for the owner to open in a private window.
export async function viewAsUser(db, auth, params) {
  const user = await findUser(db, { userId: params.userId, email: params.email });
  if (!user) return { ok: false, reason: 'user_not_found' };
  const { data, error } = await auth.generateMagicLink(user.email);
  if (error) return { ok: false, reason: 'link_failed', error: error.message };
  const link = data?.properties?.action_link || data?.action_link || null;
  const audit = await writeAudit(db, {
    actor: params.actor, action: 'view_as', targetType: 'user', targetId: user.id, targetEmail: user.email, portal: 'both',
    metadata: { note: 'time-boxed magic link generated' },
  });
  return { ok: true, action_link: link, note: 'Open in a private window. Expires per your Supabase OTP TTL.', user_id: user.id, audit: audit.ok ? 'ok' : 'failed' };
}

// #7d Delete or anonymize. Default = anonymize (reversible-ish, keeps rows for
// integrity). mode:'delete' hard-deletes the auth user and requires
// confirm:'DELETE'. Owner can never be deleted or anonymized.
export async function deleteOrAnonymize(db, auth, params) {
  const ownerEmail = params.ownerEmail || DEFAULT_OWNER_EMAIL;
  const user = await findUser(db, { userId: params.userId, email: params.email });
  if (!user) return { ok: false, reason: 'user_not_found' };
  if (normEmail(user.email) === normEmail(ownerEmail)) return { ok: false, reason: 'cannot_delete_owner' };
  const before = { email: user.email, account_status: user.account_status };

  if (params.mode === 'delete') {
    if (params.confirm !== 'DELETE') return { ok: false, reason: 'delete_requires_confirm' };
    const { error } = await auth.deleteUser(user.id);
    if (error) return { ok: false, reason: 'delete_failed', error: error.message };
    const audit = await writeAudit(db, {
      actor: params.actor, action: 'delete_user', targetType: 'user', targetId: user.id, targetEmail: user.email, portal: 'both', before,
    });
    return { ok: true, mode: 'delete', user_id: user.id, audit: audit.ok ? 'ok' : 'failed' };
  }

  // anonymize (default): scrub the email + suspend so the account is dead but
  // the rows survive for referential integrity. Best-effort auth scrub too.
  const anonEmail = `anon+${user.id}@deleted.mycvpassport.com`;
  const { error } = await db.from('profiles').update({
    email: anonEmail, account_status: 'suspended', suspended_reason: 'anonymized',
    suspended_message: 'This account has been closed.', suspended_by: params.actor?.email || 'admin',
  }).eq('id', user.id);
  if (error) return { ok: false, reason: 'anonymize_failed', error: error.message };
  try { await auth.updateUser(user.id, { email: anonEmail, user_metadata: {} }); } catch { /* best-effort auth scrub */ }
  const audit = await writeAudit(db, {
    actor: params.actor, action: 'anonymize', targetType: 'user', targetId: user.id, targetEmail: user.email, portal: 'both', before, after: { email: anonEmail },
  });
  return { ok: true, mode: 'anonymize', user_id: user.id, audit: audit.ok ? 'ok' : 'failed' };
}

// #manual unlock — grant an a-la-carte permission (e.g. linkedin_optimizer).
export async function manualUnlock(db, params) {
  const { service } = params;
  const user = await findUser(db, { userId: params.userId, email: params.email });
  if (!user) return { ok: false, reason: 'user_not_found' };
  const g = await grantAlaCarte(db, { service, userId: user.id });
  if (!g.ok) return { ok: false, reason: 'unlock_failed', error: g.error?.message || g.reason };
  if (service === 'linkedin_optimizer') {
    await db.from('profiles').update({ linkedin_unlocked: true }).eq('id', user.id);
  }
  const audit = await writeAudit(db, {
    actor: params.actor, action: 'manual_unlock', targetType: 'user', targetId: user.id, targetEmail: user.email, after: { service },
  });
  return { ok: true, service, user_id: user.id, audit: audit.ok ? 'ok' : 'failed' };
}

// #add credits — grant download or cover-letter credits via the atomic RPCs.
export async function addCredits(db, params) {
  const kind = params.kind === 'cover' ? 'cover' : 'download';
  const n = Number(params.amount) || 0;
  if (n <= 0) return { ok: false, reason: 'invalid_amount' };
  const user = await findUser(db, { userId: params.userId, email: params.email });
  if (!user) return { ok: false, reason: 'user_not_found' };
  const rpc = kind === 'cover' ? 'grant_cover_letter_credits' : 'grant_download_credits';
  const { error } = await db.rpc(rpc, { p_user_id: user.id, p_credits: n });
  if (error) return { ok: false, reason: 'grant_failed', error: error.message };
  const audit = await writeAudit(db, {
    actor: params.actor, action: 'add_credits', targetType: 'user', targetId: user.id, targetEmail: user.email, after: { kind, amount: n },
  });
  return { ok: true, kind, amount: n, user_id: user.id, audit: audit.ok ? 'ok' : 'failed' };
}
