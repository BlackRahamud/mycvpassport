import { motion, useReducedMotion } from "framer-motion";

const POSITION_OPTIONS = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
];

const JOB_TYPE_OPTIONS = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract",  label: "Contract" },
];

export default function StartStep({ value, onChange, onContinue }) {
  const reduce = useReducedMotion();

  const setField = (field) => (e) => {
    const v = e?.target ? e.target.value : e;
    onChange({ ...value, [field]: v });
  };

  const containerVariants = {
    initial: {},
    animate: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
  };
  const itemVariants = reduce
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.4, 0, 0.2, 1] } },
      };

  return (
    <motion.div variants={containerVariants} initial="initial" animate="animate" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <motion.h1 className="pj-h1" variants={itemVariants}>Let&rsquo;s Get Started</motion.h1>
      <motion.p  className="pj-subhead" variants={itemVariants}>Tell us about the position you need to fill</motion.p>
      <motion.hr className="pj-divider" variants={itemVariants} />

      <motion.div className="pj-field" variants={itemVariants}>
        <label className="pj-label" htmlFor="pj-job-title">Job Title</label>
        <input
          id="pj-job-title"
          className="pj-input"
          type="text"
          placeholder="Enter job title"
          value={value.jobTitle}
          onChange={setField("jobTitle")}
          autoComplete="off"
        />
      </motion.div>

      <motion.div className="pj-field" variants={itemVariants}>
        <span className="pj-label">Position</span>
        <div className="pj-radio-row" role="radiogroup" aria-label="Position">
          {POSITION_OPTIONS.map((opt) => (
            <label key={opt.value} className="pj-radio">
              <input
                type="radio"
                name="pj-position"
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
          onClick={onContinue}
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
