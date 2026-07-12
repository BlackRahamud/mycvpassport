// =============================================================
// CandidatesPage — the cross job PEOPLE view (Candidates tab redesign,
// Option A).
//
// Her mental model everywhere: people, and the jobs each person is on.
// The words "application" and "merge" never appear in the interface.
//
//  - The list card is honest about multiple jobs: one job keeps the simple
//    stage badge; several jobs read "On N jobs · Furthest: <stage>". The
//    old newest-row-stage-as-the-person's-stage is gone.
//  - Imported people carry a filled ink tag ("You imported this CV · 3 Jul");
//    pooled people show "In pool: <name>", never a stage.
//  - THE HEART: per job staging on the profile. One stage control per job
//    row; each writes ONLY that job's record through the locked stageApi
//    (application id required). No global stage control anywhere.
//  - Passed opens the shipped RejectModal, named per job.
//  - Add to job is a COPY (RPC add_application_to_job): pooled people stay
//    in their pool, and the new job row is immediately queued for a verdict
//    scoring pass so it is never left "Not scored".
//  - Bulk bar: safe cross job actions only. No bulk stage move on this tab.
//  - Selection clears whenever a filter changes, so nobody out of view is
//    ever acted on.
// =============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase } from "../../../appSupabaseClient";
import WhatsAppComposer, { OutreachHistory } from "../../../components/hr/WhatsAppComposer";
import VerdictCard, { resolveVerdict } from "../../../components/hr/VerdictCard";
import InterviewKitCard from "../../../components/hr/InterviewKitCard";
import BulkActions from "../../../components/hr/BulkActions";
import BulkCvImport from "../../../components/hr/BulkCvImport";
import { ImportTargetModal } from "../../../components/hr/ImportTargetPicker";
import PaneEmpty from "../../../components/hr/PaneEmpty";
import CvViewerOverlay from "../../../components/hr/CvViewerOverlay";
import CompareCandidates from "../../../components/hr/CompareCandidates";
import ShareForReviewModal from "../../../components/hr/ShareForReviewModal";
import ShareReviews from "../../../components/hr/ShareReviews";
import RejectModal from "../../../components/hr/RejectModal";
import { scoreBand, BAND_COLORS, BAND_LABELS } from "../../../lib/ats/scoreBand";
import Select from "../../../components/ui/Select";
import "../PostJob/postJob.css";   // --pj-* tokens
import "../Jobs/jobPipeline.css";  // .jpp-root tokens + jpp-detail / jpp-card / jpp-section
import "../Jobs/jobsList.css";     // .hjl-toggle / .hjl-empty / --hjl-ink
import givenName from "../../../lib/hr/givenName";
import dedupeSkills from "../../../lib/hr/dedupeSkills";
import {
  rollupPeople,
  getCv,
  PERSON_STAGE_BUCKETS,
  PERSON_STAGE_FILTER_OPTIONS,
} from "../../../lib/hr/peopleRollup";
import { setApplicationStage, PERSON_STAGE_OPTIONS, personStageLabel } from "../../../lib/hr/stageApi";
import { rejectReasonLabel } from "../../../lib/hr/rejectReasons";
import "./candidates.css";

const EASE = [0.4, 0, 0.2, 1];
const SELECT_CAP = 50; // hard cap on bulk selection

const AVAIL_OPTIONS = [
  { key: "all", label: "Any availability" },
  { key: "immediate", label: "Immediate" },
  { key: "soon", label: "Within 1 month" },
  { key: "notice", label: "Longer notice" },
];
const MARKET_OPTIONS = [
  { key: "all", label: "All" },
  { key: "gulf", label: "Gulf" },
  { key: "india", label: "India" },
];

/* ───────── helpers ───────── */
function firstName(full) { return givenName(full, "them"); }

function whatsappHref(phone, name) {
  const digits = String(phone || "").replace(/\D/g, "");
  const first = givenName(name, "there");
  const msg = encodeURIComponent(`Hi ${first}, I'm reaching out regarding your profile. Are you available for a quick call?`);
  return digits ? `https://wa.me/${digits}?text=${msg}` : `https://wa.me/?text=${msg}`;
}

function timeAgo(s) {
  if (!s) return "";
  const t = new Date(s).getTime();
  if (!t || Number.isNaN(t)) return "";
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const fmtDay = (d) => (d ? d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "");

function deriveSkills(a) {
  const cv = getCv(a);
  const list = cv.skills || cv.skill_list || cv.tools || [];
  if (Array.isArray(list)) {
    return dedupeSkills(list.map((s) => (typeof s === "string" ? s : s?.name || s?.label))).slice(0, 12);
  }
  return [];
}

/* One line under each job row: what happened last, in plain words. */
function jobRowSub(ja) {
  if (ja.raw?.added_from) return `Added by you ${timeAgo(ja.applied_at)}`;
  if (ja.status === "rejected") {
    const reason = rejectReasonLabel(ja.reject_reason);
    return `Passed ${timeAgo(ja.updated_at || ja.applied_at)}${reason ? `, ${reason.toLowerCase()}` : ""}`;
  }
  if (["new", "submitted", "viewed"].includes(ja.status)) return `Joined ${timeAgo(ja.applied_at)}`;
  return `${personStageLabel(ja.status)} ${timeAgo(ja.updated_at || ja.applied_at)}`;
}

/* ───────── tiny display atoms ───────── */

/* Person score pill: the person's BEST scored number across their jobs. */
function ScorePill({ score, source, suffix = "", compact = false }) {
  const band = scoreBand(score ?? 0, source);
  if (score == null || band === "none") {
    return <span className="cand-match cand-match--none">Not scored</span>;
  }
  const color = BAND_COLORS[band];
  return (
    <span className="cand-match" style={{ color, borderColor: `${color}59`, background: `${color}16` }}>
      {Math.round(Number(score) || 0)}/100{compact ? "" : ` · ${BAND_LABELS[band]}`}{suffix}
    </span>
  );
}

function StageChip({ status }) {
  const label = personStageLabel(status);
  const tone = status === "rejected" ? "passed"
    : ["new", "submitted", "viewed"].includes(status) ? "new"
      : ["offered", "hired"].includes(status) ? "good" : "mid";
  return <span className={`cand-stagechip cand-stagechip--${tone}`}>{label}</span>;
}

const ImportTag = ({ date, short }) => (
  <span className="cand-tag-ink" title="You imported this CV yourself">
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
    You imported this CV{!short && date ? ` · ${fmtDay(date)}` : ""}
  </span>
);

const PoolTag = ({ name }) => (
  <span className="cand-tag-pool">In pool: {name}</span>
);

/* ───────── icons ───────── */
const SearchIc = () => (<svg className="cand-search__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>);
const MailIc = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 5L2 7" /></svg>);
const PhoneIc = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>);
const WhatsAppIc = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>);
const BriefIc = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>);
const CapIc = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 10 12 5 2 10l10 5 10-5z" /><path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5" /></svg>);
const ChevLeftIc = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>);
const ChevDownIc = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>);
const FileIc = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>);
const ShareIc = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>);
const ClockIc = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" /></svg>);
const PlusIc = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>);

/* ───────── per job stage control (the heart) ───────── */
function StageMenu({ jobApp, scoring, onPick, disabled }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = personStageLabel(jobApp.status);
  const isPassed = jobApp.status === "rejected";
  const isNew = ["new", "submitted", "viewed"].includes(jobApp.status);

  return (
    <span className="cand-stagectl" ref={rootRef}>
      <button
        type="button"
        className={`cand-stagebtn${open ? " cand-stagebtn--open" : ""}${isPassed ? " cand-stagebtn--passed" : ""}`}
        onClick={() => { if (!disabled) setOpen((v) => !v); }}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
      >
        {isNew && <span className="cand-stagebtn__dot" aria-hidden="true" />}
        {scoring ? label : label}
        <span className="cand-stagebtn__chev" aria-hidden="true"><ChevDownIc /></span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="cand-stagemenu"
            role="menu"
            aria-label={`Stage on ${jobApp.jobTitle}`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: EASE }}
          >
            {PERSON_STAGE_OPTIONS.map((opt) => {
              const current = opt.db === jobApp.status
                || (opt.key === "new" && isNew)
                || (opt.key === "interviewed" && jobApp.status === "interviewing");
              const passed = opt.key === "passed";
              return (
                <button
                  key={opt.key}
                  type="button"
                  role="menuitem"
                  className={`cand-stagemenu__item${current ? " cand-stagemenu__item--current" : ""}${passed ? " cand-stagemenu__item--passed" : ""}`}
                  onClick={() => { setOpen(false); onPick(opt); }}
                >
                  <span className="cand-stagemenu__label">
                    {opt.label}
                    {passed && <span className="cand-stagemenu__note">Asks for a reason first</span>}
                  </span>
                  {current && <span className="cand-stagemenu__tick" aria-hidden="true">✓</span>}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ───────── person profile ───────── */
function CandidateDetail({
  candidate, onBack, onMessage, onReachOut, hrId, outreachTick, reduce,
  onStagePick, onAddToJob, scoringIds, onVerdictPersisted,
}) {
  const [cvOpen, setCvOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  useEffect(() => { setCvOpen(false); setShareOpen(false); }, [candidate?.key]);

  if (!candidate) {
    return (
      <PaneEmpty
        className="cand-detail-placeholder"
        title="No candidate selected"
        body="Pick someone from the list to see their profile and every job they are on."
      />
    );
  }

  const a = candidate.record;
  const cv = getCv(a);
  const personal = cv.personal || cv.basics || {};
  const desiredJob = cv.desired_job || cv.target_role || cv.desired_position || personal.headline || "";
  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];
  const skills = candidate.skills;
  const initials = (candidate.name || "?").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";
  const metaLine = [
    desiredJob,
    personal.location || cv.location || "",
    candidate.visa,
    cv.notice_period || cv.availability || personal.notice_period || "",
  ].filter(Boolean).join(" · ");
  const poolOnly = candidate.jobApps.length === 0;
  const firstJob = candidate.jobApps[0] || null;

  return (
    <motion.aside
      className="jpp-detail cand-detail"
      key={candidate.key}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
    >
      <button type="button" className="cand-detail__back" onClick={onBack}>
        <ChevLeftIc /> Back to list
      </button>

      {/* identity — the five second scan */}
      <header className="jpp-detail__head">
        <div className="jpp-detail__avatar">{initials}</div>
        <div className="jpp-detail__identity">
          <div className="cand-id__toprow">
            <h2 className="jpp-detail__name" title={candidate.name || undefined}>{candidate.name}</h2>
            <ScorePill score={candidate.bestScore} source={candidate.bestScoreSource} />
          </div>
          <div className="cand-id__tags">
            {candidate.importedAt && <ImportTag date={candidate.importedAt} />}
            {candidate.pools.map((p) => <PoolTag key={p.app_id} name={p.name} />)}
          </div>
          {metaLine && <p className="jpp-detail__role cand-id__meta">{metaLine}</p>}
          <div className="jpp-detail__contact">
            {candidate.email && (
              <a href={`mailto:${candidate.email}`} title={candidate.email}><MailIc /> <span className="jpp-detail__contact-txt">{candidate.email}</span></a>
            )}
            {candidate.phone && (
              <a href={whatsappHref(candidate.phone, candidate.name)} target="_blank" rel="noreferrer noopener"><PhoneIc /> <span className="jpp-detail__contact-txt">{candidate.phone}</span></a>
            )}
          </div>
        </div>
      </header>

      {/* pool only: no stage controls, one clear action */}
      {poolOnly && (
        <div className="cand-poolbanner">
          <span className="cand-poolbanner__text">
            {firstName(candidate.name)} is in your keep warm pool and is not on a job yet. Add them to a job to start staging.
          </span>
          <button type="button" className="cand-inkbtn" onClick={() => onAddToJob(candidate)}>
            <PlusIc /> Add to job
          </button>
        </div>
      )}

      <div className="jpp-detail__actions">
        <button type="button" className="jpp-action jpp-action--message" onClick={onMessage}>
          <WhatsAppIc /> Message {givenName(candidate.name, "them")}
        </button>
        {candidate.email && (
          <a className="jpp-action jpp-action--ghost" href={`mailto:${candidate.email}`}>
            <MailIc /> Email {givenName(candidate.name, "them")}
          </a>
        )}
        {a.cv_file_path && (
          <button type="button" className="jpp-action jpp-action--ghost" onClick={() => setCvOpen(true)}>
            <FileIc /> View CV
          </button>
        )}
        <button type="button" className="jpp-action jpp-action--ghost" onClick={() => setShareOpen(true)}>
          <ShareIc /> Share for review
        </button>
      </div>

      {/* THE HEART: one stage control per job, nothing global */}
      {candidate.jobApps.length > 0 && (
        <section className="jpp-section">
          <h3 className="jpp-section__title">
            On these jobs{" "}
            <span className="jpp-section__source">
              · {candidate.jobApps.length === 1 ? "1 job" : `${candidate.jobApps.length} jobs, stage each one on purpose`}
            </span>
          </h3>
          <div className="cand-jobs">
            {candidate.jobApps.map((ja) => (
              <div className="cand-jobrow" key={ja.app_id}>
                <span className="cand-jobrow__who">
                  <span className="cand-jobrow__title">{ja.jobTitle}</span>
                  <span className="cand-jobrow__sub">{jobRowSub(ja)}</span>
                </span>
                <span className="cand-jobrow__ctl">
                  {scoringIds.has(ja.app_id)
                    ? <span className="cand-match cand-match--scoring">Scoring…</span>
                    : <ScorePill score={ja.score_source ? ja.ats_score : null} source={ja.score_source} compact />}
                  <StageMenu
                    jobApp={ja}
                    scoring={scoringIds.has(ja.app_id)}
                    onPick={(opt) => onStagePick(candidate, ja, opt)}
                  />
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {skills.length > 0 && (
        <section className="jpp-section">
          <h3 className="jpp-section__title">Skills, Tools, and Technology</h3>
          <div className="jpp-tags">{skills.map((s) => <span key={s} className="jpp-tag">{s}</span>)}</div>
        </section>
      )}

      <OutreachHistory hrId={hrId} candidateId={a.candidate_id} refreshKey={outreachTick} />

      {/* Interview prep needs a real job to write against — people with no
          job would get generic questions, so the card waits for one. */}
      {firstJob && (
        <InterviewKitCard
          cacheKey={`${a.candidate_id || candidate.key}:${firstJob.job_id}`}
          cvSnapshot={cv}
          jobId={firstJob.job_id}
          candidateName={candidate.name}
          jobTitle={firstJob.jobTitle}
        />
      )}

      <ShareReviews applicationId={a.id} />

      {experience.length > 0 && (
        <section className="jpp-section">
          <h3 className="jpp-section__title">Experience</h3>
          <div className="jpp-timeline">
            {experience.slice(0, 6).map((e, i) => (
              <div key={i} className="jpp-timeline__row">
                <div className="jpp-timeline__icon"><BriefIc /></div>
                <div>
                  <p className="jpp-timeline__title">{e.title || e.role || "Role"}</p>
                  <p className="jpp-timeline__sub">{e.company || e.employer || ""}</p>
                  {(e.start_date || e.end_date) && (
                    <p className="jpp-timeline__date">{e.start_date || ""}{e.end_date ? ` to ${e.end_date}` : (e.start_date ? " to Present" : "")}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {education.length > 0 && (
        <section className="jpp-section">
          <h3 className="jpp-section__title">Education</h3>
          <div className="jpp-timeline">
            {education.slice(0, 4).map((e, i) => (
              <div key={i} className="jpp-timeline__row">
                <div className="jpp-timeline__icon jpp-timeline__icon--edu"><CapIc /></div>
                <div>
                  <p className="jpp-timeline__title">{e.school || e.institution || "Institution"}</p>
                  <p className="jpp-timeline__sub">{[e.degree, e.field].filter(Boolean).join(", ")}</p>
                  {(e.start_date || e.end_date) && (
                    <p className="jpp-timeline__date">{e.start_date || ""}{e.end_date ? ` to ${e.end_date}` : ""}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <CvViewerOverlay
        open={cvOpen}
        onClose={() => setCvOpen(false)}
        path={a.cv_file_path}
        fileName={`${candidate.name} CV`}
        intel={{
          name: candidate.name,
          role: desiredJob || firstJob?.jobTitle || "Candidate",
          location: personal.location || cv.location || "",
          visa: candidate.visa || "",
          notice: cv.notice_period || cv.availability || personal.notice_period || "",
          score: candidate.bestScore ?? 0,
          scoreSource: candidate.bestScoreSource,
          matchedKeywords: Array.isArray(a.match_keywords) ? a.match_keywords : [],
          missingKeywords: Array.isArray(a.missing_keywords) ? a.missing_keywords : [],
          skills,
          appliedTo: [
            ...candidate.jobApps.map((ja) => ({ title: ja.jobTitle, when: personStageLabel(ja.status) })),
            ...candidate.pools.map((p) => ({ title: p.name, when: "Talent pool" })),
          ],
          email: candidate.email || "",
          onWhatsApp: () => { setCvOpen(false); onMessage?.(); },
        }}
        verdict={firstJob ? (
          <VerdictCard
            hideHeader
            cacheKey={`${a.candidate_id || candidate.key}:${firstJob.job_id}`}
            cvSnapshot={cv}
            jobId={firstJob.job_id}
            applicationId={firstJob.app_id}
            storedVerdict={firstJob.raw?.ai_verdict}
            onVerdictPersisted={(v) => onVerdictPersisted?.(firstJob.app_id, v)}
            onReachOut={(template) => { setCvOpen(false); onReachOut?.(template); }}
          />
        ) : null}
      />
      <ShareForReviewModal open={shareOpen} onClose={() => setShareOpen(false)} applicationId={a.id} candidateName={candidate.name} hrId={hrId} />
    </motion.aside>
  );
}

/* ───────── Add to job / Add to pool modals (rjm shell reuse) ───────── */
function AddToJobModal({ ctx, jobs, countsByJob, people, busy, onPickJob, onPickStage, onCancel, onConfirm, mobile, reduce }) {
  const open = !!ctx;
  const selectedPeople = open ? ctx.keys.map((k) => people.find((p) => p.key === k)).filter(Boolean) : [];
  const single = selectedPeople.length === 1 ? selectedPeople[0] : null;
  const anyPooled = selectedPeople.some((p) => p.pools.length > 0);
  const jobTitle = open && ctx.jobId ? (jobs.find((j) => j.id === ctx.jobId)?.title || "this job") : null;
  const stageChoices = PERSON_STAGE_OPTIONS.filter((o) => o.key !== "passed");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cand-addjob-scrim"
          className="rjm-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: EASE }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
        >
          <motion.div
            className={`rjm-modal${mobile ? " rjm-modal--sheet" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={single ? `Add ${firstName(single.name)} to a job` : `Add ${selectedPeople.length} people to a job`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: mobile ? 32 : 14, scale: mobile ? 1 : 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: mobile ? 24 : 8, scale: mobile ? 1 : 0.98 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            <div className="rjm-modal__head">
              <span className="rjm-modal__title">
                {single ? `Add ${firstName(single.name)} to a job` : `Add ${selectedPeople.length} people to a job`}
              </span>
              <button type="button" className="rjm-modal__close" onClick={onCancel} aria-label="Close">✕</button>
            </div>

            {jobs.length === 0 ? (
              <p className="rjm-modal__lede">Post a job first, then you can add people to it.</p>
            ) : (
              <>
                <div className="cand-jobpick" role="radiogroup" aria-label="Choose a job">
                  {jobs.map((j) => {
                    const active = ctx.jobId === j.id;
                    const count = countsByJob.get(j.id) || 0;
                    return (
                      <button
                        key={j.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={`cand-jobpick__row${active ? " cand-jobpick__row--active" : ""}`}
                        onClick={() => onPickJob(j.id)}
                      >
                        <span className="cand-jobpick__who">
                          <span className="cand-jobpick__title">{j.title || "Untitled role"}</span>
                          <span className="cand-jobpick__sub">
                            {[j.location, `${count} ${count === 1 ? "person" : "people"} on it`].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <span className={`cand-jobpick__radio${active ? " cand-jobpick__radio--on" : ""}`} aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>

                <div className="cand-stagepick">
                  <span className="cand-stagepick__label">Starting stage</span>
                  <div style={{ width: 170 }}>
                    <Select
                      size="sm"
                      menuAlign="right"
                      value={ctx.stageDb}
                      onChange={(v) => onPickStage(v)}
                      options={stageChoices.map((o) => ({ value: o.db, label: o.label }))}
                      ariaLabel="Starting stage"
                    />
                  </div>
                </div>

                {anyPooled && (
                  <div className="rjm-modal__note">
                    <span aria-hidden="true"><ClockIc /></span>
                    <span>
                      {single
                        ? `${firstName(single.name)} also stays in your ${single.pools[0]?.name || "talent"} pool, so you keep them warm even if this role does not work out.`
                        : "Pooled people stay in their pools too, so you keep them warm even if this role does not work out."}
                    </span>
                  </div>
                )}

                <div className="rjm-modal__acts">
                  <button type="button" className="rjm-btn" onClick={onCancel}>Cancel</button>
                  <button
                    type="button"
                    className="rjm-btn cand-inkbtn--solid"
                    disabled={!ctx.jobId || busy}
                    onClick={onConfirm}
                  >
                    {busy ? "Adding…" : (jobTitle ? `Add to ${jobTitle}` : "Add to job")}
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

function AddToPoolModal({ ctx, pools, people, busy, onPickPool, onName, onMarket, onCancel, onConfirm, mobile, reduce }) {
  const open = !!ctx;
  const selectedPeople = open ? ctx.keys.map((k) => people.find((p) => p.key === k)).filter(Boolean) : [];
  const creating = open && ctx.poolId === "__new__";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cand-addpool-scrim"
          className="rjm-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: EASE }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
        >
          <motion.div
            className={`rjm-modal${mobile ? " rjm-modal--sheet" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label="Add to a pool"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: mobile ? 32 : 14, scale: mobile ? 1 : 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: mobile ? 24 : 8, scale: mobile ? 1 : 0.98 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            <div className="rjm-modal__head">
              <span className="rjm-modal__title">
                Add {selectedPeople.length === 1 ? firstName(selectedPeople[0]?.name) : `${selectedPeople.length} people`} to a pool
              </span>
              <button type="button" className="rjm-modal__close" onClick={onCancel} aria-label="Close">✕</button>
            </div>
            <p className="rjm-modal__lede">A pool is a keep warm list, not a pipeline. People in pools carry no stage until you add them to a job.</p>

            <div className="cand-jobpick" role="radiogroup" aria-label="Choose a pool">
              {pools.map((j) => {
                const active = ctx.poolId === j.id;
                return (
                  <button
                    key={j.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`cand-jobpick__row${active ? " cand-jobpick__row--active" : ""}`}
                    onClick={() => onPickPool(j.id)}
                  >
                    <span className="cand-jobpick__who">
                      <span className="cand-jobpick__title">{j.title || "Talent pool"}</span>
                      <span className="cand-jobpick__sub">{j.market === "india" ? "India" : "Gulf"}</span>
                    </span>
                    <span className={`cand-jobpick__radio${active ? " cand-jobpick__radio--on" : ""}`} aria-hidden="true" />
                  </button>
                );
              })}
              <button
                type="button"
                role="radio"
                aria-checked={creating}
                className={`cand-jobpick__row${creating ? " cand-jobpick__row--active" : ""}`}
                onClick={() => onPickPool("__new__")}
              >
                <span className="cand-jobpick__who">
                  <span className="cand-jobpick__title">New pool</span>
                  <span className="cand-jobpick__sub">Name it and keep this group warm</span>
                </span>
                <span className={`cand-jobpick__radio${creating ? " cand-jobpick__radio--on" : ""}`} aria-hidden="true" />
              </button>
            </div>

            {creating && (
              <div className="cand-poolnew">
                <input
                  type="text"
                  className="cand-poolnew__input"
                  placeholder='Name the pool, e.g. "Sales bench"'
                  value={ctx.newName}
                  maxLength={80}
                  onChange={(e) => onName(e.target.value)}
                />
                <div className="hjl-toggle" role="radiogroup" aria-label="Pool market">
                  {["gulf", "india"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={ctx.market === m}
                      className={`hjl-toggle__btn${ctx.market === m ? " hjl-toggle__btn--active" : ""}`}
                      onClick={() => onMarket(m)}
                    >
                      {m === "india" ? "India" : "Gulf"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rjm-modal__acts">
              <button type="button" className="rjm-btn" onClick={onCancel}>Cancel</button>
              <button
                type="button"
                className="rjm-btn cand-inkbtn--solid"
                disabled={busy || !ctx.poolId || (creating && !ctx.newName.trim())}
                onClick={onConfirm}
              >
                {busy ? "Adding…" : "Add to pool"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═════════════════ main page ═════════════════ */
export default function CandidatesPage() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [rows, setRows] = useState(null); // raw application rows; null = loading
  const [jobsList, setJobsList] = useState([]);
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [importJob, setImportJob] = useState(null);

  const [search, setSearch] = useState("");
  const [market, setMarket] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [selectedKey, setSelectedKey] = useState(null);
  const [checkedKeys, setCheckedKeys] = useState(() => new Set());
  const [checkNotice, setCheckNotice] = useState(false);

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerInitialMessage, setComposerInitialMessage] = useState(null);
  const [outreachTick, setOutreachTick] = useState(0);
  const [compareOpen, setCompareOpen] = useState(false);

  const [toast, setToast] = useState(null); // { msg, undo }
  const toastTimer = useRef(null);
  const [rejectCtx, setRejectCtx] = useState(null); // { person, jobApp, reason }
  const [addJobCtx, setAddJobCtx] = useState(null); // { keys, jobId, stageDb }
  const [addPoolCtx, setAddPoolCtx] = useState(null); // { keys, poolId, newName, market }
  const [addBusy, setAddBusy] = useState(false);
  const [scoringIds, setScoringIds] = useState(() => new Set());

  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? !window.matchMedia("(min-width: 900px)").matches
      : false,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia("(min-width: 900px)");
    const onChange = (e) => setMobile(!e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  useEffect(() => {
    let live = true;
    supabase.auth.getUser().then(({ data }) => { if (live) setUser(data?.user || null); });
    return () => { live = false; };
  }, []);

  /* ── data ── */
  useEffect(() => {
    const uid = user?.id;
    if (!uid) return undefined;
    let live = true;
    (async () => {
      try {
        const BASE = "id, job_id, candidate_id, candidate_name, candidate_email, candidate_phone, cv_snapshot, cv_file_path, ats_score, score_source, source, status, visa_status, match_keywords, missing_keywords, ai_verdict, applied_at, updated_at";
        let appsRes = await supabase
          .from("applications")
          .select(`${BASE}, reject_reason, added_from`)
          .eq("hr_id", uid)
          .limit(5000);
        if (appsRes.error && /column|schema cache/i.test(appsRes.error.message || "")) {
          appsRes = await supabase.from("applications").select(BASE).eq("hr_id", uid).limit(5000);
        }
        const jobsRes = await supabase
          .from("jobs")
          .select("id, title, market, status, kind, location, description, skills, requirements")
          .eq("hr_id", uid)
          .eq("source", "hr_portal")
          .limit(500);
        if (!live) return;
        if (appsRes.error) throw appsRes.error;
        setJobsList(jobsRes.data || []);
        setRows(appsRes.data || []);
      } catch (e) {
        if (!live) return;
        setRows([]);
        setError(e.message || "Couldn't load candidates");
      }
    })();
    return () => { live = false; };
  }, [user?.id, reloadTick]);

  /* ── people (pure rollup) + card decoration ── */
  const people = useMemo(() => {
    if (!rows) return null;
    return rollupPeople({ applications: rows, jobs: jobsList }).map((p) => ({
      ...p,
      skills: deriveSkills(p.record),
      // Back-compat alias for Compare + the WhatsApp queue: apps[0] is the
      // person's furthest-along ACTIVE job (never a pool).
      apps: p.jobApps,
    }));
  }, [rows, jobsList]);

  const activeJobs = useMemo(
    () => jobsList.filter((j) => j.kind !== "pool" && (j.status === "active" || j.status === "published")),
    [jobsList],
  );
  const pools = useMemo(() => jobsList.filter((j) => j.kind === "pool"), [jobsList]);
  const countsByJob = useMemo(() => {
    const m = new Map();
    (rows || []).forEach((a) => {
      if (a.status === "rejected") return;
      m.set(a.job_id, (m.get(a.job_id) || 0) + 1);
    });
    return m;
  }, [rows]);

  /* ── filters ── */
  const filtered = useMemo(() => {
    if (!people) return null;
    const q = search.trim().toLowerCase();
    const bucket = PERSON_STAGE_BUCKETS[stageFilter];
    return people.filter((c) => {
      if (market !== "all" && !c.markets.has(market) && !(c.jobApps.length === 0 && c.pools.length > 0)) return false;
      if (availability !== "all" && c.availability !== availability) return false;
      if (bucket) {
        let any = false;
        c.statuses.forEach((s) => { if (bucket.has(s)) any = true; });
        if (!any) return false;
      }
      if (q) {
        const hay = `${c.name} ${c.email} ${c.skills.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [people, search, market, stageFilter, availability]);

  /* Selection clears when ANY filter changes — nobody out of view is ever
     acted on (locked decision 7). */
  const filterSig = `${search}|${market}|${stageFilter}|${availability}`;
  const prevSig = useRef(filterSig);
  useEffect(() => {
    if (prevSig.current !== filterSig) {
      prevSig.current = filterSig;
      setCheckedKeys((prev) => (prev.size ? new Set() : prev));
      setCheckNotice(false);
    }
  }, [filterSig]);

  const selected = useMemo(
    () => (filtered || []).find((c) => c.key === selectedKey) || null,
    [filtered, selectedKey],
  );

  /* ── bulk selection ── */
  const pageKeys = useMemo(() => (filtered || []).map((c) => c.key), [filtered]);
  const allPageChecked = pageKeys.length > 0 && pageKeys.every((k) => checkedKeys.has(k));
  const someChecked = checkedKeys.size > 0;

  const toggleCheck = (key) => {
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); setCheckNotice(false); return next; }
      if (next.size >= SELECT_CAP) { setCheckNotice(true); return prev; }
      next.add(key);
      return next;
    });
  };
  const toggleSelectAllPage = () => {
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      if (allPageChecked) { pageKeys.forEach((k) => next.delete(k)); setCheckNotice(false); return next; }
      let capped = false;
      for (const k of pageKeys) {
        if (next.has(k)) continue;
        if (next.size >= SELECT_CAP) { capped = true; break; }
        next.add(k);
      }
      setCheckNotice(capped);
      return next;
    });
  };
  const clearSelection = () => { setCheckedKeys(new Set()); setCheckNotice(false); };
  const selectedArr = useMemo(() => {
    if (!people || checkedKeys.size === 0) return [];
    const order = new Map((filtered || people).map((c, i) => [c.key, i]));
    return people
      .filter((c) => checkedKeys.has(c.key))
      .sort((a, b) => (order.has(a.key) ? order.get(a.key) : 1e9) - (order.has(b.key) ? order.get(b.key) : 1e9));
  }, [people, filtered, checkedKeys]);

  /* ── local row patches ── */
  const patchRow = useCallback((appId, patch) => {
    setRows((prev) => (prev || []).map((a) => (a.id === appId ? { ...a, ...patch } : a)));
  }, []);

  const patchVerdict = useCallback((appId, v) => {
    if (!appId || !v || typeof v.score !== "number") return;
    patchRow(appId, { ai_verdict: v, ats_score: v.score, score_source: "sonnet_verdict" });
  }, [patchRow]);

  const showToast = useCallback((msg, undo) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, undo: undo || null });
    toastTimer.current = setTimeout(() => setToast(null), 6500);
  }, []);

  /* ── staging (per job, locked to the application id) ── */
  const doStage = useCallback(async (person, jobApp, newStatus, reasonCode, { silent = false } = {}) => {
    const prev = { status: jobApp.raw.status, updated_at: jobApp.raw.updated_at, reject_reason: jobApp.raw.reject_reason || null };
    const optimistic = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === "rejected") optimistic.reject_reason = reasonCode;
    if (prev.status === "rejected" && newStatus !== "rejected") optimistic.reject_reason = null;
    patchRow(jobApp.app_id, optimistic);

    const res = await setApplicationStage({
      applicationId: jobApp.app_id,
      newStatus,
      app: jobApp.raw,
      hrId: user?.id,
      rejectReason: reasonCode,
    });
    if (!res.ok) {
      patchRow(jobApp.app_id, prev);
      showToast(`Couldn't update ${jobApp.jobTitle}. Check your connection and try again.`);
      return false;
    }
    if (!silent) {
      const first = firstName(person.name);
      const label = newStatus === "rejected" ? "Passed" : personStageLabel(newStatus);
      const others = person.jobApps.length > 1 ? " Their other jobs stay where they are." : "";
      const msg = newStatus === "rejected"
        ? `${first} passed on ${jobApp.jobTitle}${reasonCode ? `: ${rejectReasonLabel(reasonCode)}` : ""}.${others}`
        : `${first} moved to ${label} on ${jobApp.jobTitle}.${others}`;
      showToast(msg, async () => {
        patchRow(jobApp.app_id, prev);
        const back = await setApplicationStage({
          applicationId: jobApp.app_id,
          newStatus: prev.status,
          app: { ...jobApp.raw, status: newStatus },
          hrId: user?.id,
          rejectReason: prev.reject_reason,
        });
        if (!back.ok) showToast(`Couldn't undo the change on ${jobApp.jobTitle}.`);
        else setToast(null);
      });
    }
    return true;
  }, [patchRow, user?.id, showToast]);

  const onStagePick = useCallback((person, jobApp, opt) => {
    if (opt.db === jobApp.status) return;
    if (opt.db === "rejected") {
      setRejectCtx({ person, jobApp, reason: null });
      return;
    }
    doStage(person, jobApp, opt.db, null);
  }, [doStage]);

  const confirmReject = useCallback(() => {
    if (!rejectCtx?.reason) return;
    const { person, jobApp, reason } = rejectCtx;
    setRejectCtx(null);
    doStage(person, jobApp, "rejected", reason);
  }, [rejectCtx, doStage]);

  /* Compare column Shortlist: the specific job shown in that column. */
  const shortlistOne = useCallback(async (cand) => {
    const ja = cand.jobApps?.[0];
    if (!ja) return false;
    return doStage(cand, ja, "shortlisted", null, { silent: true });
  }, [doStage]);

  /* ── Add to job (a COPY; pool membership survives) ── */
  const openAddToJob = useCallback((keys) => {
    setAddJobCtx({ keys, jobId: activeJobs.length === 1 ? activeJobs[0].id : null, stageDb: "new" });
  }, [activeJobs]);

  const queueVerdictPass = useCallback((newId, srcApp, targetJob) => {
    if (!targetJob || targetJob.kind === "pool") return;
    setScoringIds((prev) => new Set(prev).add(newId));
    resolveVerdict({
      cacheKey: `${srcApp.candidate_id || newId}:${targetJob.id}`,
      cvSnapshot: getCv(srcApp),
      job: targetJob,
      applicationId: newId,
    })
      .then((v) => patchVerdict(newId, v))
      .catch(() => { /* honest fallback: the row stays "Not scored" */ })
      .finally(() => setScoringIds((prev) => { const n = new Set(prev); n.delete(newId); return n; }));
  }, [patchVerdict]);

  const runAddCopies = useCallback(async (keys, targetJobId, stageDb) => {
    const target = jobsList.find((j) => j.id === targetJobId)
      || pools.find((j) => j.id === targetJobId);
    const created = [];
    let skipped = 0;
    let failed = 0;
    for (const k of keys) {
      const person = (people || []).find((p) => p.key === k);
      const src = person?.record;
      if (!src) continue;
      const { data, error } = await supabase.rpc("add_application_to_job", {
        p_app_id: src.id,
        p_job_id: targetJobId,
        p_status: stageDb,
      });
      if (error) {
        failed += 1;
        if (/function .* does not exist|schema cache/i.test(error.message || "")) {
          showToast("Couldn't add to the job. The database needs migration 038 first.");
          return { created, skipped, failed, fatal: true };
        }
        continue;
      }
      if (!data?.added) { skipped += 1; continue; }
      const iso = new Date().toISOString();
      const newRow = {
        ...src,
        id: data.id,
        job_id: targetJobId,
        status: data.status || stageDb,
        ats_score: 0,
        score_source: null,
        ai_verdict: null,
        match_keywords: [],
        missing_keywords: [],
        reject_reason: null,
        added_from: src.id,
        applied_at: iso,
        updated_at: iso,
      };
      setRows((prev) => ([...(prev || []), newRow]));
      created.push({ id: data.id, src, person });
      queueVerdictPass(data.id, src, target);
    }
    return { created, skipped, failed, fatal: false };
  }, [jobsList, pools, people, queueVerdictPass, showToast]);

  const undoAddCopies = useCallback(async (ids) => {
    const { error } = await supabase.from("applications").delete().in("id", ids);
    if (error) {
      showToast("Couldn't undo. The people stay where you added them.");
      return;
    }
    setRows((prev) => (prev || []).filter((a) => !ids.includes(a.id)));
    setToast(null);
  }, [showToast]);

  const confirmAddToJob = useCallback(async () => {
    if (!addJobCtx?.jobId || addBusy) return;
    const { keys, jobId, stageDb } = addJobCtx;
    const job = activeJobs.find((j) => j.id === jobId);
    setAddBusy(true);
    const { created, skipped, fatal } = await runAddCopies(keys, jobId, stageDb);
    setAddBusy(false);
    if (fatal) { setAddJobCtx(null); return; }
    setAddJobCtx(null);
    clearSelection();
    const jobTitle = job?.title || "the job";
    const stageLabel = personStageLabel(stageDb);
    if (created.length === 0) {
      showToast(skipped > 0 ? `Everyone selected is already on ${jobTitle}.` : `Nothing was added to ${jobTitle}.`);
      return;
    }
    const single = created.length === 1 && keys.length === 1 ? created[0] : null;
    const msg = single
      ? `${firstName(single.person.name)} added to ${jobTitle}, starting at ${stageLabel}.${single.person.pools.length ? " They stay in your pool too." : ""}`
      : `${created.length} people added to ${jobTitle}, starting at ${stageLabel}. Pooled people stay in their pools.${skipped ? ` ${skipped} already on it.` : ""}`;
    showToast(msg, () => undoAddCopies(created.map((c) => c.id)));
  }, [addJobCtx, addBusy, activeJobs, runAddCopies, showToast, undoAddCopies]);

  /* ── Add to pool ── */
  const openAddToPool = useCallback((keys) => {
    setAddPoolCtx({ keys, poolId: pools.length === 1 ? pools[0].id : (pools.length === 0 ? "__new__" : null), newName: "", market: "gulf" });
  }, [pools]);

  const confirmAddToPool = useCallback(async () => {
    if (!addPoolCtx?.poolId || addBusy) return;
    const { keys, poolId, newName, market: poolMarket } = addPoolCtx;
    setAddBusy(true);
    let targetPoolId = poolId;
    let poolName = pools.find((p) => p.id === poolId)?.title;
    if (poolId === "__new__") {
      const name = newName.trim();
      const { data, error } = await supabase
        .from("jobs")
        .insert({ hr_id: user?.id, title: name, company: "", location: "", source: "hr_portal", status: "active", kind: "pool", market: poolMarket })
        .select("id, title, market, status, kind, location, description, skills, requirements")
        .single();
      if (error || !data) {
        setAddBusy(false);
        showToast("Couldn't create the pool. Check your connection and try again.");
        return;
      }
      setJobsList((prev) => [...prev, data]);
      targetPoolId = data.id;
      poolName = data.title;
    }
    const { created, skipped, fatal } = await runAddCopies(keys, targetPoolId, "new");
    setAddBusy(false);
    if (fatal) { setAddPoolCtx(null); return; }
    setAddPoolCtx(null);
    clearSelection();
    if (created.length === 0) {
      showToast(skipped > 0 ? `Everyone selected is already in ${poolName || "that pool"}.` : "Nothing was added.");
      return;
    }
    showToast(
      `${created.length === 1 ? `${firstName(created[0].person.name)}` : `${created.length} people`} added to ${poolName || "the pool"}.`,
      () => undoAddCopies(created.map((c) => c.id)),
    );
  }, [addPoolCtx, addBusy, pools, user?.id, runAddCopies, showToast, undoAddCopies]);

  const loading = rows === null;
  const totalCandidates = people ? people.length : 0;

  /* ═════════ render ═════════ */
  return (
    <div className="jpp-root cand-root">
      <Helmet><title>Candidates · CVPassport</title></Helmet>
      <main className="jpp-page cand-page">
        <header className="cand-head">
          <div>
            <h1 className="cand-head__title">Candidates</h1>
            <p className="cand-head__sub">
              {loading ? "Loading…" : `${totalCandidates} ${totalCandidates === 1 ? "person" : "people"} across all your jobs`}
            </p>
          </div>
          <button type="button" className="cand-add" onClick={() => setPickerOpen(true)}>
            <PlusIc /> <span className="cand-add__label">Add candidate</span>
          </button>
        </header>

        {/* Filters */}
        <div className="cand-filters">
          <div className="cand-search">
            <SearchIc />
            <input
              type="text"
              placeholder="Search name, email, or skill…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search candidates"
            />
          </div>
          <div className="hjl-toggle" role="radiogroup" aria-label="Market">
            {MARKET_OPTIONS.map((o) => (
              <button key={o.key} type="button" role="radio" aria-checked={market === o.key}
                className={`hjl-toggle__btn${market === o.key ? " hjl-toggle__btn--active" : ""}`}
                onClick={() => setMarket(o.key)}>{o.label}</button>
            ))}
          </div>
          <div className="cand-stagefilter-select" style={{ width: 170 }}>
            <Select
              size="sm"
              menuAlign="right"
              value={stageFilter}
              onChange={(v) => setStageFilter(v)}
              options={PERSON_STAGE_FILTER_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
              ariaLabel="Stage"
            />
          </div>
          <div className="cand-availfilter" style={{ width: 190 }}>
            <Select
              size="sm"
              menuAlign="right"
              value={availability}
              onChange={(v) => setAvailability(v)}
              options={AVAIL_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
              ariaLabel="Availability"
            />
          </div>
        </div>

        {/* Mobile: stage filter as a sideways chip row (frame 1k) */}
        <div className="cand-stagechips" role="radiogroup" aria-label="Stage filter">
          {PERSON_STAGE_FILTER_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={stageFilter === o.key}
              className={`cand-stagechips__chip${stageFilter === o.key ? " cand-stagechips__chip--active" : ""}`}
              onClick={() => setStageFilter(o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="cand-loading" aria-busy="true">
            <div className="cand-loading__tile" /><div className="cand-loading__tile" /><div className="cand-loading__tile" />
          </div>
        )}

        {/* Empty (no people at all) */}
        {!loading && totalCandidates === 0 && (
          <div className="hjl-empty">
            <p className="hjl-empty__title">No candidates yet</p>
            <p className="hjl-empty__body">
              People show up here once they apply to your jobs, or when you import CVs yourself. Everyone is searchable across every role you post.
              {error && <span style={{ display: "block", marginTop: 8, fontSize: 12, color: "var(--pj-muted)" }}>({error})</span>}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button type="button" className="cand-ghostbtn" onClick={() => setPickerOpen(true)}>Import CVs</button>
              <button type="button" className="hjl-cta" onClick={() => navigate("/employer/post")}>Post a job</button>
            </div>
          </div>
        )}

        {/* Data */}
        {!loading && totalCandidates > 0 && (
          <div className={`cand-layout${selected ? " cand-layout--detail" : ""}`}>
            <div className="cand-list" style={{ paddingBottom: someChecked ? 96 : undefined }}>
              {filtered.length === 0 ? (
                <div className="cand-nomatch">
                  <p className="cand-nomatch__title">No one matches these filters</p>
                  <p className="cand-nomatch__body">Clear the search or widen the stage filter. Your ticked people were unselected so nothing happens to anyone out of view.</p>
                </div>
              ) : (
                <>
                  <div className="cand-selectall">
                    <label>
                      <input
                        type="checkbox"
                        className="cand-check"
                        checked={allPageChecked}
                        ref={(el) => { if (el) el.indeterminate = !allPageChecked && pageKeys.some((k) => checkedKeys.has(k)); }}
                        onChange={toggleSelectAllPage}
                        aria-label="Select all candidates on this page"
                      />
                      Select all ({filtered.length})
                    </label>
                    {someChecked && <span className="cand-selectall__count">{checkedKeys.size} selected</span>}
                    {checkNotice && (
                      <span role="status" className="cand-selectall__cap">
                        You can act on up to {SELECT_CAP} candidates at once
                      </span>
                    )}
                  </div>

                  {filtered.map((c, i) => {
                    const checked = checkedKeys.has(c.key);
                    const multi = c.jobApps.length > 1;
                    const single = c.jobApps.length === 1 ? c.jobApps[0] : null;
                    return (
                      <div key={c.key} className="cand-rowwrap">
                        <label onClick={(e) => e.stopPropagation()} className="cand-rowwrap__check">
                          <input
                            type="checkbox"
                            className="cand-check"
                            checked={checked}
                            onChange={() => toggleCheck(c.key)}
                            aria-label={`Select ${c.name}`}
                          />
                        </label>
                        <motion.button
                          type="button"
                          className={`jpp-card cand-card${selectedKey === c.key ? " jpp-card--active" : ""}`}
                          onClick={() => setSelectedKey(c.key)}
                          initial={reduce ? false : { opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.26, ease: EASE, delay: Math.min(i * 0.02, 0.16) }}
                          style={{ flex: 1, boxShadow: checked ? "inset 0 0 0 1.5px var(--hjl-ink)" : undefined }}
                        >
                          <div className="jpp-card__top cand-card__top">
                            <span className="jpp-card__name">{c.name}</span>
                            <ScorePill score={c.bestScore} source={c.bestScoreSource} />
                          </div>
                          <div className="cand-card__meta">
                            {c.importedAt && <ImportTag date={c.importedAt} short={mobile} />}
                            {c.markets.size > 0 && (
                              <span className={`cand-market cand-market--${c.markets.has("india") && !c.markets.has("gulf") ? "india" : "gulf"}`}>
                                {c.markets.has("india") && !c.markets.has("gulf") ? "India" : "Gulf"}
                              </span>
                            )}
                            {multi && (
                              <>
                                <span className="cand-card__multi">On {c.jobApps.length} jobs</span>
                                <span className="cand-card__furthest">Furthest: {c.furthest}</span>
                              </>
                            )}
                            {single && (
                              <>
                                <span className="cand-card__jobtitle">{single.jobTitle}</span>
                                <StageChip status={single.status} />
                              </>
                            )}
                            {c.pools.length > 0 && <PoolTag name={c.pools[0].name} />}
                          </div>
                          {(c.email || c.availabilityLine) && (
                            <span className="cand-card__email">
                              {[c.email, c.availabilityLine].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </motion.button>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            <AnimatePresence mode="wait">
              <CandidateDetail
                candidate={selected}
                onBack={() => setSelectedKey(null)}
                onMessage={() => { setComposerInitialMessage(null); setComposerOpen(true); }}
                onReachOut={(template) => { setComposerInitialMessage(template); setComposerOpen(true); }}
                hrId={user?.id}
                outreachTick={outreachTick}
                reduce={reduce}
                onStagePick={onStagePick}
                onAddToJob={(person) => openAddToJob([person.key])}
                scoringIds={scoringIds}
                onVerdictPersisted={patchVerdict}
              />
            </AnimatePresence>
          </div>
        )}
      </main>

      <WhatsAppComposer
        open={composerOpen && !!selected}
        onClose={() => setComposerOpen(false)}
        initialMessage={composerInitialMessage}
        candidate={selected ? {
          id: selected.record?.candidate_id,
          name: selected.name,
          phone: selected.phone,
          cvSnapshot: getCv(selected.record),
        } : null}
        job={selected?.jobApps?.[0] ? { id: selected.jobApps[0].job_id, title: selected.jobApps[0].jobTitle } : null}
        hrId={user?.id}
        onLogged={() => setOutreachTick((t) => t + 1)}
      />

      {someChecked && (
        <BulkActions
          selected={selectedArr}
          onClear={clearSelection}
          hrId={user?.id}
          onLogged={() => setOutreachTick((t) => t + 1)}
          onCompare={() => setCompareOpen(true)}
          onAddToJob={() => openAddToJob([...checkedKeys])}
          onAddToPool={() => openAddToPool([...checkedKeys])}
        />
      )}

      <CompareCandidates
        open={compareOpen && selectedArr.length >= 2}
        onClose={() => setCompareOpen(false)}
        candidates={selectedArr.slice(0, 3)}
        onShortlist={shortlistOne}
        onVerdictPersisted={(cand, v) => patchVerdict(cand?.jobApps?.[0]?.app_id || cand?.record?.id, v)}
      />

      {/* Passed from a per job control: the shipped modal, named per job */}
      <RejectModal
        open={!!rejectCtx}
        title={rejectCtx ? `Pass on ${rejectCtx.person.name} for ${rejectCtx.jobApp.jobTitle}` : ""}
        lede={rejectCtx ? `This only changes ${rejectCtx.jobApp.jobTitle}. ${rejectCtx.person.jobApps.length > 1 ? "Their other jobs stay where they are. " : ""}Pick a reason, it sharpens future AI matching and talent pool search.` : ""}
        note={rejectCtx ? `${firstName(rejectCtx.person.name)} is not notified right away, and you can undo this decision. Passed people stay findable under the Passed filter.` : ""}
        confirmLabel={rejectCtx ? `Pass on ${rejectCtx.jobApp.jobTitle}` : "Pass"}
        reason={rejectCtx?.reason || null}
        onPick={(code) => setRejectCtx((ctx) => (ctx ? { ...ctx, reason: code } : ctx))}
        onCancel={() => setRejectCtx(null)}
        onConfirm={confirmReject}
        mobile={mobile}
        reduce={reduce}
      />

      <AddToJobModal
        ctx={addJobCtx}
        jobs={activeJobs}
        countsByJob={countsByJob}
        people={people || []}
        busy={addBusy}
        onPickJob={(id) => setAddJobCtx((ctx) => (ctx ? { ...ctx, jobId: id } : ctx))}
        onPickStage={(db) => setAddJobCtx((ctx) => (ctx ? { ...ctx, stageDb: db } : ctx))}
        onCancel={() => { if (!addBusy) setAddJobCtx(null); }}
        onConfirm={confirmAddToJob}
        mobile={mobile}
        reduce={reduce}
      />

      <AddToPoolModal
        ctx={addPoolCtx}
        pools={pools}
        people={people || []}
        busy={addBusy}
        onPickPool={(id) => setAddPoolCtx((ctx) => (ctx ? { ...ctx, poolId: id } : ctx))}
        onName={(v) => setAddPoolCtx((ctx) => (ctx ? { ...ctx, newName: v } : ctx))}
        onMarket={(m) => setAddPoolCtx((ctx) => (ctx ? { ...ctx, market: m } : ctx))}
        onCancel={() => { if (!addBusy) setAddPoolCtx(null); }}
        onConfirm={confirmAddToPool}
        mobile={mobile}
        reduce={reduce}
      />

      <ImportTargetModal
        open={pickerOpen}
        jobs={jobsList.filter((j) => j.status !== "closed")}
        onPickJob={(j) => { setPickerOpen(false); setImportJob(j); }}
        onCreatePool={(name, mkt) => { setPickerOpen(false); setImportJob({ isPool: true, id: null, title: name, market: mkt }); }}
        onClose={() => setPickerOpen(false)}
        reduce={reduce}
      />

      <BulkCvImport
        open={!!importJob && !!user?.id}
        jobId={importJob?.isPool ? null : importJob?.id}
        job={importJob?.isPool ? null : importJob}
        poolName={importJob?.isPool ? importJob.title : null}
        market={importJob?.isPool ? importJob.market : (importJob?.market || null)}
        hrId={user?.id}
        onClose={() => setImportJob(null)}
        onImported={() => setReloadTick((t) => t + 1)}
      />

      {/* toast with undo */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="cand-toast"
            role="status"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <span>{toast.msg}</span>
            {toast.undo && <button type="button" onClick={() => toast.undo()}>Undo</button>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
