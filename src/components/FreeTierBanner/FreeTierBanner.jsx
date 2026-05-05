import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import "./freeTierBanner.css";

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

export default function FreeTierBanner({ daysRemaining, onUpgrade }) {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const upgrade = () => (onUpgrade ? onUpgrade() : navigate("/pricing"));
  const noun = daysRemaining === 1 ? "day" : "days";

  return (
    <motion.div
      role="status"
      className="ftb"
      initial={reduce ? false : { y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
    >
      <span className="ftb__icon" aria-hidden><ClockIcon /></span>
      <span className="ftb__text">
        <b>{daysRemaining} {noun} left</b> on your free trial. After that, you&rsquo;ll need to upgrade to keep posting jobs.
      </span>
      <button type="button" className="ftb__cta" onClick={upgrade}>
        Upgrade
      </button>
    </motion.div>
  );
}
