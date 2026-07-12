// =============================================================
// src/components/hr/InterviewKitCard.jsx
//
// The prep kit, hers to shape (interview kit frames 1c / 1d). AI
// questions with "listen for" notes, plus:
//  - "Add your own question" inline; edit or remove ANY question. Her
//    questions carry the purple "Your question" chip and no listen for
//    line, so hers and the AI's stay distinct in one list, her order.
//  - "Save these as my set for <role>": the next interview for this job
//    preloads exactly this set. Her bank grows with no management screen.
//  - Credit discipline: the first generation is Haiku on an explicit
//    click and free. Regenerate confirms, replaces ONLY the AI questions,
//    and uses 1 credit (Sonnet, tailored) with the cost note beside it.
//  - Persistence: when the candidate has an interview scheduled, the kit
//    lives on that interviews row (kit jsonb) and survives refresh; the
//    live companion reads and writes the same row. With no interview yet
//    it keeps the old session-memory behaviour.
//
// Generating state is calm: pulse dot + sentence + quiet ghost rows.
// No bare spinner, no percentage.
// =============================================================

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { getCachedVerdict } from "./VerdictCard";
import givenName from "../../lib/hr/givenName";
import {
  KIT_CATEGORY_LABELS, normalizeKit, kitFromQuestions,
  addOwnQuestion, updateQuestionText, removeQuestion, replaceAiQuestions,
  saveKit, loadRoleSet, saveRoleSet, generateKitQuestions, loadLatestInterview,
} from "../../lib/hr/interviewKit";
import "./interviewKitCard.css";

const EASE = [0.4, 0, 0.2, 1];

// Session memory fallback: `${candidateId}:${jobId}` -> kit object. Used
// when there is no interview row to persist against (pre-schedule prep).
const kitCache = new Map();
export function clearInterviewKitCache() { kitCache.clear(); }

/* ───────── icons ───────── */
const SparkIc = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.7 4.6L18.3 9.3l-4.6 1.7L12 15.6l-1.7-4.6L5.7 9.3l4.6-1.7z" /><path d="M19 15l.85 2.3L22.15 18.15l-2.3.85L19 21.3l-.85-2.3-2.3-.85 2.3-.85z" /></svg>);
const CopyIc = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>);
const CheckIc = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>);
const RefreshIc = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>);
const EarIc = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8.5a6 6 0 1 1 12 0c0 4.5-3.5 4.6-3.5 8a3 3 0 0 1-6 0" /><path d="M9.5 8.5a2.5 2.5 0 0 1 5 0" /></svg>);
const SaveIc = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>);

// Plain-text export for the clipboard — formatted so it pastes cleanly
// into WhatsApp, email, or a printed sheet. Heading is dash-free per the
// portal copy rule.
function kitToText({ candidateName, jobTitle, questions }) {
  const head = `Interview questions for ${candidateName || "candidate"}${jobTitle ? `, ${jobTitle}` : ""}`;
  const body = questions.map((q, i) =>
    `${i + 1}. [${KIT_CATEGORY_LABELS[q.category] || "Question"}] ${q.question}${q.listen_for ? `\n   Listen for: ${q.listen_for}` : ""}`
  ).join("\n\n");
  return `${head}\n\n${body}`;
}

export default function InterviewKitCard({
  cacheKey, cvSnapshot, job, jobId, candidateName, jobTitle,
  hrId, applicationId,
}) {
  const reduce = useReducedMotion();
  const [kit, setKit] = useState(() => (cacheKey && kitCache.get(cacheKey)) || null);
  const [interviewId, setInterviewId] = useState(null);
  const [savedSet, setSavedSet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [addingOwn, setAddingOwn] = useState(false);
  const [ownText, setOwnText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [setSaved, setSetSaved] = useState(false);
  const liveRef = useRef(true);
  useEffect(() => () => { liveRef.current = false; }, []);

  const resolvedJobId = jobId || job?.id || null;
  const first = givenName(candidateName, "this candidate");

  /* Re-sync when the recruiter switches candidates: session cache first,
     then the interview row (the durable home), then the saved-set probe. */
  useEffect(() => {
    let live = true;
    setCopied(false); setAddingOwn(false); setOwnText("");
    setEditingId(null); setConfirmRegen(false); setSetSaved(false);
    setError(null); setLoading(false);
    setKit((cacheKey && kitCache.get(cacheKey)) || null);
    setInterviewId(null);
    (async () => {
      const [interview, roleSet] = await Promise.all([
        loadLatestInterview(hrId, applicationId),
        loadRoleSet(hrId, resolvedJobId),
      ]);
      if (!live) return;
      setSavedSet(roleSet);
      if (interview?.id) {
        setInterviewId(interview.id);
        const stored = normalizeKit(interview.kit);
        if (stored && stored.questions.length) {
          setKit(stored);
          if (cacheKey) kitCache.set(cacheKey, stored);
        }
      }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, hrId, applicationId, resolvedJobId]);

  /* Every kit change lands in session cache immediately and on the
     interview row when there is one (fire and forget). */
  const commit = (next) => {
    setKit(next);
    if (cacheKey) kitCache.set(cacheKey, next);
    if (interviewId) saveKit(interviewId, next);
  };

  const runGenerate = async ({ tailored = false, preset = null } = {}) => {
    if (loading) return;
    setError(null);
    setConfirmRegen(false);
    if (preset) {
      commit(kitFromQuestions(preset, { generatedAt: null }));
      return;
    }
    setLoading(true);
    const verdict = getCachedVerdict(cacheKey);
    const verdictGap = verdict?.two_second_why?.[2] || "";
    const out = await generateKitQuestions({ cvSnapshot, job, jobId: resolvedJobId, verdictGap, tailored });
    if (!liveRef.current) return;
    setLoading(false);
    if (!out.ok) { setError(out.error); return; }
    commit(tailored && kit ? replaceAiQuestions(kit, out.questions) : kitFromQuestions(out.questions));
  };

  const copyAll = async () => {
    if (!kit) return;
    try {
      await navigator.clipboard.writeText(kitToText({ candidateName, jobTitle, questions: kit.questions }));
      setCopied(true);
      setTimeout(() => { if (liveRef.current) setCopied(false); }, 1600);
    } catch { /* clipboard blocked — button simply stays "Copy all" */ }
  };

  const submitOwn = () => {
    const text = ownText.trim();
    if (!text || !kit) return;
    commit(addOwnQuestion(kit, text));
    setOwnText("");
    setAddingOwn(false);
  };

  const startEdit = (q) => { setEditingId(q.id); setEditText(q.question); };
  const submitEdit = () => {
    if (!kit || !editingId) return;
    commit(updateQuestionText(kit, editingId, editText));
    setEditingId(null);
  };

  const saveAsSet = async () => {
    if (!kit || !hrId || !resolvedJobId) return;
    const r = await saveRoleSet(hrId, resolvedJobId, kit.questions);
    if (!liveRef.current) return;
    if (r.ok) {
      setSavedSet(kit.questions);
      setSetSaved(true);
      setTimeout(() => { if (liveRef.current) setSetSaved(false); }, 2400);
    }
  };

  const roleWord = jobTitle || job?.title || "this role";
  const canSaveSet = Boolean(hrId && resolvedJobId);
  const questions = kit?.questions || [];
  const showList = !loading && questions.length > 0;

  const idle = !loading && !error && questions.length === 0;

  return (
    <motion.section
      className="ik-card"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      <div className="ik-head">
        <h3 className="ik-head__title"><SparkIc /> Interview questions</h3>
        {showList && (
          <div className="ik-head__actions">
            <button type="button" className="ik-mini" onClick={copyAll}>
              {copied ? <span className="ik-pop"><CheckIc /></span> : <CopyIc />} {copied ? "Copied" : "Copy all"}
            </button>
            <button type="button" className="ik-mini" disabled={loading} onClick={() => setConfirmRegen((v) => !v)}>
              <RefreshIc /> Regenerate
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {confirmRegen && (
          <motion.div
            className="ik-regen"
            initial={reduce ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <span className="ik-regen__text">Writes a fresh AI set tailored to {first}'s CV and keeps your own questions. Uses 1 credit.</span>
            <span className="ik-regen__actions">
              <button type="button" className="ik-mini ik-mini--primary" onClick={() => runGenerate({ tailored: true })}>Regenerate, 1 credit</button>
              <button type="button" className="ik-mini" onClick={() => setConfirmRegen(false)}>Keep these</button>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {idle && (
        <div className="ik-idle">
          <p className="ik-idle__text">
            {savedSet
              ? `Your saved set for ${roleWord} is ready, or write a fresh one from ${first}'s CV.`
              : `Get 6 to 8 questions written for ${first}'s actual CV and this role. Each comes with a note on what a good answer sounds like.`}
          </p>
          {savedSet ? (
            <div className="ik-idle__row">
              <button type="button" className="ik-generate" onClick={() => runGenerate({ preset: savedSet })}>
                <SaveIc /> Use my saved set
              </button>
              <button type="button" className="ik-mini" onClick={() => runGenerate()}>
                <SparkIc /> Generate fresh questions
              </button>
            </div>
          ) : (
            <button type="button" className="ik-generate" onClick={() => runGenerate()}>
              <SparkIc /> Generate questions
            </button>
          )}
        </div>
      )}

      {loading && (
        <div className="ik-genstate" aria-live="polite">
          <div className="ik-loading">
            <span className="ik-loading__pulse" aria-hidden="true" />
            <span className="ik-loading__text">Writing questions from {first}'s CV and this role…</span>
          </div>
          <div className="ik-ghosts" aria-hidden="true">
            <span className="ik-ghost" />
            <span className="ik-ghost" style={{ opacity: 0.7 }} />
            <span className="ik-ghost" style={{ opacity: 0.4 }} />
          </div>
          <p className="ik-genstate__foot">
            {savedSet
              ? "Takes about ten seconds. Your saved questions for this role stay untouched."
              : "Takes about ten seconds."}
          </p>
        </div>
      )}

      {!loading && error && (
        <div className="ik-error">
          <span className="ik-error__text">{error}</span>
          <button type="button" className="ik-mini" onClick={() => runGenerate()}>
            <RefreshIc /> Try again
          </button>
        </div>
      )}

      {showList && (
        <>
          <ol className="ik-list">
            {questions.map((q, i) => (
              <motion.li
                className="ik-item"
                key={q.id}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: EASE, delay: reduce ? 0 : Math.min(i * 0.04, 0.32) }}
              >
                <div className="ik-item__top">
                  <span className="ik-item__lead">
                    <span className="ik-item__num" aria-hidden="true">{i + 1}</span>
                    <span className={`ik-chip ik-chip--${q.category}`}>{KIT_CATEGORY_LABELS[q.category] || "Question"}</span>
                  </span>
                  <span className="ik-item__tools">
                    {editingId === q.id ? (
                      <>
                        <button type="button" className="ik-link ik-link--strong" onClick={submitEdit}>Save</button>
                        <button type="button" className="ik-link" onClick={() => setEditingId(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="ik-link" onClick={() => startEdit(q)}>Edit</button>
                        <button type="button" className="ik-link" onClick={() => commit(removeQuestion(kit, q.id))}>Remove</button>
                      </>
                    )}
                  </span>
                </div>
                {editingId === q.id ? (
                  <textarea
                    className="ik-edit"
                    value={editText}
                    autoFocus
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitEdit(); } if (e.key === "Escape") setEditingId(null); }}
                  />
                ) : (
                  <p className="ik-item__q">{q.question}</p>
                )}
                {q.listen_for && editingId !== q.id && (
                  <p className="ik-item__listen"><EarIc /> <span><span className="ik-item__listen-label">Listen for:</span> {q.listen_for}</span></p>
                )}
              </motion.li>
            ))}
          </ol>

          {addingOwn ? (
            <div className="ik-addform">
              <textarea
                className="ik-edit"
                value={ownText}
                autoFocus
                placeholder="Type your question"
                onChange={(e) => setOwnText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitOwn(); } if (e.key === "Escape") { setAddingOwn(false); setOwnText(""); } }}
              />
              <span className="ik-addform__actions">
                <button type="button" className="ik-mini ik-mini--primary" disabled={!ownText.trim()} onClick={submitOwn}>Add question</button>
                <button type="button" className="ik-mini" onClick={() => { setAddingOwn(false); setOwnText(""); }}>Cancel</button>
              </span>
            </div>
          ) : (
            <button type="button" className="ik-add" onClick={() => setAddingOwn(true)}>+ Add your own question</button>
          )}

          <div className="ik-foot">
            {canSaveSet && (
              <button type="button" className="ik-mini ik-foot__save" onClick={saveAsSet}>
                {setSaved ? <span className="ik-pop"><CheckIc /></span> : <SaveIc />}
                {setSaved ? "Saved as your set" : `Save these as my set for ${roleWord}`}
              </button>
            )}
            <span className="ik-foot__note">Regenerate writes a fresh set and uses 1 credit</span>
          </div>
        </>
      )}
    </motion.section>
  );
}
