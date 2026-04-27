/**
 * Per-tier daily Anthropic spend caps (USD, UTC midnight reset).
 *
 * Hard stop at 100 % of cap. Soft alert at 80 % is recorded into
 * anthropic_calls.meta.soft_alert so the dashboard can surface it;
 * email/Slack notification is a follow-up sprint.
 */

const DAILY_USD_CAP = {
  anonymous: 0.1,
  free: 0.5,
  paid: 5.0,
  paid_pro: 25.0,
};

const SOFT_ALERT_FRACTION = 0.8;

export function getDailyCapUsd(tier) {
  return DAILY_USD_CAP[tier] ?? DAILY_USD_CAP.anonymous;
}

export function getSoftAlertFraction() {
  return SOFT_ALERT_FRACTION;
}

/**
 * How much has this caller spent today? UTC-day window.
 * Returns { allowed, spentUsd, capUsd, fraction, alertThresholdHit }.
 *
 * Fails OPEN on database error — see _rateLimit.mjs for rationale.
 */
export async function checkSpendCap(supabase, { userId, ipHash, tier }) {
  const cap = getDailyCapUsd(tier);
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const since = startOfDay.toISOString();

  let query = supabase
    .from("anthropic_calls")
    .select("estimated_cost_usd")
    .gte("occurred_at", since)
    .eq("status", "ok");

  if (userId) {
    query = query.eq("user_id", userId);
  } else if (ipHash) {
    query = query.eq("ip_hash", ipHash).is("user_id", null);
  } else {
    return {
      allowed: true,
      spentUsd: 0,
      capUsd: cap,
      fraction: 0,
      alertThresholdHit: false,
    };
  }

  const { data, error } = await query;
  if (error) {
    return {
      allowed: true,
      spentUsd: 0,
      capUsd: cap,
      fraction: 0,
      alertThresholdHit: false,
      degraded: true,
      error: error.message,
    };
  }

  const spent = (data ?? []).reduce(
    (s, r) => s + Number(r.estimated_cost_usd || 0),
    0,
  );
  const fraction = cap > 0 ? spent / cap : 0;

  return {
    allowed: spent < cap,
    spentUsd: Number(spent.toFixed(6)),
    capUsd: cap,
    fraction: Number(fraction.toFixed(4)),
    alertThresholdHit: fraction >= SOFT_ALERT_FRACTION,
  };
}
