import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
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
function formatPostedDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  // m/d/yyyy
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

/* Fresh-agency onboarding empty state — the first thing a brand-new, empty
   account sees on the open Jobs view. Designed (not a skeleton): headline,
   3-step hint, single primary CTA into the post-job flow. */
const ONBOARD_STEPS = [
  { n: 1, title: "Post a job", body: "Tell us the role — our team helps you get it live in minutes." },
  { n: 2, title: "Candidates land in your pipeline", body: "Applicants flow straight into your shortlist, ready to review." },
  { n: 3, title: "Message them on WhatsApp", body: "Reach out in a tap — assisted, personalised per candidate." },
];

function EmptyOnboarding({ reduce, onPost }) {
  return (
    <motion.div
      className="hjl-empty hjl-empty--onboard"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: [0.4, 0, 0.2, 1] }}
    >
      <p className="hjl-empty__title">Your hiring pipeline starts here</p>
      <p className="hjl-empty__body">Post your first role and watch candidates flow in. Here's how it works:</p>

      <div className="hjl-onboard-steps">
        {ONBOARD_STEPS.map((s, i) => (
          <motion.div
            key={s.n}
            className="hjl-onboard-step"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.08 + i * 0.07 }}
          >
            <span className="hjl-onboard-step__num" aria-hidden>{s.n}</span>
            <div className="hjl-onboard-step__text">
              <p className="hjl-onboard-step__title">{s.title}</p>
              <p className="hjl-onboard-step__body">{s.body}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <button type="button" className="hjl-cta hjl-onboard__cta" onClick={onPost}>
        <BriefcaseIc size={14} white />
        Post your first job
      </button>
    </motion.div>
  );
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
      <Helmet><title>Jobs · CVPassport</title></Helmet>
      <header className="hjl-topbar">
        <div>
          <a href="/" className="hjl-wordmark">CV<span>Passport</span></a>
        </div>
        <div className="hjl-center" />
        <div className="hjl-right">
          <button type="button" className="hjl-cta" onClick={() => navigate("/hr/post")}>
            <BriefcaseIc size={14} white />
            Request Talent
          </button>
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
          error ? (
            <div className="hjl-empty">
              <p className="hjl-empty__title">Couldn't load jobs</p>
              <p className="hjl-empty__body">{error}</p>
            </div>
          ) : search.trim() ? (
            <div className="hjl-empty">
              <p className="hjl-empty__title">No matching jobs</p>
              <p className="hjl-empty__body">Nothing matches “{search.trim()}”. Clear the search to see all your {view === "open" ? "open" : "past"} roles.</p>
            </div>
          ) : view === "past" ? (
            <div className="hjl-empty">
              <p className="hjl-empty__title">No past jobs</p>
              <p className="hjl-empty__body">
                Closed roles you've previously posted will appear here.
                {error && <span style={{ display: "block", marginTop: 8, fontSize: 12, color: "var(--pj-muted)" }}>({error})</span>}
              </p>
            </div>
          ) : (
            <EmptyOnboarding reduce={reduce} onPost={() => navigate("/hr/post")} />
          )
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
              <span>Posted</span>
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
                  </div>
                  <span className="hjl-table__cell hjl-table__cell--salary">{formatSalary(j)}</span>
                  <span className="hjl-table__cell">{formatPostedDate(j.posted_at || j.created_at)}</span>
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
