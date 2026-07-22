// ============================================================================
// src/lib/featureFlags.js — live feature-flag reader for the app (client).
//
// Reads public.feature_flags (migration 051) so the app can gate features
// without a deploy. Cached for 30s. DEFAULT ON: a missing row or a read
// error never disables a feature, so a flag outage can't take checkout / PDF
// / AI down by accident. Writes happen only through /api/admin (audited).
// ============================================================================

import { supabase } from "../appSupabaseClient";

let _cache = null;
let _ts = 0;
const TTL = 30000;

export async function loadFlags(force = false) {
  if (!force && _cache && Date.now() - _ts < TTL) return _cache;
  try {
    const { data } = await supabase.from("feature_flags").select("key,enabled,value");
    _cache = Object.fromEntries((data || []).map((f) => [f.key, f]));
    _ts = Date.now();
  } catch {
    _cache = _cache || {};
  }
  return _cache;
}

// True only when a flag row exists and is explicitly disabled.
export function featureOff(flags, key) {
  const f = flags?.[key];
  return f ? f.enabled === false : false;
}

// The active incident banner ({ message, portal }) or null.
export function incident(flags) {
  const f = flags?.incident_banner;
  return f && f.enabled ? (f.value || {}) : null;
}

// Convenience: fetch + check in one call (used by non-reactive callers).
export async function isFeatureOff(key) {
  const flags = await loadFlags();
  return featureOff(flags, key);
}
