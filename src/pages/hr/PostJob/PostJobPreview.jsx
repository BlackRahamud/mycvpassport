import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import PortalLogo from "../../../components/hr/PortalLogo";

const POSITION_LABEL = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site" };
const JOB_TYPE_LABEL = { "full-time": "Fulltime", "part-time": "Part-time", contract: "Contract" };
const CURRENCY_PREFIX = { AED: "AED", INR: "₹", USD: "$" };

// "₹50,000 – ₹90,000 / month" / "AED 8,000 / month" / "$50 – $1000".
// Alpha codes get a trailing space, symbols don't; values are thousands-
// grouped and the period (from salaryUnit) is appended. Single value or
// em-dash fallback.
function periodLabel(unit) {
  return unit ? String(unit).replace(/^per\s+/i, "").trim() : ""; // "per month" -> "month"
}
function formatSalary(job) {
  const code = CURRENCY_PREFIX[job.currency] ? job.currency : "AED";
  const prefix = CURRENCY_PREFIX[code];
  const sep = prefix.length > 1 ? `${prefix} ` : prefix; // "AED " vs "$"
  const fmt = (n) => Number(n).toLocaleString("en-US");
  const min = job.salaryMin;
  const max = job.salaryMax;
  const hasMin = min != null && min !== "";
  const hasMax = max != null && max !== "";
  const period = periodLabel(job.salaryUnit);
  const suffix = period ? ` / ${period}` : "";
  if (hasMin && hasMax) return `${sep}${fmt(min)} – ${sep}${fmt(max)}${suffix}`;
  if (hasMin) return `${sep}${fmt(min)}${suffix}`;
  if (hasMax) return `${sep}${fmt(max)}${suffix}`;
  return "—";
}

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

function EmptyState() {
  return (
    <div className="pj-preview__empty">
      <PortalLogo />
      <h3 className="pj-preview__title">Build your talent search</h3>
      <p className="pj-preview__subtle">Your job preview builds here as you fill in the details.</p>
      <div className="pj-preview__ghost" aria-hidden="true">
        <span className="pj-preview__ghost-bar pj-preview__ghost-bar--title" />
        <div className="pj-preview__ghost-chips">
          <span className="pj-preview__ghost-chip" />
          <span className="pj-preview__ghost-chip" />
          <span className="pj-preview__ghost-chip" />
        </div>
        <span className="pj-preview__ghost-bar" />
        <span className="pj-preview__ghost-bar pj-preview__ghost-bar--short" />
      </div>
    </div>
  );
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
  const positionLabel = POSITION_LABEL[job.position] || "On-site";
  const typeLabel = JOB_TYPE_LABEL[job.jobType] || "Fulltime";
  const salaryDisplay = formatSalary(job);
  const locationText = (job.location || "").trim();
  const showSummary = step === "job-description" || step === "hire";

  const userDescPlain = htmlToPlain(job.jobDescription || "").trim();
  const hasDescription = userDescPlain.length > 0;

  const list = { initial: {}, animate: { transition: { staggerChildren: 0.06, delayChildren: 0.18 } } };
  const item = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.36, ease: [0.4, 0, 0.2, 1] } },
  };
  return (
    <motion.div variants={list} initial="initial" animate="animate">
      <motion.h3 className="pj-pcard__title" variants={item}>{title}</motion.h3>
      <motion.p  className="pj-pcard__sub"   variants={item}>
        {locationText && <>{locationText} &nbsp;·&nbsp; </>}<b>{positionLabel}</b>
      </motion.p>
      <motion.div className="pj-pcard__stats" variants={item}>
        <div className="pj-stat">
          <span className="pj-stat__label">Experience</span>
          <span className="pj-stat__value-row"><ChartIcon /><span className="pj-stat__value">Less than 1 Year</span></span>
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
            <h4 className="pj-pcard__section-title">Job Summary</h4>
            {hasDescription ? (
              // First-party HTML authored in our Tiptap editor (schema-constrained
              // to safe nodes/marks) — render it so formatting + images preview.
              <div className="pj-pcard__rich" dangerouslySetInnerHTML={{ __html: job.jobDescription }} />
            ) : (
              <p className="pj-pcard__empty">No description added yet.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {showSummary && hasDescription && (
        <button type="button" className="pj-pcard__see-more">See more <Chevron /></button>
      )}
    </motion.div>
  );
}

export default function PostJobPreview({ step = "start", job }) {
  const reduce = useReducedMotion();
  // Past step 1 OR as soon as a job title is typed — so the preview goes
  // live on step 1 instead of staying a static empty state.
  const isPopulated = step !== "start" || !!(job && job.jobTitle && job.jobTitle.trim());
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
              <EmptyState />
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
