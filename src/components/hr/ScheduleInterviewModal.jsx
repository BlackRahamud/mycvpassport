// =============================================================
// src/components/hr/ScheduleInterviewModal.jsx
//
// Schedule an interview from the HR pipeline candidate detail. Reuses
// the pipeline's jpp-modal / jpp-* field styling (ink accent, no purple).
//
// On submit:
//   1. INSERT interviews row (RLS scopes to hr_id = auth.uid()).
//   2. INSERT candidate_events { event_type: 'interview_scheduled' } —
//      shows on the candidate timeline (event_type CHECK dropped in 009).
//   3. POST /api/notify-candidate { type: 'interview' } — emails the
//      candidate with a generated .ics invite (best-effort).
//   4. Surface a wa.me deep-link with the details pre-filled.
//
// Also exports <InterviewTimeline> — the candidate_events render for
// scheduled interviews (reuses jpp-timeline).
// =============================================================

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase } from "../../appSupabaseClient";
import safeFetch from "../../lib/net/safeFetch";
import Select from "../ui/Select";
import "./scheduleInterview.css";

const EASE = [0.4, 0, 0.2, 1];
const DURATIONS = [30, 45, 60];

const CloseIc = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);
const CalIc = ({ size = 15 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>);
const CheckIc = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>);
const WaIc = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>);

function tzLabel() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; }
}
function formatWhen(start) {
  const f = start.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
  const tz = tzLabel();
  return tz ? `${f} (${tz})` : f;
}

export default function ScheduleInterviewModal({ open, onClose, application, job, hrId, onScheduled }) {
  const reduce = useReducedMotion();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [meetingLink, setMeetingLink] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!open) return;
    setDate(""); setTime(""); setDuration(30); setMeetingLink(""); setNote("");
    setSubmitting(false); setError(null); setSuccess(null);
  }, [open]);

  async function submit() {
    if (submitting) return;
    if (!date || !time) { setError("Pick a date and time."); return; }
    const start = new Date(`${date}T${time}`);
    if (Number.isNaN(start.getTime())) { setError("That date/time isn't valid."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const iso = start.toISOString();
      const link = meetingLink.trim();
      const trimmedNote = note.trim();

      const { error: insErr } = await supabase.from("interviews").insert({
        application_id: application?.id || null,
        job_id: job?.id || null,
        hr_id: hrId,
        candidate_id: application?.candidate_id || null,
        scheduled_at: iso,
        duration_min: Number(duration),
        meeting_link: link || null,
        note: trimmedNote || null,
        status: "scheduled",
      });
      if (insErr) throw insErr;

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

      const whenLabel = formatWhen(start);

      // Candidate email + .ics (best-effort).
      if (application?.candidate_email) {
        safeFetch("/api/notify-candidate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "interview",
            candidateEmail: application.candidate_email,
            candidateName: application.candidate_name,
            jobTitle: job?.title || "",
            scheduledAt: iso,
            durationMin: Number(duration),
            meetingLink: link,
            note: trimmedNote,
            whenLabel,
          }),
        }).catch(() => {});
      }

      // WhatsApp deep-link with the details pre-filled.
      const digits = String(application?.candidate_phone || "").replace(/\D/g, "");
      const first = String(application?.candidate_name || "").split(" ")[0] || "there";
      const msg = `Hi ${first}, your interview for ${job?.title || "the role"} is scheduled for ${whenLabel} (${duration} min).${link ? ` Join: ${link}` : ""} Looking forward to speaking with you.`;
      const wa = `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;

      if (onScheduled) onScheduled();
      setSuccess({ wa, whenLabel });
    } catch (e) {
      setError(e?.message || "Couldn't schedule the interview. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const first = String(application?.candidate_name || "the candidate").split(" ")[0] || "the candidate";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="jpp-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Schedule interview"
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
                <h3 className="si-success__title">Interview scheduled</h3>
                <p className="si-success__sub">{first} has been emailed a calendar invite for {success.whenLabel}.</p>
                <div className="si-success__actions">
                  <a className="jpp-action jpp-action--message" href={success.wa} target="_blank" rel="noreferrer noopener"><WaIc /> Send WhatsApp invite</a>
                  <button type="button" className="jpp-action jpp-action--primary" onClick={onClose}>Done</button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="jpp-modal__title"><CalIc size={18} /> Schedule interview</h3>
                <div className="jpp-modal__divider" />

                <div className="si-form">
                  <div className="si-grid2">
                    <div className="si-row">
                      <label className="si-label" htmlFor="si-date">Date</label>
                      <input id="si-date" type="date" className="jpp-note__input" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <div className="si-row">
                      <label className="si-label" htmlFor="si-time">Time</label>
                      <input id="si-time" type="time" className="jpp-note__input" value={time} onChange={(e) => setTime(e.target.value)} />
                    </div>
                  </div>

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
                    <input id="si-link" type="url" className="jpp-note__input" placeholder="Paste your Zoom / Meet / Teams link" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} />
                    <span className="si-hint">Optional — paste your own video link; we don't generate one yet.</span>
                  </div>

                  <div className="si-row">
                    <label className="si-label" htmlFor="si-note">Note for the candidate</label>
                    <textarea id="si-note" className="jpp-note__input si-textarea" placeholder="Anything they should prepare or bring (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
                  </div>

                  {error && <p className="si-error" role="alert">{error}</p>}
                </div>

                <div className="jpp-modal__actions">
                  <button type="button" className="jpp-action jpp-action--ghost" onClick={onClose}>Cancel</button>
                  <button type="button" className="jpp-action jpp-action--primary" onClick={submit} disabled={submitting || !date || !time}>
                    {submitting ? "Scheduling…" : "Schedule & notify"}
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
export const INTERVIEW_STATUS_LABEL = { scheduled: "Scheduled", completed: "Completed", no_show: "No-show", cancelled: "Cancelled" };

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
      <button type="button" className="si-flip" disabled={busy} onClick={() => run("no_show")}>No-show</button>
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

export function InterviewTimeline({ hrId, candidateId, refreshKey }) {
  const [items, setItems] = useState([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!hrId || !candidateId) { setItems([]); return undefined; }
    let live = true;
    (async () => {
      const { data } = await supabase
        .from("interviews")
        .select("id, job_id, candidate_id, scheduled_at, duration_min, meeting_link, status")
        .eq("hr_id", hrId)
        .eq("candidate_id", candidateId)
        .order("scheduled_at", { ascending: false })
        .limit(20);
      if (live) setItems(data || []);
    })();
    return () => { live = false; };
  }, [hrId, candidateId, refreshKey, tick]);

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
