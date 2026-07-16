/**
 * Post-a-Job submission — wizard state → Supabase INSERT.
 *
 * Free tier rule: HRs are capped at 10 active+published listings on
 * the hr_portal source. The cap is enforced here BEFORE the INSERT
 * so the user gets a structured error rather than an RLS denial or
 * silent overwrite. (Schema-level enforcement could be added later
 * with a trigger; for now this is the only write path.)
 */

import { supabase } from "../appSupabaseClient";
import { isFounder } from "../utils/founder";
import { marketFromCurrency } from "../pages/hr/PostJob/market";

export const ACTIVE_LISTING_LIMIT = 10;

/**
 * Resolve the company name to stamp on the listing. Order of preference:
 *   1. What the HR entered/confirmed in the wizard this session (required
 *      field on the Start step — the one moment the name actually matters).
 *   2. hr_profiles.company_name (a returning HR whose profile already has it).
 *   3. user.user_metadata.company_name (set during HR onboarding).
 *
 * There is deliberately NO email-domain fallback. Deriving the name from the
 * address ("gmail.com" → "Gmail") stamped a false credibility signal — and
 * sometimes a third-party trademark — onto public Dubai job postings. When we
 * genuinely have no name we return "" and submitJob refuses the post, rather
 * than inventing one. Returns "" only when every source is empty.
 */
async function resolveCompanyName(user, job) {
  const typed = (job?.companyName || "").trim();
  if (typed) return typed;
  if (user?.id) {
    try {
      const { data } = await supabase
        .from("hr_profiles")
        .select("company_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.company_name) return data.company_name;
    } catch {
      // Table may not exist yet, or RLS may block — fall through.
    }
  }
  const meta = user?.user_metadata || {};
  if (meta.company_name) return meta.company_name;
  return "";
}

/**
 * Count the HR's active listings to enforce the cap.
 * Returns the count (number) — caller decides what to do with it.
 */
export async function countActiveListings(userId) {
  const { count, error } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("hr_id", userId)
    .eq("source", "hr_portal")
    .in("status", ["active", "published"]);
  if (error) throw error;
  return count || 0;
}

/**
 * Build the INSERT payload from wizard state.
 * Mirrors the wizard field → DB column mapping documented in
 * supabase/migrations/011_post_job_wizard_fields.sql.
 *
 * `location` is NOT NULL on the schema. The wizard now collects a city in
 * the Start step; if the HR leaves it blank we fall back to the workplace
 * label so the row stays valid (never a US placeholder).
 */
function buildPayload(job, { hrId, companyName }) {
  const positionLabel = ({ remote: "Remote", hybrid: "Hybrid", onsite: "On-site" })[job.position] || "On-site";
  const location = (job.location || "").trim() || positionLabel;
  const phone = (job.hrPhone || "").trim();
  const fullPhone = phone ? `${job.hrPhoneCountryCode || "+971"} ${phone}` : null;
  return {
    hr_id: hrId,
    title: (job.jobTitle || "").trim(),
    company: companyName,
    // Field/department: a controlled value from the wizard select, or null.
    // NEVER free text — a title in this column ("IT support technician")
    // becomes a junk facet on the board's Field filter.
    department: (job.department || "").trim() || null,
    location,
    // Market drives the India/Gulf Location filter. It follows the chosen
    // currency (INR → india, else gulf); before this it was never written,
    // so every post defaulted to 'gulf' and India could never have a role.
    market: marketFromCurrency(job.currency),
    position: job.position || "onsite",
    job_type: job.jobType || "full-time",
    currency: job.currency || "AED",
    salary_min: Number(job.salaryMin) || null,
    salary_max: Number(job.salaryMax) || null,
    salary_unit: job.salaryUnit || "per month",
    min_education: job.educationLevel || null,
    skills: Array.isArray(job.relevantSkills) ? job.relevantSkills : [],
    tools:  Array.isArray(job.tools) ? job.tools : [],
    experience_min: Number(job.yearsExperience?.min ?? 0),
    experience_max: Number(job.yearsExperience?.max ?? 0),
    experience_policy: job.yearsExperiencePolicy || "required",
    work_auth_policy:  job.workAuthPolicy || "required",
    visa_status: Array.isArray(job.visaStatus) ? job.visaStatus : [],
    uae_driving_license: !!job.uaeDrivingLicense,
    origin_driving_license: !!job.originDrivingLicense,
    screening_questions: Array.isArray(job.screeningQuestionGroups) ? job.screeningQuestionGroups : [],
    description: job.jobDescription || "",
    hr_phone: fullPhone,
    source: "hr_portal",
    status: "active",
  };
}

/**
 * Submit a wizard job state to Supabase.
 * Throws with a code in { 'unauthenticated', 'limit_reached', 'invalid', 'db_error' }.
 * Resolves with the inserted row on success.
 */
export async function submitJob({ user, job }) {
  if (!user?.id) {
    const err = new Error("You need to be signed in to post a job.");
    err.code = "unauthenticated";
    throw err;
  }
  if (!job?.jobTitle || !String(job.jobTitle).trim()) {
    const err = new Error("Add a job title before posting.");
    err.code = "invalid";
    throw err;
  }

  // Founder skips the active-listing cap (client-side convenience, keyed
  // off the authenticated session email only). RLS still governs the
  // INSERT itself — this only removes the pre-INSERT UX guard.
  if (!isFounder(user)) {
    const count = await countActiveListings(user.id);
    if (count >= ACTIVE_LISTING_LIMIT) {
      const err = new Error(
        `You're at the ${ACTIVE_LISTING_LIMIT}-listing limit on the free tier. Close an existing listing or upgrade to post more.`
      );
      err.code = "limit_reached";
      throw err;
    }
  }

  const companyName = await resolveCompanyName(user, job);
  if (!companyName) {
    const err = new Error("Add your company name before posting — it's the first thing candidates see.");
    err.code = "no_company";
    throw err;
  }
  const payload = buildPayload(job, { hrId: user.id, companyName });

  const { data, error } = await supabase
    .from("jobs")
    .insert(payload)
    .select()
    .single();

  if (error) {
    const e = new Error(error.message || "Couldn't save the job.");
    e.code = "db_error";
    e.cause = error;
    throw e;
  }
  return data;
}
