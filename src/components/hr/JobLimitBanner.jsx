import { motion, useReducedMotion } from "framer-motion";
import "./jobLimitBanner.css";

/**
 * Gate E2, active job limit reached.
 *
 * Inline and NOT blocking, per the canvas: the existing jobs stay
 * visible and usable, this sits above them and explains what the plan
 * allows. A wall would be dishonest here, because nothing has been taken
 * away, the employer simply cannot add another live role.
 *
 * The database is the authority. Migration 046's jobs insert trigger
 * raises HR001 regardless of what this component shows, so this is the
 * designed state for a limit that is already being enforced, never the
 * enforcement itself.
 */

const EASE = [0.4, 0, 0.2, 1];

const CaseIc = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

/** "1 of 1 active on free" — the quiet counter that sits by the heading. */
export function JobCountChip({ ent }) {
  if (!ent?.loaded) return null;
  // Uncapped: state the count, never a ceiling. "10 of null" or a made up
  // number would both be wrong, and there is nothing to count down to.
  if (ent.unlimited) {
    return (
      <span className="jlb-count" title={`${ent.activeJobs} active jobs`}>
        {ent.activeJobs} active {ent.activeJobs === 1 ? "job" : "jobs"}
      </span>
    );
  }
  const planWord = ent.plan === "foundation" ? "Foundation" : "free";
  return (
    <span className="jlb-count" title={`${ent.activeJobs} active of ${ent.activeJobsAllowed} allowed`}>
      {ent.activeJobs} of {ent.activeJobsAllowed} active on {planWord}
    </span>
  );
}

export default function JobLimitBanner({ ent, onUpgrade }) {
  const reduce = useReducedMotion();
  // canPostJob is already true for an uncapped account, so this is
  // belt and braces: the banner must never appear for one, even if a
  // future change makes canPostJob briefly false while data loads.
  if (!ent?.loaded || ent.unlimited || ent.canPostJob) return null;

  // A grandfathered employer sits above the plan limit because their
  // baseline was recorded at backfill. Saying "free allows 1" to someone
  // holding 7 would read as a lie, so the copy follows the real ceiling.
  const grandfathered = ent.activeJobsAllowed > (ent.limits?.active_jobs ?? 0);
  const onFoundation = ent.plan === "foundation";

  const body = grandfathered
    ? `You are at ${ent.activeJobsAllowed} active jobs, the number you had when plans arrived. Close one to post another.`
    : onFoundation
      ? "Foundation allows up to 3 active jobs. Close one to post another, or talk to us about hiring at scale."
      : "Free allows 1 active job. Foundation allows up to 3, so you can hire for more roles at once.";

  return (
    <motion.div
      className="jlb"
      role="status"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: EASE }}
    >
      <span className="jlb__ic" aria-hidden="true"><CaseIc /></span>
      <div className="jlb__copy">
        <div className="jlb__title">You have reached your active job limit</div>
        <p className="jlb__body">{body}</p>
      </div>
      {!onFoundation && !grandfathered && (
        <button type="button" className="jlb__cta" onClick={onUpgrade}>
          Upgrade to Foundation
        </button>
      )}
    </motion.div>
  );
}
