import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { FREE_TIER } from "../../../utils/freeTier";

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const TIER_FEATURES = [
  `Up to ${FREE_TIER.jobLimit} active job listings`,
  `${FREE_TIER.applicantsPerMonth} applicants per month`,
  "Full ATS access",
  "Unlimited team seats",
];

export default function PostJobExpiredPaywall({ daysSinceSignup }) {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const item = reduce
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } } };

  return (
    <div className="pj-root">
      <header className="pj-topbar">
        <a href="/" className="pj-wordmark">CV<span>Passport</span></a>
      </header>

      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 24px",
        textAlign: "center",
      }}>
        <motion.div
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.08, delayChildren: 0.05 }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, maxWidth: 480 }}
        >
          <motion.span
            variants={item}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: 999,
              background: "rgba(124, 58, 237, 0.10)",
              color: "var(--pj-primary)",
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Free trial complete
          </motion.span>
          <motion.h1
            variants={item}
            style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: "-0.025em", color: "var(--pj-text)" }}
          >
            Your {FREE_TIER.days}-day free trial has ended
          </motion.h1>
          <motion.p
            variants={item}
            style={{ margin: 0, fontSize: 14, color: "var(--pj-text-soft)", lineHeight: 1.55 }}
          >
            {typeof daysSinceSignup === "number" && (
              <>You signed up {daysSinceSignup} days ago. </>
            )}
            Upgrade to keep posting roles, reviewing applicants, and tapping the full ATS toolkit.
          </motion.p>
          <motion.ul variants={item} style={{ listStyle: "none", padding: 0, margin: "8px 0", display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5, color: "var(--pj-text-soft)", textAlign: "left" }}>
            {TIER_FEATURES.map((f) => (
              <li key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 18, height: 18, borderRadius: 999, background: "rgba(16, 185, 129, 0.12)", color: "#059669", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><CheckIcon /></span>
                {f}
              </li>
            ))}
          </motion.ul>
          <motion.div variants={item} style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <motion.button
              type="button"
              className="pj-btn pj-btn--ghost"
              onClick={() => navigate("/hr")}
              whileHover={reduce ? undefined : { y: -1 }}
              whileTap={reduce ? undefined : { scale: 0.985 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            >
              Back to portal
            </motion.button>
            <motion.button
              type="button"
              className="pj-btn pj-btn--primary"
              onClick={() => navigate("/pricing")}
              whileHover={reduce ? undefined : { y: -1 }}
              whileTap={reduce ? undefined : { scale: 0.985 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            >
              View plans
            </motion.button>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
