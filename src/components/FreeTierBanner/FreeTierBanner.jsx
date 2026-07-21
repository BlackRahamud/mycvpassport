import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import "./freeTierBanner.css";

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

/**
 * Trial status strip for the employer portal.
 *
 * `message` comes from entitlementNotice() so the copy has one source.
 * The old version hardcoded "you'll need to upgrade to keep posting
 * jobs", which is no longer true: trial expiry drops an employer to the
 * permanent free tier with 1 active job, it never locks them out. It
 * also sent employers to /pricing, the CANDIDATE pricing page.
 */
export default function FreeTierBanner({ message, onUpgrade }) {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const upgrade = () => (onUpgrade ? onUpgrade() : navigate("/employer/pricing"));

  if (!message) return null;

  return (
    <motion.div
      role="status"
      className="ftb"
      initial={reduce ? false : { y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
    >
      <span className="ftb__icon" aria-hidden><ClockIcon /></span>
      <span className="ftb__text">{message}</span>
      <button type="button" className="ftb__cta" onClick={upgrade}>
        See plans
      </button>
    </motion.div>
  );
}
