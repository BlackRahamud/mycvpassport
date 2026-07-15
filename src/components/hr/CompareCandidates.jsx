// =============================================================
// src/components/hr/CompareCandidates.jsx
//
// Side by side candidate compare (design 2a hybrid: labeled rail +
// warm card cells). Opens from the Candidates CRM bulk bar with 2 or 3
// checked candidates.
//
// Data reality:
// - Stored fields (keywords, visa, notice, experience, applied) render
//   instantly from the rows the page already fetched.
// - Score, verdict, strengths and gaps come from VerdictCard's shared
//   resolveVerdict loader (036): session Map -> the row's persisted
//   ai_verdict -> one Sonnet call that writes back to the row. One
//   number per candidate+job across every surface, permanently. Each
//   column loads independently with its own shimmer; one slow candidate
//   never blocks the rest.
// - The "Leading" ribbon + green wash appear only after EVERY column
//   has a score — never a premature winner.
// - Old cached verdicts without strengths/gaps arrays fall back to the
//   Match and Gap lines from two_second_why.
//
// z-index 3400: above the kanban drawer scrim (3000), below the CV
// viewer (3500) so View CV opens on top of the compare panel.
// =============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { scoreBand, BAND_COLORS, BAND_LABELS } from "../../lib/ats/scoreBand";
import { trackHr } from "../../lib/analytics/hrEvents";
import { resolveVerdict } from "./VerdictCard";
import CvViewerOverlay from "./CvViewerOverlay";
import "./compareCandidates.css";

const EASE = [0.4, 0, 0.2, 1];

const getCv = (rec) => rec?.cv_snapshot || rec?.cv_data || {};
const vKey = (cand) => `${cand.record?.candidate_id || cand.key}:${cand.apps?.[0]?.job_id || ""}`;
const initialsOf = (name) =>
  (String(name || "?").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("") || "?").toUpperCase();

function fmtDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/* Career span from the experience array: earliest 4 digit year to the
   latest (or the current year when a role reads as ongoing). Honest
   null when nothing parseable. */
export function careerSpan(experience) {
  const list = Array.isArray(experience) ? experience : [];
  let minY = null;
  let maxY = null;
  let ongoing = false;
  list.forEach((e) => {
    const text = [e?.start_date, e?.startDate, e?.end_date, e?.endDate, e?.period, e?.years].filter(Boolean).join(" ");
    const years = String(text).match(/(19|20)\d{2}/g) || [];
    years.forEach((y) => {
      const n = Number(y);
      if (minY === null || n < minY) minY = n;
      if (maxY === null || n > maxY) maxY = n;
    });
    if (e?.present || /present|current|now/i.test(String(e?.end_date || e?.endDate || e?.period || ""))) ongoing = true;
  });
  if (minY === null) return { years: null, roles: list.length };
  const end = ongoing ? new Date().getFullYear() : (maxY ?? minY);
  return { years: Math.max(0, end - minY), roles: list.length };
}

/* Old cached verdicts predate the strengths/gaps arrays — fall back to
   the Match and Gap lines so the column is never blank. */
function strengthsOf(data) {
  if (Array.isArray(data?.strengths) && data.strengths.length) return data.strengths;
  const m = String(data?.two_second_why?.[0] || "").replace(/^Match\s*:\s*/i, "").trim();
  return m ? [m] : [];
}
function gapsOf(data) {
  if (Array.isArray(data?.gaps) && data.gaps.length) return data.gaps;
  const g = String(data?.two_second_why?.[2] || "").replace(/^Gap\s*:\s*/i, "").trim();
  return g ? [g] : [];
}

/* ───────── icons ───────── */
const CheckIc = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>);
const CloseIc = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);
const RefreshIc = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>);

/* Small score ring (60px), same construction as the VerdictCard ring. */
function MiniRing({ score, color, reduce }) {
  const size = 60;
  const r = 26;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.max(0, Math.min(100, score))) / 100;
  return (
    <span className="cc-ring">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--pj-border)" strokeWidth="5" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ}
          initial={reduce ? { strokeDashoffset: offset } : { strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduce ? 0 : 0.7, ease: EASE }}
        />
      </svg>
      <span className="cc-ring__num" style={{ color }}>{Math.round(score)}</span>
    </span>
  );
}

const NotProvided = () => <span className="cc-pill cc-pill--none">Not provided</span>;

function ShimmerLines({ note }) {
  return (
    <div className="cc-shimmer" aria-hidden="true">
      <span style={{ width: "82%" }} />
      <span style={{ width: "64%" }} />
      {note && <em>{note}</em>}
    </div>
  );
}

export default function CompareCandidates({ open, onClose, candidates = [], from = null, onShortlist, onVerdictPersisted }) {
  const reduce = useReducedMotion();
  const cols = candidates.slice(0, 3);
  const n = cols.length;
  // Did she act on Compare, or just look? actionTakenRef flips on View CV /
  // Shortlist; on close with no action we record 'none' — the signal that
  // Compare is a viewer missing its decision.
  const actionTakenRef = useRef(false);
  const [verdicts, setVerdicts] = useState({}); // vKey -> { loading, data, error }
  const [shortlistBusy, setShortlistBusy] = useState({}); // key -> true
  const [shortlisted, setShortlisted] = useState({}); // key -> true (done this session)
  const [viewCvFor, setViewCvFor] = useState(null); // candidate | null
  const liveRef = useRef(true);
  useEffect(() => () => { liveRef.current = false; }, []);

  const loadVerdict = useCallback(async (cand) => {
    const key = vKey(cand);
    setVerdicts((v) => ({ ...v, [key]: { loading: true, data: null, error: null } }));
    try {
      // Shared 036 loader: Map -> the row's persisted ai_verdict -> one
      // Sonnet call that writes back. Same number as the drawer and the
      // list badge, by construction.
      const out = await resolveVerdict({
        cacheKey: key,
        cvSnapshot: getCv(cand.record) || null,
        jobId: cand.apps?.[0]?.job_id,
        applicationId: cand.record?.id,
        storedVerdict: cand.record?.ai_verdict,
        onPersisted: onVerdictPersisted ? (v) => onVerdictPersisted(cand, v) : undefined,
      });
      if (!liveRef.current) return;
      setVerdicts((v) => ({ ...v, [key]: { loading: false, data: out, error: null } }));
    } catch (_e) {
      if (!liveRef.current) return;
      setVerdicts((v) => ({ ...v, [key]: { loading: false, data: null, error: "Couldn't score this candidate." } }));
    }
  }, [onVerdictPersisted]);

  const colKeys = cols.map(vKey).join("|");
  useEffect(() => {
    if (!open) return;
    cols.forEach((cand) => {
      const key = vKey(cand);
      // Load once per column; errored columns retry on the next open
      // (cheap when the verdict is already stored or cached).
      if (!verdicts[key] || verdicts[key].error) loadVerdict(cand);
    });
    // cols are keyed by colKeys; verdicts is written here, not a trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, colKeys, loadVerdict]);

  // Compare opened: how many, and from where (is it used after interviews?).
  // Also count each candidate she's now looking at, tagged from=compare.
  useEffect(() => {
    if (!open) return;
    actionTakenRef.current = false;
    trackHr("hr_compare_opened", { candidate_count: n, from });
    cols.forEach((c) => trackHr("hr_candidate_opened", { application_id: c.record?.id || null, from: "compare" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Every close control (scrim, Back, X, Escape) funnels through this so a
  // no-action close reliably records 'none'.
  const handleClose = useCallback(() => {
    if (!actionTakenRef.current) trackHr("hr_compare_action_taken", { action: "none" });
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape" && !viewCvFor) handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, handleClose, viewCvFor]);

  /* Leader: only once every column has a score — never a premature winner.
     On an exact tie no one is crowned: no ribbon, no Top score, a "Tied"
     chip instead of the misleading "0 behind". */
  const scores = cols.map((c) => verdicts[vKey(c)]?.data?.score);
  const allScored = n >= 2 && scores.every((s) => typeof s === "number");
  const topScore = allScored ? Math.max(...scores) : null;
  const tied = allScored && scores.filter((s) => s === topScore).length > 1;
  const leaderIdx = allScored && !tied ? scores.indexOf(topScore) : -1;

  /* Row presence: a row renders only when at least ONE column has the value
     (walkthrough item 7: imported candidates produced a wall of "Not
     provided"). With partial data the empty columns still say Not provided,
     because that absence is itself comparison signal. */
  const visaOf = (c) => {
    const cv = getCv(c.record);
    return c.visa || c.record?.visa_status || cv.visa_status || (cv.personal || cv.basics || {}).visa_status || "";
  };
  const noticeOf = (c) => {
    const cv = getCv(c.record);
    const personal = cv.personal || cv.basics || {};
    return cv.notice_period || cv.availability || personal.notice_period || personal.availability || "";
  };
  const rowHas = {
    matchedKw: cols.some((c) => (Array.isArray(c.record?.match_keywords) ? c.record.match_keywords : []).length > 0),
    missingKw: cols.some((c) => (Array.isArray(c.record?.missing_keywords) ? c.record.missing_keywords : []).length > 0),
    visa: cols.some((c) => Boolean(visaOf(c))),
    notice: cols.some((c) => Boolean(noticeOf(c))),
    experience: cols.some((c) => careerSpan(getCv(c.record).experience).years !== null),
  };

  const sameJob = cols.length > 0 && cols.every((c) => c.apps?.[0]?.job_id && c.apps[0].job_id === cols[0].apps?.[0]?.job_id);
  const subtitle = sameJob && cols[0].apps?.[0]?.jobTitle
    ? `${cols[0].apps[0].jobTitle} · ${n} selected`
    : `${n} selected`;

  const doShortlist = async (cand) => {
    const key = vKey(cand);
    if (shortlistBusy[key] || shortlisted[key] || !onShortlist) return;
    // The Compare decision: advancing a candidate (the "Move to Offer" the
    // brief was about — labeled Shortlist here).
    actionTakenRef.current = true;
    trackHr("hr_compare_action_taken", { action: "move_to_offer" });
    setShortlistBusy((s) => ({ ...s, [key]: true }));
    const ok = await onShortlist(cand);
    if (!liveRef.current) return;
    setShortlistBusy((s) => ({ ...s, [key]: false }));
    if (ok) setShortlisted((s) => ({ ...s, [key]: true }));
  };

  /* Column entrance delay (stagger), capped; ribbon fades in last. */
  const colDelay = (i) => (reduce ? 0 : Math.min(0.08 + i * 0.06, 0.3));
  const cellMotion = (i) => ({
    initial: reduce ? false : { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: EASE, delay: colDelay(i) },
  });

  if (!open || n < 2) return null;

  const viewRec = viewCvFor?.record;
  const viewCv = viewCvFor ? getCv(viewRec) : {};
  const viewPersonal = viewCv.personal || viewCv.basics || {};

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="cc-scrim"
        className="cc-scrim"
        role="dialog"
        aria-modal="true"
        aria-label="Compare candidates"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: EASE }}
        onClick={handleClose}
      >
        <motion.div
          className="cc-panel"
          onClick={(e) => e.stopPropagation()}
          initial={reduce ? false : { opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.99 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <header className="cc-head">
            <div className="cc-head__text">
              <h2 className="cc-head__title">Compare candidates</h2>
              <span className="cc-head__sub">{subtitle}</span>
            </div>
            <button type="button" className="cc-back" onClick={handleClose}>Back to candidates</button>
            <button type="button" className="cc-x" aria-label="Close compare" onClick={handleClose}><CloseIc /></button>
          </header>

          <div className="cc-scroll">
            <div className="cc-grid" style={{ "--cc-cols": n }}>
              {/* ── header row ── */}
              <div className="cc-label" aria-hidden="true" />
              {cols.map((c, i) => {
                const lead = i === leaderIdx;
                return (
                  <motion.div key={`h-${c.key}`} className={`cc-cell cc-cell--head${lead ? " cc-cell--lead" : ""}`} {...cellMotion(i)}>
                    <AnimatePresence>
                      {lead && (
                        <motion.span
                          className="cc-ribbon"
                          initial={reduce ? false : { opacity: 0, y: 3 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3, ease: EASE, delay: reduce ? 0 : 0.35 }}
                        >
                          Leading
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <span className="cc-avatar">{initialsOf(c.name)}</span>
                    <div className="cc-who">
                      <span className="cc-who__name">{c.name}</span>
                      {(getCv(c.record).desired_job || getCv(c.record).target_role || (getCv(c.record).personal || {}).headline || c.apps?.[0]?.jobTitle) && (
                        <span className="cc-who__role">
                          {getCv(c.record).desired_job || getCv(c.record).target_role || (getCv(c.record).personal || {}).headline || c.apps?.[0]?.jobTitle}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* ── Match score ── */}
              <div className="cc-label">Match score</div>
              {cols.map((c, i) => {
                const v = verdicts[vKey(c)] || { loading: true };
                const lead = i === leaderIdx;
                return (
                  <motion.div key={`s-${c.key}`} className={`cc-cell${lead ? " cc-cell--lead" : ""}`} {...cellMotion(i)}>
                    {v.data ? (
                      <span className="cc-score">
                        <MiniRing
                          score={v.data.score}
                          color={BAND_COLORS[scoreBand(v.data.score, "ai_verdict")]}
                          reduce={reduce}
                        />
                        {allScored && (tied && v.data.score === topScore
                          ? <span className="cc-chip cc-chip--top">Tied</span>
                          : lead
                            ? <span className="cc-chip cc-chip--top">Top score</span>
                            : <span className="cc-behind">{topScore - v.data.score} behind</span>)}
                      </span>
                    ) : v.error ? (
                      <span className="cc-err">
                        {v.error}
                        <button type="button" className="cc-retry" onClick={() => loadVerdict(c)}><RefreshIc /> Retry</button>
                      </span>
                    ) : (
                      <span className="cc-score"><span className="cc-ring cc-ring--empty" aria-hidden="true" /><span className="cc-soft">Scoring…</span></span>
                    )}
                  </motion.div>
                );
              })}

              {/* ── Verdict ── */}
              <div className="cc-label">Verdict</div>
              {cols.map((c, i) => {
                const v = verdicts[vKey(c)] || { loading: true };
                const lead = i === leaderIdx;
                if (!v.data) {
                  return (
                    <motion.div key={`v-${c.key}`} className={`cc-cell${lead ? " cc-cell--lead" : ""}`} {...cellMotion(i)}>
                      {v.error ? <span className="cc-soft">No verdict yet</span> : <ShimmerLines />}
                    </motion.div>
                  );
                }
                const band = scoreBand(v.data.score, "ai_verdict");
                return (
                  <motion.div key={`v-${c.key}`} className={`cc-cell${lead ? " cc-cell--lead" : ""}`} {...cellMotion(i)}>
                    <span className={`cc-verdict cc-verdict--${band}`}>{BAND_LABELS[band]}</span>
                  </motion.div>
                );
              })}

              {/* ── Strengths ── */}
              <div className="cc-label cc-label--top">Strengths</div>
              {cols.map((c, i) => {
                const v = verdicts[vKey(c)] || { loading: true };
                const items = v.data ? strengthsOf(v.data) : [];
                const lead = i === leaderIdx;
                return (
                  <motion.div key={`st-${c.key}`} className={`cc-cell cc-cell--list${lead ? " cc-cell--lead" : ""}`} {...cellMotion(i)}>
                    {v.loading ? <ShimmerLines note="Reading this CV against the role…" />
                      : v.error ? <span className="cc-soft">Not available</span>
                      : items.length ? items.map((s, j) => (
                          <span className="cc-item" key={j}><span className="cc-item__ic cc-item__ic--good"><CheckIc /></span>{s}</span>
                        ))
                      : <span className="cc-soft">None noted</span>}
                  </motion.div>
                );
              })}

              {/* ── Gaps ── */}
              <div className="cc-label cc-label--top">Gaps</div>
              {cols.map((c, i) => {
                const v = verdicts[vKey(c)] || { loading: true };
                const items = v.data ? gapsOf(v.data) : [];
                const lead = i === leaderIdx;
                return (
                  <motion.div key={`g-${c.key}`} className={`cc-cell cc-cell--list${lead ? " cc-cell--lead" : ""}`} {...cellMotion(i)}>
                    {v.loading ? <ShimmerLines />
                      : v.error ? <span className="cc-soft">Not available</span>
                      : items.length ? items.map((g, j) => (
                          <span className="cc-item" key={j}><span className="cc-item__dot" aria-hidden="true" />{g}</span>
                        ))
                      : <span className="cc-soft">None noted</span>}
                  </motion.div>
                );
              })}

              {/* ── Matched keywords (hidden when NO column has any) ── */}
              {rowHas.matchedKw && (
                <>
                  <div className="cc-label cc-label--top">Matched keywords</div>
                  {cols.map((c, i) => {
                    const matched = Array.isArray(c.record?.match_keywords) ? c.record.match_keywords : [];
                    const missing = Array.isArray(c.record?.missing_keywords) ? c.record.missing_keywords : [];
                    const total = matched.length + missing.length;
                    const lead = i === leaderIdx;
                    return (
                      <motion.div key={`mk-${c.key}`} className={`cc-cell cc-cell--chips${lead ? " cc-cell--lead" : ""}`} {...cellMotion(i)}>
                        {matched.length ? (
                          <>
                            {matched.slice(0, 6).map((k, j) => <span className="cc-kw cc-kw--hit" key={j}>{k}</span>)}
                            {total > 0 && <span className="cc-tally">{matched.length} of {total}</span>}
                          </>
                        ) : <NotProvided />}
                      </motion.div>
                    );
                  })}
                </>
              )}

              {/* ── Missing keywords (hidden when NO column has any) ── */}
              {rowHas.missingKw && (
                <>
                  <div className="cc-label cc-label--top">Missing keywords</div>
                  {cols.map((c, i) => {
                    const missing = Array.isArray(c.record?.missing_keywords) ? c.record.missing_keywords : [];
                    const lead = i === leaderIdx;
                    return (
                      <motion.div key={`xk-${c.key}`} className={`cc-cell cc-cell--chips${lead ? " cc-cell--lead" : ""}`} {...cellMotion(i)}>
                        {missing.length
                          ? missing.slice(0, 6).map((k, j) => <span className="cc-kw cc-kw--miss" key={j}>{k}</span>)
                          : <span className="cc-soft">None</span>}
                      </motion.div>
                    );
                  })}
                </>
              )}

              {/* ── Experience (hidden when NO column has parseable dates) ── */}
              {rowHas.experience && (
                <>
                  <div className="cc-label">Experience</div>
                  {cols.map((c, i) => {
                    const span = careerSpan(getCv(c.record).experience);
                    const lead = i === leaderIdx;
                    return (
                      <motion.div key={`e-${c.key}`} className={`cc-cell${lead ? " cc-cell--lead" : ""}`} {...cellMotion(i)}>
                        {span.years !== null ? (
                          <span className="cc-fact">
                            <strong>{span.years} {span.years === 1 ? "year" : "years"}</strong>
                            <em>{span.roles} {span.roles === 1 ? "role" : "roles"} listed</em>
                          </span>
                        ) : <NotProvided />}
                      </motion.div>
                    );
                  })}
                </>
              )}

              {/* ── Visa status (record column OR parsed CV; hidden when empty everywhere) ── */}
              {rowHas.visa && (
                <>
                  <div className="cc-label">Visa status</div>
                  {cols.map((c, i) => {
                    const visa = visaOf(c);
                    const lead = i === leaderIdx;
                    return (
                      <motion.div key={`vi-${c.key}`} className={`cc-cell${lead ? " cc-cell--lead" : ""}`} {...cellMotion(i)}>
                        {visa ? <span className="cc-pill">{visa}</span> : <NotProvided />}
                      </motion.div>
                    );
                  })}
                </>
              )}

              {/* ── Notice period (hidden when empty everywhere) ── */}
              {rowHas.notice && (
                <>
                  <div className="cc-label">Notice period</div>
                  {cols.map((c, i) => {
                    const notice = noticeOf(c);
                    const lead = i === leaderIdx;
                    return (
                      <motion.div key={`np-${c.key}`} className={`cc-cell${lead ? " cc-cell--lead" : ""}`} {...cellMotion(i)}>
                        {notice ? <span className="cc-fact"><strong>{notice}</strong></span> : <NotProvided />}
                      </motion.div>
                    );
                  })}
                </>
              )}

              {/* ── Applied ── */}
              <div className="cc-label">Applied</div>
              {cols.map((c, i) => {
                const when = fmtDate(c.record?.applied_at);
                const lead = i === leaderIdx;
                return (
                  <motion.div key={`a-${c.key}`} className={`cc-cell${lead ? " cc-cell--lead" : ""}`} {...cellMotion(i)}>
                    {when ? <span className="cc-soft cc-soft--dark">{when}</span> : <NotProvided />}
                  </motion.div>
                );
              })}

              {/* ── Actions ── */}
              <div className="cc-label" aria-hidden="true" />
              {cols.map((c, i) => {
                const key = vKey(c);
                const already = shortlisted[key] || c.apps?.[0]?.status === "shortlisted";
                return (
                  <motion.div key={`act-${c.key}`} className="cc-cell cc-cell--actions" {...cellMotion(i)}>
                    {/* Shortlist targets the specific job shown in this column
                        (apps[0]); a person with no job has nothing to stage,
                        so the button never renders as a dead control. */}
                    {onShortlist && c.apps?.[0] && (
                      <button
                        type="button"
                        className="cc-btn cc-btn--primary"
                        disabled={!!shortlistBusy[key] || already}
                        onClick={() => doShortlist(c)}
                      >
                        {already ? <><CheckIc /> Shortlisted</> : shortlistBusy[key] ? "Saving…" : "Shortlist"}
                      </button>
                    )}
                    <button type="button" className="cc-btn" onClick={() => { actionTakenRef.current = true; trackHr("hr_compare_action_taken", { action: "view_cv" }); setViewCvFor(c); }}>View CV</button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>

        <CvViewerOverlay
          open={!!viewCvFor}
          onClose={() => setViewCvFor(null)}
          path={viewRec?.cv_file_path}
          fileName={viewCvFor ? `${viewCvFor.name} CV` : ""}
          intel={viewCvFor ? {
            name: viewCvFor.name,
            role: viewCv.desired_job || viewCv.target_role || viewPersonal.headline || viewCvFor.apps?.[0]?.jobTitle || "Candidate",
            location: viewPersonal.location || "",
            visa: viewCvFor.visa || "",
            notice: viewCv.notice_period || viewCv.availability || viewPersonal.notice_period || "",
            score: viewRec?.ats_score,
            scoreSource: viewRec?.score_source,
            matchedKeywords: Array.isArray(viewRec?.match_keywords) ? viewRec.match_keywords : [],
            missingKeywords: Array.isArray(viewRec?.missing_keywords) ? viewRec.missing_keywords : [],
            skills: viewCvFor.skills || [],
            appliedTo: (viewCvFor.apps || []).map((ap) => ({ title: ap.jobTitle, when: ap.kind === "pool" ? "Talent pool" : "" })),
            email: viewCvFor.email || "",
          } : null}
        />
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
