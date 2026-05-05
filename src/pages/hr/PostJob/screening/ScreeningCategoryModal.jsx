import { motion, useReducedMotion } from "framer-motion";

const CATEGORIES = [
  { key: "background-check",  label: "Background Check" },
  { key: "certifications",    label: "Certifications" },
  { key: "drivers-license",   label: "Driver's License" },
  { key: "gpa",               label: "GPA" },
  { key: "work-authorization",label: "Work Authorization" },
  { key: "drug-test",         label: "Drug Test" },
  { key: "education",         label: "Education" },
  { key: "expertise-tools",   label: "Expertise with Tools" },
  { key: "hybrid-work",       label: "Hybrid Work" },
  { key: "industry-experience",label: "Industry Experience" },
  { key: "language",          label: "Language" },
  { key: "location",          label: "Location" },
  { key: "onsite-work",       label: "Onsite Work" },
  { key: "remote-work",       label: "Remote Work" },
  { key: "urgent-hiring",     label: "Urgent Hiring Needed" },
  { key: "visa-status",       label: "Visa Status" },
  { key: "work-experience",   label: "Work Experience" },
  { key: "custom",            label: "Custom question", badge: "New" },
];

const PlusGlyph = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const CloseGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export default function ScreeningCategoryModal({ open, onClose, onPickCategory }) {
  const reduce = useReducedMotion();
  if (!open) return null;
  return (
    <>
      <motion.div
        className="pj-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        onClick={onClose}
      />
      <div className="pj-modal-wrap">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pj-modal-title"
          className="pj-modal"
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 4 }}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="pj-modal__head">
            <h2 id="pj-modal-title" className="pj-modal__title">Add Screening Questions</h2>
            <button type="button" className="pj-modal__close" onClick={onClose} aria-label="Close"><CloseGlyph /></button>
          </div>
          <div className="pj-modal__body">
            <motion.div
              className="pj-cat-grid"
              initial="initial"
              animate="animate"
              variants={{ initial: {}, animate: { transition: { staggerChildren: 0.025, delayChildren: 0.05 } } }}
            >
              {CATEGORIES.map((c) => (
                <motion.button
                  key={c.key}
                  type="button"
                  className="pj-cat-chip"
                  onClick={() => onPickCategory(c.key)}
                  variants={
                    reduce
                      ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
                      : {
                          initial: { opacity: 0, y: 6 },
                          animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
                        }
                  }
                  whileTap={reduce ? undefined : { scale: 0.97 }}
                >
                  <span className="pj-cat-chip__label">
                    {c.badge && <span className="pj-badge">{c.badge}</span>}
                    {c.label}
                  </span>
                  <span className="pj-cat-chip__plus" aria-hidden><PlusGlyph /></span>
                </motion.button>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
