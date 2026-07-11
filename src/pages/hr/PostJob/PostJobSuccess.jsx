import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

const STEPS = [
  { key: "start",          label: "Start" },
  { key: "new-job",        label: "New Job" },
  { key: "qualifications", label: "Qualifications" },
  { key: "job-description",label: "Job Description" },
  { key: "hire",           label: "Post" },
];

function StepperAllDone() {
  return (
    <nav className="pj-stepper" aria-label="Wizard progress">
      {STEPS.map((step, i) => {
        const isLast = i === STEPS.length - 1;
        return (
          <span key={step.key} style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
            <span className={`pj-step ${isLast ? "pj-step--active" : "pj-step--done"}`}>
              <span className="pj-step__dot" aria-hidden>{i + 1}</span>
              <span className="pj-step__label">{step.label}</span>
            </span>
            {i < STEPS.length - 1 && <span className="pj-step__sep" aria-hidden />}
          </span>
        );
      })}
    </nav>
  );
}

function CheckmarkBadge() {
  // Scalloped/wavy outer edge as a conic burst, inner white disc, purple draw-in check.
  const reduce = useReducedMotion();
  const draw = reduce
    ? { initial: { pathLength: 1, opacity: 1 }, animate: { pathLength: 1, opacity: 1 } }
    : { initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1, transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1], delay: 0.45 } } };

  return (
    <motion.div
      style={{ position: "relative", width: 144, height: 144 }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <svg viewBox="0 0 144 144" width="144" height="144" style={{ display: "block" }}>
        <defs>
          <linearGradient id="pj-burst" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"  stopColor="#22D3EE" />
            <stop offset="55%" stopColor="#5EA8F2" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
        </defs>
        {/* Scalloped burst — 16 lobes */}
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i * 360) / 16;
          return (
            <ellipse
              key={i}
              cx="72" cy="72" rx="14" ry="64"
              fill="url(#pj-burst)"
              opacity="0.9"
              transform={`rotate(${angle} 72 72)`}
            />
          );
        })}
        <circle cx="72" cy="72" r="46" fill="url(#pj-burst)" />
        <circle cx="72" cy="72" r="40" fill="#F4F1FB" />
        <circle cx="72" cy="72" r="40" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
        <motion.path
          d="M52 74 L66 88 L94 60"
          fill="none"
          stroke="#7C3AED"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...draw}
        />
      </svg>
    </motion.div>
  );
}

export default function PostJobSuccess({ onGoToJobList }) {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const goBack = () => (onGoToJobList ? onGoToJobList() : navigate("/employer/jobs"));

  const item = reduce
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.4, 0, 0.2, 1] } } };

  return (
    <div className="pj-root">
      <header className="pj-topbar">
        <a href="/" className="pj-wordmark">CV<span>Passport</span></a>
        <StepperAllDone />
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
          transition={{ staggerChildren: 0.12, delayChildren: 0.05 }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}
        >
          <CheckmarkBadge />
          <motion.h1
            variants={item}
            style={{ margin: "16px 0 0", fontSize: 28, fontWeight: 700, color: "var(--pj-text)", letterSpacing: "-0.025em" }}
          >
            Job Successfully Created
          </motion.h1>
          <motion.p
            variants={item}
            style={{ margin: 0, fontSize: 14, color: "var(--pj-muted)" }}
          >
            Your job has been successfully posted.
          </motion.p>
          <motion.button
            type="button"
            onClick={goBack}
            variants={item}
            className="pj-btn pj-btn--ghost"
            whileHover={reduce ? undefined : { y: -1 }}
            whileTap={reduce ? undefined : { scale: 0.985 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            style={{ marginTop: 14, height: 46, padding: "0 28px" }}
          >
            Go back to Job List
          </motion.button>
        </motion.div>
      </main>
    </div>
  );
}
