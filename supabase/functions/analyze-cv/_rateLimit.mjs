/**
 * Per-tier rate limits (calls / 24h).
 *
 * anonymous : 3   (gate-of-the-funnel; protect Anthropic spend)
 * free      : 10  (signed-in; lifts the gate post-signup)
 * paid      : 100 (Express Pass / Active Hunter)
 * paid_pro  : 500 (Career Pro)
 *
 * Identifiers: user_id when signed in, ip_hash when anonymous.
 * Counts only successful (status='ok') calls so blocked attempts
 * don't burn the quota.
 */

const LIMITS = {
  anonymous: { count: 3, windowHours: 24 },
  free: { count: 10, windowHours: 24 },
  paid: { count: 100, windowHours: 24 },
  paid_pro: { count: 500, windowHours: 24 },
};

export function getLimit(tier) {
  return LIMITS[tier] ?? LIMITS.anonymous;
}

/**
 * Check whether the caller is under their daily quota.
 * Returns { allowed, used, remaining, limit, windowHours }.
 *
 * Fails OPEN on database error — we'd rather scan than 500 a user.
 * The error itself is logged at the call site.
 */
export async function checkRateLimit(supabase, { userId, ipHash, tier }) {
  const { count: limit, windowHours } = getLimit(tier);
  const since = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();

  let query = supabase
    .from("anthropic_calls")
    .select("id", { count: "exact", head: true })
    .gte("occurred_at", since)
    .eq("status", "ok");

  if (userId) {
    query = query.eq("user_id", userId);
  } else if (ipHash) {
    query = query.eq("ip_hash", ipHash).is("user_id", null);
  } else {
    // No identifier at all — treat as fresh anonymous, 0 used.
    return { allowed: true, used: 0, remaining: limit, limit, windowHours };
  }

  const { count, error } = await query;
  if (error) {
    return {
      allowed: true,
      used: 0,
      remaining: limit,
      limit,
      windowHours,
      degraded: true,
      error: error.message,
    };
  }

  const used = count ?? 0;
  return {
    allowed: used < limit,
    used,
    remaining: Math.max(0, limit - used),
    limit,
    windowHours,
  };
}
