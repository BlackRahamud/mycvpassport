import { supabase } from "../../appSupabaseClient";

/**
 * Employer-side role helpers. profiles.user_type is the role source of
 * truth ('candidate' | 'recruiter' | 'both'); hr_profiles + companies
 * carry the recruiter's org data (schema-only phase: jobs stay keyed to
 * hr_id, companies exist for onboarding + later team support).
 */

export function isRecruiterType(userType) {
  return userType === "recruiter" || userType === "both";
}

/** One round trip per table: role + org state for the signed-in user. */
export async function fetchRecruiterStatus(userId) {
  if (!supabase || !userId) return { userType: null, isRecruiter: false, hrProfile: null };
  const [{ data: prof }, { data: hp }] = await Promise.all([
    supabase.from("profiles").select("user_type, company_name, work_email").eq("id", userId).maybeSingle(),
    supabase.from("hr_profiles").select("company_name, work_email, company_id").eq("user_id", userId).maybeSingle(),
  ]);
  return {
    userType: prof?.user_type || null,
    isRecruiter: isRecruiterType(prof?.user_type),
    hrProfile: hp || null,
    profile: prof || null,
  };
}

/**
 * Grants the recruiter role to the signed-in user and sets up their org:
 * company row (+ owner membership) → hr_profiles upsert → user_type.
 * Existing candidates become 'both' (dual role); fresh employer signups
 * stay 'recruiter'. Idempotent: an existing company_id is reused, not
 * duplicated. Throws on failure — callers surface an honest error state.
 */
export async function completeEmployerOnboarding(userId, { companyName, companySize, workEmail }) {
  if (!supabase || !userId) throw new Error("Not signed in");
  const name = (companyName || "").trim();
  if (!name) throw new Error("Company name is required");

  const { userType, hrProfile } = await fetchRecruiterStatus(userId);

  let companyId = hrProfile?.company_id || null;
  if (!companyId) {
    const { data: company, error: cErr } = await supabase
      .from("companies")
      .insert({ name, size: companySize || null, created_by: userId })
      .select("id")
      .single();
    if (cErr) throw cErr;
    companyId = company.id;
    const { error: mErr } = await supabase
      .from("company_members")
      .upsert(
        { company_id: companyId, user_id: userId, role: "owner" },
        { onConflict: "company_id,user_id", ignoreDuplicates: true },
      );
    if (mErr) throw mErr;
  }

  const { error: hErr } = await supabase
    .from("hr_profiles")
    .upsert(
      { user_id: userId, company_name: name, work_email: (workEmail || "").trim(), company_id: companyId },
      { onConflict: "user_id" },
    );
  if (hErr) throw hErr;

  const nextType = userType === "candidate" || !userType ? "both" : userType;
  const grantedType = nextType === "candidate" ? "recruiter" : nextType;
  const { error: pErr } = await supabase
    .from("profiles")
    .update({ user_type: grantedType, company_name: name, work_email: (workEmail || "").trim() || null })
    .eq("id", userId);
  if (pErr) throw pErr;

  return { companyId, userType: grantedType };
}
