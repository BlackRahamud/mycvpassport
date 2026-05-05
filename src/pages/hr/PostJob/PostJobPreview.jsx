import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const POSITION_LABEL = { remote: "Remote", hybrid: "Hybrid", onsite: "Onsite" };
const JOB_TYPE_LABEL = { "full-time": "Fulltime", "part-time": "Part-time", contract: "Contract" };

const PLACEHOLDER_SUMMARY =
  "Erat facilisis mi nulla accumsan erat sit. Ac imperdiet felis, libero massa dolor. Nibh sed nec, non neque, platea eu mauris rat facilisis. Erat facilisis mi nulla accumsan erat sit. Ac imperdiet felis, libero massa dolor. Nibh sed nec, non neque, platea eu mauris rat facilisis.";

const PLACEHOLDER_REQUIREMENTS = [
  "Erat facilisis mi nulla accumsan erat sit. Ac imperdiet felis, libero massa dolor.",
  "Nibh sed nec, non neque, platea eu mauris rat facilisis.",
  "Erat facilisis mi nulla accumsan erat sit. Ac imperdiet felis, libero massa dolor.",
];

const ChartIcon = () => (
  <svg className="pj-stat__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const BriefcaseIcon = () => (
  <svg className="pj-stat__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);
const DollarIcon = () => (
  <svg className="pj-stat__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);
const Chevron = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

function EmptyState({ title }) {
  return <h3 className="pj-preview__title">{title}</h3>;
}

function htmlToPlain(html) {
  if (!html) return "";
  if (typeof document === "undefined") return html;
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

function PopulatedJobCard({ job, step }) {
  const title = job.jobTitle?.trim() || "Senior Software Engineer";
  const positionLabel = POSITION_LABEL[job.position] || "Onsite";
  const typeLabel = JOB_TYPE_LABEL[job.jobType] || "Fulltime";
  const salaryDisplay = job.salaryMin != null ? `$${job.salaryMin}` : "—";
  const showSummary = step === "job-description" || step === "hire";
  const showRequirements = step === "hire";

  const userDescPlain = htmlToPlain(job.jobDescription || "").trim();
  const summaryText = userDescPlain || PLACEHOLDER_SUMMARY;

  const list = { initial: {}, animate: { transition: { staggerChildren: 0.06, delayChildren: 0.18 } } };
  const item = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.36, ease: [0.4, 0, 0.2, 1] } },
  };
  return (
    <motion.div variants={list} initial="initial" animate="animate">
      <motion.h3 className="pj-pcard__title" variants={item}>{title}</motion.h3>
      <motion.p  className="pj-pcard__sub"   variants={item}>
        Menlo Park, CA &nbsp;·&nbsp; <b>{positionLabel}</b>
      </motion.p>
      <motion.div className="pj-pcard__stats" variants={item}>
        <div className="pj-stat">
          <span className="pj-stat__label">Experience</span>
          <span className="pj-stat__value-row"><ChartIcon /><span className="pj-stat__value">Less than 1 Years</span></span>
        </div>
        <div className="pj-stat">
          <span className="pj-stat__label">Type</span>
          <span className="pj-stat__value-row"><BriefcaseIcon /><span className="pj-stat__value">{typeLabel}</span></span>
        </div>
        <div className="pj-stat">
          <span className="pj-stat__label">Salary</span>
          <span className="pj-stat__value-row"><DollarIcon /><span className="pj-stat__value">{salaryDisplay}</span></span>
        </div>
      </motion.div>

      <AnimatePresence>
        {showSummary && (
          <motion.div
            key="summary"
            className="pj-pcard__section"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.34, ease: [0.4, 0, 0.2, 1] }}
          >
            <h4 className="pj-pcard__section-title">Job Summary:</h4>
            <p className="pj-pcard__body">{summaryText}</p>
          </motion.div>
        )}
        {showRequirements && (
          <motion.div
            key="reqs"
            className="pj-pcard__section"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.34, ease: [0.4, 0, 0.2, 1], delay: 0.06 }}
          >
            <h4 className="pj-pcard__section-title">Requirements:</h4>
            <ul className="pj-pcard__list">
              {PLACEHOLDER_REQUIREMENTS.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {(showSummary && !showRequirements) && (
        <button type="button" className="pj-pcard__see-more">See more <Chevron /></button>
      )}
    </motion.div>
  );
}

export default function PostJobPreview({ step = "start", job }) {
  const reduce = useReducedMotion();
  const isPopulated = step !== "start";
  return (
    <div className="pj-preview">
      <motion.div
        className="pj-preview__card"
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={reduce ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, -3, 0] }}
        transition={
          reduce
            ? { duration: 0.4 }
            : {
                opacity: { duration: 0.5, ease: [0.4, 0, 0.2, 1], delay: 0.15 },
                y: { duration: 6, ease: [0.4, 0, 0.2, 1], repeat: Infinity, repeatType: "loop", delay: 0.6 },
              }
        }
      >
        <AnimatePresence mode="wait">
          {!isPopulated && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -4, transition: { duration: 0.18 } }} transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}>
              <EmptyState title="Build your talent search" />
            </motion.div>
          )}
          {isPopulated && (
            <motion.div key={`populated-${step}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6, transition: { duration: 0.18 } }} transition={{ duration: 0.36, ease: [0.4, 0, 0.2, 1] }}>
              <PopulatedJobCard job={job || {}} step={step} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
