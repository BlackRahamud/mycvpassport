// ============================================================================
// src/lib/admin/flags.js — Admin Command Center, Phase 4: feature flags.
//
// Dependency-injected (db + params). Persists the kill switches / maintenance
// / incident banner that the app reads LIVE from public.feature_flags
// (migration 051). Every change is confirm-gated and audited.
// ============================================================================

import { writeAudit } from './adminCore.js';

const KNOWN = new Set([
  'candidate_checkout', 'hr_checkout', 'ai_evaluation', 'ats_checker', 'pdf_export', 'hr_portal',
  'maintenance_candidate', 'maintenance_hr', 'incident_banner',
]);

export async function flagsList(db) {
  const { data, error } = await db.from('feature_flags').select('*').order('key', { ascending: true });
  if (error) {
    return { ok: true, data_state: 'needs_wiring', reason: `feature_flags query failed: ${error.message}. Apply migration 051_feature_flags.`, flags: [] };
  }
  return { ok: true, data_state: data && data.length ? 'real' : 'estimated', flags: data || [] };
}

// Flip a kill switch / maintenance flag. Confirm-gated (the UI holds to
// confirm and passes confirm:'CONFIRM'); every flip is audited with before/after.
export async function flagSet(db, params) {
  const { actor, key } = params;
  if (!KNOWN.has(key)) return { ok: false, reason: 'unknown_flag' };
  if (params.confirm !== 'CONFIRM') return { ok: false, reason: 'confirm_required' };
  const enabled = params.enabled === true;

  const { data: before } = await db.from('feature_flags').select('*').eq('key', key).maybeSingle();
  const row = { key, enabled, description: before?.description || null, updated_by: actor?.email || 'admin', updated_at: new Date().toISOString() };
  if (params.value !== undefined) row.value = params.value;
  const { error } = await db.from('feature_flags').upsert(row, { onConflict: 'key' });
  if (error) return { ok: false, reason: 'upsert_failed', error: error.message };

  const audit = await writeAudit(db, {
    actor, action: 'feature_flag', targetType: 'flag', targetId: key,
    before: before ? { enabled: before.enabled } : null, after: { enabled },
    metadata: { note: enabled ? 'feature ON' : 'feature OFF' },
  });
  return { ok: true, key, enabled, audit: audit.ok ? 'ok' : 'failed' };
}

// Set or clear the incident banner. active=true shows it; value carries the
// message + which portal. Confirm-gated + audited.
export async function setIncident(db, params) {
  const { actor } = params;
  if (params.confirm !== 'CONFIRM') return { ok: false, reason: 'confirm_required' };
  const active = params.active === true;
  const value = { message: String(params.message || '').slice(0, 500), portal: ['candidate', 'hr', 'both'].includes(params.portal) ? params.portal : 'both' };
  if (active && !value.message) return { ok: false, reason: 'message_required' };

  const { data: before } = await db.from('feature_flags').select('*').eq('key', 'incident_banner').maybeSingle();
  const { error } = await db.from('feature_flags').upsert(
    { key: 'incident_banner', enabled: active, value, description: 'Status/incident banner', updated_by: actor?.email || 'admin', updated_at: new Date().toISOString() },
    { onConflict: 'key' },
  );
  if (error) return { ok: false, reason: 'upsert_failed', error: error.message };

  const audit = await writeAudit(db, {
    actor, action: 'incident_banner', targetType: 'flag', targetId: 'incident_banner',
    before: before ? { enabled: before.enabled } : null, after: { enabled: active, portal: value.portal },
    metadata: { message: value.message },
  });
  return { ok: true, active, audit: audit.ok ? 'ok' : 'failed' };
}
