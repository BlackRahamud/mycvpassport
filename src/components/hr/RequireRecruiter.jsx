import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { supabase } from "../../appSupabaseClient";
import { fetchRecruiterStatus, completeEmployerOnboarding } from "../../lib/employer/recruiterStatus";
import "../../pages/hr/PostJob/postJob.css"; // --pj-* tokens
import "../../pages/employer/employerLanding.css"; // emp- button/card styles

/**
 * Layout guard for the employer portal (/employer/jobs and friends).
 * RLS already keeps the DATA safe — this guard keeps the UX honest:
 *  - logged out           → /employer/login (return path preserved)
 *  - recruiter, no org row → /employer/onboarding
 *  - signed-in candidate  → explicit "this area is for employers" screen
 *                           with a path to onboarding, never a blank shell
 *  - check failed         → honest error + retry (no silent empty portal)
 * Recruiters whose signup captured a company name but predate the
 * companies table get their company row self-healed on entry.
 */
export default function RequireRecruiter({ children }) {
  const [phase, setPhase] = useState("checking"); // checking|anon|blocked|onboarding|error|ok
  // Router location in a ref so runCheck stays referentially stable (one
  // check per portal entry, not one per in-portal navigation).
  const location = useLocation();
  const locationRef = useRef(location);
  locationRef.current = location;

  const runCheck = useCallback(async () => {
    setPhase("checking");
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      // Preserve the requested portal URL through the login flow — same
      // key NavigateToAuth uses; consumed after auth completes.
      try {
        window.sessionStorage?.setItem(
          "cvp_return_path",
          locationRef.current.pathname + locationRef.current.search,
        );
      } catch { /* private mode */ }
      setPhase("anon");
      return;
    }
    try {
      const { isRecruiter, hrProfile } = await fetchRecruiterStatus(session.user.id);
      if (!isRecruiter) {
        setPhase("blocked");
        return;
      }
      if (!hrProfile) {
        setPhase("onboarding");
        return;
      }
      if (!hrProfile.company_id && hrProfile.company_name) {
        // Self-heal: employer signup captures the company name but the
        // companies row is minted at onboarding — recruiters who skipped
        // it (or predate it) get theirs created silently on entry.
        completeEmployerOnboarding(session.user.id, {
          companyName: hrProfile.company_name,
          workEmail: hrProfile.work_email,
        }).catch(() => { /* retried next entry; portal still works */ });
      }
      setPhase("ok");
    } catch {
      setPhase("error");
    }
  }, []);

  useEffect(() => { runCheck(); }, [runCheck]);

  if (phase === "ok") return children;
  if (phase === "anon") return <Navigate to="/employer/login" replace />;
  if (phase === "onboarding") return <Navigate to="/employer/onboarding" replace />;

  return (
    <div className="emp-root">
      <main className="emp-onb-wrap">
        {phase === "checking" ? (
          <p className="emp-onb-checking" role="status">Checking your account…</p>
        ) : phase === "blocked" ? (
          <div className="emp-onb-card" role="alert">
            <h1>This area is for employers</h1>
            <p className="emp-onb-sub">
              You&rsquo;re signed in with a job-seeker account. Set up a company to
              start hiring — your CVs and applications stay exactly where they are.
            </p>
            <Link to="/employer/onboarding" className="emp-btn emp-btn--primary emp-onb-submit">
              Set up a company →
            </Link>
            <p className="emp-onb-sub" style={{ marginTop: 14, marginBottom: 0 }}>
              <Link to="/dashboard" style={{ color: "inherit" }}>← Back to my dashboard</Link>
            </p>
          </div>
        ) : (
          <div className="emp-onb-card" role="alert">
            <h1>Couldn&rsquo;t verify your access</h1>
            <p className="emp-onb-sub">
              Something went wrong while checking your employer access. Your data
              is unaffected.
            </p>
            <button type="button" className="emp-btn emp-btn--primary emp-onb-submit" onClick={runCheck}>
              Try again
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
