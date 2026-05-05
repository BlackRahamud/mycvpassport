import { motion, useReducedMotion } from "framer-motion";

const STEPS = [
  { key: "start",        label: "Start" },
  { key: "new-job",      label: "New Job" },
  { key: "qualifications", label: "Qualifications" },
  { key: "job-description", label: "Job Description" },
  { key: "hire",         label: "Hire" },
];

function Stepper({ currentStep }) {
  const currentIdx = STEPS.findIndex((s) => s.key === currentStep);
  return (
    <nav className="pj-stepper" aria-label="Wizard progress">
      {STEPS.map((step, i) => {
        const isActive = i === currentIdx;
        const isDone = i < currentIdx;
        const cls = ["pj-step"];
        if (isActive) cls.push("pj-step--active");
        if (isDone) cls.push("pj-step--done");
        return (
          <span key={step.key} style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
            <span className={cls.join(" ")}>
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

export default function PostJobShell({ currentStep, leftSlot, rightSlot }) {
  const reduce = useReducedMotion();
  return (
    <div className="pj-root">
      <header className="pj-topbar">
        <a href="/" className="pj-wordmark">
          CV<span>Passport</span>
        </a>
        <Stepper currentStep={currentStep} />
      </header>

      <main className="pj-main">
        <motion.section
          className="pj-form-col"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        >
          {leftSlot}
        </motion.section>

        <motion.aside
          className="pj-preview-col"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1], delay: 0.05 }}
        >
          {rightSlot}
        </motion.aside>
      </main>
    </div>
  );
}
