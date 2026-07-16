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

  const setField = (field) => (e) => {
    const v = e?.target ? e.target.value : e;
    onChange({ ...value, [field]: v });
  };

  const companyMissing = !(value.companyName || "").trim();
  const titleMissing = !(value.jobTitle || "").trim();

  const handleContinue = () => {
    if (companyMissing || titleMissing) { setShowErrors(true); return; }
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
        <label className="pj-label" htmlFor="pj-company">Company name</label>
        <input
          id="pj-company"
          className="pj-input"
          type="text"
          placeholder="The name candidates will see"
          value={value.companyName || ""}
          onChange={(e) => { setShowErrors(false); setField("companyName")(e); }}
          aria-invalid={showErrors && companyMissing}
          autoComplete="organization"
        />
        {showErrors && companyMissing && (
          <div className="pj-field-error">Add your company name — it&rsquo;s the first thing candidates see on the board.</div>
        )}
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
        <div className="pj-select-wrap">
          <select
            id="pj-field"
            className={`pj-select${value.department ? "" : " pj-select--placeholder"}`}
            value={value.department || ""}
            onChange={setField("department")}
          >
            <option value="">Select a field</option>
            {FIELD_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
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
