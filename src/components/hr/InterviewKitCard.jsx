// =============================================================
// src/components/hr/InterviewKitCard.jsx
//
// Interview kit — click-to-generate tailored interview questions for a
// candidate against a specific job. Calls /api/ai?action=interview_kit
// (Haiku) and renders 6 to 8 questions, each with a category chip and a
// plain-language "Listen for" note a non-technical HR can judge by.
//
// Mark-as-asked (design 4a): each question carries a "Mark asked" pill for
// live-interview use. Asked items dim + strike the question and hide the
// Listen for line; the header shows an "N of M asked" counter with a mini
// progress bar. Session memory only (same keying as the kit cache) — resets
// on reload, cleared by Regenerate, never persisted.
//
// Deliberately NOT auto-fetched on open (unlike VerdictCard): questions
// only matter once a candidate reaches interview stage, and the button
// keeps an extra AI call off every drawer open. Results cache in session
// memory per candidate+job; Regenerate busts the cache for a fresh set.
//
// If the verdict for the same cacheKey has already been generated, its
// "Gap:" line is passed along so at least one question probes the
// flagged risk — the single thing that makes the set feel tailored.
// =============================================================

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "../../appSupabaseClient";
import safeFetch from "../../lib/net/safeFetch";
import { getCachedVerdict } from "./VerdictCard";
import givenName from "../../lib/hr/givenName";
import "./interviewKitCard.css";

const EASE = [0.4, 0, 0.2, 1];

// Session memory: `${candidateId}:${jobId}` -> questions[]. Same pattern
// as VerdictCard's verdictCache. askedCache mirrors it with the set of
// question indices the HR has marked asked mid-interview.
const kitCache = new Map();
const askedCache = new Map();
export function clearInterviewKitCache() { kitCache.clear(); askedCache.clear(); }

const CATEGORY_LABELS = {
  technical: "Technical",
  experience: "Experience",
  corridor: "Corridor",
  behavioral: "Behavioral",
};

/* ───────── icons ───────── */
const SparkIc = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.7 4.6L18.3 9.3l-4.6 1.7L12 15.6l-1.7-4.6L5.7 9.3l4.6-1.7z" /><path d="M19 15l.85 2.3L22.15 18.15l-2.3.85L19 21.3l-.85-2.3-2.3-.85 2.3-.85z" /></svg>);
const CopyIc = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>);
const CheckIc = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>);
const RefreshIc = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>);
const EarIc = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8.5a6 6 0 1 1 12 0c0 4.5-3.5 4.6-3.5 8a3 3 0 0 1-6 0" /><path d="M9.5 8.5a2.5 2.5 0 0 1 5 0" /></svg>);

// Plain-text export for the clipboard — formatted so it pastes cleanly
// into WhatsApp, email, or a printed sheet. Heading is dash-free per the
// portal copy rule.
function kitToText({ candidateName, jobTitle, questions }) {
  const head = `Interview questions for ${candidateName || "candidate"}${jobTitle ? `, ${jobTitle}` : ""}`;
  const body = questions.map((q, i) =>
    `${i + 1}. [${CATEGORY_LABELS[q.category] || "Question"}] ${q.question}\n   Listen for: ${q.listen_for}`
  ).join("\n\n");
  return `${head}\n\n${body}`;
}

export default function InterviewKitCard({ cacheKey, cvSnapshot, job, jobId, candidateName, jobTitle }) {
  const reduce = useReducedMotion();
  const [state, setState] = useState(() =>
    cacheKey && kitCache.has(cacheKey)
      ? { loading: false, data: kitCache.get(cacheKey), error: null }
      : { loading: false, data: null, error: null }
  );
  const [copied, setCopied] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [asked, setAsked] = useState(() => new Set((cacheKey && askedCache.get(cacheKey)) || []));
  const [spinning, setSpinning] = useState(false);
  const liveRef = useRef(true);
  useEffect(() => () => { liveRef.current = false; }, []);

  // Re-sync when the recruiter switches candidates (cacheKey changes).
  useEffect(() => {
    setCopied(false); setCopiedIdx(null); setSpinning(false);
    setAsked(new Set((cacheKey && askedCache.get(cacheKey)) || []));
    setState(
      cacheKey && kitCache.has(cacheKey)
        ? { loading: false, data: kitCache.get(cacheKey), error: null }
        : { loading: false, data: null, error: null }
    );
  }, [cacheKey]);

  const toggleAsked = (i) => {
    const next = new Set(asked);
    if (next.has(i)) next.delete(i); else next.add(i);
    if (cacheKey) askedCache.set(cacheKey, next);
    setAsked(next);
  };

  const generate = async ({ fresh } = {}) => {
    if (state.loading) return;
    if (fresh && cacheKey) { kitCache.delete(cacheKey); askedCache.delete(cacheKey); }
    if (fresh) setAsked(new Set());
    if (!fresh && cacheKey && kitCache.has(cacheKey)) {
      setState({ loading: false, data: kitCache.get(cacheKey), error: null });
      return;
    }
    setState((s) => ({ loading: true, data: fresh ? null : s.data, error: null }));
    try {
      // Resolve the full job (description/skills/requirements) if the
      // caller only had a jobId — same resolution VerdictCard does.
      let fullJob = job;
      if ((!fullJob || fullJob.description == null) && jobId) {
        const { data: jrow } = await supabase
          .from("jobs")
          .select("title, description, skills, requirements")
          .eq("id", jobId)
          .maybeSingle();
        if (jrow) fullJob = jrow;
      }
      const { data: { session } = {} } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("auth");
      // If the verdict already ran for this candidate+job, hand its Gap
      // line to the prompt so a question probes the flagged risk.
      const verdict = getCachedVerdict(cacheKey);
      const verdictGap = verdict?.two_second_why?.[2] || "";
      const res = await safeFetch("/api/ai?action=interview_kit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          cvSnapshot: cvSnapshot || null,
          job: {
            title: fullJob?.title || "",
            description: fullJob?.description || "",
            skills: fullJob?.skills || [],
            requirements: fullJob?.requirements || [],
          },
          verdictGap,
        }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(out.questions) || out.questions.length === 0) {
        throw new Error(out.error || "failed");
      }
      if (!liveRef.current) return;
      if (cacheKey) kitCache.set(cacheKey, out.questions);
      setState({ loading: false, data: out.questions, error: null });
    } catch (_e) {
      if (!liveRef.current) return;
      setState({ loading: false, data: null, error: "Couldn't generate questions. Please try again." });
    }
  };

  const copyAll = async () => {
    if (!state.data) return;
    try {
      await navigator.clipboard.writeText(kitToText({ candidateName, jobTitle, questions: state.data }));
      setCopied(true);
      setTimeout(() => { if (liveRef.current) setCopied(false); }, 1600);
    } catch { /* clipboard blocked — button simply stays "Copy all" */ }
  };

  const copyOne = async (q, i) => {
    try {
      await navigator.clipboard.writeText(`${q.question}\nListen for: ${q.listen_for}`);
      setCopiedIdx(i);
      setTimeout(() => { if (liveRef.current) setCopiedIdx(null); }, 1600);
    } catch { /* clipboard blocked */ }
  };

  // Regenerate micro-interaction (design 4a): one quick rotate of the
  // refresh icon, then hand off to the loading state. Reduced-motion users
  // skip straight to the fetch.
  const regenerate = () => {
    if (state.loading || spinning) return;
    if (reduce) { generate({ fresh: true }); return; }
    setSpinning(true);
    setTimeout(() => {
      if (!liveRef.current) return;
      setSpinning(false);
      generate({ fresh: true });
    }, 360);
  };

  const askedCount = state.data ? Math.min(asked.size, state.data.length) : 0;

  return (
    <motion.section
      className="ik-card"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      <div className="ik-head">
        <h3 className="ik-head__title"><SparkIc /> Interview questions</h3>
        {state.data && (
          <div className="ik-head__actions">
            {askedCount > 0 && (
              <span className="ik-counter" aria-live="polite">
                <span className="ik-counter__bar" aria-hidden="true">
                  <span className="ik-counter__fill" style={{ width: `${Math.round((askedCount / state.data.length) * 100)}%` }} />
                </span>
                {askedCount} of {state.data.length} asked
              </span>
            )}
            <button type="button" className="ik-mini" onClick={copyAll}>
              {copied ? <span className="ik-pop"><CheckIc /></span> : <CopyIc />} {copied ? "Copied" : "Copy all"}
            </button>
            <button type="button" className={`ik-mini${spinning ? " ik-mini--spin" : ""}`} disabled={state.loading || spinning} onClick={regenerate}>
              <RefreshIc /> Regenerate
            </button>
          </div>
        )}
      </div>

      {!state.data && !state.loading && !state.error && (
        <div className="ik-idle">
          <p className="ik-idle__text">
            {`Get 6 to 8 questions written for ${candidateName ? `${givenName(candidateName, "this candidate")}'s` : "this candidate's"} actual CV and this role. Each comes with a note on what a good answer sounds like.`}
          </p>
          <button type="button" className="ik-generate" onClick={() => generate()}>
            <SparkIc /> Generate questions
          </button>
        </div>
      )}

      {state.loading && (
        <div className="ik-loading" aria-live="polite">
          <span className="ik-loading__pulse" aria-hidden="true" />
          <span className="ik-loading__text">Writing questions from the CV and the role…</span>
        </div>
      )}

      {!state.loading && state.error && (
        <div className="ik-error">
          <span className="ik-error__text">{state.error}</span>
          <button type="button" className="ik-mini" onClick={() => generate({ fresh: true })}>
            <RefreshIc /> Try again
          </button>
        </div>
      )}

      {!state.loading && state.data && (
        <ol className="ik-list">
          {state.data.map((q, i) => {
            const isAsked = asked.has(i);
            return (
              <motion.li
                className={`ik-item${isAsked ? " ik-item--asked" : ""}`}
                key={`${cacheKey}-${i}`}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: EASE, delay: reduce ? 0 : Math.min(i * 0.05, 0.35) }}
              >
                <div className="ik-item__top">
                  <span className="ik-item__lead">
                    <span className="ik-item__num" aria-hidden="true">{i + 1}</span>
                    <span className={`ik-chip ik-chip--${q.category}`}>{CATEGORY_LABELS[q.category] || "Question"}</span>
                  </span>
                  <span className="ik-item__tools">
                    {!isAsked && (
                      <button
                        type="button"
                        className="ik-item__copy"
                        aria-label={copiedIdx === i ? "Copied" : "Copy this question"}
                        onClick={() => copyOne(q, i)}
                      >
                        {copiedIdx === i ? <span className="ik-pop"><CheckIc /></span> : <CopyIc />}
                      </button>
                    )}
                    <button
                      type="button"
                      className={`ik-asked${isAsked ? " ik-asked--on" : ""}`}
                      aria-pressed={isAsked}
                      title={isAsked ? "Tap again to undo" : undefined}
                      onClick={() => toggleAsked(i)}
                    >
                      {isAsked ? <><CheckIc /> Asked</> : "Mark asked"}
                    </button>
                  </span>
                </div>
                <p className="ik-item__q">{q.question}</p>
                {!isAsked && (
                  <p className="ik-item__listen"><EarIc /> <span className="ik-item__listen-label">Listen for:</span> {q.listen_for}</p>
                )}
              </motion.li>
            );
          })}
        </ol>
      )}
    </motion.section>
  );
}
