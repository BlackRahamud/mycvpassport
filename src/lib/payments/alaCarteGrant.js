/**
 * A-la-carte grant actions — what a successful purchase actually DOES.
 *
 * The rail fix made every webhook identify its product explicitly. This
 * module says what to do once identified, and it is the ONE place that
 * decides. Both webhooks import it, so Ziina and Razorpay cannot drift
 * into granting the same product two different ways.
 *
 * Two shapes, because the two products genuinely differ:
 *
 *   permission — a permanent unlock. A row in `permissions` IS the
 *                access. This is what the LinkedIn optimizer already
 *                does, and its server-side reader (isUnlockedFor in
 *                supabase/functions/linkedin-optimize/index.ts) is
 *                unchanged by this module.
 *
 *   credits    — a consumable. The purchase increments a counter that
 *                the feature's server gate decrements on use. Cover
 *                letter is one generation per AED 10 purchase.
 *
 * A service that is not listed here CANNOT be granted. That is
 * deliberate: adding a product to the price table is not enough to make
 * it sellable, it must also declare how it is delivered. Anything
 * missing fails loudly rather than silently recording a payment that
 * grants nothing, which is the exact regression this module closes.
 */

export const ALA_CARTE_GRANTS = {
  linkedin_optimizer: { kind: 'permission' },
  cover_letter: { kind: 'credits', rpc: 'grant_cover_letter_credits', amount: 1 },
};

export function grantSpecFor(service) {
  return ALA_CARTE_GRANTS[service] || null;
}

/**
 * Apply the grant. `db` must be a service-role client.
 * Returns { ok: true } or { ok: false, error, reason }.
 */
export async function grantAlaCarte(db, { service, userId }) {
  const spec = grantSpecFor(service);
  if (!spec) {
    return {
      ok: false,
      reason: 'no_grant_spec',
      error: new Error(`No grant defined for service "${service}"`),
    };
  }

  if (spec.kind === 'permission') {
    const { error } = await db
      .from('permissions')
      .upsert(
        { user_id: userId, service, status: 'unlocked', unlocked_at: new Date().toISOString() },
        { onConflict: 'user_id,service' },
      );
    if (error) return { ok: false, reason: 'permission_upsert_failed', error };
    return { ok: true, kind: 'permission' };
  }

  if (spec.kind === 'credits') {
    const { data, error } = await db.rpc(spec.rpc, {
      p_user_id: userId,
      p_credits: spec.amount,
    });
    if (error) return { ok: false, reason: 'credit_grant_failed', error };
    return { ok: true, kind: 'credits', total: data };
  }

  return {
    ok: false,
    reason: 'unknown_grant_kind',
    error: new Error(`Unknown grant kind "${spec.kind}"`),
  };
}
