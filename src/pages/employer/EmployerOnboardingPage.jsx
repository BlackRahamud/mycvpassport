import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "../../appSupabaseClient";
import { fetchRecruiterStatus, completeEmployerOnboarding } from "../../lib/employer/recruiterStatus";
import "../hr/PostJob/postJob.css"; // --pj-* tokens
import "./employerLanding.css";

/**
 * /employer/onboarding — grants the recruiter role to the signed-in
 * account (existing candidates keep their candidate side: user_type
 * becomes 'both') and sets up the company. Reached from:
 *  - employer-intent login without the recruiter role
 *  - fresh employer signup (company confirmation step)
 *  - a logged-in candidate clicking through from /employer
 * Already-set-up recruiters are forwarded straight to the portal.
 */

const SIZES = ["1-10", "11-50", "51-200", "200+"];
const EASE = [0.4, 0, 0.2, 1];

export default function EmployerOnboardingPage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session?.user) {
        navigate("/employer/login", { replace: true });
        return;
      }
      setUserId(session.user.id);
      try {
        const { isRecruiter, hrProfile, profile } = await fetchRecruiterStatus(session.user.id);
        if (cancelled) return;
        if (isRecruiter && hrProfile?.company_id) {
          // Nothing to onboard — straight into the portal.
          navigate("/hr", { replace: true });
          return;
        }
        // Prefill anything the signup form already captured.
        setCompanyName(hrProfile?.company_name || profile?.company_name || "");
        setWorkEmail(hrProfile?.work_email || profile?.work_email || "");
      } catch {
        /* fall through to the empty form — submit re-validates */
      }
      if (!cancelled) setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!companyName.trim()) {
      setError("Enter your company name to continue.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await completeEmployerOnboarding(userId, { companyName, companySize, workEmail });
      navigate("/hr", { replace: true });
    } catch {
      setError("Could not set up your company. Please try again — your account is unaffected.");
      setSaving(false);
    }
  };

  return (
    <div className="emp-root">
      <header className="emp-topbar">
        <Link to="/employer" className="emp-wordmark">
          CVPassport <small>for Employers</small>
        </Link>
      </header>

      <main className="emp-onb-wrap">
        {checking ? (
          <p className="emp-onb-checking" role="status">Checking your account…</p>
        ) : (
          <motion.form
            className="emp-onb-card"
            onSubmit={submit}
            {...(reduceMotion ? {} : {
              initial: { opacity: 0, y: 14 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.45, ease: EASE },
            })}
          >
            <h1>Set up your company</h1>
            <p className="emp-onb-sub">
              This unlocks the employer portal on your existing account — your
              CVs and applications stay exactly where they are.
            </p>

            <label className="emp-field">
              <span>Company name</span>
              <input
                type="text"
                value={companyName}
                onChange={(e) => { setCompanyName(e.target.value); setError(null); }}
                placeholder="Your company"
                autoFocus
              />
            </label>

            <label className="emp-field">
              <span>Company size <em>(optional)</em></span>
              <select value={companySize} onChange={(e) => setCompanySize(e.target.value)}>
                <option value="">Select…</option>
                {SIZES.map((s) => <option key={s} value={s}>{s} people</option>)}
              </select>
            </label>

            <label className="emp-field">
              <span>Work email <em>(optional)</em></span>
              <input
                type="email"
                value={workEmail}
                onChange={(e) => setWorkEmail(e.target.value)}
                placeholder="work@company.com"
              />
            </label>

            {error ? <p className="emp-onb-error" role="alert">{error}</p> : null}

            <button type="submit" className="emp-btn emp-btn--primary emp-onb-submit" disabled={saving}>
              {saving ? "Setting up…" : "Start hiring →"}
            </button>
          </motion.form>
        )}
      </main>

      <footer className="emp-foot">
        <Link to="/">Looking for a job instead? Go to CVPassport →</Link>
        <p>&copy; 2026 CVPassport. Operated by JMK, Dubai UAE.</p>
      </footer>
    </div>
  );
}
