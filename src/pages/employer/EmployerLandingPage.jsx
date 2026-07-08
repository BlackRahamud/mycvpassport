import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "../../appSupabaseClient";
import { HR_SALES } from "../../utils/paywall";
import "../hr/PostJob/postJob.css"; // --pj-* tokens (font stack fallback)
import "./employerLandingPage.css";

/**
 * /employer — the recruiter front door (Claude Design handoff v3,
 * reskinned to brand: navy gradient hero, ink buttons, amber accents).
 *
 * CTA routing is session-aware: logged-in visitors reuse their account
 * (onboarding grants the recruiter role, no re-login); logged-out
 * visitors get the employer auth entries. Pricing is enterprise and
 * handled privately over email/WhatsApp (HR_SALES in paywall.js) —
 * /employer/pricing is deliberately NOT linked from here.
 *
 * The <span data-region> markers are the hooks for the later
 * India/Gulf copy swap; keep them intact.
 */

const EASE = [0.4, 0, 0.2, 1];

const mailHref = `mailto:${HR_SALES.email}`;
const waHref = `https://wa.me/${HR_SALES.whatsapp}`;

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );
}

const VALUE_CARDS = [
  {
    icon: "navy",
    iconPath: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    title: "Guided Job Wizard",
    body: "Post a complete job listing in minutes with our step by step wizard. No guesswork, no blank pages.",
  },
  {
    icon: "plum",
    iconPath: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    title: "ATS Scoring",
    body: "Applicants arrive already scored against your job description. See the best fits first, skip manual screening.",
  },
  {
    icon: "amber",
    iconPath: "M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2",
    title: "Pipeline Board",
    body: "Move candidates from applied to hired on one visual board. Schedule interviews and share profiles for team feedback.",
  },
];

const STEPS = [
  { title: "Post Your Role", body: "Use the guided wizard. Describe what you need in plain language." },
  { title: "Get Scored Applicants", body: "Candidates arrive ranked by fit. The strongest matches surface first." },
  { title: "Run Your Pipeline", body: "Shortlist, schedule interviews, and share profiles for team feedback." },
  { title: "Connect on WhatsApp", body: "Reach shortlisted candidates instantly on the app they already check." },
];

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
  const scrollTop = () => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });

  const rise = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, ease: EASE, delay },
        };

  const reveal = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "-40px" },
          transition: { duration: 0.45, ease: EASE, delay },
        };

  return (
    <div className="empl-root">
      <Helmet>
        <title>Hire Gulf-Ready Candidates: Post Jobs Free | CVPassport</title>
        <meta
          name="description"
          content="Post jobs and reach candidates building ATS-ready CVs for UAE and GCC roles. Applications arrive scored, with a built-in hiring pipeline. Free to start, no card required."
        />
        <link rel="canonical" href="https://www.mycvpassport.com/employer" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Hire Gulf-Ready Candidates: Post Jobs Free | CVPassport" />
        <meta
          property="og:description"
          content="Post jobs and reach candidates building ATS-ready CVs for UAE and GCC roles. Applications arrive scored, with a built-in hiring pipeline."
        />
        <meta property="og:url" content="https://www.mycvpassport.com/employer" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      {/* ── Nav ── */}
      <header className="empl-nav">
        <div className="empl-container empl-nav-inner">
          <button type="button" className="empl-brand empl-brand--btn" onClick={scrollTop} aria-label="Back to top">
            <img src="/logo512.png" alt="CVPassport logo" />
            <span className="empl-brand-name">CVPassport</span>
          </button>
          <nav className="empl-nav-links">
            <a href="#features">Features</a>
            <a href="#founding">Founding Employers</a>
            <Link to="/">For Candidates</Link>
            <a href={mailHref}>Contact</a>
          </nav>
          <div className="empl-nav-actions">
            <button type="button" className="empl-signin-link" onClick={goSignIn}>Sign in</button>
            <button type="button" className="empl-btn empl-btn--primary empl-btn--sm" onClick={goGetStarted}>
              Post a Job Free
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="empl-hero empl-dots-dark">
        <div className="empl-container empl-hero-inner">
          <motion.div className="empl-hero-badge" {...rise(0)}>
            <span className="empl-tag">FOUNDING</span>
            <span>Now onboarding our first hiring teams</span>
          </motion.div>
          <motion.h1 {...rise(0.06)}>
            The fastest way to post jobs and screen applicants in <span data-region>the Gulf</span>.
          </motion.h1>
          <motion.p className="empl-hero-sub" {...rise(0.12)}>
            Post, screen, and hire on a single board. Applicants arrive already scored
            against your exact job description. Free to start, built for teams hiring
            across <strong data-region>the Gulf</strong>.
          </motion.p>
          <motion.div className="empl-hero-ctas" {...rise(0.18)}>
            <button type="button" className="empl-btn empl-btn--primary" onClick={goGetStarted}>
              Post Your First Job
              <ArrowIcon />
            </button>
            <a className="empl-btn empl-btn--ghost-dark" href="#how-it-works">See How It Works</a>
          </motion.div>
          <motion.p className="empl-hero-reassure" {...rise(0.24)}>
            No credit card required. Set up in under 3 minutes.
          </motion.p>
          <motion.p className="empl-hero-signin" {...rise(0.28)}>
            Already hiring with us?{" "}
            <button type="button" className="empl-link-btn" onClick={goSignIn}>Sign in</button>
          </motion.p>
        </div>
      </section>

      {/* ── Value cards ── */}
      <section id="features" className="empl-section empl-section--white">
        <div className="empl-container">
          <motion.div className="empl-section-head" {...reveal(0)}>
            <h2>Everything you need to hire, in one place.</h2>
            <p>Four tools that replace your entire hiring stack.</p>
          </motion.div>
          <div className="empl-values-grid">
            {VALUE_CARDS.map((card, i) => (
              <motion.article key={card.title} className="empl-card" {...reveal(i * 0.08)}>
                <span className={`empl-card-icon empl-icon--${card.icon}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={card.iconPath} />
                  </svg>
                </span>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </motion.article>
            ))}
            <motion.article className="empl-card empl-card--wa" {...reveal(3 * 0.08)}>
              <span className="empl-card-icon empl-icon--green">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </span>
              <h3>WhatsApp Messaging</h3>
              <p>
                Message shortlisted candidates directly over WhatsApp, the channel
                professionals across India and <span data-region>the Gulf</span> already use.
              </p>
            </motion.article>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="empl-section empl-section--soft">
        <div className="empl-container">
          <motion.div className="empl-section-head" {...reveal(0)}>
            <h2>From job post to hire in four steps.</h2>
          </motion.div>
          <div className="empl-steps-grid">
            {STEPS.map((step, i) => (
              <motion.div key={step.title} className="empl-step" {...reveal(i * 0.08)}>
                <div className="empl-step-num">{i + 1}</div>
                <h4>{step.title}</h4>
                <p>{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Founding employers ── */}
      <section id="founding" className="empl-section empl-section--white">
        <div className="empl-container empl-founding-wrap">
          <motion.div className="empl-founding empl-dots-dark" {...reveal(0)}>
            <div className="empl-founding-inner">
              <span className="empl-founding-pill">Limited Founding Offer</span>
              <h2>Join our first 50 employers.</h2>
              <p className="empl-founding-lede">
                We are building CVPassport with the teams who use it first. Founding
                employers get more than a free plan.
              </p>
              <div className="empl-perks">
                <div className="empl-perk">
                  <span className="empl-perk-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </span>
                  <h4>Lifetime Premium Access</h4>
                  <p>
                    Founding employers keep premium features forever, even after we
                    introduce paid tiers. No expiry, no catch.
                  </p>
                </div>
                <div className="empl-perk">
                  <span className="empl-perk-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </span>
                  <h4>Direct Line to Our Team</h4>
                  <p>
                    Tell us what you need and we will build it. Founding employers shape
                    the product roadmap through direct conversations with our team.
                  </p>
                </div>
              </div>
              <button type="button" className="empl-btn empl-btn--primary" onClick={goGetStarted}>
                Claim Your Founding Spot
                <ArrowIcon />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Trust band ── */}
      <section className="empl-trust">
        <div className="empl-container">
          <motion.div {...reveal(0)}>
            <h3>Onboarding our founding employers.</h3>
            <p>We are early and independent. Join the first wave of teams shaping CVPassport today.</p>
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="empl-section empl-section--white empl-final">
        <div className="empl-container">
          <motion.div {...reveal(0)}>
            <h2>Ready to hire smarter?</h2>
            <p>Post your first job today. No credit card, no commitment, no risk.</p>
            <button type="button" className="empl-btn empl-btn--primary" onClick={goGetStarted}>
              Get Started Free
              <ArrowIcon />
            </button>
            <p className="empl-final-pricing">
              For pricing, talk to us. <a href={mailHref}>Email</a> or{" "}
              <a href={waHref} target="_blank" rel="noreferrer">WhatsApp</a>.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="empl-footer">
        <div className="empl-container empl-footer-inner">
          <Link to="/" className="empl-brand" aria-label="CVPassport home">
            <img src="/logo512.png" alt="CVPassport logo" />
            <span className="empl-brand-name">CVPassport</span>
          </Link>
          <nav className="empl-footer-links">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <a href={mailHref}>Contact</a>
          </nav>
          <p className="empl-footer-copy">© 2026 CVPassport. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
