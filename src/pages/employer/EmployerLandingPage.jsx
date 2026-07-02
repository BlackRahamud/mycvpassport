import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "../../appSupabaseClient";
import "../hr/PostJob/postJob.css"; // --pj-* tokens live on :root there
import "./employerLanding.css";

/**
 * /employer — the recruiter front door (LinkedIn/Indeed pattern).
 * Candidate site links here via "For Employers"; recruiters bookmark
 * and enter here directly. Light HR theme, black-accent direction.
 *
 * CTA routing (interim until the /employer/login + onboarding steps land):
 * logged-out → auth with employer intent; logged-in → the portal.
 */

const FEATURES = [
  {
    title: "Post a job in minutes",
    body: "A five-step wizard captures the role, skills, salary band and screening questions — no formatting work, live on the board when you publish.",
  },
  {
    title: "ATS-scored applicants",
    body: "Applications arrive scored against your job description, so your shortlist starts sorted instead of raw.",
  },
  {
    title: "Pipeline built in",
    body: "Move candidates from shortlist to hired, schedule interviews, and share profiles for feedback — one board, no spreadsheet.",
  },
];

const EASE = [0.4, 0, 0.2, 1];

export default function EmployerLandingPage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) setHasSession(!!session?.user);
    }).catch(() => { /* logged-out default */ });
    return () => { cancelled = true; };
  }, []);

  // Logged-in visitors reuse their account: onboarding grants the recruiter
  // role (no re-login). Logged-out visitors get the employer auth entries.
  const goGetStarted = () => navigate(hasSession ? "/employer/onboarding" : "/employer/signup");
  const goSignIn = () => navigate(hasSession ? "/employer/jobs" : "/employer/login");

  const rise = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, ease: EASE, delay },
        };

  return (
    <div className="emp-root">
      <header className="emp-topbar">
        <Link to="/" className="emp-wordmark">
          CVPassport <small>for Employers</small>
        </Link>
        <div className="emp-topbar-actions">
          <button type="button" className="emp-btn emp-btn--ghost" onClick={goSignIn}>
            Sign in
          </button>
          <button type="button" className="emp-btn emp-btn--primary" onClick={goGetStarted}>
            Get started
          </button>
        </div>
      </header>

      <main>
        <section className="emp-hero">
          <motion.span className="emp-eyebrow" {...rise(0)}>
            For employers
          </motion.span>
          <motion.h1 {...rise(0.06)}>Post jobs. Find Gulf-ready candidates.</motion.h1>
          <motion.p className="emp-hero-sub" {...rise(0.12)}>
            Reach professionals building ATS-ready CVs for the Gulf job market — post a
            role, screen scored applicants, and run your hiring pipeline in one place.
          </motion.p>
          <motion.div className="emp-hero-ctas" {...rise(0.18)}>
            <button type="button" className="emp-btn emp-btn--primary" onClick={goGetStarted}>
              {hasSession ? "Use your existing account to start hiring" : "Post your first job free"}
            </button>
            <button type="button" className="emp-btn emp-btn--ghost" onClick={() => navigate("/employer/pricing")}>
              View plans
            </button>
          </motion.div>
          <motion.p className="emp-hero-note" {...rise(0.24)}>
            Free to start — no card required.
          </motion.p>
        </section>

        <section className="emp-features" aria-label="What you get">
          {FEATURES.map((f, i) => (
            <motion.article
              key={f.title}
              className="emp-card"
              {...(reduceMotion
                ? {}
                : {
                    initial: { opacity: 0, y: 20 },
                    whileInView: { opacity: 1, y: 0 },
                    viewport: { once: true, margin: "-40px" },
                    transition: { duration: 0.45, ease: EASE, delay: i * 0.08 },
                  })}
            >
              <span className="emp-card-num">{i + 1}</span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </motion.article>
          ))}
        </section>
      </main>

      <footer className="emp-foot">
        <Link to="/">Looking for a job instead? Go to CVPassport →</Link>
        <p>&copy; 2026 CVPassport. Operated by JMK, Dubai UAE.</p>
      </footer>
    </div>
  );
}
