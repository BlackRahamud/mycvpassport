// =============================================================
// src/components/hr/ImportTargetPicker.jsx
//
// Shared "where should these candidates go?" chooser for the bulk CV
// importer. Two surfaces render it and must stay identical:
//   - /employer/import (ImportPage) — inline as page content
//   - Candidates page "Add candidate" — inside ImportTargetModal
//
// Jobs come first (the common case: one tap → drop zone), then
// "Create a talent pool". With zero jobs the pool card IS the flow —
// never a dead end. The pool row itself is only written by
// import_candidates_batch at commit time, so backing out of the
// importer leaves no orphan pool.
// =============================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./importTargetPicker.css";

const EASE = [0.4, 0, 0.2, 1];

export default function ImportTargetPicker({ jobs, onPickJob, onCreatePool }) {
  const [creating, setCreating] = useState(false);
  const [poolName, setPoolName] = useState("");
  const [poolMarket, setPoolMarket] = useState("gulf");

  const hasJobs = jobs.length > 0;
  const hasPools = jobs.some((j) => j.kind === "pool");

  const submitPool = () => {
    const n = poolName.trim();
    if (!n) return;
    onCreatePool(n, poolMarket);
  };

  return (
    <div className="itp">
      {hasJobs ? (
        <>
          <p className="itp-label">{hasPools ? "Add to a job or pool" : "Add to a job"}</p>
          <div className="itp-jobs">
            {jobs.map((j) => (
              <button key={j.id} type="button" className="itp-job" onClick={() => onPickJob(j)}>
                <span className="itp-job__title">{j.title || "Untitled role"}</span>
                {j.kind === "pool"
                  ? <span className="itp-tag itp-tag--pool">Pool</span>
                  : <span className="itp-tag">{j.market === "india" ? "India" : "Gulf"}</span>}
              </button>
            ))}
          </div>
          <p className="itp-divider">or</p>
        </>
      ) : (
        <p className="itp-empty">
          No jobs posted yet — keep these candidates in a talent pool.
          You can move them onto a job later.
        </p>
      )}

      {creating ? (
        <div className="itp-form">
          <input
            autoFocus
            type="text"
            value={poolName}
            maxLength={80}
            onChange={(e) => setPoolName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitPool(); }}
            placeholder='Name the pool — e.g. "Sales candidates"'
            className="itp-form__input"
            aria-label="Pool name"
          />
          <p className="itp-form__marketlabel">Where are you hiring?</p>
          <div className="itp-toggle" role="radiogroup" aria-label="Market">
            {[["gulf", "Gulf"], ["india", "India"]].map(([k, l]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={poolMarket === k}
                className={`itp-toggle__btn${poolMarket === k ? " itp-toggle__btn--active" : ""}`}
                onClick={() => setPoolMarket(k)}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="itp-form__row">
            <button type="button" className="itp-form__cancel" onClick={() => setCreating(false)}>Cancel</button>
            <button type="button" className="itp-form__go" onClick={submitPool} disabled={!poolName.trim()}>
              Create and add CVs
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="itp-create" onClick={() => setCreating(true)}>
          <span className="itp-create__text">
            <span className="itp-create__title">Create a talent pool</span>
            <span className="itp-create__sub">For CVs that aren't for one job yet</span>
          </span>
          <span className="itp-create__plus" aria-hidden>+</span>
        </button>
      )}
    </div>
  );
}

/* Modal wrapper used by the Candidates page "Add candidate" button.
   Unmounts on close (AnimatePresence), so the picker's local state
   resets naturally between opens. */
export function ImportTargetModal({ open, jobs, onPickJob, onCreatePool, onClose, reduce }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="itp-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Add candidates"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: EASE }}
          onClick={onClose}
        >
          <motion.div
            className="itp-modal"
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            <h3 className="itp-modal__title">Add candidates</h3>
            <p className="itp-modal__sub">Add them to one of your jobs, or keep them in a talent pool.</p>
            <ImportTargetPicker jobs={jobs} onPickJob={onPickJob} onCreatePool={onCreatePool} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
