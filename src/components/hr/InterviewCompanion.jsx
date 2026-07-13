// =============================================================
// src/components/hr/InterviewCompanion.jsx
//
// The live interview companion, Layout B, single scroll (interview kit
// frames 1h / 1q). One column, zero navigation: a collapsible CV peek
// at the top, the questions where she lives, and the scorecard pinned
// so "Finish and rate" is always one tap away.
//
// SELF-CONTAINED BY DESIGN: this component never assumes it owns the
// viewport. It fills whatever box its parent gives it (height: 100%),
// and every overlay (no show sheet, offer prompt, done card, toast) is
// absolutely positioned INSIDE the component root. The next phase drops
// this same component into a small always-on-top window unchanged.
// (The reschedule form and the reject modal are shared portal-level
// modals reused exactly, so those two render above everything.)
//
// The couplings this screen exists for:
//  - Saving the rating flips the interview to completed AND moves the
//    application to Interviewed. Never a second manual step.
//  - Strong yes offers the Offer move. No opens the shipped reject
//    modal (reason required). Yes and Mixed release her back to her day.
//  - "Candidate did not join" is first class: reschedule (prefilled,
//    fresh invite) or pass with "Did not join" preselected.
//
// Kit state (questions, asked, per-question notes) persists to the
// interviews row on every change — nothing dies on refresh.
// =============================================================

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase } from "../../appSupabaseClient";
import givenName from "../../lib/hr/givenName";
import { scoreBand, BAND_COLORS, BAND_LABELS } from "../../lib/ats/scoreBand";
import { setApplicationStage, personStageLabel } from "../../lib/hr/stageApi";
import {
  KIT_CATEGORY_LABELS, normalizeKit, kitFromQuestions,
  toggleAsked as kitToggleAsked, setQuestionNote, askedCount,
  saveKit, loadRoleSet, generateKitQuestions, loadInterviewById,
} from "../../lib/hr/interviewKit";
import { formatTimeIn, dualTimeLine, hrTimeZone } from "../../lib/hr/interviewTz";
import RejectModal from "./RejectModal";
import ScheduleInterviewModal from "./ScheduleInterviewModal";
import "./interviewCompanion.css";

const EASE = [0.4, 0, 0.2, 1];

const RATINGS = [
  { key: "strong_yes", label: "Strong yes", emoji: "\u{1F44D}\u{1F44D}", tone: "green" },
  { key: "yes", label: "Yes", emoji: "\u{1F44D}", tone: "green" },
  { key: "mixed", label: "Mixed", emoji: "\u{1F914}", tone: "amber" },
  { key: "no", label: "No", emoji: "\u{1F44E}", tone: "red" },
];

const asText = (v) => (typeof v === "string" ? v.trim() : "");

/* ── Float, Document Picture in Picture ──
   The PiP document starts empty and inherits NOTHING from the opener:
   clone every stylesheet (inline the rules; fall back to a link for
   cross-origin sheets) and carry the theme attribute across so the
   tokens and the glass surface resolve inside the float window. */
function preparePipDocument(win) {
  const doc = win.document;
  doc.title = "Interview companion";
  const theme = document.documentElement.getAttribute("data-theme");
  if (theme) doc.documentElement.setAttribute("data-theme", theme);
  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      const css = Array.from(sheet.cssRules).map((r) => r.cssText).join("\n");
      const style = doc.createElement("style");
      style.textContent = css;
      doc.head.appendChild(style);
    } catch {
      if (sheet.href) {
        const link = doc.createElement("link");
        link.rel = "stylesheet";
        link.href = sheet.href;
        doc.head.appendChild(link);
      }
    }
  });
  try {
    if (document.adoptedStyleSheets && document.adoptedStyleSheets.length) {
      doc.adoptedStyleSheets = [...document.adoptedStyleSheets];
    }
  } catch { /* engines that reject cross-document sheets: the clones above cover us */ }
  doc.body.className = "ic-pip-body";
}

const FloatIc = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><rect x="13" y="11" width="8" height="10" rx="2" /><path d="M13 3h8v6" /><path d="M21 3l-7 7" /></svg>);
const DockIc = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2.5" /><path d="M15 9l-6 6" /><path d="M15 15H9V9" /></svg>);
const XIc = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);

function cvBits(application) {
  const cv = application?.cv_snapshot || application?.cv_data || {};
  const personal = cv.personal || cv.basics || {};
  const location = asText(cv.location) || asText(personal.location);
  const notice = asText(cv.notice_period) || asText(cv.availability)
    || asText(personal.notice_period) || asText(personal.availability);
  const skills = (Array.isArray(cv.skills) ? cv.skills : [])
    .map((s) => (typeof s === "string" ? s : asText(s?.name)))
    .filter(Boolean);
  const experience = (Array.isArray(cv.experience) ? cv.experience : (Array.isArray(cv.work) ? cv.work : []))
    .filter(Boolean);
  const title = asText(cv.title) || asText(personal.title) || asText(personal.headline)
    || asText(experience[0]?.title) || asText(experience[0]?.role);
  return { cv, personal, location, notice, skills, experience, title };
}

export default function InterviewCompanion({
  interview, application, job, hrId, hrEmail, onExit, onChanged,
  floatWindow = false,
}) {
  const reduce = useReducedMotion();
  const [kit, setKit] = useState(() => {
    const stored = normalizeKit(interview?.kit);
    return stored && stored.questions.length ? stored : null;
  });
  const [kitLoading, setKitLoading] = useState(false);
  const [kitError, setKitError] = useState(null);
  const [cvOpen, setCvOpen] = useState(false);
  const [rating, setRating] = useState(interview?.rating || null);
  const [scoreNote, setScoreNote] = useState(interview?.rating_note || "");
  const [savingRating, setSavingRating] = useState(false);
  const [phase, setPhase] = useState("live");
  const [outcome, setOutcome] = useState(null); // 'offer' | 'stay' | 'passed' | 'rescheduled'
  const [noShowOpen, setNoShowOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState(null);
  const [rejectFromNoShow, setRejectFromNoShow] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [pipWindow, setPipWindow] = useState(null); // Document PiP window while floated
  const [popupOpen, setPopupOpen] = useState(false); // fallback popup active (no Document PiP)
  const liveRef = useRef(true);
  const scrollRef = useRef(null);
  const askAnchor = useRef(null);
  const noteTimer = useRef(null);
  const rescheduledRef = useRef(false);
  const toastTimer = useRef(null);
  const pipRef = useRef(null);
  const popupRef = useRef(null);
  useEffect(() => () => {
    liveRef.current = false;
    clearTimeout(noteTimer.current);
    clearTimeout(toastTimer.current);
    // The float window renders THIS component's subtree — it cannot
    // outlive the component. The fallback popup is its own page and may.
    try { pipRef.current?.close(); } catch { /* already gone */ }
  }, []);

  const pipSupported = typeof window !== "undefined" && "documentPictureInPicture" in window;
  const floated = Boolean(pipWindow);

  /* One tap out. Document PiP where the browser has it; elsewhere a
     compact popup of this same route. window.open stays inside the
     gesture — a deferred open is eaten by popup blockers. */
  const openFloat = () => {
    if (floatWindow || floated || popupOpen) return;
    if (pipSupported) {
      window.documentPictureInPicture
        .requestWindow({ width: 380, height: 660 })
        .then((win) => {
          if (!liveRef.current) { try { win.close(); } catch { /* noop */ } return; }
          preparePipDocument(win);
          win.addEventListener("pagehide", () => {
            pipRef.current = null;
            if (liveRef.current) setPipWindow(null);
          });
          pipRef.current = win;
          setPipWindow(win);
        })
        .catch(() => { /* user or browser declined, the docked view is still here */ });
    } else if (interview?.id) {
      const w = window.open(
        `/employer/interview/${interview.id}?float=1`,
        "cvp-float-companion",
        "popup=yes,width=380,height=660",
      );
      if (w) { popupRef.current = w; setPopupOpen(true); }
    }
  };

  const dockNow = () => {
    if (floatWindow) { window.close(); return; }
    if (pipRef.current) { try { pipRef.current.close(); } catch { /* noop */ } }
    if (popupRef.current && !popupRef.current.closed) { try { popupRef.current.close(); } catch { /* noop */ } }
  };

  /* Fallback popup is a second React app writing the same interview row:
     watch for it closing, then reconcile once from the row so nothing
     she did over there is lost here. */
  useEffect(() => {
    if (!popupOpen) return undefined;
    const t = setInterval(() => {
      if (popupRef.current && !popupRef.current.closed) return;
      popupRef.current = null;
      setPopupOpen(false);
      (async () => {
        const fresh = await loadInterviewById(interview?.id);
        if (!liveRef.current || !fresh) return;
        const stored = normalizeKit(fresh.kit);
        if (stored && stored.questions.length) setKit(stored);
        if (fresh.rating) setRating(fresh.rating);
        if (typeof fresh.rating_note === "string" && fresh.rating_note) setScoreNote(fresh.rating_note);
      })();
    }, 600);
    return () => clearInterval(t);
  }, [popupOpen, interview?.id]);

  const first = givenName(application?.candidate_name, "the candidate");
  const isMobile = typeof window !== "undefined" && window.innerWidth < 720;

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => { if (liveRef.current) setToast(""); }, 2600);
  };

  /* ── Kit bootstrap: stored kit → her saved set (free) → calm Haiku
        generation. Start works even when no kit was made yet. ── */
  useEffect(() => {
    if (kit || !interview?.id) return undefined;
    let live = true;
    (async () => {
      setKitLoading(true);
      setKitError(null);
      const saved = await loadRoleSet(hrId, interview.job_id);
      if (!live) return;
      if (saved && saved.length) {
        const preloaded = kitFromQuestions(saved, { generatedAt: null });
        setKit(preloaded);
        setKitLoading(false);
        saveKit(interview.id, preloaded);
        return;
      }
      const verdictGap = application?.ai_verdict?.two_second_why?.[2] || "";
      const out = await generateKitQuestions({
        cvSnapshot: application?.cv_snapshot || null,
        job,
        jobId: interview.job_id,
        verdictGap,
      });
      if (!live) return;
      setKitLoading(false);
      if (!out.ok) { setKitError(out.error); return; }
      const freshKit = kitFromQuestions(out.questions);
      setKit(freshKit);
      saveKit(interview.id, freshKit);
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview?.id]);

  /* Every kit interaction persists — mark asked immediately, notes
     debounced so typing stays light. */
  const commitKit = (next, { debounce = false } = {}) => {
    setKit(next);
    if (!interview?.id) return;
    if (debounce) {
      clearTimeout(noteTimer.current);
      noteTimer.current = setTimeout(() => saveKit(interview.id, next), 700);
    } else {
      clearTimeout(noteTimer.current);
      saveKit(interview.id, next);
    }
  };

  /* Marking a question asked shrinks its card (listen for + note input
     leave the DOM); with the list near its end the browser clamps the
     scroll to the new bottom — the scorecard — and she loses her place
     mid interview. Pin the tapped button to the same viewport spot. */
  useLayoutEffect(() => {
    const a = askAnchor.current;
    askAnchor.current = null;
    if (!a || !scrollRef.current || !a.el.isConnected) return;
    const delta = a.el.getBoundingClientRect().top - a.top;
    if (delta) scrollRef.current.scrollTop += delta;
  }, [kit]);

  const questions = useMemo(() => kit?.questions || [], [kit]);
  const asked = useMemo(() => kit?.asked || {}, [kit]);
  const notes = kit?.notes || {};
  const nAsked = askedCount(kit);
  const currentId = useMemo(() => {
    const firstUnasked = questions.find((q) => !asked[q.id]);
    return firstUnasked?.id || null;
  }, [questions, asked]);

  const bits = useMemo(() => cvBits(application), [application]);
  const band = scoreBand(application?.ats_score, application?.score_source);
  const peekLine = ["CV at a glance", bits.location, bits.notice ? `${bits.notice} notice`.replace(/notice notice$/i, "notice") : "", bits.skills.slice(0, 3).join(", ")]
    .filter(Boolean).join(" · ");

  /* ── Stage helpers ── */
  const moveStage = async (newStatus, rejectCode = null) => {
    if (!application?.id) return { ok: false };
    return setApplicationStage({
      applicationId: application.id,
      newStatus,
      app: application,
      hrId,
      rejectReason: rejectCode,
    });
  };

  /* ── Save rating: interview completed + stage moves by itself ── */
  const saveRating = async () => {
    if (!rating || savingRating) return;
    setSavingRating(true);
    try {
      const full = {
        rating,
        rating_note: scoreNote.trim() || null,
        rated_at: new Date().toISOString(),
        status: "completed",
      };
      let { error } = await supabase.from("interviews").update(full).eq("id", interview.id);
      if (error && /column|schema cache/i.test(error.message || "")) {
        ({ error } = await supabase.from("interviews").update({ status: "completed" }).eq("id", interview.id));
      }
      if (error) throw error;
      if (interview.candidate_id && hrId) {
        supabase.from("candidate_events").insert({
          candidate_id: interview.candidate_id,
          job_id: interview.job_id || null,
          hr_id: hrId,
          event_type: "interview_completed",
          metadata: { scheduled_at: interview.scheduled_at, rating },
        }).then(() => {}, () => {});
      }
      // The subtitle's promise: the rating moves the pipeline itself.
      if (!["offered", "hired", "rejected"].includes(application?.status)) {
        await moveStage("interviewed");
      }
      if (onChanged) onChanged();
      if (rating === "strong_yes") {
        setOfferOpen(true);
      } else if (rating === "no") {
        setRejectFromNoShow(false);
        setRejectReason(null);
        setRejectOpen(true);
      } else {
        setOutcome("stay");
        setPhase("done");
        showToast("Rating saved");
      }
    } catch {
      showToast("The rating could not be saved. Please try again.");
    } finally {
      if (liveRef.current) setSavingRating(false);
    }
  };

  const advanceToOffer = async () => {
    setOfferOpen(false);
    const r = await moveStage("offered");
    if (r.ok) {
      setOutcome("offer");
      showToast(`${first} moved to Offer`);
    } else {
      setOutcome("stay");
      showToast("The move to Offer did not go through. The rating is saved.");
    }
    setPhase("done");
    if (onChanged) onChanged();
  };

  const keepInterviewed = () => {
    setOfferOpen(false);
    setOutcome("stay");
    setPhase("done");
    showToast("Rating saved");
  };

  /* ── Reject (rating No, or no show pass) — the shipped modal, exactly ── */
  const confirmReject = async () => {
    if (!rejectReason) return;
    setRejectOpen(false);
    if (rejectFromNoShow) {
      // The interview itself was a no show; record that honestly.
      supabase.from("interviews").update({ status: "no_show" }).eq("id", interview.id).then(() => {}, () => {});
    }
    const r = await moveStage("rejected", rejectReason);
    if (r.ok) {
      setOutcome("passed");
      showToast("Moved to Passed. Notification goes out in about 24 hours.");
    } else {
      setOutcome("stay");
      showToast("The pass did not go through. Please try again from the pipeline.");
    }
    setPhase("done");
    if (onChanged) onChanged();
  };

  /* ── No show sheet ── */
  const openReschedule = () => {
    setNoShowOpen(false);
    setRescheduleOpen(true);
  };
  const openPassNoShow = () => {
    setNoShowOpen(false);
    setRejectFromNoShow(true);
    setRejectReason("did_not_join");
    setRejectOpen(true);
  };

  const scrollToScorecard = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  };

  const timeLabel = interview?.scheduled_at
    ? formatTimeIn(new Date(interview.scheduled_at), undefined)
    : "";
  const headSub = [job?.title, timeLabel, interview?.duration_min ? `${interview.duration_min} min` : ""]
    .filter(Boolean).join(" · ");

  /* Floated header speaks in both timezones, in words, never an offset. */
  const floatedUi = floated || floatWindow;
  const dualLine = useMemo(() => {
    if (!interview?.scheduled_at) return "";
    const when = new Date(interview.scheduled_at);
    if (Number.isNaN(when.getTime())) return "";
    const hrTz = hrTimeZone();
    return dualTimeLine({ when, hrTz, candidateTz: interview.candidate_tz || hrTz, firstName: first });
  }, [interview, first]);

  const DONE = {
    offer: {
      emoji: "\u{1F44D}\u{1F44D}", tone: "green",
      title: "Moved to Offer",
      sub: `${first} is rated Strong yes with your notes attached. The offer stage is ready when you are.`,
      from: "Interviewed", to: "Offer", toTone: "green",
    },
    stay: {
      emoji: "\u{1F44D}", tone: "green",
      title: `Saved. ${first} stays at Interviewed.`,
      sub: `${first} is marked with your rating and note. When you are ready, advance ${first} from the profile or compare with the others you interview this week.`,
      from: "To interview", to: "Interviewed", toTone: "purple",
    },
    passed: {
      emoji: "\u{1F44B}", tone: "grey",
      title: `Passed on ${job?.title || "this role"}`,
      sub: `${first} moves to Passed with your reason and interview notes kept. Nothing is sent right away and you can undo for about 24 hours.`,
      from: personStageLabel(application?.status) || "Interviewed", to: "Passed", toTone: "red",
    },
    rescheduled: {
      emoji: "\u{1F5D3}\u{FE0F}", tone: "purple",
      title: "Rescheduled",
      sub: `${first} got a fresh calendar invite and the board updated. Your questions and notes are kept for the new time.`,
      from: "Today", to: "New time set", toTone: "purple",
    },
  };
  const done = DONE[outcome] || DONE.stay;

  const body = (
    <div className={`ic-root${floatedUi ? " ic-root--float" : ""}`}>
      {/* ── Sticky header ── */}
      <div className="ic-head">
        <div className="ic-head__who">
          <div className="ic-head__name">{application?.candidate_name || "Candidate"}</div>
          <div className="ic-head__sub">{floatedUi && dualLine ? dualLine : headSub}</div>
        </div>
        {floatedUi ? (
          <div className="ic-head__acts">
            <button type="button" className="ic-float-btn" onClick={dockNow}><DockIc /> Dock</button>
            <button type="button" className="ic-float-x" aria-label="Close the float window" onClick={dockNow}><XIc /></button>
          </div>
        ) : (phase === "live" && (
          <div className="ic-head__acts">
            <button
              type="button"
              className="ic-float-btn"
              onClick={openFloat}
              title={pipSupported ? undefined : "This window is not always on top on this browser"}
            >
              <FloatIc /> Float
            </button>
            <button type="button" className="ic-noshow-btn" onClick={() => setNoShowOpen(true)}>
              Candidate did not join
            </button>
          </div>
        ))}
      </div>

      {/* ── Floated header meter: N of M plus the quiet no show door ── */}
      {floatedUi && phase === "live" && (
        <div className="ic-float-meter">
          {questions.length > 0 && (
            <>
              <span className="ic-float-meter__bar" aria-hidden="true">
                <span className="ic-float-meter__fill" style={{ width: `${Math.round((nAsked / questions.length) * 100)}%` }} />
              </span>
              <span className="ic-float-meter__txt">{nAsked} of {questions.length} asked</span>
            </>
          )}
          <button type="button" className="ic-float-meter__noshow" onClick={() => setNoShowOpen(true)}>Did not join</button>
        </div>
      )}

      {/* ── CV peek (Layout B: expands in place, never leaves the column) ── */}
      {phase === "live" && (
        <div className="ic-peek">
          <button type="button" className="ic-peek__bar" onClick={() => setCvOpen((v) => !v)} aria-expanded={cvOpen}>
            <span className="ic-peek__line">{peekLine}</span>
            <span className="ic-peek__toggle">{cvOpen ? "Collapse ⌃" : "Expand ⌄"}</span>
          </button>
          <AnimatePresence initial={false}>
            {cvOpen && (
              <motion.div
                className="ic-peek__body"
                initial={reduce ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
              >
                <div className="ic-cv">
                  <div className="ic-cv__top">
                    <div>
                      <div className="ic-cv__name">{application?.candidate_name || "Candidate"}</div>
                      <div className="ic-cv__meta">{[bits.title, bits.location, bits.notice ? `${bits.notice} notice` : ""].filter(Boolean).join(" · ")}</div>
                    </div>
                    {band !== "none" && application?.ats_score != null && (
                      // The same score as everywhere else — never rerolled here.
                      <span className="ic-cv__score" style={{ color: BAND_COLORS[band], borderColor: BAND_COLORS[band] }}>
                        {application.ats_score}/100 · {BAND_LABELS[band]}
                      </span>
                    )}
                  </div>
                  {bits.skills.length > 0 && (
                    <div className="ic-cv__chips">
                      {bits.skills.slice(0, 6).map((s) => <span key={s} className="ic-cv__chip">{s}</span>)}
                    </div>
                  )}
                  {bits.experience.slice(0, 2).map((e, i) => (
                    <div key={i} className="ic-cv__exp">
                      <span className="ic-cv__dates">{[e.start_date, e.end_date || (e.start_date ? "now" : "")].filter(Boolean).join(" to ")}</span>
                      <span className="ic-cv__role"><b>{[e.title || e.role, e.company || e.employer].filter(Boolean).join(", ")}.</b> {asText(e.summary) || asText(e.description) || ""}</span>
                    </div>
                  ))}
                  {application?.ai_verdict?.two_second_why?.[0] && (
                    <div className="ic-cv__why"><b>Why they matched:</b> {application.ai_verdict.two_second_why[0]}</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Scroll body: questions, then the scorecard ── */}
      <div className="ic-body" ref={scrollRef}>
        {phase === "live" && (
          <>
            {kitLoading && (
              <div className="ic-gen" aria-live="polite">
                <div className="ic-gen__row">
                  <span className="ic-gen__pulse" aria-hidden="true" />
                  <span className="ic-gen__text">Writing questions from {first}'s CV and this role…</span>
                </div>
                <div className="ic-gen__ghosts" aria-hidden="true">
                  <span className="ic-ghost" />
                  <span className="ic-ghost" style={{ opacity: 0.7 }} />
                  <span className="ic-ghost" style={{ opacity: 0.4 }} />
                </div>
                <p className="ic-gen__foot">Takes about ten seconds. You can start the call, the questions will be here.</p>
              </div>
            )}

            {!kitLoading && kitError && (
              <div className="ic-generr">
                <span>{kitError}</span>
                <button
                  type="button"
                  className="ic-generr__retry"
                  onClick={() => {
                    setKitError(null);
                    setKit(null);
                    setKitLoading(true);
                    generateKitQuestions({ cvSnapshot: application?.cv_snapshot || null, job, jobId: interview.job_id }).then((out) => {
                      if (!liveRef.current) return;
                      setKitLoading(false);
                      if (!out.ok) { setKitError(out.error); return; }
                      const freshKit = kitFromQuestions(out.questions);
                      setKit(freshKit);
                      saveKit(interview.id, freshKit);
                    });
                  }}
                >
                  Try again
                </button>
              </div>
            )}

            {!kitLoading && questions.map((q, i) => {
              const isAsked = Boolean(asked[q.id]);
              const isCurrent = q.id === currentId;
              return (
                <motion.div
                  key={q.id}
                  className={`ic-q${isAsked ? " ic-q--asked" : ""}${isCurrent ? " ic-q--current" : ""}`}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: EASE, delay: reduce ? 0 : Math.min(i * 0.04, 0.32) }}
                >
                  <div className="ic-q__top">
                    <span className="ic-q__lead">
                      <span className="ic-q__num" aria-hidden="true">{i + 1}</span>
                      <span className={`ic-chip ic-chip--${q.category}`}>{KIT_CATEGORY_LABELS[q.category] || "Question"}</span>
                    </span>
                    <button
                      type="button"
                      className={`ic-asked${isAsked ? " ic-asked--on" : ""}`}
                      aria-pressed={isAsked}
                      onClick={(e) => {
                        askAnchor.current = { el: e.currentTarget, top: e.currentTarget.getBoundingClientRect().top };
                        commitKit(kitToggleAsked(kit, q.id));
                      }}
                    >
                      {isAsked ? "✓ Asked" : "Mark asked"}
                    </button>
                  </div>
                  <p className="ic-q__text">{q.question}</p>
                  {!isAsked && q.listen_for && (
                    <p className="ic-q__listen"><span aria-hidden="true">{"\u{1F442}"}</span><span><b>Listen for:</b> {q.listen_for}</span></p>
                  )}
                  {isAsked ? (
                    notes[q.id] ? <p className="ic-q__notedone">{"\u{1F4DD}"} {notes[q.id]}</p> : null
                  ) : (
                    <input
                      className="ic-q__note"
                      value={notes[q.id] || ""}
                      placeholder="Add a quick note…"
                      onChange={(e) => commitKit(setQuestionNote(kit, q.id, e.target.value), { debounce: true })}
                    />
                  )}
                </motion.div>
              );
            })}

            {/* ── Scorecard, end of the single scroll ── */}
            {!kitLoading && questions.length > 0 && (
              <div className="ic-score">
                <div className="ic-score__title">How was {first}?</div>
                <div className="ic-score__sub">Your rating moves {first} in the pipeline, nothing else to update.</div>
                <div className="ic-score__grid">
                  {RATINGS.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      className={`ic-rate ic-rate--${r.tone}${rating === r.key ? " ic-rate--on" : ""}`}
                      aria-pressed={rating === r.key}
                      onClick={() => setRating(r.key)}
                    >
                      <span aria-hidden="true">{r.emoji}</span> {r.label}
                    </button>
                  ))}
                </div>
                <textarea
                  className="ic-score__note"
                  value={scoreNote}
                  placeholder="One line you will want to remember (optional)"
                  onChange={(e) => setScoreNote(e.target.value)}
                />
                <button type="button" className="ic-score__save" disabled={!rating || savingRating} onClick={saveRating}>
                  {savingRating ? "Saving…" : "Save rating"}
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Done card ── */}
        {phase === "done" && (
          <motion.div
            className="ic-done"
            initial={reduce ? false : { opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <span className={`ic-done__icon ic-done__icon--${done.tone}`} aria-hidden="true">{done.emoji}</span>
            <div className="ic-done__title">{done.title}</div>
            <div className="ic-done__sub">{done.sub}</div>
            <span className="ic-done__pill">
              {done.from} <span className="ic-done__arrow">→</span> <b className={`ic-done__to--${done.toTone}`}>{done.to}</b>
            </span>
            <div className="ic-done__acts">
              <button type="button" className="ic-done__back" onClick={onExit}>Back to today's board</button>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Pinned bar: progress + Finish and rate, always one tap away ── */}
      {phase === "live" && questions.length > 0 && (
        <div className="ic-pin">
          <span className="ic-pin__progress">
            <span className="ic-pin__bar" aria-hidden="true">
              <span className="ic-pin__fill" style={{ width: `${questions.length ? Math.round((nAsked / questions.length) * 100) : 0}%` }} />
            </span>
            {nAsked} of {questions.length} asked
          </span>
          <button type="button" className="ic-pin__finish" onClick={scrollToScorecard}>Finish and rate</button>
        </div>
      )}

      {/* ── No show sheet (inside the component root, mobile = bottom sheet) ── */}
      <AnimatePresence>
        {noShowOpen && (
          <motion.div
            className="ic-scrim ic-scrim--sheet"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: EASE }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) setNoShowOpen(false); }}
          >
            <motion.div
              className="ic-sheet"
              role="dialog"
              aria-modal="true"
              aria-label={`${first} did not join`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
              transition={{ duration: 0.24, ease: EASE }}
            >
              <div className="ic-sheet__title">{first} did not join</div>
              <div className="ic-sheet__sub">It happens a lot in this corridor. Nothing you did wrong. What would you like to do?</div>
              <button type="button" className="ic-sheet__opt ic-sheet__opt--primary" onClick={openReschedule}>
                <span className="ic-sheet__optname">Reschedule</span>
                <span className="ic-sheet__optsub">Reopens the schedule form with everything prefilled. {first} gets a fresh invite and a WhatsApp nudge.</span>
              </button>
              <button type="button" className="ic-sheet__opt" onClick={openPassNoShow}>
                <span className="ic-sheet__optname ic-sheet__optname--danger">Pass on this candidate</span>
                <span className="ic-sheet__optsub">Opens the usual pass form with Did not join preselected as the reason.</span>
              </button>
              <button type="button" className="ic-sheet__back" onClick={() => setNoShowOpen(false)}>Go back, still waiting</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Offer prompt (strong yes) ── */}
      <AnimatePresence>
        {offerOpen && (
          <motion.div
            className="ic-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: EASE }}
          >
            <motion.div
              className="ic-offer"
              role="dialog"
              aria-modal="true"
              aria-label={`Move ${first} to Offer`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24, ease: EASE }}
            >
              <span className="ic-offer__icon" aria-hidden="true">{"\u{1F44D}\u{1F44D}"}</span>
              <div className="ic-offer__title">Saved. Move {first} to Offer?</div>
              <div className="ic-offer__sub">{first} is at Interviewed now. A strong yes usually means the next call is an offer.</div>
              <button type="button" className="ic-offer__go" onClick={advanceToOffer}>Advance to Offer</button>
              <button type="button" className="ic-offer__stay" onClick={keepInterviewed}>Keep at Interviewed</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── The shipped reject modal, reused exactly ── */}
      <RejectModal
        open={rejectOpen}
        title={`Pass on ${application?.candidate_name || "this candidate"} for ${job?.title || "this role"}`}
        lede="Pick a reason. It sharpens future AI matching and talent pool search."
        note={`${first} is not notified right away. Notifications are batched and sent in about 24 hours, and you can undo until then.`}
        confirmLabel={`Pass on ${job?.title || "this role"}`}
        reason={rejectReason}
        onPick={setRejectReason}
        onCancel={() => setRejectOpen(false)}
        onConfirm={confirmReject}
        mobile={isMobile}
        reduce={reduce}
      />

      {/* ── Reschedule: the shipped schedule form, prefilled ── */}
      <ScheduleInterviewModal
        open={rescheduleOpen}
        onClose={() => {
          setRescheduleOpen(false);
          if (rescheduledRef.current) {
            setOutcome("rescheduled");
            setPhase("done");
          }
        }}
        application={application}
        job={job ? { id: job.id, title: job.title, location: job.location, market: job.market } : null}
        hrId={hrId}
        hrEmail={hrEmail}
        rescheduleOf={interview}
        onScheduled={() => { rescheduledRef.current = true; if (onChanged) onChanged(); }}
      />

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="ic-toast"
            role="status"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  /* While the questions are away (PiP portal or fallback popup), the
     in-app page holds a calm placeholder so she knows where they went. */
  const awayCard = (
    <div className="ic-root ic-away">
      <span className="ic-away__dot" aria-hidden="true" />
      <p className="ic-away__line">Your questions are floating over your call</p>
      <button type="button" className="ic-away__back" onClick={dockNow}>Bring back</button>
    </div>
  );

  if (floated && pipWindow.document && pipWindow.document.body) {
    // Same React subtree, portaled into the PiP document: every mark
    // asked, note, and rating flows through the exact handlers above.
    return (
      <>
        {createPortal(body, pipWindow.document.body)}
        {awayCard}
      </>
    );
  }
  if (popupOpen && !floatWindow) return awayCard;
  return body;
}
