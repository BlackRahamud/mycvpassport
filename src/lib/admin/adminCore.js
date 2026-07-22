// ============================================================================
// src/lib/admin/adminCore.js — UI-agnostic admin Command Center logic.
//
// Dependency-injected on purpose: every function takes a service-role
// Supabase client `db` plus plain params — no env, no req/res, no global
// client. That makes it unit-testable without a live DB (see
// scripts/verify-admin-backend.mjs) and reusable from any endpoint.
//
// Owner-gating + auth live in the thin api/admin.js wrapper; this module
// assumes the caller is already authorised and receives the acting admin as
// `actor` ({ id, email }) purely for the audit trail.
//
// Phase 1 surface: grant_access (candidate + HR, existing user OR new email),
// set_plan, suspend/unsuspend (soft, reversible, owner-protected), audit
// read. Every write funnels through writeAudit().
// ============================================================================

import { PROFILE_PLAN_TO_TIER } from '../../config/tierConfig.js';

export const DEFAULT_OWNER_EMAIL = 'connectingjunaidkhan@gmail.com';

// Candidate profiles.plan enum values, derived from the single source of
// truth so a new tier can never drift out of sync with what admin accepts.
const CANDIDATE_PLANS = new Set(Object.keys(PROFILE_PLAN_TO_TIER)); // FREE, EXPRESS_PASS, ACTIVE_HUNTER, CAREER_PRO
const HR_PLANS = new Set(['free', 'foundation']);
const PERMANENT_EXPIRY = '2099-01-01T00:00:00.000Z';

export function normEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// Structured so more roles can be added later without touching call sites;
// today it is owner-or-nothing. NEVER trust a profile row or client input —
// the caller passes the AUTHENTICATED session user.
export function resolveAdminRole(user, ownerEmail = DEFAULT_OWNER_EMAIL) {
  const email = normEmail(user?.email);
  if (email && email === normEmail(ownerEmail)) return 'owner';
  return null;
}

// ── Audit — every write action calls this. Best-effort but REPORTED: a
// failed audit never rolls back the action (it already happened) but the
// caller surfaces audit:'failed' so a gap is visible, never silent.
export async function writeAudit(db, entry) {
  try {
    const { error } = await db.from('audit_log').insert({
      actor_id: entry.actor?.id || null,
      actor_email: entry.actor?.email || 'unknown',
      action: entry.action,
      target_type: entry.targetType || null,
      target_id: entry.targetId != null ? String(entry.targetId) : null,
      target_email: entry.targetEmail ? normEmail(entry.targetEmail) : null,
      portal: entry.portal || null,
      before: entry.before ?? null,
      after: entry.after ?? null,
      metadata: entry.metadata ?? null,
      result: entry.result || 'ok',
      error: entry.error || null,
    });
    return { ok: !error, error: error?.message || null };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

function computeExpiry({ accessKind, durationDays, expiry }) {
  if (accessKind === 'permanent') return PERMANENT_EXPIRY;
  if (accessKind === 'expiry') {
    if (!expiry) throw new Error('expiry required for access_kind=expiry');
    return new Date(expiry).toISOString();
  }
  const days = Number(durationDays);
  if (!days || days <= 0) throw new Error('duration_days required for access_kind=duration');
  return new Date(Date.now() + days * 86400000).toISOString();
}

function daysUntil(iso) {
  return Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

export function validatePlan(portal, plan) {
  if (portal === 'hr') return HR_PLANS.has(plan);
  if (portal === 'candidate') return CANDIDATE_PLANS.has(plan);
  return false;
}

async function findProfile(db, { userId, email }) {
  let q = db.from('profiles').select('id, email, plan, pro_access_expires_at, account_status');
  q = userId ? q.eq('id', userId) : q.eq('email', normEmail(email));
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(`profile lookup failed: ${error.message}`);
  return data || null;
}

// Apply a plan grant to an EXISTING profile row (either portal). Reuses the
// existing grant primitives (grant_hr_foundation RPC for HR; direct
// pro_access_expires_at write for candidate — the authoritative field per
// src/config/access.js). Returns the shared result shape.
async function applyToUser(db, { actor, profile, portal, plan, accessKind, durationDays, expiry, note }) {
  const before = { plan: profile.plan, pro_access_expires_at: profile.pro_access_expires_at };
  let after;

  if (portal === 'hr') {
    if (plan === 'foundation') {
      const days = accessKind === 'permanent'
        ? 36500
        : accessKind === 'expiry'
          ? daysUntil(new Date(expiry).toISOString())
          : Number(durationDays) || 30;
      const { error } = await db.rpc('grant_hr_foundation', { p_user_id: profile.id, p_days: days, p_source: 'manual' });
      if (error) throw new Error(`grant_hr_foundation failed: ${error.message}`);
      after = { hr_plan: 'foundation', days };
    } else {
      const { error } = await db.from('hr_entitlements').upsert(
        { user_id: profile.id, plan: 'free', status: 'active', current_period_end: null, source: 'manual' },
        { onConflict: 'user_id' },
      );
      if (error) throw new Error(`hr entitlement downgrade failed: ${error.message}`);
      after = { hr_plan: 'free' };
    }
  } else {
    if (plan === 'FREE') {
      const { error } = await db.from('profiles').update({ plan: 'FREE', pro_access_expires_at: null, is_pro: false }).eq('id', profile.id);
      if (error) throw new Error(`profile downgrade failed: ${error.message}`);
      after = { plan: 'FREE', pro_access_expires_at: null };
    } else {
      const expiresAt = computeExpiry({ accessKind, durationDays, expiry });
      const { error } = await db.from('profiles').update({ plan, pro_access_expires_at: expiresAt, is_pro: true }).eq('id', profile.id);
      if (error) throw new Error(`profile grant failed: ${error.message}`);
      after = { plan, pro_access_expires_at: expiresAt };
    }
  }

  const audit = await writeAudit(db, {
    actor, action: 'grant_access', targetType: 'user', targetId: profile.id, targetEmail: profile.email,
    portal, before, after,
    metadata: { accessKind: accessKind || 'duration', durationDays: durationDays || null, expiry: expiry || null, note: note || null, applied: 'immediate' },
  });
  return { ok: true, applied: 'immediate', user_id: profile.id, audit: audit.ok ? 'ok' : 'failed' };
}

// #1 Grant access to any email, existing or new. New email → a pending grant
// keyed to the email that the DB trigger resolves on signup.
export async function grantAccess(db, params) {
  const { actor, portal, plan } = params;
  const email = normEmail(params.email);
  if (!email) return { ok: false, reason: 'email_required' };
  if (!['candidate', 'hr'].includes(portal)) return { ok: false, reason: 'invalid_portal' };
  if (!validatePlan(portal, plan)) return { ok: false, reason: 'invalid_plan' };

  const profile = await findProfile(db, { email });
  if (profile) {
    return applyToUser(db, { ...params, profile, email });
  }

  const accessKind = params.accessKind || 'duration';
  const row = {
    email,
    portal,
    plan,
    access_kind: accessKind,
    duration_days: accessKind === 'duration' ? (Number(params.durationDays) || 30) : null,
    expiry: accessKind === 'expiry' ? new Date(params.expiry).toISOString() : null,
    note: params.note || null,
    status: 'pending',
    created_by: actor?.email || 'unknown',
  };
  const { error } = await db.from('pending_grants').upsert(row, { onConflict: 'email' });
  if (error) return { ok: false, reason: 'pending_insert_failed', error: error.message };

  const audit = await writeAudit(db, {
    actor, action: 'grant_access', targetType: 'pending_grant', targetEmail: email, portal,
    after: { plan, access_kind: accessKind }, metadata: { applied: 'pending', note: params.note || null },
  });
  return { ok: true, applied: 'pending', email, audit: audit.ok ? 'ok' : 'failed' };
}

// #2 Set plan / entitlements for an EXISTING user on either portal.
export async function setPlan(db, params) {
  const { portal, plan } = params;
  if (!['candidate', 'hr'].includes(portal)) return { ok: false, reason: 'invalid_portal' };
  if (!validatePlan(portal, plan)) return { ok: false, reason: 'invalid_plan' };
  const profile = await findProfile(db, { userId: params.userId, email: params.email });
  if (!profile) return { ok: false, reason: 'user_not_found' };
  return applyToUser(db, { ...params, profile });
}

// #3 Soft suspend (reversible). Owner-protected: the owner account can never
// be suspended (no self-lockout). Enforcement is an app guard reading
// account_status; this only sets the state + message and audits it.
export async function suspendAccount(db, params) {
  const { actor, reason, message, until } = params;
  const ownerEmail = params.ownerEmail || DEFAULT_OWNER_EMAIL;
  const profile = await findProfile(db, { userId: params.userId, email: params.email });
  if (!profile) return { ok: false, reason: 'user_not_found' };
  if (normEmail(profile.email) === normEmail(ownerEmail)) {
    return { ok: false, reason: 'cannot_suspend_owner' };
  }
  const before = { account_status: profile.account_status || 'active' };
  const { error } = await db.from('profiles').update({
    account_status: 'suspended',
    suspended_reason: reason || null,
    suspended_message: message || 'Your account has been suspended. Please contact support.',
    suspended_until: until ? new Date(until).toISOString() : null,
    suspended_at: new Date().toISOString(),
    suspended_by: actor?.email || 'unknown',
  }).eq('id', profile.id);
  if (error) return { ok: false, reason: 'update_failed', error: error.message };

  const audit = await writeAudit(db, {
    actor, action: 'suspend', targetType: 'user', targetId: profile.id, targetEmail: profile.email,
    portal: 'both', before, after: { account_status: 'suspended' },
    metadata: { reason: reason || null, until: until || null },
  });
  return { ok: true, user_id: profile.id, audit: audit.ok ? 'ok' : 'failed' };
}

export async function unsuspendAccount(db, params) {
  const { actor } = params;
  const profile = await findProfile(db, { userId: params.userId, email: params.email });
  if (!profile) return { ok: false, reason: 'user_not_found' };
  const before = { account_status: profile.account_status || 'active' };
  const { error } = await db.from('profiles').update({
    account_status: 'active',
    suspended_reason: null,
    suspended_message: null,
    suspended_until: null,
    suspended_at: null,
    suspended_by: null,
  }).eq('id', profile.id);
  if (error) return { ok: false, reason: 'update_failed', error: error.message };

  const audit = await writeAudit(db, {
    actor, action: 'unsuspend', targetType: 'user', targetId: profile.id, targetEmail: profile.email,
    portal: 'both', before, after: { account_status: 'active' },
  });
  return { ok: true, user_id: profile.id, audit: audit.ok ? 'ok' : 'failed' };
}

// #9 Audit read. Owner gate is enforced in the wrapper; this just queries.
export async function queryAudit(db, params = {}) {
  const limit = Math.min(Number(params.limit) || 100, 500);
  let q = db.from('audit_log').select('*').order('occurred_at', { ascending: false }).limit(limit);
  if (params.action) q = q.eq('action', params.action);
  if (params.targetEmail) q = q.eq('target_email', normEmail(params.targetEmail));
  const { data, error } = await q;
  if (error) return { ok: false, reason: 'query_failed', error: error.message };
  return { ok: true, rows: data || [], data_state: 'real' };
}
