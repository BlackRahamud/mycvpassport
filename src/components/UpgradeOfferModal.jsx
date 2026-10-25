import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import "./UpgradeOfferModal.css";

// Presentational upgrade modal. It owns no pricing or checkout logic: the
// caller passes the offer (plan name, price, perks) and the click handler.
// Inline SVG icons keep this free of extra dependencies.

const PATHS = {
  check: "M5 12.5l4.5 4.5L19 7.5",
  x: "M6 6l12 12M18 6L6 18",
  arrow: "M5 12h14M13 6l6 6-6 6",
  lock: "M7 11V8a5 5 0 0110 0v3M6 11h12v9H6z",
  wand: "M4 20L16 8M14 4l1.5 2.5L18 8l-2.5 1.5L14 12l-1.5-2.5L10 8l2.5-1.5zM19 14l.8 1.4 1.4.8-1.4.8L19 18.4l-.8-1.4-1.4-.8 1.4-.8z",
  target: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8zM12 12h.01",
  file: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  bolt: "M13 3L5 14h6l-1 7 8-11h-6z",
  up: "M7 17L17 7M9 7h8v8",
  crown: "M4 18h16M5 18L3 7l5 4 4-6 4 6 5-4-2 11",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
};

function Icon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

const FEATURES = [
  { title: "AI Rewrite", description: "Turn your experience into stronger, clearer bullet points.", icon: "wand", tone: "blue" },
  { title: "Full ATS Checker", description: "See every gap and fix it before you apply.", icon: "target", tone: "purple" },
  { title: "Premium Templates", description: "Modern, recruiter-friendly CV designs.", icon: "file", tone: "green" },
  { title: "Cover Letter + Job Match", description: "Tailor your CV and letter to each job.", icon: "mail", tone: "orange" },
];

const SAMPLE_BEFORE = ["Worked on web applications", "Assisted in team projects"];
const SAMPLE_AFTER = ["Built and shipped customer-facing web apps with React and Node.js", "Led delivery of 3 projects across product and design teams"];

function ResumeCard({ after = false, score, projected }) {
  return (
    <motion.article
      className={`cv-resume ${after ? "cv-resume--after" : "cv-resume--before"}`}
      initial={false}
      whileHover={{ y: -5, rotate: after ? 1 : -3 }}
      transition={{ type: "spring", stiffness: 240, damping: 20 }}
      aria-label={after ? "Example of an improved CV" : "Example of an original CV"}
    >
      <div className="cv-resume__top">
        <span>Example CV</span>
        <span className={`cv-resume__status ${after ? "is-premium" : ""}`}>{after ? "After" : "Before"}</span>
      </div>
      <div className="cv-profile">
        <div className="cv-avatar" aria-hidden="true">CV</div>
        <div>
          <strong>Your Name</strong>
          <span>Your Target Role</span>
          <small>name@email.com · City</small>
        </div>
      </div>
      <div className="cv-section">
        <b>Work Experience</b>
        <strong className="cv-role">{after ? "Clear title, impact-led" : "Vague title"}</strong>
        <ul>
          {(after ? SAMPLE_AFTER : SAMPLE_BEFORE).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="cv-section cv-skills">
        <b>Skills</b>
        <div className="cv-skill-list">
          {(after ? ["Role keywords", "Tools", "Certifications"] : ["Generic skills"]).map((skill) => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
      </div>
      {after && score != null && projected != null && (
        <div className="cv-score">
          <span className="cv-score__icon"><Icon name="up" size={18} /></span>
          <span><small>Your ATS score, projected</small><strong>{score} → {projected}</strong></span>
        </div>
      )}
    </motion.article>
  );
}

function BenefitCard({ feature, index }) {
  return (
    <motion.div
      className="cv-benefit"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.12 + index * 0.07 }}
    >
      <span className={`cv-benefit__icon cv-tone-${feature.tone}`}><Icon name={feature.icon} size={20} /></span>
      <span className="cv-benefit__text">
        <strong>{feature.title}</strong>
        <small>{feature.description}</small>
      </span>
    </motion.div>
  );
}

/**
 * Props
 * - open, onClose, onUpgrade, loading
 * - planName:    "Express Pass" | "Active Hunter" | ...
 * - price:       display string, e.g. "₹149"
 * - priceNote:   e.g. "one-time payment" | "30 days, one-time payment"
 * - perks:       up to 3 short strings shown under the price
 * - ctaLabel:    button text
 * - processor:   "Razorpay" | "Ziina" (shown in the secure note)
 * - score / projectedScore / missingKeywords: real scan data, all optional
 * - headline / lede: optional copy overrides
 */
export default function UpgradeOfferModal({
  open = false,
  onClose = () => {},
  onUpgrade = () => {},
  loading = false,
  disabled = false,
  planName = "Premium",
  price = "",
  priceNote = "one-time payment",
  perks = [],
  ctaLabel = "Upgrade",
  processor = "",
  score = null,
  projectedScore = null,
  missingKeywords = [],
  headline = null,
  lede = null,
}) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const hasScore = typeof score === "number" && typeof projectedScore === "number" && projectedScore > score;
  const keywords = (Array.isArray(missingKeywords) ? missingKeywords : []).slice(0, 3);

  const title = headline || (hasScore ? `Your CV scored ${score}. Let's get it to ${projectedScore}.` : "Make your next application your strongest yet.");
  const sub = lede || (hasScore
    ? "Your free scan is used up. Unlock the full checker, AI rewrites and premium templates to fix the gaps recruiters' systems are filtering you out for."
    : "Unlock the full ATS checker, AI rewrites and premium templates, all in one place.");

  const fadeUp = reduceMotion
    ? { initial: false, animate: { opacity: 1 }, transition: { duration: 0 } }
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="cv-upgrade-overlay"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.section
            className="cv-upgrade-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cv-upgrade-title"
            {...fadeUp}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.985 }}
            transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="cv-upgrade-glow cv-upgrade-glow--one" />
            <div className="cv-upgrade-glow cv-upgrade-glow--two" />

            <header className="cv-upgrade-header">
              <div className="cv-brand">
                <span className="cv-brand__mark" aria-hidden="true">»</span>
                <span>CVPassport</span>
              </div>
              <div className="cv-header-actions">
                <span className="cv-premium-pill"><Icon name="crown" size={14} /> {planName}</span>
                <button className="cv-close" type="button" onClick={onClose} aria-label="Close">
                  <Icon name="x" size={19} />
                </button>
              </div>
            </header>

            <div className="cv-upgrade-grid">
              <div className="cv-upgrade-copy">
                <motion.div className="cv-eyebrow" {...fadeUp}>
                  <Icon name="sparkle" size={15} /> {hasScore ? "YOUR SCAN RESULT" : "YOUR NEXT CAREER MOVE"}
                </motion.div>
                <motion.h2 id="cv-upgrade-title" {...fadeUp}>{title}</motion.h2>
                <motion.p className="cv-upgrade-lede" {...fadeUp}>{sub}</motion.p>

                {hasScore && (
                  <div className="cv-scorestrip" aria-label={`ATS score ${score}, projected ${projectedScore}`}>
                    <span className="cv-scorestrip__now"><small>Now</small><strong>{score}</strong></span>
                    <span className="cv-scorestrip__arrow"><Icon name="arrow" size={18} /></span>
                    <span className="cv-scorestrip__next"><small>Projected</small><strong>{projectedScore}</strong></span>
                  </div>
                )}

                {keywords.length > 0 && (
                  <div className="cv-chips">
                    <small>Missing from your CV</small>
                    <div>
                      {keywords.map((k) => <span key={k}>{k}</span>)}
                    </div>
                  </div>
                )}

                <div className="cv-benefit-grid">
                  {FEATURES.map((feature, index) => (
                    <BenefitCard key={feature.title} feature={feature} index={index} />
                  ))}
                </div>

                <div className="cv-price-panel">
                  <div className="cv-price-main">
                    <span className="cv-best-value">{planName.toUpperCase()}</span>
                    <div className="cv-price-line">
                      <strong>{price}</strong>
                      <span>{priceNote}</span>
                    </div>
                  </div>
                  <ul className="cv-price-perks">
                    {perks.slice(0, 3).map((p) => (
                      <li key={p}><Icon name="check" size={14} /> {p}</li>
                    ))}
                  </ul>
                </div>

                <button className="cv-upgrade-cta" type="button" onClick={onUpgrade} disabled={loading || disabled}>
                  {loading ? "Opening checkout…" : ctaLabel} {!loading && <Icon name="arrow" size={19} />}
                </button>
                <div className="cv-secure-note">
                  <Icon name="lock" size={12} /> Secure checkout{processor ? ` via ${processor}` : ""}
                </div>
                <button className="cv-later" type="button" onClick={onClose}>Maybe later</button>
              </div>

              <div className="cv-visual" aria-label="Example of a CV before and after">
                <div className="cv-visual__orb" />
                <motion.div className="cv-floating-note cv-floating-note--rewrite" animate={reduceMotion ? {} : { y: [0, -7, 0] }} transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}>
                  <span className="cv-note-icon cv-tone-blue"><Icon name="wand" size={20} /></span>
                  <span><b>AI Rewrite</b><small>Clearer, stronger bullets.</small></span>
                </motion.div>
                <motion.div className="cv-floating-note cv-floating-note--ats" animate={reduceMotion ? {} : { y: [0, 6, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
                  <span className="cv-note-icon cv-tone-purple"><Icon name="target" size={20} /></span>
                  <span><b>ATS Checker</b><small>Find and fix the gaps.</small></span>
                </motion.div>

                <motion.div className="cv-resume-stack" {...(reduceMotion ? {} : { initial: { opacity: 0, scale: 0.94 }, animate: { opacity: 1, scale: 1 }, transition: { delay: 0.18, duration: 0.55 } })}>
                  <ResumeCard />
                  <ResumeCard after score={hasScore ? score : null} projected={hasScore ? projectedScore : null} />
                </motion.div>

                <motion.div className="cv-floating-note cv-floating-note--templates" animate={reduceMotion ? {} : { y: [0, 5, 0] }} transition={{ duration: 4.7, repeat: Infinity, ease: "easeInOut" }}>
                  <span className="cv-note-icon cv-tone-green"><Icon name="file" size={20} /></span>
                  <span><b>Pro Templates</b><small>Modern, polished designs.</small></span>
                </motion.div>
                <motion.div className="cv-floating-note cv-floating-note--tips" animate={reduceMotion ? {} : { y: [0, -5, 0] }} transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}>
                  <span className="cv-note-icon cv-tone-orange"><Icon name="bolt" size={20} /></span>
                  <span><b>Cover Letter</b><small>Tailored to each job.</small></span>
                </motion.div>
                <p className="cv-example-tag">Illustrative example</p>
              </div>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
