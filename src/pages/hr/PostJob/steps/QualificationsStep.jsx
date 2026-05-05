import { motion, useReducedMotion } from "framer-motion";

const SCREENING_CATEGORY_LABELS = {
  "background-check":  "Background Check",
  "certifications":    "Certifications",
  "drivers-license":   "Driver's License",
  "gpa":               "GPA",
  "work-authorization":"Work Authorization",
  "drug-test":         "Drug Test",
  "education":         "Education",
  "expertise-tools":   "Expertise with Tools",
  "hybrid-work":       "Hybrid Work",
  "industry-experience":"Industry Experience",
  "language":          "Language",
  "location":          "Location",
  "onsite-work":       "Onsite Work",
  "remote-work":       "Remote Work",
  "urgent-hiring":     "Urgent Hiring Needed",
  "visa-status":       "Visa Status",
  "work-experience":   "Work Experience",
  "custom":            "Custom",
};

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
  </svg>
);
const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const Caret = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);
const CaretDown = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

function YearsStepper({ value, onChange, min, max }) {
  return (
    <div className="pj-num pj-num--plain pj-num--compact">
      <input type="number" value={value} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} min={min} max={max} />
      <div className="pj-num__steppers">
        <button type="button" className="pj-num__step" onClick={() => onChange(Math.min(max, Number(value) + 1))} aria-label="Increase"><Caret /></button>
        <button type="button" className="pj-num__step" onClick={() => onChange(Math.max(min, Number(value) - 1))} aria-label="Decrease"><CaretDown /></button>
      </div>
    </div>
  );
}

function YearsRange({ valueMin, valueMax, onChange, min = 0, max = 50 }) {
  const span = max - min;
  const left = ((valueMin - min) / span) * 100;
  const right = ((valueMax - min) / span) * 100;
  return (
    <div className="pj-range pj-range--compact">
      <div className="pj-range__track" />
      <div className="pj-range__fill" style={{ left: `${left}%`, right: `${100 - right}%` }} />
      <input type="range" min={min} max={max} value={valueMin}
        onChange={(e) => onChange({ min: Math.min(Number(e.target.value), valueMax - 1), max: valueMax })} aria-label="Minimum years" />
      <input type="range" min={min} max={max} value={valueMax}
        onChange={(e) => onChange({ min: valueMin, max: Math.max(Number(e.target.value), valueMin + 1) })} aria-label="Maximum years" />
    </div>
  );
}

function PolicyRow({ policy, onPolicy, onRemove }) {
  return (
    <div className="pj-qual-controls">
      <div className="pj-radio-row" role="radiogroup">
        <label className="pj-radio">
          <input type="radio" checked={policy === "required"} onChange={() => onPolicy("required")} />
          <span className="pj-radio__circle" aria-hidden />
          <span>Required</span>
        </label>
        <label className="pj-radio">
          <input type="radio" checked={policy === "prefer"} onChange={() => onPolicy("prefer")} />
          <span className="pj-radio__circle" aria-hidden />
          <span>Prefer</span>
        </label>
      </div>
      {onRemove && (
        <button type="button" className="pj-icon-btn" onClick={onRemove} aria-label="Remove qualification"><TrashIcon /></button>
      )}
    </div>
  );
}

export default function QualificationsStep({ value, onChange, onContinue, onBack, onAddScreeningQuestion, onViewQuestionGroup }) {
  const reduce = useReducedMotion();
  const set = (patch) => onChange({ ...value, ...patch });

  const containerVariants = { initial: {}, animate: { transition: { staggerChildren: 0.055, delayChildren: 0.06 } } };
  const item = reduce
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } } };

  const groups = value.screeningQuestionGroups || [];

  return (
    <motion.div variants={containerVariants} initial="initial" animate="animate" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <motion.h1 className="pj-h1" variants={item}>Qualifications</motion.h1>

      <motion.div className="pj-qual-block" variants={item}>
        <span className="pj-label">Total years of industry experience</span>
        <YearsRange
          valueMin={value.yearsExperience.min}
          valueMax={value.yearsExperience.max}
          onChange={(yr) => set({ yearsExperience: yr })}
        />
        <div className="pj-num-row" style={{ gridTemplateColumns: "90px 90px", gap: 10 }}>
          <YearsStepper value={value.yearsExperience.min} onChange={(v) => set({ yearsExperience: { ...value.yearsExperience, min: v } })} min={0} max={value.yearsExperience.max - 1} />
          <YearsStepper value={value.yearsExperience.max} onChange={(v) => set({ yearsExperience: { ...value.yearsExperience, max: v } })} min={value.yearsExperience.min + 1} max={50} />
        </div>
        <PolicyRow policy={value.yearsExperiencePolicy} onPolicy={(p) => set({ yearsExperiencePolicy: p })} onRemove={() => set({ yearsExperienceEnabled: false })} />
      </motion.div>

      <motion.div className="pj-qual-block" variants={item} style={{ marginTop: 10 }}>
        <span className="pj-label">Legally authorized to work in the United States</span>
        <PolicyRow policy={value.workAuthPolicy} onPolicy={(p) => set({ workAuthPolicy: p })} onRemove={() => set({ workAuthEnabled: false })} />
      </motion.div>

      {groups.length > 0 && (
        <motion.div variants={item} style={{ marginTop: 18 }}>
          {groups.map((g) => (
            <div key={g.categoryKey} className="pj-saved-q">
              <span className="pj-saved-q__label">{g.questions.length} questions in {SCREENING_CATEGORY_LABELS[g.categoryKey] || g.categoryKey}</span>
              <span className="pj-saved-q__actions">
                <button type="button" className="pj-icon-btn pj-icon-btn--neutral" onClick={() => onViewQuestionGroup?.(g.categoryKey)} aria-label="View questions"><EyeIcon /></button>
                <button type="button" className="pj-icon-btn pj-icon-btn--neutral" onClick={() => onAddScreeningQuestion?.(g.categoryKey)} aria-label="Add more"><PlusIcon /></button>
              </span>
            </div>
          ))}
        </motion.div>
      )}

      <motion.div variants={item} style={{ marginTop: 12 }}>
        <button type="button" className="pj-link-btn" onClick={() => onAddScreeningQuestion?.()}>
          <PlusIcon />
          Add screening question
        </button>
      </motion.div>

      <motion.div className="pj-actions" variants={item}>
        <motion.button type="button" className="pj-btn pj-btn--ghost" onClick={onBack}
          whileHover={reduce ? undefined : { y: -1 }} whileTap={reduce ? undefined : { scale: 0.985 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}>Previous</motion.button>
        <motion.button type="button" className="pj-btn pj-btn--primary" onClick={onContinue}
          whileHover={reduce ? undefined : { y: -1 }} whileTap={reduce ? undefined : { scale: 0.985 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}>Continue</motion.button>
      </motion.div>
    </motion.div>
  );
}
