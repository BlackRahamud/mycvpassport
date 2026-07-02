/**
 * Pure post-login destination decision — extracted from useCvpAuth so the
 * intent matrix is unit-testable without mocking Supabase.
 *
 * intentUserType   'recruiter' when login came through an employer entry
 *                  (/employer/login or the ?as=employer preset); else null.
 * profileUserType  profiles.user_type: 'candidate' | 'recruiter' | 'both'
 *                  (null when the profile read failed).
 * lastPortal       'candidate' | 'employer' | null — cvp_last_portal memory.
 */
export function resolveLoginRoute({ intentUserType, profileUserType, lastPortal }) {
  const hasRecruiterRole = profileUserType === "recruiter" || profileUserType === "both";
  if (intentUserType === "recruiter") {
    // Employer-intent login: recruiters enter the portal; everyone else
    // gets the role via company onboarding (same account, no re-login).
    // Also the failure default — onboarding self-redirects recruiters.
    return hasRecruiterRole ? "/employer/jobs" : "/employer/onboarding";
  }
  if (profileUserType === "recruiter") return "/employer/jobs";
  if (profileUserType === "both") {
    return lastPortal === "employer" ? "/employer/jobs" : "/dashboard";
  }
  return "/dashboard";
}
