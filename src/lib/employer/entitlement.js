import { supabase } from "../../appSupabaseClient";

/**
 * Employer entitlement, read from server truth.
 *
 * This module deliberately contains NO limit numbers and NO expiry
 * arithmetic. Both live in SQL (migration 046: hr_plan_limits and
 * hr_effective_entitlement) because the trigger that actually blocks a
 * job insert needs them too, and two copies would drift.
 *
 * What this file does is call hr_my_entitlement(), which resolves
 * auth.uid() only and cannot be pointed at another employer, and shape
 * the result for the UI.
 *
 * This is NOT the gate. The gate is the jobs insert trigger. A user who
 * edits the response in devtools sees a different button and still
 * cannot post a job.
 *
 * Candidate passes are irrelevant here by construction: nothing in this
 * path reads profiles.is_pro, profiles.plan or pro_access_expires_at.
 */

const FREE_FALLBACK = Object.freeze({
  plan: "free",
  status: "active",
  periodEnd: null,
  limits: Object.freeze({ active_jobs: 1, ai_evaluation: false, analytics: false }),
  baseline: 0,
  activeJobs: 0,
  activeJobsAllowed: 1,
  canPostJob: false,
  isTrial: false,
  daysLeft: null,
  loaded: false,
});

function shape(row) {
  const limits = row?.limits || {};
  const planLimit = Number(limits.active_jobs) || 0;
  const baseline = Number(row?.baseline) || 0;
  // The grandfather floor: an employer is never blocked below what they
  // already had live when the cap arrived. Mirrors GREATEST(limit,
  // baseline) in hr_enforce_job_limit so the button and the trigger agree.
  const allowed = Math.max(planLimit, baseline);
  const activeJobs = Number(row?.active_jobs) || 0;

  // period_end is a UTC instant. Days left is derived here, in the
  // browser, so it renders in device time. No timezone string is stored
  // or transported.
  let daysLeft = null;
  if (row?.period_end) {
    const ms = new Date(row.period_end).getTime() - Date.now();
    daysLeft = ms > 0 ? Math.ceil(ms / 86400000) : 0;
  }

  return {
    plan: row?.plan || "free",
    status: row?.status || "active",
    periodEnd: row?.period_end || null,
    limits,
    baseline,
    activeJobs,
    activeJobsAllowed: allowed,
    canPostJob: activeJobs < allowed,
    isTrial: row?.status === "trial",
    daysLeft,
    loaded: true,
  };
}

/**
 * Resolve the signed-in employer's entitlement.
 * Falls back to free on any failure — the safe direction, and the
 * trigger is the real gate regardless.
 */
export async function fetchEntitlement() {
  if (!supabase) return FREE_FALLBACK;
  try {
    const { data, error } = await supabase.rpc("hr_my_entitlement");
    if (error) {
      console.error("[entitlement] resolve failed", error.message);
      return FREE_FALLBACK;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return FREE_FALLBACK;
    return shape(row);
  } catch (e) {
    console.error("[entitlement] resolve threw", e?.message || String(e));
    return FREE_FALLBACK;
  }
}

export { FREE_FALLBACK };

/**
 * Copy for the post-job surface. Sentence case, no dashes, no
 * exclamation marks. Returns null when there is nothing to say.
 */
export function entitlementNotice(ent) {
  if (!ent?.loaded) return null;
  if (ent.status === "expired") {
    return "Your trial has ended. You are on the free plan with 1 active job.";
  }
  if (ent.isTrial && ent.daysLeft != null) {
    return ent.daysLeft === 1
      ? "1 day left on your Foundation trial."
      : `${ent.daysLeft} days left on your Foundation trial.`;
  }
  return null;
}
