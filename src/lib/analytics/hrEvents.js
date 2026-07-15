// Employer-portal analytics. Two products share PostHog project 166982;
// every portal event is `hr_`-prefixed, snake_case, noun-then-verb, so
// the two are trivially separable in every query.
//
// Deliberately NOT logEvent(): that triple-writes to the Supabase
// `candidate_events` table (keyed by candidate_id, candidate RLS). HR
// events must never land in the candidate table, so this path is PostHog
// (+ a Clarity tag) only.
//
// PII rule: event properties are IDs and enums only — never candidate
// names, emails, phones, or CV text. `hr_company` is a person/group
// property (a company name, not a person), which the spec allows.

import { trackPostHog, identifyPostHog, groupPostHog } from "./posthog";
import { tagClarity } from "./clarity";
import { isFounderEmail } from "../../utils/founder";
import { supabase } from "../../appSupabaseClient";

// Internal usage (founder + testers) is flagged so it can be filtered out
// of every funnel — the single most important segment in the taxonomy.
// Testers are added via REACT_APP_INTERNAL_HR_EMAILS (comma-separated)
// without a code change.
const ENV_INTERNAL = String(process.env.REACT_APP_INTERNAL_HR_EMAILS || "")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

export function isInternalHr(email) {
  if (!email) return false;
  const e = String(email).trim().toLowerCase();
  return isFounderEmail(e) || ENV_INTERNAL.includes(e);
}

// Fire one portal event. Strips null/undefined props so PostHog never
// stores empty keys; enum/id values pass through unchanged.
export function trackHr(event, props) {
  if (!event || typeof event !== "string") return;
  let clean;
  if (props && typeof props === "object") {
    clean = {};
    for (const [k, v] of Object.entries(props)) {
      if (v !== undefined && v !== null) clean[k] = v;
    }
    if (Object.keys(clean).length === 0) clean = undefined;
  }
  try { trackPostHog(event, clean); } catch { /* analytics never throws */ }
  try { tagClarity(event); } catch { /* noop */ }
}

// Derive hr_market from the recruiter's own jobs (there is no market
// column on hr_profiles). One lightweight read, best-effort.
async function deriveMarket(userId) {
  try {
    const { data } = await supabase
      .from("jobs")
      .select("market")
      .eq("hr_id", userId)
      .eq("source", "hr_portal")
      .limit(300);
    const set = new Set((data || []).map((r) => r.market).filter(Boolean));
    if (set.size === 0) return null;
    if (set.has("india") && set.has("gulf")) return "both";
    if (set.has("india")) return "india";
    if (set.has("gulf")) return "gulf";
    return null;
  } catch {
    return null;
  }
}

// Called once per portal entry, after the recruiter check passes. Sets
// the person + company group, and fires hr_signed_in once per browser
// session with is_first_session.
export function beginHrSession({ userId, email, companyId, companyName }) {
  if (!userId) return;
  const internal = isInternalHr(email);

  // Person properties (set on identify → $set). Market refines async.
  const traits = { hr_is_internal: internal };
  if (companyName) traits.hr_company = companyName;
  try { identifyPostHog(String(userId), traits); } catch { /* noop */ }

  // Company group so one agency with three recruiters reads as one account.
  if (companyId) {
    try { groupPostHog("company", String(companyId), companyName ? { name: companyName } : undefined); } catch { /* noop */ }
  }

  // hr_signed_in — once per browser session. is_first_session is the first
  // time this browser has ever entered the portal.
  try {
    const seenBefore = window.localStorage?.getItem("cvp_hr_seen") === "1";
    const firedThisSession = window.sessionStorage?.getItem("cvp_hr_signed_in") === "1";
    if (!firedThisSession) {
      window.sessionStorage?.setItem("cvp_hr_signed_in", "1");
      window.localStorage?.setItem("cvp_hr_seen", "1");
      trackHr("hr_signed_in", { is_first_session: !seenBefore });
    }
  } catch {
    trackHr("hr_signed_in", { is_first_session: false });
  }

  // Refine hr_market from the recruiter's jobs without blocking.
  deriveMarket(userId).then((market) => {
    if (market) {
      try { identifyPostHog(String(userId), { hr_market: market }); } catch { /* noop */ }
    }
  });
}
