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

export const ACTIVE_LISTING_LIMIT = 10;

/**
 * Look up the HR's company name. Order of preference:
 *   1. hr_profiles.company_name (the canonical source)
 *   2. user.user_metadata.company_name (set during HR onboarding)
 *   3. Email domain (capitalised first segment) as a last-resort
 *      placeholder — wizard works for HRs who haven't completed their
 *      profile yet, but the row is still recoverable later.
 */
async function resolveCompanyName(user) {
  if (!user?.id) return "Your Company";
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
  const meta = user.user_metadata || {};
  if (meta.company_name) return meta.company_name;
  const domain = String(user.email || "").split("@")[1] || "";
  const first = domain.split(".")[0];
  if (first) return first.charAt(0).toUpperCase() + first.slice(1);
  return "Your Company";
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
 * Note: `location` is NOT NULL on the existing schema and the wizard
 * doesn't yet collect a city — we set it to the position label so the
 * row is valid. When location collection is added to the wizard,
 * replace this fallback.
 */
function buildPayload(job, { hrId, companyName }) {
  const positionLabel = ({ remote: "Remote", hybrid: "Hybrid", onsite: "Onsite" })[job.position] || "Remote";
  const phone = (job.hrPhone || "").trim();
  const fullPhone = phone ? `${job.hrPhoneCountryCode || "+971"} ${phone}` : null;
  return {
    hr_id: hrId,
    title: (job.jobTitle || "").trim(),
    company: companyName,
    location: positionLabel,
    position: job.position || "remote",
    job_type: job.jobType || "full-time",
    currency: job.currency || "AED",
    salary_min: Number(job.salaryMin) || null,
    salary_max: Number(job.salaryMax) || null,
    salary_unit: job.salaryUnit || "per Hour",
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

  const count = await countActiveListings(user.id);
  if (count >= ACTIVE_LISTING_LIMIT) {
    const err = new Error(
      `You're at the ${ACTIVE_LISTING_LIMIT}-listing limit on the free tier. Close an existing listing or upgrade to post more.`
    );
    err.code = "limit_reached";
    throw err;
  }

  const companyName = await resolveCompanyName(user);
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
