import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { supabase } from "../../appSupabaseClient";
import { fetchRecruiterStatus, completeEmployerOnboarding } from "../../lib/employer/recruiterStatus";
import { trackHr, beginHrSession } from "../../lib/analytics/hrEvents";
import "../../pages/hr/PostJob/postJob.css"; // --pj-* tokens
import "../../pages/employer/employerLanding.css"; // emp- button/card styles
import "./recruiterAuthLoading.css"; // CVPassport Hiring Portal account-check screen

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
    // The "Checking your account…" screen: measure how long it actually
    // shows. hr_auth_check_completed(duration_ms) settles the redesign
    // argument — is there really a stare to warm up, or is it sub-second?
    const t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());
    trackHr("hr_auth_check_started");
    const settle = (phase) => {
      const end = (typeof performance !== "undefined" ? performance.now() : Date.now());
      trackHr("hr_auth_check_completed", { duration_ms: Math.round(end - t0) });
      setPhase(phase);
    };
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
      settle("anon");
      return;
    }
    try {
      const { isRecruiter, hrProfile } = await fetchRecruiterStatus(session.user.id);
      if (!isRecruiter) {
        settle("blocked");
        return;
      }
      if (!hrProfile) {
        settle("onboarding");
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
      // Recruiter confirmed: identify, attach the company group, and fire
      // hr_signed_in (once per session). hr_is_internal keeps founder +
      // tester traffic out of every funnel.
      beginHrSession({
        userId: session.user.id,
        email: session.user.email,
        companyId: hrProfile.company_id,
        companyName: hrProfile.company_name,
      });
      settle("ok");
    } catch {
      settle("error");
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
          <section className="cvp-auth-loading" role="status" aria-live="polite" aria-label="Checking your employer account">
            <div className="cvp-auth-loading__brand" aria-label="CVPassport Hiring Portal">
              <span className="cvp-auth-loading__mark" aria-hidden="true">
                <svg viewBox="0 0 28 28" focusable="false">
                  <path d="M4 6.5 11.5 14 4 21.5M11 6.5 18.5 14 11 21.5M18 6.5 25.5 14 18 21.5" />
                </svg>
              </span>
              <span className="cvp-auth-loading__wordmark">CVPassport</span>
              <span className="cvp-auth-loading__portal">Hiring Portal</span>
            </div>

            <div className="cvp-auth-loading__visual" aria-hidden="true">
              <span className="cvp-auth-loading__halo" />
              <span className="cvp-auth-loading__track" />
              <span className="cvp-auth-loading__ring" />
              <span className="cvp-auth-loading__icon">
                <svg viewBox="0 0 32 32" focusable="false">
                  <rect x="4.5" y="10" width="23" height="17" rx="3" />
                  <path d="M11 10V7.5A2.5 2.5 0 0 1 13.5 5h5A2.5 2.5 0 0 1 21 7.5V10M4.5 16h23M13.5 16v3h5v-3" />
                </svg>
              </span>
            </div>

            <h1 className="cvp-auth-loading__title">Checking your account<span className="cvp-auth-loading__ellipsis">…</span></h1>
            <p className="cvp-auth-loading__message">Just a moment while we confirm your employer access.</p>
            <span className="cvp-auth-loading__sr-only">Please wait while we verify your access.</span>
          </section>
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
