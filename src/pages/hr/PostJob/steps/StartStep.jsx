import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

// On-site first AND default — most UAE/GCC + India roles are on-site.
const WORKPLACE_OPTIONS = [
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
];

const JOB_TYPE_OPTIONS = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract",  label: "Contract" },
  { value: "freelance", label: "Freelance" },
  { value: "intern",    label: "Intern" },
];

// Controlled Field / department vocabulary. This is the ONLY source that
// populates job.department — it is never free text, so the board's Field
// filter can never fill with a job title again. Tune this list freely;
// each entry is stored verbatim and becomes a Field facet on /jobs.
const FIELD_OPTIONS = [
  "Healthcare & Nursing",
  "Engineering",
  "Construction & Trades",
  "IT & Software",
  "Sales & Business Development",
  "Customer Service & Support",
  "Hospitality & Tourism",
  "Retail",
  "Logistics & Supply Chain",
  "Driving & Transport",
  "Finance & Accounting",
  "Admin & Office Support",
  "Marketing & Communications",
  "Human Resources",
  "Education & Training",
  "Operations & Management",
  "Other",
];

export default function StartStep({ value, onChange, onContinue }) {
  const reduce = useReducedMotion();
  const [showErrors, setShowErrors] = useState(false);
  const [fieldOpen, setFieldOpen] = useState(false);
  const [activeFieldIndex, setActiveFieldIndex] = useState(() => Math.max(0, FIELD_OPTIONS.indexOf(value.department)));

  const setField = (field) => (e) => {
    const v = e?.target ? e.target.value : e;
    onChange({ ...value, [field]: v });
  };

  // Company name is optional: blank = "Confidential Company" (applied in services/postJob.js).
  const titleMissing = !(value.jobTitle || "").trim();

  const handleContinue = () => {
    if (titleMissing) { setShowErrors(true); return; }
    onContinue();
  };

  const containerVariants = {
    initial: {},
    animate: { transition: { staggerChildren: 0.04, delayChildren: 0.04 } },
  };
  const itemVariants = reduce
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
      };

  return (
    <motion.div variants={containerVariants} initial="initial" animate="animate" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <motion.h1 className="pj-h1" variants={itemVariants}>Let&rsquo;s Get Started</motion.h1>
      <motion.p  className="pj-subhead" variants={itemVariants}>Tell us about the position you need to fill</motion.p>
      <motion.hr className="pj-divider" variants={itemVariants} />

      <motion.div className="pj-field" variants={itemVariants}>
        <label className="pj-label" htmlFor="pj-company">Company name <span className="pj-label-hint">(optional)</span></label>
        <input
          id="pj-company"
          className="pj-input"
          type="text"
          placeholder="The name candidates will see"
          value={value.companyName || ""}
          onChange={setField("companyName")}
          autoComplete="organization"
        />
        <div style={{ marginTop: 6, fontSize: 12, color: "var(--pj-muted)" }}>
          Leave blank to keep your company confidential. Candidates will see &ldquo;Confidential Company&rdquo;.
        </div>
      </motion.div>

      <motion.div className="pj-field" variants={itemVariants}>
        <label className="pj-label" htmlFor="pj-job-title">Job Title</label>
        <input
          id="pj-job-title"
          className="pj-input"
          type="text"
          placeholder="Enter job title"
          value={value.jobTitle}
          onChange={(e) => { setShowErrors(false); setField("jobTitle")(e); }}
          aria-invalid={showErrors && titleMissing}
          autoComplete="off"
        />
        {showErrors && titleMissing && (
          <div className="pj-field-error">Add a job title to continue.</div>
        )}
      </motion.div>

      <motion.div className="pj-field" variants={itemVariants}>
        <label className="pj-label" htmlFor="pj-field">Field <span className="pj-label-hint">(optional)</span></label>
        <div className={`pj-field-select${fieldOpen ? " is-open" : ""}`}>
          <button
            id="pj-field"
            type="button"
            className={`pj-select pj-field-select__trigger${value.department ? "" : " pj-select--placeholder"}`}
            aria-haspopup="listbox"
            aria-expanded={fieldOpen}
            aria-controls="pj-field-options"
            onClick={() => {
              const currentIndex = FIELD_OPTIONS.indexOf(value.department);
              setActiveFieldIndex(currentIndex >= 0 ? currentIndex : 0);
              setFieldOpen((open) => !open);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setFieldOpen(true);
                setActiveFieldIndex((i) => e.key === "ArrowDown" ? (i + 1) % FIELD_OPTIONS.length : (i - 1 + FIELD_OPTIONS.length) % FIELD_OPTIONS.length);
              } else if (e.key === "Escape") {
                setFieldOpen(false);
              } else if (e.key === "Enter" && fieldOpen) {
                e.preventDefault();
                setField("department")(FIELD_OPTIONS[activeFieldIndex]);
                setFieldOpen(false);
              }
            }}
          >
            <span>{value.department || "Select a field"}</span>
            <span className="pj-field-select__chevron" aria-hidden="true" />
          </button>
          {fieldOpen && (
            <div className="pj-field-select__menu" id="pj-field-options" role="listbox" aria-label="Choose a job field">
              {FIELD_OPTIONS.map((field, index) => (
                <button
                  key={field}
                  type="button"
                  role="option"
                  aria-selected={value.department === field}
                  className={`pj-field-select__option${value.department === field ? " is-selected" : ""}${activeFieldIndex === index ? " is-active" : ""}`}
                  onMouseEnter={() => setActiveFieldIndex(index)}
                  onClick={() => {
                    setField("department")(field);
                    setActiveFieldIndex(index);
                    setFieldOpen(false);
                  }}
                >
                  <span>{field}</span>
                  {value.department === field && <span className="pj-field-select__check" aria-hidden="true">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <motion.div className="pj-field" variants={itemVariants}>
        <label className="pj-label" htmlFor="pj-location">Location</label>
        <input
          id="pj-location"
          className="pj-input"
          type="text"
          placeholder="e.g. Dubai, UAE"
          value={value.location || ""}
          onChange={setField("location")}
          autoComplete="off"
        />
      </motion.div>

      <motion.div className="pj-field" variants={itemVariants}>
        <span className="pj-label">Workplace</span>
        <div className="pj-radio-row" role="radiogroup" aria-label="Workplace">
          {WORKPLACE_OPTIONS.map((opt) => (
            <label key={opt.value} className="pj-radio">
              <input
                type="radio"
                name="pj-workplace"
                value={opt.value}
                checked={value.position === opt.value}
                onChange={setField("position")}
              />
              <span className="pj-radio__circle" aria-hidden />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </motion.div>

      <motion.div className="pj-field" variants={itemVariants}>
        <span className="pj-label">Job Type</span>
        <div className="pj-radio-row" role="radiogroup" aria-label="Job Type">
          {JOB_TYPE_OPTIONS.map((opt) => (
            <label key={opt.value} className="pj-radio">
              <input
                type="radio"
                name="pj-job-type"
                value={opt.value}
                checked={value.jobType === opt.value}
                onChange={setField("jobType")}
              />
              <span className="pj-radio__circle" aria-hidden />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </motion.div>

      <motion.div className="pj-actions" variants={itemVariants}>
        <motion.button
          type="button"
          className="pj-btn pj-btn--primary"
          onClick={handleContinue}
          whileHover={reduce ? undefined : { y: -1 }}
          whileTap={reduce ? undefined : { scale: 0.985 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        >
          Continue
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
