import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "../../../appSupabaseClient";
import UserMenu from "../../../components/UserMenu/UserMenu";
import HrInsightsPanel from "../Insights/HrInsightsPanel";
import NotificationsBell from "../../../components/hr/NotificationsBell";
import AttentionPanel from "../../../components/hr/AttentionPanel";
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
/* ───────── Helpers ───────── */
function formatStartDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  // m/d/yyyy to match the mock format (8/17/2022)
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function formatSalary(j) {
  const lo = j?.salary_min, hi = j?.salary_max;
  if (!lo && !hi) return "—";
  const cur = j.currency || "AED";
  const fmt = (n) => Number(n).toLocaleString();
  if (lo && hi && lo !== hi) return `${cur} ${fmt(lo)}–${fmt(hi)}`;
  return `${cur} ${fmt(lo || hi)}`;
}

function isActiveStatus(s) {
  return s === "active" || s === "published";
}

/* Stats roll-up tile. value === null prints an em-dash (truthful when
   the stats query failed) — value === 0 prints "0" (a real fact). */
function StatTile({ label, value, suffix = "", accent }) {
  const display = value == null ? "—" : `${value.toLocaleString()}${suffix}`;
  return (
    <div className={`hjl-stat${accent ? ` hjl-stat--${accent}` : ""}`}>
      <div className="hjl-stat__label">{label}</div>
      <div className="hjl-stat__value">{display}</div>
    </div>
  );
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
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState("open"); // open | past
  const [search, setSearch] = useState("");
  const [jobs, setJobs] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: null, active: null, applicants: null, avgScore: null });
  const [mainTab, setMainTab] = useState("jobs"); // jobs | insights

  useEffect(() => {
    let live = true;
    supabase.auth.getUser().then(({ data }) => { if (live) setUser(data?.user || null); });
    return () => { live = false; };
  }, []);

  // Pull profile.plan once we know the user — feeds the UserMenu
  // popover's plan badge. Best-effort: a missing row falls back to
  // "Free plan" inside UserMenu so the popover never breaks.
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

  useEffect(() => {
    if (!user?.id) return;
    let live = true;
    (async () => {
      try {
        const statusFilter = view === "open"
          ? ["active", "published"]
          : ["closed"];
        const { data, error: e } = await supabase
          .from("jobs")
          .select("id, title, status, posted_at, created_at, hr_id, salary_min, salary_max, currency")
          .eq("source", "hr_portal")
          .eq("hr_id", user.id)
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
  }, [view, user?.id]);

  // Stats bar — four roll-ups across the HR's whole portfolio. Counts
  // use head:true so Supabase returns the count without shipping rows.
  // Avg score pulls only the ats_score column (small payload) and only
  // for rows that have actually been scored, so the average isn't
  // dragged down by un-scored rows from the legacy pre-stopgap window.
  useEffect(() => {
    if (!user?.id) return;
    let live = true;
    (async () => {
      try {
        const [
          { count: total },
          { count: active },
          { count: applicants },
          { data: scoreRows },
        ] = await Promise.all([
          supabase.from("jobs")
            .select("id", { count: "exact", head: true })
            .eq("hr_id", user.id)
            .eq("source", "hr_portal"),
          supabase.from("jobs")
            .select("id", { count: "exact", head: true })
            .eq("hr_id", user.id)
            .eq("source", "hr_portal")
            .in("status", ["active", "published"]),
          supabase.from("applications")
            .select("id", { count: "exact", head: true })
            .eq("hr_id", user.id),
          supabase.from("applications")
            .select("ats_score")
            .eq("hr_id", user.id)
            .not("score_source", "is", null)
            .gt("ats_score", 0),
        ]);
        if (!live) return;
        const sum = (scoreRows || []).reduce((acc, r) => acc + (r.ats_score || 0), 0);
        const avg = scoreRows && scoreRows.length ? Math.round(sum / scoreRows.length) : null;
        setStats({
          total:      total ?? 0,
          active:     active ?? 0,
          applicants: applicants ?? 0,
          avgScore:   avg,
        });
      } catch (_e) {
        if (!live) return;
        // Stats are decorative — leave them as nulls so the UI shows
        // an em-dash rather than zeros that would lie about state.
        setStats({ total: null, active: null, applicants: null, avgScore: null });
      }
    })();
    return () => { live = false; };
  }, [user?.id]);

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
          <NotificationsBell userId={user?.id} buttonClassName="hjl-icon-btn" />
          <UserMenu
            email={user?.email || ""}
            name={profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || greetingName}
            plan={profile?.plan}
            roleLabel="Admin"
            switchTo={{ label: "Switch to Candidate", path: "/dashboard" }}
            settingsPath="/account"
            theme="light"
          />
        </div>
      </header>

      <main className="hjl-page">
        <div style={{ display: "flex", marginBottom: 18 }}>
          <div className="hjl-toggle" role="tablist" aria-label="HR view" style={{ marginLeft: 0 }}>
            <button
              type="button"
              role="tab"
              aria-selected={mainTab === "jobs"}
              className={`hjl-toggle__btn${mainTab === "jobs" ? " hjl-toggle__btn--active" : ""}`}
              onClick={() => setMainTab("jobs")}
            >Jobs</button>
            <button
              type="button"
              role="tab"
              aria-selected={mainTab === "insights"}
              className={`hjl-toggle__btn${mainTab === "insights" ? " hjl-toggle__btn--active" : ""}`}
              onClick={() => setMainTab("insights")}
            >Insights</button>
          </div>
        </div>

        {mainTab === "insights" ? (
          <HrInsightsPanel user={user} onGoToJobs={() => setMainTab("jobs")} />
        ) : (
        <>
        <AttentionPanel user={user} />

        <motion.div
          className="hjl-stats"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
          aria-label="Portfolio summary"
        >
          <StatTile label="Total Jobs"       value={stats.total} />
          <StatTile label="Active Jobs"      value={stats.active} accent="ok" />
          <StatTile label="Total Applicants" value={stats.applicants} />
          <StatTile label="Avg ATS Match"    value={stats.avgScore} suffix={stats.avgScore == null ? "" : "%"} />
        </motion.div>

        <motion.div
          className="hjl-header"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1], delay: 0.04 }}
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
              <span>Salary</span>
              <span>Start Date</span>
              <span>Last Activity</span>
              <span className="hjl-table__head--action">Action</span>
            </div>
            {filtered.map((j, i) => {
              const live = isActiveStatus(j.status);
              return (
                <motion.div
                  key={j.id}
                  className="hjl-table__row"
                  initial={reduce ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1], delay: Math.min(i * 0.025, 0.18) }}
                >
                  <div className="hjl-table__title-cell">
                    <div className="hjl-table__title-row">
                      <p className="hjl-table__title">{j.title}</p>
                      <span className={`hjl-status-badge hjl-status-badge--${live ? "active" : "inactive"}`}>
                        <span className="hjl-status-badge__dot" aria-hidden />
                        {live ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="hjl-table__id">{shortJobRef(j.id)}</p>
                  </div>
                  <span className="hjl-table__cell hjl-table__cell--salary">{formatSalary(j)}</span>
                  <span className="hjl-table__cell">{formatStartDate(j.posted_at || j.created_at)}</span>
                  <span className="hjl-table__cell hjl-table__cell--muted">{relativeFromNow(j.posted_at || j.created_at)}</span>
                  <button
                    type="button"
                    className="hjl-row-action"
                    onClick={() => navigate(`/hr/jobs/${j.id}`)}
                  >
                    View Applicants
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
        </>
        )}
      </main>
    </div>
  );
}
