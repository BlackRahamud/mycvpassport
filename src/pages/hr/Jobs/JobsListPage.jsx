import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "../../../appSupabaseClient";
import "../PostJob/postJob.css"; // :root tokens
import "./jobsList.css";

/* ───────── Inline icons ───────── */
const BriefcaseIc = ({ size = 14, white = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={white ? "#FFFFFF" : "currentColor"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
);
const SearchIc = () => (
  <svg className="hjl-search__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const BellIc = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
const ChevDown = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

/* ───────── Helpers ───────── */
function formatStartDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  // m/d/yyyy to match the mock format (8/17/2022)
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function relativeFromNow(s) {
  if (!s) return "—";
  const t = new Date(s).getTime();
  if (!t) return "—";
  const days = Math.floor((Date.now() - t) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  return `${months} months ago`;
}

function shortJobRef(id) {
  // Keep the visual rhythm of the mock's "# 31000-0012403742" subtitle.
  const s = String(id || "").replace(/-/g, "");
  if (!s) return "";
  return `# ${s.slice(0, 5)}-${s.slice(5, 17).padEnd(12, "0")}`.toUpperCase();
}

export default function JobsListPage() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [view, setView] = useState("open"); // open | past
  const [search, setSearch] = useState("");
  const [jobs, setJobs] = useState(null); // null = loading
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    supabase.auth.getUser().then(({ data }) => { if (live) setUser(data?.user || null); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const statusFilter = view === "open"
          ? ["active", "published"]
          : ["closed"];
        const { data, error: e } = await supabase
          .from("jobs")
          .select("id, title, status, posted_at, created_at, hr_id")
          .eq("source", "hr_portal")
          .in("status", statusFilter)
          .order("posted_at", { ascending: false })
          .limit(200);
        if (!live) return;
        if (e) throw e;
        setJobs(data || []);
      } catch (e) {
        if (!live) return;
        setJobs([]);
        setError(e.message || "Couldn't load jobs");
      }
    })();
    return () => { live = false; };
  }, [view]);

  const filtered = useMemo(() => {
    if (!jobs) return null;
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => (j.title || "").toLowerCase().includes(q));
  }, [jobs, search]);

  const greetingName = useMemo(() => {
    const meta = user?.user_metadata || {};
    return meta.full_name || meta.name || user?.email?.split("@")[0] || "Sign in";
  }, [user]);

  return (
    <div className="hjl-root">
      <header className="hjl-topbar">
        <div>
          <a href="/" className="hjl-wordmark">CV<span>Passport</span></a>
        </div>
        <div className="hjl-center">
          <button type="button" className="hjl-cta" onClick={() => navigate("/hr/post")}>
            <BriefcaseIc size={14} white />
            Request Talent
          </button>
        </div>
        <div className="hjl-right">
          <button type="button" className="hjl-icon-btn" aria-label="Notifications"><BellIc /></button>
          <button type="button" className="hjl-userpill">
            <span className="hjl-avatar">{(greetingName?.[0] || "?").toUpperCase()}</span>
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.2 }}>
              <span className="hjl-userpill__name">{greetingName}</span>
              <span className="hjl-userpill__role">Admin</span>
            </span>
            <ChevDown />
          </button>
        </div>
      </header>

      <main className="hjl-page">
        <motion.div
          className="hjl-header"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
        >
          <span className="hjl-count">
            <span className="hjl-count__icon" aria-hidden><BriefcaseIc size={12} white /></span>
            <span className="hjl-count__num">{filtered?.length ?? 0}</span>
            <span className="hjl-count__label">Jobs</span>
          </span>
          <div className="hjl-search">
            <SearchIc />
            <input
              type="text"
              placeholder="Search for anything here…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="hjl-toggle" role="radiogroup" aria-label="Job status">
            <button
              type="button"
              role="radio"
              aria-checked={view === "open"}
              className={`hjl-toggle__btn${view === "open" ? " hjl-toggle__btn--active" : ""}`}
              onClick={() => setView("open")}
            >Open</button>
            <button
              type="button"
              role="radio"
              aria-checked={view === "past"}
              className={`hjl-toggle__btn${view === "past" ? " hjl-toggle__btn--active" : ""}`}
              onClick={() => setView("past")}
            >Past</button>
          </div>
        </motion.div>

        {filtered === null && (
          <div className="hjl-loading">
            <p className="hjl-empty__title">Loading jobs…</p>
          </div>
        )}

        {filtered && filtered.length === 0 && (
          <div className="hjl-empty">
            <p className="hjl-empty__title">{view === "open" ? "No open jobs" : "No past jobs"}</p>
            <p className="hjl-empty__body">
              {view === "open"
                ? "Click Request Talent to post your first role — it'll show up here within seconds."
                : "Closed roles you've previously posted will appear here."}
              {error && <span style={{ display: "block", marginTop: 8, fontSize: 12, color: "var(--pj-muted)" }}>({error})</span>}
            </p>
          </div>
        )}

        {filtered && filtered.length > 0 && (
          <motion.div
            className="hjl-table"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, ease: [0.4, 0, 0.2, 1], delay: 0.05 }}
          >
            <div className="hjl-table__head">
              <span>Job Title</span>
              <span>Shortlisted</span>
              <span>Selected</span>
              <span>Start Date</span>
              <span>Last Activity</span>
            </div>
            {filtered.map((j, i) => (
              <motion.div
                key={j.id}
                className="hjl-table__row"
                onClick={() => navigate(`/hr/jobs/${j.id}`)}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate(`/hr/jobs/${j.id}`); }}
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1], delay: Math.min(i * 0.025, 0.18) }}
              >
                <div>
                  <p className="hjl-table__title">{j.title}</p>
                  <p className="hjl-table__id">{shortJobRef(j.id)}</p>
                </div>
                {/* Application counts (shortlisted / selected) become live in the
                    Apply-flow batch — Task 3 will populate these from the
                    applications table. Until then, render a quiet "—". */}
                <span className="hjl-table__cell hjl-table__cell--muted">—</span>
                <span className="hjl-table__cell hjl-table__cell--muted">—</span>
                <span className="hjl-table__cell">{formatStartDate(j.posted_at || j.created_at)}</span>
                <span className="hjl-table__cell hjl-table__cell--muted">{relativeFromNow(j.posted_at || j.created_at)}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}
