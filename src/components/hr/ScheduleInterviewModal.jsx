// =============================================================
// src/components/hr/ScheduleInterviewModal.jsx
//
// Schedule an interview from the HR pipeline candidate detail. Reuses
// the pipeline's jpp-modal / jpp-* field styling (ink accent, no purple
// except the timezone readout, which matches the wizard accent).
//
// Interview kit build (frames 1a / 1b / 1o):
//  - Dual timezone readout in words the moment date and time are both
//    set ("3:00 PM Dubai, 4:30 PM India"), candidate zone inferred from
//    the CV location first, the job market second, with a Change link
//    over the seven corridor zones (src/lib/hr/interviewTz.js).
//  - Past dates are unpickable (min on the date input) and a past time
//    shows "That time has already passed, pick a time after now" with
//    the confirm disabled.
//  - On confirm the pipeline moves BY ITSELF: the candidate goes to
//    "To interview" through setApplicationStage (the one stage-write
//    API), and the confirmation shows the move that already happened.
//  - Reschedule mode (rescheduleOf = interview row): prefilled form,
//    UPDATEs the same row, bumps ics_sequence so the calendar entry
//    updates in place, sends the reschedule email.
//
// On submit:
//   1. INSERT interviews row (or UPDATE in reschedule mode).
//   2. setApplicationStage → 'ready' ("To interview"), unless the
//      candidate is already at Offer or Hired (never demote those).
//   3. INSERT candidate_events { event_type: 'interview_scheduled' }.
//   4. POST /api/notify-candidate { type: 'interview' | 'interview_reschedule' }
//      — formal email + real .ics invite (stable UID, organizer,
//      attendees, HR copy). Best-effort.
//   5. Surface the green WhatsApp action prefilled with both timezones
//      and the link.
//
// Also exports <InterviewTimeline> — reads interviews by APPLICATION id
// (candidate_id is null for imported candidates, so querying by it hid
// half the interviews).
// =============================================================

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase } from "../../appSupabaseClient";
import safeFetch from "../../lib/net/safeFetch";
import Select from "../ui/Select";
import { setApplicationStage, personStageLabel } from "../../lib/hr/stageApi";
import {
  CORRIDOR_ZONES, zoneByKey, inferCandidateZone, hrTimeZone,
  dualTimeLine, formatDayIn,
} from "../../lib/hr/interviewTz";
import "./scheduleInterview.css";

const EASE = [0.4, 0, 0.2, 1];
const DURATIONS = [30, 45, 60];

const CloseIc = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);
const CalIc = ({ size = 15 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>);
const CheckIc = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>);
const ClockIc = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>);
const WaIc = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>);

function cvLocationOf(application) {
  const cv = application?.cv_snapshot || application?.cv_data || {};
  const personal = cv.personal || cv.basics || {};
  return (typeof cv.location === "string" && cv.location.trim())
    || (typeof personal.location === "string" && personal.location.trim())
    || "";
}

function todayInputValue() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Build the shared invite wording once: the HR-side day ("Tue 14 Jul")
 * and the dual line ("3:00 PM Dubai, 4:30 PM India"). Email, WhatsApp,
 * and the confirmation card all read these two.
 */
function inviteWording({ start, candidateTz, firstName }) {
  const hrTz = hrTimeZone();
  return {
    dayLabel: formatDayIn(start, hrTz),
    dualLine: dualTimeLine({ when: start, hrTz, candidateTz, firstName }),
  };
}

export default function ScheduleInterviewModal({
  open, onClose, application, job, hrId, hrEmail, hrName, onScheduled,
  rescheduleOf = null,
}) {
  const reduce = useReducedMotion();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [meetingLink, setMeetingLink] = useState("");
  const [note, setNote] = useState("");
  const [tzOverride, setTzOverride] = useState(null); // corridor zone key
  const [tzPicking, setTzPicking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const reschedule = Boolean(rescheduleOf?.id);
  const first = String(application?.candidate_name || "the candidate").split(" ")[0] || "the candidate";

  useEffect(() => {
    if (!open) return;
    if (rescheduleOf?.id) {
      const prev = new Date(rescheduleOf.scheduled_at);
      const valid = !Number.isNaN(prev.getTime());
      const p = (n) => String(n).padStart(2, "0");
      setDate(valid ? `${prev.getFullYear()}-${p(prev.getMonth() + 1)}-${p(prev.getDate())}` : "");
      setTime(valid ? `${p(prev.getHours())}:${p(prev.getMinutes())}` : "");
      setDuration(rescheduleOf.duration_min || 30);
      setMeetingLink(rescheduleOf.meeting_link || "");
      setNote(rescheduleOf.note || "");
    } else {
      setDate(""); setTime(""); setDuration(30); setMeetingLink(""); setNote("");
    }
    setTzOverride(null); setTzPicking(false);
    setSubmitting(false); setError(null); setSuccess(null);
  }, [open, rescheduleOf]);

  /* Candidate timezone: stored zone (reschedule) > her override > CV
     location > job market > her own. Never a raw offset, always words. */
  const inferred = useMemo(() => inferCandidateZone({
    cvLocation: cvLocationOf(application),
    jobLocation: [job?.location, job?.market].filter(Boolean).join(", "),
  }), [application, job]);
  const storedZone = useMemo(() => {
    if (!reschedule || !rescheduleOf?.candidate_tz) return null;
    return CORRIDOR_ZONES.find((z) => z.tz === rescheduleOf.candidate_tz) || null;
  }, [reschedule, rescheduleOf]);
  const zone = (tzOverride && zoneByKey(tzOverride)) || storedZone || inferred.zone;
  const candidateTz = zone?.tz || hrTimeZone();

  /* Past guard + the live dual readout. */
  const start = useMemo(() => {
    if (!date || !time) return null;
    const d = new Date(`${date}T${time}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [date, time]);
  const isPast = Boolean(start && start.getTime() < Date.now());
  const wording = useMemo(() => (
    start && !isPast ? inviteWording({ start, candidateTz, firstName: first }) : null
  ), [start, isPast, candidateTz, first]);

  const tzSourceLine = tzOverride
    ? `${first} is in ${zone?.label}.`
    : storedZone
      ? `${first} is in ${storedZone.label}, kept from the first invite.`
      : inferred.zone
        ? (inferred.source === "cv"
          ? `${first} is in ${inferred.zone.label}, taken from the CV location.`
          : `${first} is in ${inferred.zone.label}, taken from the job market.`)
        : `We could not read a timezone from the CV, so this shows your time.`;

  async function submit() {
    if (submitting) return;
    if (!date || !time) { setError("Pick a date and time."); return; }
    if (!start) { setError("That date and time could not be read."); return; }
    if (isPast) { setError("That time has already passed, pick a time after now."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const iso = start.toISOString();
      const link = meetingLink.trim();
      const trimmedNote = note.trim();
      const storedTz = zone?.tz || null;

      let interviewId = rescheduleOf?.id || null;
      let sequence = 0;
      if (reschedule) {
        sequence = (Number(rescheduleOf.ics_sequence) || 0) + 1;
        const { error: updErr } = await supabase.from("interviews").update({
          scheduled_at: iso,
          duration_min: Number(duration),
          meeting_link: link || null,
          note: trimmedNote || null,
          status: "scheduled",
          candidate_tz: storedTz,
          ics_sequence: sequence,
        }).eq("id", rescheduleOf.id);
        if (updErr) throw updErr;
      } else {
        const { data: inserted, error: insErr } = await supabase.from("interviews").insert({
          application_id: application?.id || null,
          job_id: job?.id || null,
          hr_id: hrId,
          interviewer_id: hrId,
          candidate_id: application?.candidate_id || null,
          scheduled_at: iso,
          duration_min: Number(duration),
          meeting_link: link || null,
          note: trimmedNote || null,
          status: "scheduled",
          candidate_tz: storedTz,
        }).select("id").single();
        if (insErr) {
          // Pre-039 database: retry without the new columns rather than
          // blocking the schedule (mirror of stageApi's degraded path).
          if (/column|schema cache/i.test(insErr.message || "")) {
            const { data: retried, error: retryErr } = await supabase.from("interviews").insert({
              application_id: application?.id || null,
              job_id: job?.id || null,
              hr_id: hrId,
              candidate_id: application?.candidate_id || null,
              scheduled_at: iso,
              duration_min: Number(duration),
              meeting_link: link || null,
              note: trimmedNote || null,
              status: "scheduled",
            }).select("id").single();
            if (retryErr) throw retryErr;
            interviewId = retried?.id || null;
          } else {
            throw insErr;
          }
        } else {
          interviewId = inserted?.id || null;
        }
      }

      // The whole point: scheduling moves the pipeline by itself. The
      // candidate lands at "To interview" (db status 'ready') unless they
      // are already at Offer or Hired, which a new call never demotes.
      const fromStatus = application?.status || null;
      let stageMove = null;
      if (application?.id && !["offered", "hired", "ready"].includes(fromStatus)) {
        const moved = await setApplicationStage({
          applicationId: application.id,
          newStatus: "ready",
          app: application,
          hrId,
        });
        if (moved.ok) stageMove = { from: personStageLabel(fromStatus), to: "To interview" };
      } else if (fromStatus === "ready") {
        stageMove = { from: null, to: "To interview" };
      }

      // Timeline event (best-effort — never block the schedule).
      if (application?.candidate_id) {
        supabase.from("candidate_events").insert({
          candidate_id: application.candidate_id,
          job_id: job?.id || null,
          hr_id: hrId,
          event_type: "interview_scheduled",
          metadata: { scheduled_at: iso, duration_min: Number(duration), meeting_link: link || null },
        }).then(() => {}, () => {});
      }

      const { dayLabel, dualLine } = inviteWording({ start, candidateTz, firstName: first });
      const whenLine = `${dayLabel}, ${dualLine}`;

      // Candidate email + real .ics invite (best-effort).
      if (application?.candidate_email) {
        safeFetch("/api/notify-candidate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: reschedule ? "interview_reschedule" : "interview",
            candidateEmail: application.candidate_email,
            candidateName: application.candidate_name,
            jobTitle: job?.title || "",
            scheduledAt: iso,
            durationMin: Number(duration),
            meetingLink: link,
            note: trimmedNote,
            whenLabel: dayLabel,
            dualTimeLine: dualLine,
            interviewId,
            sequence,
            hrEmail: hrEmail || null,
            hrName: hrName || null,
          }),
        }).catch(() => {});
      }

      // WhatsApp deep-link, prefilled with both timezones and the link.
      const digits = String(application?.candidate_phone || "").replace(/\D/g, "");
      const msg = `Hi ${first}, your interview for ${job?.title || "the role"} is on ${whenLine} (${duration} min).${link ? ` Join: ${link}` : ""} Looking forward to speaking with you.`;
      const wa = digits ? `https://wa.me/${digits}?text=${encodeURIComponent(msg)}` : null;

      if (onScheduled) onScheduled({ interviewId, rescheduled: reschedule });
      setSuccess({ wa, whenLine, stageMove });
    } catch (e) {
      setError(e?.message || "The interview could not be scheduled. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const confirmDisabled = submitting || !date || !time || isPast;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="jpp-modal"
          role="dialog"
          aria-modal="true"
          aria-label={reschedule ? "Reschedule interview" : "Schedule interview"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: EASE }}
          onClick={onClose}
        >
          <motion.div
            className="jpp-modal__panel si-panel"
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? false : { opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.24, ease: EASE }}
          >
            <button type="button" className="jpp-modal__close" onClick={onClose} aria-label="Close"><CloseIc /></button>

            {success ? (
              <div className="si-success">
                <span className="si-success__check"><CheckIc /></span>
                <h3 className="si-success__title">{reschedule ? "Interview rescheduled" : "Interview scheduled"}</h3>
                <p className="si-success__sub">{first} has been emailed a calendar invite for {success.whenLine}.</p>
                {success.stageMove && (
                  <span className="si-stagepill">
                    {success.stageMove.from
                      ? (<>{success.stageMove.from} <span className="si-stagepill__arrow">→</span> <b>{success.stageMove.to}</b></>)
                      : (<>Stays at <b>{success.stageMove.to}</b></>)}
                  </span>
                )}
                <div className="si-success__actions">
                  {success.wa && (
                    <a className="jpp-action jpp-action--message" href={success.wa} target="_blank" rel="noreferrer noopener"><WaIc /> Send WhatsApp invite</a>
                  )}
                  <button type="button" className="jpp-action jpp-action--primary" onClick={onClose}>Done</button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="jpp-modal__title"><CalIc size={18} /> {reschedule ? `Reschedule with ${first}` : `Schedule interview with ${first}`}</h3>
                <div className="jpp-modal__divider" />

                <div className="si-form">
                  <div className="si-grid2">
                    <div className="si-row">
                      <label className="si-label" htmlFor="si-date">Date</label>
                      <input id="si-date" type="date" className="jpp-note__input" min={todayInputValue()} value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <div className="si-row">
                      <label className="si-label" htmlFor="si-time">Time</label>
                      <input id="si-time" type="time" className="jpp-note__input" value={time} onChange={(e) => setTime(e.target.value)} />
                    </div>
                  </div>

                  {isPast && (
                    <p className="si-error" role="alert">That time has already passed, pick a time after now.</p>
                  )}

                  <AnimatePresence>
                    {wording && (
                      <motion.div
                        className="si-tz"
                        initial={reduce ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25, ease: EASE }}
                      >
                        <span className="si-tz__icon"><ClockIc /></span>
                        <div className="si-tz__body">
                          <span className="si-tz__line">{wording.dualLine}</span>
                          {tzPicking ? (
                            <span className="si-tz__zones" role="group" aria-label="Candidate timezone">
                              {CORRIDOR_ZONES.map((z) => (
                                <button
                                  key={z.key}
                                  type="button"
                                  className={`si-tz__zone${zone?.key === z.key ? " si-tz__zone--on" : ""}`}
                                  onClick={() => { setTzOverride(z.key); setTzPicking(false); }}
                                >
                                  {z.label}
                                </button>
                              ))}
                            </span>
                          ) : (
                            <span className="si-tz__sub">
                              {tzSourceLine}{" "}
                              <button type="button" className="si-tz__change" onClick={() => setTzPicking(true)}>Change</button>
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="si-row">
                    <label className="si-label" htmlFor="si-dur">Duration</label>
                    <Select
                      id="si-dur"
                      value={duration}
                      onChange={(v) => setDuration(Number(v))}
                      options={DURATIONS.map((d) => ({ value: d, label: `${d} minutes` }))}
                      ariaLabel="Interview duration"
                    />
                  </div>

                  <div className="si-row">
                    <label className="si-label" htmlFor="si-link">Meeting link</label>
                    <input id="si-link" type="url" className="jpp-note__input" placeholder="Paste your Zoom, Meet, or Teams link" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} />
                    <span className="si-hint">{reschedule && rescheduleOf?.meeting_link ? "Kept from the first invite. Paste a new Zoom, Meet, or Teams link to change it." : "Paste your own Zoom, Meet, or Teams link. We do not generate one."}</span>
                  </div>

                  <div className="si-row">
                    <label className="si-label" htmlFor="si-note">Note for the candidate</label>
                    <textarea id="si-note" className="jpp-note__input si-textarea" placeholder="Anything they should prepare or bring (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
                  </div>

                  {error && <p className="si-error" role="alert">{error}</p>}
                </div>

                <div className="jpp-modal__actions">
                  <button type="button" className="jpp-action jpp-action--ghost" onClick={onClose}>Cancel</button>
                  <button type="button" className="jpp-action jpp-action--primary" onClick={submit} disabled={confirmDisabled}>
                    {submitting ? "Scheduling…" : (reschedule ? "Reschedule and notify" : "Schedule and notify")}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───────── Interview status flip (shared by the timeline + dashboard) ───────── */
const STATUS_EVENT = { completed: "interview_completed", no_show: "interview_no_show", cancelled: "interview_cancelled" };
export const INTERVIEW_STATUS_LABEL = { scheduled: "Scheduled", completed: "Completed", no_show: "Did not join", cancelled: "Cancelled" };

// UPDATE the HR's own interviews row (RLS enforces hr_id = auth.uid()),
// then log a candidate_events row so the journey + Insights reflect it.
export async function flipInterviewStatus({ interview, hrId, newStatus }) {
  if (!interview?.id || !STATUS_EVENT[newStatus]) return { ok: false };
  const { error } = await supabase.from("interviews").update({ status: newStatus }).eq("id", interview.id);
  if (error) return { ok: false, error };
  if (interview.candidate_id && hrId) {
    supabase.from("candidate_events").insert({
      candidate_id: interview.candidate_id,
      job_id: interview.job_id || null,
      hr_id: hrId,
      event_type: STATUS_EVENT[newStatus],
      metadata: { scheduled_at: interview.scheduled_at, duration_min: interview.duration_min || null },
    }).then(() => {}, () => {});
  }
  return { ok: true };
}

/** Cancel email + calendar removal (best-effort, mirrors the schedule send). */
export function sendCancelEmail({ interview, application, jobTitle, hrEmail, hrName }) {
  if (!application?.candidate_email || !interview?.scheduled_at) return;
  const first = String(application.candidate_name || "").split(" ")[0] || "there";
  const start = new Date(interview.scheduled_at);
  const { dayLabel, dualLine } = (() => {
    const hrTz = hrTimeZone();
    return {
      dayLabel: formatDayIn(start, hrTz),
      dualLine: dualTimeLine({ when: start, hrTz, candidateTz: interview.candidate_tz || hrTz, firstName: first }),
    };
  })();
  safeFetch("/api/notify-candidate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "interview_cancel",
      candidateEmail: application.candidate_email,
      candidateName: application.candidate_name,
      jobTitle: jobTitle || "",
      scheduledAt: interview.scheduled_at,
      durationMin: interview.duration_min || 30,
      meetingLink: interview.meeting_link || "",
      whenLabel: dayLabel,
      dualTimeLine: dualLine,
      interviewId: interview.id,
      sequence: (Number(interview.ics_sequence) || 0) + 1,
      hrEmail: hrEmail || null,
      hrName: hrName || null,
    }),
  }).catch(() => {});
  // Bump the stored sequence so a later reschedule outruns the cancel.
  supabase.from("interviews")
    .update({ ics_sequence: (Number(interview.ics_sequence) || 0) + 1 })
    .eq("id", interview.id)
    .then(() => {}, () => {});
}

export function InterviewStatusActions({ interview, hrId, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(interview?.status || "scheduled");

  const run = async (s) => {
    if (busy || s === status) return;
    setBusy(true);
    const r = await flipInterviewStatus({ interview, hrId, newStatus: s });
    setBusy(false);
    if (r.ok) { setStatus(s); if (onChanged) onChanged(interview.id, s); }
  };

  if (status !== "scheduled") {
    return <span className={`si-status si-status--${status}`}>{INTERVIEW_STATUS_LABEL[status] || status}</span>;
  }
  return (
    <div className="si-flips" role="group" aria-label="Interview outcome">
      <button type="button" className="si-flip si-flip--done" disabled={busy} onClick={() => run("completed")}>Completed</button>
      <button type="button" className="si-flip" disabled={busy} onClick={() => run("no_show")}>Did not join</button>
      <button type="button" className="si-flip" disabled={busy} onClick={() => run("cancelled")}>Cancel</button>
    </div>
  );
}

/* ───────── Interviews on the candidate timeline (reads interviews table) ───────── */
function whenFromMeta(at) {
  if (!at) return "";
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/**
 * Interviews for ONE application. Queries by application_id — NOT
 * candidate_id, which is null for imported candidates (half the
 * candidates) and hid their interviews entirely.
 */
export function InterviewTimeline({ hrId, applicationId, refreshKey }) {
  const [items, setItems] = useState([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!hrId || !applicationId) { setItems([]); return undefined; }
    let live = true;
    (async () => {
      const { data } = await supabase
        .from("interviews")
        .select("id, job_id, candidate_id, application_id, scheduled_at, duration_min, meeting_link, status, rating, rating_note")
        .eq("hr_id", hrId)
        .eq("application_id", applicationId)
        .order("scheduled_at", { ascending: false })
        .limit(20);
      if (live) setItems(data || []);
    })();
    return () => { live = false; };
  }, [hrId, applicationId, refreshKey, tick]);

  if (!items.length) return null;

  return (
    <section className="jpp-section">
      <h3 className="jpp-section__title">Interviews</h3>
      <div className="jpp-timeline">
        {items.map((iv) => {
          const when = whenFromMeta(iv.scheduled_at);
          return (
            <div key={iv.id} className="jpp-timeline__row">
              <div className="jpp-timeline__icon si-timeline__icon"><CalIc size={14} /></div>
              <div style={{ minWidth: 0, width: "100%" }}>
                <p className="jpp-timeline__title">Interview{iv.duration_min ? ` · ${iv.duration_min} min` : ""}</p>
                {when && <p className="jpp-timeline__sub">{when}</p>}
                {iv.meeting_link && (
                  <p className="jpp-timeline__date">
                    <a href={iv.meeting_link} target="_blank" rel="noreferrer noopener">{iv.meeting_link}</a>
                  </p>
                )}
                {iv.rating_note && <p className="jpp-timeline__sub si-timeline__note">{iv.rating_note}</p>}
                <div className="si-timeline__actions">
                  <InterviewStatusActions interview={iv} hrId={hrId} onChanged={() => setTick((t) => t + 1)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
