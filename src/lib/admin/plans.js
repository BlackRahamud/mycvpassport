// ============================================================================
// src/lib/admin/plans.js — Admin Command Center, Phase 3: Plan builder CRUD.
//
// Dependency-injected (db + params). Reads/writes the `plans` table
// (migration 050). Explorer and Foundation are immutable — the builder cannot
// reprice or delete the free base or the fixed employer plan.
// ============================================================================

import { writeAudit } from './adminCore.js';

const IMMUTABLE_SLUGS = new Set(['explorer', 'foundation']);

export async function plansList(db) {
  const { data, error } = await db.from('plans').select('*').order('sort', { ascending: true });
  if (error) {
    return { ok: true, data_state: 'needs_wiring', reason: `plans query failed: ${error.message}. Apply migration 050_plans.`, plans: [] };
  }
  if (!data || data.length === 0) {
    return { ok: true, data_state: 'estimated', reason: 'plans table is empty — the seed lives in migration 050_plans. Apply it to populate.', plans: [] };
  }
  return { ok: true, data_state: 'real', plans: data };
}

export async function planUpsert(db, params) {
  const slug = String(params.slug || '').trim();
  if (!slug) return { ok: false, reason: 'slug_required' };
  if (!['candidate', 'hr'].includes(params.portal)) return { ok: false, reason: 'invalid_portal' };

  const { data: before } = await db.from('plans').select('*').eq('slug', slug).maybeSingle();
  // Immutable if the existing row says so, or it's a protected slug being created.
  if (before?.immutable || IMMUTABLE_SLUGS.has(slug)) {
    return { ok: false, reason: 'plan_immutable' };
  }

  const row = {
    slug,
    name: params.name || slug,
    portal: params.portal,
    aed_minor: params.aedMinor ?? null,
    inr_minor: params.inrMinor ?? null,
    duration_days: params.durationDays ?? null,
    model: ['free', 'permanent', 'pass'].includes(params.model) ? params.model : 'pass',
    entitlements: params.entitlements && typeof params.entitlements === 'object' ? params.entitlements : {},
    active: params.active !== false,
    sort: Number(params.sort) || 0,
    updated_at: new Date().toISOString(),
  };
  const { error } = await db.from('plans').upsert(row, { onConflict: 'slug' });
  if (error) return { ok: false, reason: 'upsert_failed', error: error.message };

  const audit = await writeAudit(db, {
    actor: params.actor, action: before ? 'plan_update' : 'plan_create', targetType: 'plan', targetId: slug,
    before: before || null, after: row,
  });
  return { ok: true, slug, created: !before, audit: audit.ok ? 'ok' : 'failed' };
}

export async function planDelete(db, params) {
  const slug = String(params.slug || '').trim();
  if (!slug) return { ok: false, reason: 'slug_required' };
  if (IMMUTABLE_SLUGS.has(slug)) return { ok: false, reason: 'plan_immutable' };

  const { data: before } = await db.from('plans').select('*').eq('slug', slug).maybeSingle();
  if (!before) return { ok: false, reason: 'plan_not_found' };
  if (before.immutable) return { ok: false, reason: 'plan_immutable' };

  const { error } = await db.from('plans').delete().eq('slug', slug);
  if (error) return { ok: false, reason: 'delete_failed', error: error.message };

  const audit = await writeAudit(db, {
    actor: params.actor, action: 'plan_delete', targetType: 'plan', targetId: slug, before,
  });
  return { ok: true, slug, audit: audit.ok ? 'ok' : 'failed' };
}
