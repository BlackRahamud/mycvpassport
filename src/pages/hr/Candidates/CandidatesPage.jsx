import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase } from "../../../appSupabaseClient";
import WhatsAppComposer, { OutreachHistory } from "../../../components/hr/WhatsAppComposer";
import VerdictCard from "../../../components/hr/VerdictCard";
import BulkActions from "../../../components/hr/BulkActions";
import CvDrawer from "../../../components/hr/CvDrawer";
import ShareForReviewModal from "../../../components/hr/ShareForReviewModal";
import ShareReviews from "../../../components/hr/ShareReviews";
import { scoreBand, BAND_COLORS } from "../../../lib/ats/scoreBand";
import Select from "../../../components/ui/Select";
import "../PostJob/postJob.css";   // --pj-* tokens
import "../Jobs/jobPipeline.css";  // .jpp-root tokens + jpp-detail / jpp-card / jpp-section
import "../Jobs/jobsList.css";     // .hjl-toggle / .hjl-empty
import "./candidates.css";

/* ───────── Helpers (mirrors JobPipelinePage so the data shape + look
   stay identical across the pipeline detail panel and this CRM view) ── */
function getCv(c) { return c?.cv_snapshot || c?.cv_data || {}; }
function ts(s) { const t = new Date(s).getTime(); return Number.isNaN(t) ? 0 : t; }
function firstName(full) { return String(full || "").trim().split(/\s+/)[0] || "candidate"; }

function deriveSkills(c) {
  const cv = getCv(c);
  const list = cv.skills || cv.skill_list || cv.tools || [];
  if (Array.isArray(list)) {
    return list.map((s) => (typeof s === "string" ? s : s?.name || s?.label)).filter(Boolean).slice(0, 14);
  }
  return [];
}

function visaTone(visa) {
  const v = String(visa || "").toLowerCase();
  if (v.includes("own")) return "ok";
  if (v.includes("sponsor")) return "warn";
  if (v.includes("freelance")) return "ok";
  return "neutral";
}

function whatsappHref(phone, name) {
  const digits = String(phone || "").replace(/\D/g, "");
  const first = String(name || "").split(" ")[0] || "there";
  const msg = encodeURIComponent(`Hi ${first}, I'm reaching out regarding your application. Are you available for a quick call?`);
  return digits ? `https://wa.me/${digits}?text=${msg}` : `https://wa.me/?text=${msg}`;
}

const STATUS_LABEL = {
  submitted: "Applied", viewed: "Viewed", shortlisted: "Shortlisted", new: "Applied",
  ready: "Ready", interviewing: "Interviewing", interviewed: "Interviewed",
  offered: "Offer", hired: "Hired", rejected: "Passed",
};
function statusLabel(s) { return STATUS_LABEL[s] || (s ? String(s) : "—"); }

/* Status buckets for the filter (a candidate matches if ANY of their
   applications falls in the selected bucket). */
const STATUS_BUCKETS = {
  all: null,
  shortlisted: new Set(["submitted", "viewed", "shortlisted", "new", "ready"]),
  interviewing: new Set(["interviewing", "interviewed"]),
  offered: new Set(["offered"]),
  hired: new Set(["hired"]),
};
const STATUS_OPTIONS = [
  { key: "all", label: "Any status" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "interviewing", label: "Interviewing" },
  { key: "offered", label: "Offer" },
  { key: "hired", label: "Hired" },
];
const MARKET_OPTIONS = [
  { key: "all", label: "All" },
  { key: "gulf", label: "Gulf" },
  { key: "india", label: "India" },
];

/* Availability is derived from the candidate's stated notice period (free
   text on the CV). We only assert a bucket when the text is unambiguous, so
   filtering to "Immediate" shows the people we can actually confirm are
   immediate — never a guess dressed up as data. The bucket drives the filter;
   `line` is the natural phrase shown on the card. */
function deriveAvailability(cv) {
  const personal = cv.personal || cv.basics || {};
  const raw = String(cv.notice_period || cv.availability || personal.notice_period || personal.availability || "").toLowerCase();
  if (!raw) return { bucket: "unknown", line: "" };
  if (/(immediate|available now|ready to join|right away|no notice|0\s*day|join now)/.test(raw)) return { bucket: "immediate", line: "immediately available" };
  if (/(1\s*week|one week|7\s*day)/.test(raw)) return { bucket: "soon", line: "1 week notice" };
  if (/(2\s*week|two week|fortnight|10\s*day|15\s*day)/.test(raw)) return { bucket: "soon", line: "2 weeks notice" };
  if (/(1\s*month|one month|30\s*day|4\s*week)/.test(raw)) return { bucket: "soon", line: "1 month notice" };
  if (/(2\s*month|two month|60\s*day)/.test(raw)) return { bucket: "notice", line: "2 months notice" };
  if (/(3\s*month|three month|90\s*day)/.test(raw)) return { bucket: "notice", line: "3 months notice" };
  if (/(6\s*month|six month)/.test(raw)) return { bucket: "notice", line: "6 months notice" };
  return { bucket: "unknown", line: "" };
}
const AVAIL_OPTIONS = [
  { key: "all", label: "Any availability" },
  { key: "immediate", label: "Immediate" },
  { key: "soon", label: "Within 1 month" },
  { key: "notice", label: "Longer notice" },
];

const EASE = [0.4, 0, 0.2, 1];
const SELECT_CAP = 50; // hard cap on bulk selection

/* Match pill — reuses scoreBand so a 78 reads the same band/colour as it
   does in the pipeline ring. 'none' (never scored) renders an honest grey
   chip rather than a silent gap. */
function MatchPill({ score, source }) {
  const band = scoreBand(score, source);
  if (band === "none") return <span className="cand-match cand-match--none">Not scored</span>;
  const color = BAND_COLORS[band];
  return (
    <span className="cand-match" style={{ color, borderColor: `${color}59`, background: `${color}16` }}>
      {Math.round(Number(score) || 0)}/100
    </span>
  );
}

/* ───────── Inline icons (feather-style, matching the portal) ───────── */
const SearchIc = () => (<svg className="cand-search__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>);
const MapPinIc = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>);
const MailIc = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 5L2 7" /></svg>);
const PhoneIc = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>);
const WhatsAppIc = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>);
const BriefIc = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>);
const CapIc = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 10 12 5 2 10l10 5 10-5z" /><path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5" /></svg>);
const ChevLeftIc = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>);
const ChevRightIc = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>);
const FileIc = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>);
const ShareIc = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>);
const ClockIc = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" /></svg>);
const UsersIc = () => (<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>);

/* ───────── Candidate detail (reuses jpp-detail classes) ───────── */
function CandidateDetail({ candidate, onBack, onMessage, onReachOut, hrId, outreachTick, reduce }) {
  const navigate = useNavigate();
  // "View full fit analysis" reveals the old keyword score + chips; reset
  // when switching candidates (this component isn't remounted per pick).
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [cvOpen, setCvOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  useEffect(() => { setShowAnalysis(false); setCvOpen(false); setShareOpen(false); }, [candidate?.key]);
  if (!candidate) {
    return (
      <aside className="jpp-detail jpp-detail--empty cand-detail-placeholder">
        <span className="cand-empty__icon" aria-hidden><UsersIc /></span>
        <h3>No candidate selected</h3>
        <p>Pick someone from the list to see their profile and every job they've applied to.</p>
      </aside>
    );
  }
  const a = candidate.record;
  const cv = getCv(a);
  const matchedKw = Array.isArray(a.match_keywords) ? a.match_keywords : [];
  const missingKw = Array.isArray(a.missing_keywords) ? a.missing_keywords : [];
  const initials = (candidate.name || "?").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";
  const personal = cv.personal || cv.basics || {};
  const desiredJob = cv.desired_job || cv.target_role || cv.desired_position || personal.headline || "";
  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];
  const skills = candidate.skills;

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

      <VerdictCard
        cacheKey={`${a.candidate_id || candidate.key}:${candidate.apps[0]?.job_id || ""}`}
        cvSnapshot={cv}
        jobId={candidate.apps[0]?.job_id}
        header={{
          name: candidate.name,
          role: desiredJob || candidate.apps[0]?.jobTitle || "Candidate",
          location: personal.location || "",
          visa: candidate.visa || "",
          availability: cv.notice_period || cv.availability || personal.notice_period || "",
        }}
        onReachOut={onReachOut}
        onViewAnalysis={(matchedKw.length + missingKw.length) > 0 ? () => setShowAnalysis(true) : undefined}
      />

      <header className="jpp-detail__head">
        <div className="jpp-detail__avatar">{initials}</div>
        <div className="jpp-detail__identity">
          <h2 className="jpp-detail__name">{candidate.name}</h2>
          <p className="jpp-detail__role">{desiredJob || "Candidate"}</p>
          {candidate.visa && (
            <span className={`jpp-visa-chip jpp-visa-chip--${visaTone(candidate.visa)}`}>{candidate.visa}</span>
          )}
          <div className="jpp-detail__contact">
            {personal.location && <span><MapPinIc /> {personal.location}</span>}
            {candidate.email && (
              <a href={`mailto:${candidate.email}`}><MailIc /> {candidate.email}</a>
            )}
            {candidate.phone && (
              <a href={whatsappHref(candidate.phone, candidate.name)} target="_blank" rel="noreferrer noopener"><PhoneIc /> {candidate.phone}</a>
            )}
          </div>
        </div>
      </header>

      <div className="jpp-detail__actions">
        <button type="button" className="jpp-action jpp-action--message" onClick={onMessage}>
          <WhatsAppIc /> Message {firstName(candidate.name)}
        </button>
        {candidate.email && (
          <a className="jpp-action jpp-action--ghost" href={`mailto:${candidate.email}`}>
            <MailIc /> Email {firstName(candidate.name)}
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

      <OutreachHistory hrId={hrId} candidateId={candidate.record?.candidate_id} refreshKey={outreachTick} />

      <ShareReviews applicationId={a.id} />

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

      {/* Applied to — the cross-job view that makes this a CRM, not a list */}
      <section className="jpp-section">
        <h3 className="jpp-section__title">Applied to <span className="jpp-section__source">{candidate.apps.length} {candidate.apps.length === 1 ? "job" : "jobs"}</span></h3>
        <div className="cand-applied">
          {candidate.apps.map((ap, i) => (
            <button
              type="button"
              className="cand-applied__row"
              key={`${ap.job_id}-${i}`}
              onClick={() => navigate(`/hr/jobs/${ap.job_id}?app=${ap.app_id}`)}
            >
              <span className="cand-applied__title">{ap.jobTitle}</span>
              <span className="cand-applied__meta">
                <MatchPill score={ap.ats_score} source={ap.score_source} />
                <span className={`cand-market cand-market--${ap.market === "india" ? "india" : "gulf"}`}>{ap.market === "india" ? "India" : "Gulf"}</span>
                <span className="cand-statuschip">{statusLabel(ap.status)}</span>
                <span className="cand-applied__chev" aria-hidden><ChevRightIc /></span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {skills.length > 0 && (
        <section className="jpp-section">
          <h3 className="jpp-section__title">Skills, Tools, and Technology</h3>
          <div className="jpp-tags">{skills.map((s) => <span key={s} className="jpp-tag">{s}</span>)}</div>
        </section>
      )}

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
                    <p className="jpp-timeline__date">{e.start_date || ""}{e.end_date ? ` – ${e.end_date}` : (e.start_date ? " – Present" : "")}</p>
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
                    <p className="jpp-timeline__date">{e.start_date || ""}{e.end_date ? ` – ${e.end_date}` : ""}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <CvDrawer open={cvOpen} path={a.cv_file_path} fileName={`${candidate.name} CV`} onClose={() => setCvOpen(false)} />
      <ShareForReviewModal open={shareOpen} onClose={() => setShareOpen(false)} applicationId={a.id} candidateName={candidate.name} hrId={hrId} />
    </motion.aside>
  );
}

export default function CandidatesPage() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [rows, setRows] = useState(null); // null = loading
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [market, setMarket] = useState("all");
  const [status, setStatus] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [selectedKey, setSelectedKey] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerInitialMessage, setComposerInitialMessage] = useState(null);
  const [outreachTick, setOutreachTick] = useState(0);

  // Bulk selection (distinct from `selectedKey`, which is the detail-panel
  // pick). Set of candidate keys; hard-capped at SELECT_CAP.
  const [checkedKeys, setCheckedKeys] = useState(() => new Set());
  const [checkNotice, setCheckNotice] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState(null);

  useEffect(() => {
    let live = true;
    supabase.auth.getUser().then(({ data }) => { if (live) setUser(data?.user || null); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const uid = user?.id;
    if (!uid) return undefined;
    let live = true;
    (async () => {
      try {
        const [appsRes, jobsRes] = await Promise.all([
          supabase
            .from("applications")
            .select("id, job_id, candidate_id, candidate_name, candidate_email, candidate_phone, cv_snapshot, cv_file_path, ats_score, score_source, status, visa_status, match_keywords, missing_keywords, applied_at")
            .eq("hr_id", uid)
            .limit(5000),
          supabase
            .from("jobs")
            .select("id, title, market")
            .eq("hr_id", uid)
            .eq("source", "hr_portal")
            .limit(500),
        ]);
        if (!live) return;
        if (appsRes.error) throw appsRes.error;
        const jobMap = new Map((jobsRes.data || []).map((j) => [j.id, j]));

        // Dedupe to unique people by candidate_id, falling back to email.
        const byKey = new Map();
        (appsRes.data || []).forEach((a) => {
          const key = a.candidate_id
            || (a.candidate_email ? `email:${String(a.candidate_email).toLowerCase()}` : `app:${a.id}`);
          const job = jobMap.get(a.job_id);
          const appEntry = {
            job_id: a.job_id,
            app_id: a.id,
            jobTitle: job?.title || "Untitled role",
            market: job?.market || "gulf",
            status: a.status,
            applied_at: a.applied_at,
            ats_score: a.ats_score || 0,
            score_source: a.score_source,
          };
          let c = byKey.get(key);
          if (!c) {
            c = { key, latest: a, latestAt: ts(a.applied_at), apps: [] };
            byKey.set(key, c);
          } else if (ts(a.applied_at) >= c.latestAt) {
            c.latest = a; c.latestAt = ts(a.applied_at);
          }
          c.apps.push(appEntry);
        });

        const candidates = [...byKey.values()].map((c) => {
          const a = c.latest;
          const markets = new Set(c.apps.map((x) => x.market));
          const cvA = getCv(a);
          const avail = deriveAvailability(cvA);
          return {
            key: c.key,
            record: a,
            name: a.candidate_name || "Unnamed candidate",
            email: a.candidate_email || "",
            phone: a.candidate_phone || "",
            visa: a.visa_status || "",
            score: a.ats_score || 0,
            score_source: a.score_source,
            availability: avail.bucket,
            availabilityLine: avail.line,
            market: jobMap.get(a.job_id)?.market || "gulf",
            markets,
            skills: deriveSkills(a),
            apps: c.apps.sort((x, y) => ts(y.applied_at) - ts(x.applied_at)),
            statuses: new Set(c.apps.map((x) => x.status)),
            latestAt: c.latestAt,
          };
        }).sort((x, y) => y.latestAt - x.latestAt);

        setRows(candidates);
      } catch (e) {
        if (!live) return;
        setRows([]);
        setError(e.message || "Couldn't load candidates");
      }
    })();
    return () => { live = false; };
  }, [user?.id]);

  const filtered = useMemo(() => {
    if (!rows) return null;
    const q = search.trim().toLowerCase();
    const bucket = STATUS_BUCKETS[status];
    return rows.filter((c) => {
      if (market !== "all" && !c.markets.has(market)) return false;
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
  }, [rows, search, market, status, availability]);

  const selected = useMemo(
    () => (filtered || []).find((c) => c.key === selectedKey) || null,
    [filtered, selectedKey]
  );

  /* ── Bulk selection ────────────────────────────────────────── */
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

  const clearSelection = () => { setCheckedKeys(new Set()); setCheckNotice(false); setBulkError(null); };

  // Resolve checked keys to candidate objects, ordered by list position so the
  // WhatsApp queue's "first 10" is the first 10 the recruiter sees.
  const selectedArr = useMemo(() => {
    if (!rows || checkedKeys.size === 0) return [];
    const order = new Map((filtered || rows).map((c, i) => [c.key, i]));
    return rows
      .filter((c) => checkedKeys.has(c.key))
      .sort((a, b) => (order.has(a.key) ? order.get(a.key) : 1e9) - (order.has(b.key) ? order.get(b.key) : 1e9));
  }, [rows, filtered, checkedKeys]);

  // Bulk status: ONE .in('id', recordIds) update over each selected row's
  // latest/displayed application only — never fans out to a person's other
  // applications (status is job-specific). Optimistic with rollback on error.
  const applyBulkStatus = async (statusValue) => {
    if (!statusValue || bulkBusy || selectedArr.length === 0) return;
    const recordIds = selectedArr.map((c) => c.record?.id).filter(Boolean);
    if (!recordIds.length) return;
    const affected = new Set(selectedArr.map((c) => c.key));
    const prevRows = rows;
    setBulkBusy(true);
    setBulkError(null);
    setRows((prev) => (prev || []).map((c) => {
      if (!affected.has(c.key)) return c;
      const apps = c.apps.slice();
      if (apps[0]) apps[0] = { ...apps[0], status: statusValue };
      return { ...c, record: { ...c.record, status: statusValue }, apps, statuses: new Set(apps.map((x) => x.status)) };
    }));
    try {
      const { error } = await supabase
        .from("applications")
        .update({ status: statusValue, updated_at: new Date().toISOString() })
        .in("id", recordIds);
      if (error) throw error;
      clearSelection();
    } catch (e) {
      setRows(prevRows); // rollback
      setBulkError("Couldn't update — please try again.");
    } finally {
      setBulkBusy(false);
    }
  };

  const loading = rows === null;
  const totalCandidates = rows ? rows.length : 0;

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
          <div style={{ width: 180 }}>
            <Select
              size="sm"
              menuAlign="right"
              value={status}
              onChange={(v) => setStatus(v)}
              options={STATUS_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
              ariaLabel="Status"
            />
          </div>
          <div style={{ width: 190 }}>
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

        {/* Loading */}
        {loading && (
          <div className="cand-loading" aria-busy="true">
            <div className="cand-loading__tile" /><div className="cand-loading__tile" /><div className="cand-loading__tile" />
          </div>
        )}

        {/* Empty (no candidates at all) — designed, not a skeleton */}
        {!loading && totalCandidates === 0 && (
          <div className="hjl-empty">
            <p className="hjl-empty__title">No candidates yet</p>
            <p className="hjl-empty__body">
              Applicants show up here automatically once people apply to your jobs — searchable across every role you post.
              {error && <span style={{ display: "block", marginTop: 8, fontSize: 12, color: "var(--pj-muted)" }}>({error})</span>}
            </p>
            <button type="button" className="hjl-cta" onClick={() => navigate("/hr/post")}>Post a Job</button>
          </div>
        )}

        {/* Data */}
        {!loading && totalCandidates > 0 && (
          <div className={`cand-layout${selected ? " cand-layout--detail" : ""}`}>
            <div className="cand-list" style={{ paddingBottom: someChecked ? 96 : undefined }}>
              {filtered.length === 0 ? (
                <p className="cand-nomatch">No candidates match these filters. Clear the search or widen the market.</p>
              ) : (
                <>
                  {/* Select-all + live count + cap notice */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "2px 2px 8px" }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--pj-text-soft)" }}>
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
                    {someChecked && (
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--pj-text)" }}>{checkedKeys.size} selected</span>
                    )}
                    {checkNotice && (
                      <span role="status" style={{ fontSize: 12, fontWeight: 600, color: "var(--hjl-pass)" }}>
                        You can act on up to {SELECT_CAP} candidates at once
                      </span>
                    )}
                  </div>

                  {filtered.map((c, i) => {
                    const checked = checkedKeys.has(c.key);
                    return (
                      <div key={c.key} style={{ display: "flex", alignItems: "stretch", gap: 10 }}>
                        <label
                          onClick={(e) => e.stopPropagation()}
                          style={{ display: "flex", alignItems: "center", paddingLeft: 2, cursor: "pointer" }}
                        >
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
                            <MatchPill score={c.score} source={c.score_source} />
                          </div>
                          <div className="cand-card__meta">
                            <span className={`cand-market cand-market--${c.market === "india" ? "india" : "gulf"}`}>{c.market === "india" ? "India" : "Gulf"}</span>
                            <span className="cand-card__jobs">{c.apps.length} {c.apps.length === 1 ? "job" : "jobs"}</span>
                            <span className="cand-statuschip">{statusLabel(c.apps[0]?.status)}</span>
                          </div>
                          {c.email && <span className="cand-card__email">{c.email}</span>}
                          {c.availabilityLine && (
                            <span className="cand-avail-line"><ClockIc /> {c.availabilityLine}</span>
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
        job={selected ? { id: selected.apps[0]?.job_id, title: selected.apps[0]?.jobTitle } : null}
        hrId={user?.id}
        onLogged={() => setOutreachTick((t) => t + 1)}
      />

      {someChecked && (
        <BulkActions
          selected={selectedArr}
          onClear={clearSelection}
          onApplyStatus={applyBulkStatus}
          statusBusy={bulkBusy}
          statusError={bulkError}
          hrId={user?.id}
          onLogged={() => setOutreachTick((t) => t + 1)}
        />
      )}
    </div>
  );
}
