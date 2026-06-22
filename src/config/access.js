// Canonical access check. Used by:
//   - Client:  src/useCvpAuth.js, src/supabaseClient.js
//   - Server:  api/ai.js, api/transform.js, api/scout-*.js, api/generate-pdf.js
//
// Pro access is DERIVED from the expiry timestamp, not the raw is_pro
// boolean — that column is a stale cache that the payment webhook keeps
// in sync for legacy reads. Returns true if the user currently has
// time-bounded Pro access in effect (Active Hunter / Career Pro, or a
// grandfathered legacy paid user whose expiry was backfilled to 2099).

export function hasProAccess(profile) {
  if (!profile) return false;
  const exp = profile.pro_access_expires_at;
  if (!exp) return false;
  const expMs = new Date(exp).getTime();
  if (Number.isNaN(expMs)) return false;
  return expMs > Date.now();
}
