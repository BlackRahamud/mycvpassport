import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase } from "../../../appSupabaseClient";
import UserMenu from "../../../components/UserMenu/UserMenu";
import WhatsAppComposer, { OutreachHistory } from "../../../components/hr/WhatsAppComposer";
import VerdictCard from "../../../components/hr/VerdictCard";
import ScheduleInterviewModal, { InterviewTimeline } from "../../../components/hr/ScheduleInterviewModal";
import NotificationsBell from "../../../components/hr/NotificationsBell";
import ViewOriginalCv from "../../../components/hr/ViewOriginalCv";
import BulkCvImport from "../../../components/hr/BulkCvImport";
import "../PostJob/postJob.css"; // :root tokens (--pj-*)
import "./jobPipeline.css";

/* ───────── Stage config ─────────
   Pipeline stages B-F. Order matters: it determines tab order, the
   "next stage" advance target, and how DB statuses map onto a tab. */
const STAGES = [
  { key: "shortlist",   label: "Shortlist",   dbValues: ["new", "submitted", "viewed", "shortlisted"],
    actionLabel: "Interviewed", advanceTo: "interviewed",
    statusLine: (date) => `Shortlisted   ${date}`,
    nextLine: "Click Interviewed to request a screening call, or Pass to remove from Shortlist." },
  { key: "ready",       label: "Ready",       dbValues: ["ready"],
    actionLabel: "Interviewed", advanceTo: "interviewed",
    statusLine: (date) => `Ready to interview   ${date}`,
    nextLine: "Schedule the interview and confirm when it has been completed." },
  { key: "interviewed", label: "Interviewed", dbValues: ["interviewed", "interviewing"],
    actionLabel: "Give offer",  advanceTo: "offered",
    statusLine: (date) => `Interviewed   ${date}`,
    nextLine: "If you want to hire, extend an offer via email soon and cc your Account Manager so you don't lose the candidate." },
  { key: "offer",       label: "Offer",       dbValues: ["offered"],
    actionLabel: "Hired",       advanceTo: "hired",
    statusLine: (date) => `Offer extended   ${date}`,
    nextLine: "Let us know if the candidate accepted your offer, so we can congratulate you." },
  { key: "hired",       label: "Hired",       dbValues: ["hired"],
    actionLabel: null,           advanceTo: null,
    statusLine: (date) => `Hired   ${date}`,
    nextLine: "Onboarding tracker is in your Account Manager's hands — you'll get a follow-up note shortly." },
];

const STAGE_BY_DB = STAGES.reduce((m, s) => {
  s.dbValues.forEach((v) => { m[v] = s.key; });
  return m;
}, {});

const NEW_STATUSES = new Set(["new", "submitted", "viewed"]);

/* ───────── Inline icons ───────── */
const ChevLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const MailIc = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>
  </svg>
);
const PhoneIc = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/>
  </svg>
);
const MapPinIc = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const BriefIc = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
);
const CapIc = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6"/><path d="M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
  </svg>
);
const CloseIc = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const WhatsAppIc = () => (
  <svg className="jpp-card__wa-ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.768.967-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.005.05C5.495.05.187 5.357.184 11.867a11.79 11.79 0 0 0 1.587 5.91L0 24l6.4-1.683a11.83 11.83 0 0 0 5.65 1.444h.005c6.51 0 11.818-5.307 11.821-11.818.002-3.156-1.226-6.124-3.46-8.357A11.74 11.74 0 0 0 12.005.05zM12 21.785h-.004a9.83 9.83 0 0 1-5.012-1.374l-.36-.214-3.733.98 1-3.643-.235-.373a9.82 9.82 0 0 1-1.51-5.273C2.146 6.486 6.589 2.043 12.05 2.043a9.79 9.79 0 0 1 6.973 2.892 9.795 9.795 0 0 1 2.886 6.978c-.002 5.464-4.444 9.872-9.91 9.872z"/>
  </svg>
);

/* ───────── Helpers ───────── */
function formatStartDate(s) {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function formatSalary(j) {
  if (!j) return "";
  const lo = j.salary_min, hi = j.salary_max;
  if (!lo && !hi) return "";
  const cur = j.currency || "AED";
  const fmt = (n) => Number(n).toLocaleString();
  if (lo && hi) return `${cur} ${fmt(lo)}–${fmt(hi)}`;
  return `${cur} ${fmt(lo || hi)}`;
}

function jobTypeLabel(t) {
  const map = { full_time: "Full-time", part_time: "Part-time", contract: "Contract", internship: "Internship" };
  return map[t] || (t ? String(t).replace(/_/g, " ") : "");
}

function shortJobRef(id) {
  const s = String(id || "").replace(/-/g, "");
  if (!s) return "";
  return `# ${s.slice(0, 5)}-${s.slice(5, 17).padEnd(12, "0")}`.toUpperCase();
}

function whatsappHref(phone, name, jobTitle, hrCompany) {
  const digits = String(phone || "").replace(/\D/g, "");
  const firstName = String(name || "").split(" ")[0] || "there";
  const msg = encodeURIComponent(
    `Hi ${firstName}, I'm reaching out${hrCompany ? ` from ${hrCompany}` : ""} regarding your application${jobTitle ? ` for ${jobTitle}` : ""}. Are you available for a quick call?`
  );
  return digits ? `https://wa.me/${digits}?text=${msg}` : `https://wa.me/?text=${msg}`;
}

function timeAgo(s) {
  if (!s) return "";
  const t = new Date(s).getTime();
  if (!t) return "";
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function getCv(c) { return c?.cv_snapshot || c?.cv_data || {}; }

function firstName(full) {
  return String(full || "").trim().split(/\s+/)[0] || "candidate";
}

/* Visa-status colour split — mirrors the legacy /hr portal so HRs see
   the same flag they're used to. 'Sponsored' is amber (HR has work to
   do), 'Own visa' is green (candidate is plug-and-play), other values
   read as neutral. Anything not in this list falls through to neutral
   so a free-text visa status still renders. */
function visaTone(visa) {
  const v = String(visa || "").toLowerCase();
  if (v.includes("own"))       return "ok";       // Own visa, Own residency, etc.
  if (v.includes("sponsor"))   return "warn";     // Need sponsorship
  if (v.includes("freelance")) return "ok";
  return "neutral";
}

function deriveSkills(c) {
  const cv = getCv(c);
  const list = cv.skills || cv.skill_list || cv.tools || [];
  if (Array.isArray(list)) {
    return list
      .map((s) => (typeof s === "string" ? s : s?.name || s?.label))
      .filter(Boolean)
      .slice(0, 12);
  }
  return [];
}

export default function JobPipelinePage() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { id: jobId } = useParams();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [job, setJob] = useState(null);
  const [jobError, setJobError] = useState(null);
  const [apps, setApps] = useState(null); // null = loading
  const [appsTick, setAppsTick] = useState(0); // bump to refetch (e.g. after bulk import)
  const [importOpen, setImportOpen] = useState(false);
  const [activeStage, setActiveStage] = useState("shortlist");
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [showHiredModal, setShowHiredModal] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerInitialMessage, setComposerInitialMessage] = useState(null);
  const [outreachTick, setOutreachTick] = useState(0);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [interviewTick, setInterviewTick] = useState(0);

  /* Auth */
  useEffect(() => {
    let live = true;
    supabase.auth.getUser().then(({ data }) => { if (live) setUser(data?.user || null); });
    return () => { live = false; };
  }, []);

  /* Profile (for the UserMenu plan badge) */
  useEffect(() => {
    if (!user?.id) return;
    let live = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("plan, full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (live) setProfile(data || null);
    })();
    return () => { live = false; };
  }, [user?.id]);

  /* Load job */
  useEffect(() => {
    if (!jobId) return;
    let live = true;
    (async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, status, posted_at, created_at, location, market, job_type, salary_min, salary_max, currency, hr_id, company, department, skills, requirements, description, screening_questions")
        .eq("id", jobId)
        .maybeSingle();
      if (!live) return;
      if (error) {
        // Surface the actual PostgREST message so column / RLS issues
        // show up in DevTools instead of silently rendering "Job not
        // found" — the previous swallow hid a column-name typo for a
        // full session.
        // eslint-disable-next-line no-console
        console.warn("[pipeline] job load failed:", error.message, error);
        setJobError(error.message);
        return;
      }
      setJob(data || null);
    })();
    return () => { live = false; };
  }, [jobId]);

  /* Load applications */
  useEffect(() => {
    if (!jobId) return;
    let live = true;
    (async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("id, job_id, candidate_id, candidate_name, candidate_email, candidate_phone, cv_snapshot, cv_file_path, ats_score, match_keywords, missing_keywords, score_source, source, status, recruiter_notes, applied_at, viewed_at, updated_at, is_visible_to_hr")
        .eq("job_id", jobId)
        .neq("status", "rejected")
        .order("ats_score", { ascending: false });
      if (!live) return;
      if (error) { setApps([]); return; }
      setApps(data || []);
    })();
    return () => { live = false; };
  }, [jobId, appsTick]);

  /* Stage counts + active filter */
  const stageBuckets = useMemo(() => {
    const empty = STAGES.reduce((m, s) => ({ ...m, [s.key]: [] }), {});
    if (!apps) return empty;
    return apps.reduce((acc, a) => {
      const key = STAGE_BY_DB[a.status] || "shortlist";
      acc[key] = acc[key] || [];
      acc[key].push(a);
      return acc;
    }, { ...empty });
  }, [apps]);

  /* Auto-select the first card in the active stage when stage changes */
  const visibleCards = useMemo(() => stageBuckets[activeStage] || [], [stageBuckets, activeStage]);
  useEffect(() => {
    if (!visibleCards.length) { setSelectedAppId(null); return; }
    if (!visibleCards.find((c) => c.id === selectedAppId)) {
      setSelectedAppId(visibleCards[0].id);
    }
  }, [activeStage, visibleCards, selectedAppId]);

  const selected = useMemo(
    () => (apps || []).find((a) => a.id === selectedAppId) || null,
    [apps, selectedAppId]
  );

  const stageDef = STAGES.find((s) => s.key === activeStage) || STAGES[0];
  const company = job?.company || "";
  const jobTitle = job?.title || "";

  /* ── Mutations ─────────────────────────────────────────────── */
  const updateStatus = useCallback(async (appId, newStatus, fromStatus) => {
    setAdvancing(true);
    setApps((prev) => (prev || []).map((a) => (a.id === appId ? { ...a, status: newStatus, updated_at: new Date().toISOString() } : a)));
    try {
      await supabase
        .from("applications")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", appId);
      const app = (apps || []).find((a) => a.id === appId);
      if (user?.id && app?.candidate_id) {
        await supabase.from("candidate_events").insert({
          candidate_id: app.candidate_id,
          job_id: app.job_id,
          hr_id: user.id,
          event_type: newStatus,
          metadata: { previous_status: fromStatus, source: "hr_pipeline" },
        });
      }
    } catch (e) {
      // best-effort — leave optimistic UI in place; server will catch up
      // eslint-disable-next-line no-console
      console.warn("[pipeline] status update failed:", e?.message || e);
    } finally {
      setAdvancing(false);
    }
  }, [apps, user?.id]);

  const handleAdvance = useCallback(() => {
    if (!selected || !stageDef.advanceTo) return;
    const fromStatus = selected.status;
    updateStatus(selected.id, stageDef.advanceTo, fromStatus);
    if (stageDef.advanceTo === "hired") setShowHiredModal(true);
  }, [selected, stageDef, updateStatus]);

  const handlePass = useCallback(() => {
    if (!selected) return;
    updateStatus(selected.id, "rejected", selected.status);
  }, [selected, updateStatus]);

  const handleAddNote = useCallback(async () => {
    const trimmed = noteDraft.trim();
    if (!trimmed || !selected) return;
    setNoteSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("append_recruiter_note", {
        p_app_id: selected.id,
        p_text: trimmed,
      });
      if (error) throw error;
      setApps((prev) => (prev || []).map((a) => (a.id === selected.id ? { ...a, recruiter_notes: data } : a)));
      setNoteDraft("");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[pipeline] note save failed:", e?.message || e);
    } finally {
      setNoteSubmitting(false);
    }
  }, [noteDraft, selected]);

  /* ── Renderers ─────────────────────────────────────────────── */
  return (
    <div className="jpp-root">
      <Helmet><title>{job?.title ? `${job.title} · CVPassport` : "Pipeline · CVPassport"}</title></Helmet>
      <header className="jpp-topbar">
        <div><a href="/" className="jpp-wordmark">CV<span>Passport</span></a></div>
        <div className="jpp-topbar__center" />
        <div className="jpp-topbar__right">
          <button type="button" className="jpp-cta" onClick={() => navigate("/hr/post")}>
            <BriefIc size={14} />
            Request Talent
          </button>
          <NotificationsBell userId={user?.id} buttonClassName="jpp-icon-btn" />
          <UserMenu
            email={user?.email || ""}
            name={profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || ""}
            plan={profile?.plan}
            roleLabel="Admin"
            switchTo={{ label: "Switch to Candidate", path: "/dashboard" }}
            settingsPath="/account"
            theme="light"
          />
        </div>
      </header>

      <main className="jpp-page">
        <motion.div
          className="jpp-header"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
        >
          <div>
            <button type="button" className="jpp-back" onClick={() => navigate("/hr/jobs")}>
              <span className="jpp-back__chev"><ChevLeft /></span>
              {job?.title || (jobError ? "Job not found" : "Loading…")}
            </button>
            <p className="jpp-header__sub jpp-header__sub--meta">
              {job ? (
                <>
                  <strong>{jobTypeLabel(job.job_type) || "Role"}</strong>
                  {formatSalary(job) && <><span className="jpp-dot">·</span><strong>{formatSalary(job)}</strong></>}
                  {job.location && <><span className="jpp-dot">·</span>{job.location}</>}
                  {job.posted_at && <><span className="jpp-dot">·</span>Posted {timeAgo(job.posted_at)}</>}
                  {job.id && <><span className="jpp-dot">·</span>{shortJobRef(job.id)}</>}
                </>
              ) : "—"}
            </p>
          </div>

          <div className="jpp-am" aria-label="Account manager">
            <div className="jpp-am__avatar">CV</div>
            <div>
              <div className="jpp-am__label">Your Account Manager</div>
              <div className="jpp-am__name">CVPassport Talent Team</div>
              <a className="jpp-am__contact" href="mailto:hello@mycvpassport.com"><MailIc /> hello@mycvpassport.com</a>
            </div>
          </div>
        </motion.div>

        <nav className="jpp-tabs" role="tablist" aria-label="Pipeline stages">
          {STAGES.map((s) => {
            const count = (stageBuckets[s.key] || []).length;
            const active = activeStage === s.key;
            return (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={active}
                className={`jpp-tab${active ? " jpp-tab--active" : ""}`}
                onClick={() => setActiveStage(s.key)}
              >
                {s.label}
                <span className="jpp-tab__count">{count}</span>
              </button>
            );
          })}
        </nav>

        <div className="jpp-grid">
          {/* Left column: candidate cards */}
          <section aria-label={`${stageDef.label} candidates`}>
            <div className="jpp-col-head">
              <span className="jpp-col-head__title">{stageDef.label}</span>
              {activeStage === "shortlist" && (
                <button
                  type="button"
                  className="jpp-col-head__import"
                  onClick={() => setImportOpen(true)}
                  title="Bulk-upload existing CVs into this pipeline"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  Import CVs
                </button>
              )}
              {/* "Need Review" button removed pre-pitch — it was a no-op: its
                  onClick re-selected visibleCards[0], the top card the
                  auto-select effect already highlights on every stage change,
                  while the label implied a triage/filter action that isn't
                  built. Restore once a real triage filter exists.
              <button type="button" className="jpp-col-head__action" onClick={() => setSelectedAppId(visibleCards[0]?.id || null)}>
                Need Review
              </button>
              */}
            </div>

            {apps === null && <p className="jpp-empty-cards">Loading candidates…</p>}
            {apps !== null && visibleCards.length === 0 && (
              <p className="jpp-empty-cards">
                {activeStage === "shortlist"
                  ? "No applicants in your shortlist yet — share the job link to start collecting CVs."
                  : `No candidates at the ${stageDef.label} stage yet.`}
              </p>
            )}

            <div className="jpp-cards">
              <AnimatePresence initial={false}>
                {visibleCards.map((c, i) => {
                  const isActive = selectedAppId === c.id;
                  const isImported = c.source === "imported";
                  const isNew = NEW_STATUSES.has(c.status);
                  const showBadge = isNew || isImported;
                  const dateStamp = formatStartDate(c.updated_at || c.viewed_at || c.applied_at);
                  return (
                    <motion.div
                      key={c.id}
                      layout
                      initial={reduce ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, x: -8 }}
                      transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1], delay: Math.min(i * 0.025, 0.15) }}
                    >
                      <button
                        type="button"
                        className={`jpp-card${isActive ? " jpp-card--active" : ""}`}
                        onClick={() => setSelectedAppId(c.id)}
                      >
                        <div className="jpp-card__top">
                          <span
                            className={`jpp-card__badge${isImported ? " jpp-card__badge--imported" : ""}`}
                            aria-hidden={!showBadge}
                            style={{ visibility: showBadge ? "visible" : "hidden" }}
                          >
                            {isImported ? "Imported" : "New Applicant"}
                          </span>
                          <span className="jpp-card__top-right">
                            <input
                              type="checkbox"
                              className="jpp-card__check"
                              checked={isActive}
                              onChange={(e) => { e.stopPropagation(); setSelectedAppId(c.id); }}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Select ${c.candidate_name || "candidate"}`}
                            />
                          </span>
                        </div>
                        <div className="jpp-card__name">{c.candidate_name || "Unnamed candidate"}</div>
                        <div className="jpp-card__line">
                          <span className="jpp-card__line-label">Status</span>
                          <span className="jpp-card__line-value">· {stageDef.statusLine(dateStamp).replace(/\s+/, "  ")}</span>
                          <span className="jpp-card__line-meta" />
                        </div>
                        <div className="jpp-card__line">
                          <span className="jpp-card__line-label">Next</span>
                          <span className="jpp-card__line-value jpp-card__line-value--soft">{stageDef.nextLine}</span>
                          <span className="jpp-card__line-meta" />
                        </div>

                        <a
                          className="jpp-card__wa"
                          href={whatsappHref(c.candidate_phone, c.candidate_name, jobTitle, company)}
                          target="_blank"
                          rel="noreferrer noopener"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <WhatsAppIc /> WhatsApp
                        </a>
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </section>

          {/* Right column: candidate detail */}
          <CandidateDetail
            key={selected?.id || "empty"}
            candidate={selected}
            job={job}
            stageDef={stageDef}
            jobTitle={jobTitle}
            company={company}
            screeningQuestions={job?.screening_questions || []}
            advancing={advancing}
            onAdvance={handleAdvance}
            onPass={handlePass}
            onStatusChange={(s) => selected && updateStatus(selected.id, s, selected.status)}
            onMessage={() => { setComposerInitialMessage(null); setComposerOpen(true); }}
            onReachOut={(template) => { setComposerInitialMessage(template); setComposerOpen(true); }}
            onSchedule={() => setScheduleOpen(true)}
            hrId={user?.id}
            outreachTick={outreachTick}
            interviewTick={interviewTick}
            noteDraft={noteDraft}
            onNoteDraftChange={setNoteDraft}
            onAddNote={handleAddNote}
            noteSubmitting={noteSubmitting}
            reduce={reduce}
          />
        </div>
      </main>

      <WhatsAppComposer
        open={composerOpen && !!selected}
        onClose={() => setComposerOpen(false)}
        initialMessage={composerInitialMessage}
        candidate={selected ? {
          id: selected.candidate_id,
          name: selected.candidate_name,
          phone: selected.candidate_phone,
          cvSnapshot: getCv(selected),
        } : null}
        job={job ? { id: job.id, title: job.title, company: job.company } : null}
        hrId={user?.id}
        onLogged={() => setOutreachTick((t) => t + 1)}
      />

      <ScheduleInterviewModal
        open={scheduleOpen && !!selected}
        onClose={() => setScheduleOpen(false)}
        application={selected}
        job={job ? { id: job.id, title: job.title } : null}
        hrId={user?.id}
        onScheduled={() => setInterviewTick((t) => t + 1)}
      />

      <BulkCvImport
        open={importOpen && !!job && !!user?.id}
        jobId={jobId}
        job={job}
        hrId={user?.id}
        onClose={() => setImportOpen(false)}
        onImported={() => setAppsTick((t) => t + 1)}
      />

      <AnimatePresence>
        {showHiredModal && (
          <motion.div
            className="jpp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="jpp-modal-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            onClick={() => setShowHiredModal(false)}
          >
            <motion.div
              className="jpp-modal__panel"
              onClick={(e) => e.stopPropagation()}
              initial={reduce ? false : { opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
            >
              <button type="button" className="jpp-modal__close" onClick={() => setShowHiredModal(false)} aria-label="Close">
                <CloseIc />
              </button>
              <h3 id="jpp-modal-title" className="jpp-modal__title">Congratulations!</h3>
              <div className="jpp-modal__divider" />
              <p className="jpp-modal__body">
                Remember to cc your Account Manager in the final offer letter to the candidate so we can support onboarding and keep the loop closed.
              </p>
              <div className="jpp-modal__actions">
                <button type="button" className="jpp-action" onClick={() => { setShowHiredModal(false); setActiveStage("hired"); }}>
                  View Hired list
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────── Candidate Detail panel ───────── */
/* All status values the dropdown surfaces. Mirrors the CHECK
   constraint set by migration 013 — adding a value here without the
   matching DB widening will get rejected at update time. */
const STATUS_OVERRIDE_OPTIONS = [
  { value: "new",          label: "New" },
  { value: "shortlisted",  label: "Shortlisted" },
  { value: "ready",        label: "Ready to interview" },
  { value: "interviewed",  label: "Interviewed" },
  { value: "offered",      label: "Offer extended" },
  { value: "hired",        label: "Hired" },
  { value: "rejected",     label: "Rejected" },
];

function CandidateDetail({
  candidate, job, stageDef, jobTitle, company, screeningQuestions,
  advancing, onAdvance, onPass, onStatusChange,
  onMessage, onReachOut, onSchedule, hrId, outreachTick, interviewTick,
  noteDraft, onNoteDraftChange, onAddNote, noteSubmitting,
  reduce,
}) {
  // "View full fit analysis" reveals the old keyword score + chips; the
  // Verdict card is the headline by default.
  const [showAnalysis, setShowAnalysis] = useState(false);
  if (!candidate) {
    return (
      <motion.aside
        className="jpp-detail jpp-detail--empty"
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1], delay: 0.05 }}
      >
        <h3>No candidate selected</h3>
        <p>Pick a candidate from the list to review their CV, screening answers, and recruiter notes.</p>
      </motion.aside>
    );
  }

  const cv = getCv(candidate);
  const initials = (candidate.candidate_name || "?")
    .split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";
  const skills = deriveSkills(candidate);
  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education  = Array.isArray(cv.education)  ? cv.education  : [];
  const personal   = cv.personal || cv.basics || {};
  const desiredJob = cv.desired_job || cv.target_role || cv.desired_position || personal.headline || "";
  const sector     = cv.sector || cv.industry || personal.industry || "";
  const compensation = cv.compensation || cv.expected_salary || personal.expected_salary || "";
  const positionPreference = cv.position_preference || personal.work_mode || "";
  // Guard the "Looking for Position" grid the same way Skills / Experience /
  // Education are guarded — hide the whole block when the candidate carries no
  // preference data (e.g. upload-only applicants with no parsed cv_snapshot)
  // rather than rendering a wall of six "—" cells.
  const hasLookingForData = Boolean(
    personal.location || positionPreference || personal.job_type ||
    cv.job_type || compensation || sector || desiredJob
  );
  const screeningAnswers = Array.isArray(candidate.cv_snapshot?.screening_answers)
    ? candidate.cv_snapshot.screening_answers
    : (Array.isArray(candidate.screening_answers) ? candidate.screening_answers : []);
  const recruiterNotes = Array.isArray(candidate.recruiter_notes) ? candidate.recruiter_notes : [];
  const matchedKw = Array.isArray(candidate.match_keywords)   ? candidate.match_keywords   : [];
  const missingKw = Array.isArray(candidate.missing_keywords) ? candidate.missing_keywords : [];

  return (
    <motion.aside
      className="jpp-detail"
      key={candidate.id}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
    >
      <VerdictCard
        cacheKey={`${candidate.candidate_id || candidate.id}:${job?.id || ""}`}
        cvSnapshot={cv}
        job={job}
        header={{
          name: candidate.candidate_name || "Unnamed candidate",
          role: desiredJob || jobTitle || "Candidate",
          location: personal.location || "",
          visa: candidate.visa_status || "",
          availability: cv.notice_period || cv.availability || personal.notice_period || "",
        }}
        onReachOut={onReachOut}
        onViewAnalysis={(matchedKw.length + missingKw.length) > 0 ? () => setShowAnalysis(true) : undefined}
      />

      <header className="jpp-detail__head">
        <div className="jpp-detail__avatar">{initials}</div>
        <div className="jpp-detail__identity">
          <h2 className="jpp-detail__name">{candidate.candidate_name || "Unnamed candidate"}</h2>
          <p className="jpp-detail__role">{desiredJob || jobTitle || "Candidate"}</p>
          <span className="jpp-detail__chips">
            {candidate.source === "imported" && (
              <span className="jpp-visa-chip jpp-visa-chip--neutral" title="Added via bulk CV import — no candidate account, so the journey timeline is limited.">
                Imported CV
              </span>
            )}
            {candidate.visa_status && (
              <span className={`jpp-visa-chip jpp-visa-chip--${visaTone(candidate.visa_status)}`}>
                {candidate.visa_status}
              </span>
            )}
          </span>
          <div className="jpp-detail__contact">
            {personal.location && <span><MapPinIc /> {personal.location}</span>}
            {candidate.candidate_email && (
              <a href={`mailto:${candidate.candidate_email}?subject=${encodeURIComponent(`Re: ${jobTitle || "your application"}`)}`}>
                <MailIc /> {candidate.candidate_email}
              </a>
            )}
            {candidate.candidate_phone && (
              <a href={whatsappHref(candidate.candidate_phone, candidate.candidate_name, jobTitle, company)} target="_blank" rel="noreferrer noopener">
                <PhoneIc /> {candidate.candidate_phone}
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="jpp-detail__actions">
        <button
          type="button"
          className="jpp-action jpp-action--message"
          onClick={onMessage}
        >
          <WhatsAppIc /> Message {firstName(candidate.candidate_name)}
        </button>
        {candidate.candidate_email && (
          <a
            className="jpp-action jpp-action--ghost"
            href={`mailto:${candidate.candidate_email}?subject=${encodeURIComponent(`Re: ${jobTitle || "your application"}`)}`}
          >
            <MailIc /> Email {firstName(candidate.candidate_name)}
          </a>
        )}
        <ViewOriginalCv path={candidate.cv_file_path} />
        {["shortlist", "ready", "interviewed", "offer", "hired"].includes(stageDef?.key) && (
          <button type="button" className="jpp-action jpp-action--ghost" onClick={onSchedule}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            Schedule interview
          </button>
        )}
        <span className="jpp-action__spacer" />
        {stageDef.actionLabel ? (
          <button type="button" className="jpp-action jpp-action--primary" disabled={advancing} onClick={onAdvance}>
            {stageDef.actionLabel}
          </button>
        ) : (
          <button type="button" className="jpp-action jpp-action--primary" disabled aria-disabled="true">Hired</button>
        )}
        <button type="button" className="jpp-action jpp-action--pass" disabled={advancing} onClick={onPass}>
          Pass
        </button>
      </div>

      <InterviewTimeline hrId={hrId} candidateId={candidate.candidate_id} refreshKey={interviewTick} />

      <OutreachHistory hrId={hrId} candidateId={candidate.candidate_id} refreshKey={outreachTick} />

      {showAnalysis && (matchedKw.length + missingKw.length) > 0 && (
        <section className="jpp-section">
          <h3 className="jpp-section__title">Keyword details</h3>
          <div className="jpp-match">
            {matchedKw.length > 0 && (
              <div className="jpp-match__col">
                <span className="jpp-match__label">Matched</span>
                <div className="jpp-match__chips">
                  {matchedKw.slice(0, 8).map((k, i) => (
                    <span key={`m-${i}`} className="jpp-match__chip jpp-match__chip--hit">{k}</span>
                  ))}
                </div>
              </div>
            )}
            {missingKw.length > 0 && (
              <div className="jpp-match__col">
                <span className="jpp-match__label">Missing</span>
                <div className="jpp-match__chips">
                  {missingKw.slice(0, 8).map((k, i) => (
                    <span key={`x-${i}`} className="jpp-match__chip jpp-match__chip--miss">{k}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {skills.length > 0 && (
        <section className="jpp-section">
          <h3 className="jpp-section__title">Skills, Tools, and Technology</h3>
          <div className="jpp-tags">
            {skills.map((s) => <span key={s} className="jpp-tag">{s}</span>)}
          </div>
        </section>
      )}

      {hasLookingForData && (
      <section className="jpp-section">
        <h3 className="jpp-section__title">Looking for Position</h3>
        <div className="jpp-grid3">
          <div className="jpp-grid3__cell">
            <span className="jpp-grid3__label">Location</span>
            <span className="jpp-grid3__value"><MapPinIc /> {personal.location || "—"}</span>
          </div>
          <div className="jpp-grid3__cell">
            <span className="jpp-grid3__label">Position</span>
            <span className="jpp-grid3__value">{positionPreference || "—"}</span>
          </div>
          <div className="jpp-grid3__cell">
            <span className="jpp-grid3__label">Job Type</span>
            <span className="jpp-grid3__value">{personal.job_type || cv.job_type || "—"}</span>
          </div>
          <div className="jpp-grid3__cell">
            <span className="jpp-grid3__label">Compensation Expectation</span>
            <span className="jpp-grid3__value">{compensation || "—"}</span>
          </div>
          <div className="jpp-grid3__cell">
            <span className="jpp-grid3__label">Sector</span>
            <span className="jpp-grid3__value">{sector || "—"}</span>
          </div>
          <div className="jpp-grid3__cell">
            <span className="jpp-grid3__label">Desired Job</span>
            <span className="jpp-grid3__value">{desiredJob || jobTitle || "—"}</span>
          </div>
        </div>
      </section>
      )}

      {experience.length > 0 && (
        <section className="jpp-section">
          <h3 className="jpp-section__title">Experience</h3>
          <div className="jpp-timeline">
            {experience.slice(0, 6).map((e, i) => (
              <div key={i} className="jpp-timeline__row">
                <div className="jpp-timeline__icon"><BriefIc size={16} /></div>
                <div>
                  <p className="jpp-timeline__title">{e.title || e.role || "Role"}</p>
                  <p className="jpp-timeline__sub">{e.company || e.employer || ""}</p>
                  {(e.start_date || e.end_date) && (
                    <p className="jpp-timeline__date">
                      {e.start_date || ""}{e.end_date ? ` – ${e.end_date}` : (e.start_date ? " – Present" : "")}
                    </p>
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
                    <p className="jpp-timeline__date">
                      {e.start_date || ""}{e.end_date ? ` – ${e.end_date}` : ""}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {Array.isArray(screeningQuestions) && screeningQuestions.length > 0 && (
        <section className="jpp-section">
          <h3 className="jpp-section__title">Screening Questions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {screeningQuestions.slice(0, 8).map((q, i) => {
              const ans = screeningAnswers[i];
              const ansText = typeof ans === "object" ? (ans?.answer || "") : ans || "";
              return (
                <div key={i} className="jpp-screen">
                  <p className="jpp-screen__q">{q?.label || q?.question || `Question ${i + 1}`}</p>
                  <p className="jpp-screen__a"><strong>Answer:</strong> {ansText || "—"}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="jpp-section">
        <h3 className="jpp-section__title">Recruiter Note</h3>
        <div className="jpp-note">
          <div className="jpp-note__row">
            <input
              type="text"
              className="jpp-note__input"
              placeholder="Add a private note about this candidate…"
              value={noteDraft}
              onChange={(e) => onNoteDraftChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && noteDraft.trim()) onAddNote(); }}
              maxLength={400}
            />
            <button
              type="button"
              className="jpp-note__add"
              onClick={onAddNote}
              disabled={noteSubmitting || !noteDraft.trim()}
            >
              {noteSubmitting ? "Saving…" : "Add"}
            </button>
          </div>
          {recruiterNotes.length > 0 && (
            <ul className="jpp-note__list">
              {recruiterNotes.slice(-6).reverse().map((n, i) => (
                <li key={i} className="jpp-note__item">
                  <span>{typeof n === "string" ? n : (n?.text || n?.note || "")}</span>
                  <span className="jpp-note__item-time">{typeof n === "object" && n?.at ? timeAgo(n.at) : ""}</span>
                  <span />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="jpp-section jpp-section--status">
        <div className="jpp-status-override">
          <label className="jpp-status-override__label" htmlFor={`jpp-status-${candidate.id}`}>
            Status override
            <span className="jpp-status-override__hint">
              Use the tab CTAs for normal flow — this drops the candidate straight into any stage.
            </span>
          </label>
          <select
            id={`jpp-status-${candidate.id}`}
            className="jpp-status-override__select"
            value={candidate.status || "new"}
            disabled={advancing || !onStatusChange}
            onChange={(e) => onStatusChange && onStatusChange(e.target.value)}
          >
            {/* Surface the current status even if it's outside the override
                set (e.g. legacy 'submitted' / 'viewed' / 'interviewing' rows
                from before migration 013) so the select shows truth. */}
            {!STATUS_OVERRIDE_OPTIONS.some((o) => o.value === (candidate.status || "new")) && (
              <option value={candidate.status} disabled>{candidate.status}</option>
            )}
            {STATUS_OVERRIDE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </section>
    </motion.aside>
  );
}
