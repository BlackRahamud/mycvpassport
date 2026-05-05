import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import SegmentedToggle from "../components/SegmentedToggle";

const CURRENCY_PREFIX = { AED: "AED", INR: "₹", USD: "$" };
const CURRENCY_OPTIONS = ["AED", "INR", "USD"];

const EDUCATION_LEVELS = [
  { value: "",            label: "Enter minimum education level" },
  { value: "high-school", label: "High School" },
  { value: "associate",   label: "Associate Degree" },
  { value: "bachelor",    label: "Bachelor's Degree" },
  { value: "master",      label: "Master's Degree" },
  { value: "doctorate",   label: "Doctorate" },
];

const RELEVANT_SKILLS = [
  { value: "react-native",      label: "React Native" },
  { value: "react-backend",     label: "React + Backend" },
  { value: "python",            label: "Python" },
  { value: "react-node",        label: "React + Node" },
  { value: "react-frontend",    label: "React (Frontend only)" },
  { value: "react-backend-only",label: "React (Backend only)" },
  { value: "python-django",     label: "Python (Django)" },
  { value: "javascript",        label: "JavaScript" },
  { value: "ruby-on-rails",     label: "Ruby on Rails" },
  { value: "python-flask",      label: "Python (Flask/Vue/Angular)" },
];

const SALARY_RANGE = { min: 0, max: 5000 };

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
const XIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

function DualRange({ min, max, valueMin, valueMax, onChange }) {
  const clampMin = Math.max(min, Math.min(valueMin, valueMax - 1));
  const clampMax = Math.min(max, Math.max(valueMax, valueMin + 1));
  const span = max - min;
  const leftPct  = ((clampMin - min) / span) * 100;
  const rightPct = ((clampMax - min) / span) * 100;
  return (
    <div className="pj-range">
      <div className="pj-range__track" />
      <div className="pj-range__fill" style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }} />
      <input type="range" min={min} max={max} value={clampMin}
        onChange={(e) => onChange({ min: Math.min(Number(e.target.value), clampMax - 1), max: clampMax })}
        aria-label="Minimum salary" />
      <input type="range" min={min} max={max} value={clampMax}
        onChange={(e) => onChange({ min: clampMin, max: Math.max(Number(e.target.value), clampMin + 1) })}
        aria-label="Maximum salary" />
    </div>
  );
}

function NumberStepper({ value, onChange, min = 0, max = 999999, step = 1, prefix = "$" }) {
  const inc = () => onChange(Math.min(max, Number(value) + step));
  const dec = () => onChange(Math.max(min, Number(value) - step));
  return (
    <div className="pj-num">
      <span className="pj-num__prefix">{prefix}</span>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} min={min} max={max} />
      <div className="pj-num__steppers">
        <button type="button" className="pj-num__step" onClick={inc} aria-label="Increase"><Caret /></button>
        <button type="button" className="pj-num__step" onClick={dec} aria-label="Decrease"><CaretDown /></button>
      </div>
    </div>
  );
}

function TagInput({ tags, onChange, placeholder = "" }) {
  const [draft, setDraft] = useState(placeholder);
  const commit = (raw) => {
    const v = String(raw).trim();
    if (!v) return;
    if (tags.includes(v)) { setDraft(""); return; }
    onChange([...tags, v]);
    setDraft("");
  };
  const onKey = (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(draft); }
    else if (e.key === "Backspace" && !draft && tags.length) onChange(tags.slice(0, -1));
  };
  const remove = (t) => onChange(tags.filter((x) => x !== t));
  return (
    <div className="pj-tag-input" onClick={(e) => e.currentTarget.querySelector("input")?.focus()}>
      {tags.map((t) => (
        <span key={t} className="pj-tag">
          {t}
          <button type="button" className="pj-tag__x" onClick={(e) => { e.stopPropagation(); remove(t); }} aria-label={`Remove ${t}`}><XIcon /></button>
        </span>
      ))}
      <input className="pj-tag-input__input" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} onBlur={() => commit(draft)} placeholder={tags.length ? "" : "Add a skill or tool…"} />
    </div>
  );
}

export default function NewJobStep({ value, onChange, onContinue, onBack }) {
  const reduce = useReducedMotion();
  const set = (patch) => onChange({ ...value, ...patch });
  const toggleSkill = (k) => {
    const has = value.relevantSkills.includes(k);
    set({ relevantSkills: has ? value.relevantSkills.filter((x) => x !== k) : [...value.relevantSkills, k] });
  };

  const containerVariants = { initial: {}, animate: { transition: { staggerChildren: 0.055, delayChildren: 0.06 } } };
  const item = reduce
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } } };

  return (
    <motion.div variants={containerVariants} initial="initial" animate="animate" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <motion.h1 className="pj-h1" variants={item}>Skills and Salary</motion.h1>

      <motion.div className="pj-section" variants={item}>
        <p className="pj-section-head">Education &amp; Salary</p>
        <hr className="pj-divider" />
        <div className="pj-field">
          <label className="pj-label" htmlFor="pj-edu">Minimum Education Level</label>
          <div className="pj-select-wrap">
            <select id="pj-edu" className={`pj-select${value.educationLevel ? "" : " pj-select--placeholder"}`} value={value.educationLevel} onChange={(e) => set({ educationLevel: e.target.value })}>
              {EDUCATION_LEVELS.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.value === ""}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="pj-field">
          <div className="pj-row-with-toggle">
            <div className="pj-salary-head" style={{ marginBottom: 0 }}>
              <span className="pj-label">Salary</span>
              <button type="button" className="pj-unit-pill">{value.salaryUnit}</button>
            </div>
            <SegmentedToggle
              options={CURRENCY_OPTIONS}
              value={value.currency || "AED"}
              onChange={(c) => set({ currency: c })}
              ariaLabel="Salary currency"
              size="sm"
            />
          </div>
          <DualRange min={SALARY_RANGE.min} max={SALARY_RANGE.max} valueMin={Number(value.salaryMin) || 0} valueMax={Number(value.salaryMax) || 0} onChange={({ min, max }) => set({ salaryMin: min, salaryMax: max })} />
          <div className="pj-num-row">
            <NumberStepper value={value.salaryMin} onChange={(v) => set({ salaryMin: v })} min={0} max={value.salaryMax - 1} prefix={CURRENCY_PREFIX[value.currency || "AED"]} />
            <NumberStepper value={value.salaryMax} onChange={(v) => set({ salaryMax: v })} min={value.salaryMin + 1} max={SALARY_RANGE.max} prefix={CURRENCY_PREFIX[value.currency || "AED"]} />
          </div>
        </div>
      </motion.div>

      <motion.div className="pj-section" variants={item}>
        <p className="pj-section-head">Skill, Tools, and Technology</p>
        <hr className="pj-divider" />
        <div className="pj-field">
          <span className="pj-label">Relevant Skills</span>
          <div className="pj-chip-grid" role="group" aria-label="Relevant skills">
            {RELEVANT_SKILLS.map((s) => {
              const active = value.relevantSkills.includes(s.value);
              return (
                <motion.button
                  key={s.value} type="button"
                  className={`pj-chip${active ? " pj-chip--active" : ""}`}
                  onClick={() => toggleSkill(s.value)}
                  whileTap={reduce ? undefined : { scale: 0.96 }}
                  transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
                  aria-pressed={active}
                >
                  {s.label}
                </motion.button>
              );
            })}
          </div>
        </div>
        <div className="pj-field">
          <span className="pj-label">Skills, Tools, and Technology</span>
          <TagInput tags={value.tools} onChange={(tools) => set({ tools })} />
        </div>
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
