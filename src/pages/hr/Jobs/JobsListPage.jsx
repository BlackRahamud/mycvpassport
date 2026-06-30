import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
function ts(s) {
  const t = new Date(s).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function formatSalary(j) {
  const lo = j?.salary_min, hi = j?.salary_max;
  if (!lo && !hi) return "";
  const cur = j.currency || "AED";
  const fmt = (n) => Number(n).toLocaleString();
  if (lo && hi && lo !== hi) return `${cur} ${fmt(lo)}–${fmt(hi)}`;
  return `${cur} ${fmt(lo || hi)}`;
}

/* Map a raw application status onto a display pipeline stage (rejected and
   unknown statuses fall through to null and don't show as a pill). */
function pillStage(status) {
  if (["new", "submitted", "viewed"].includes(status)) return "new";
  if (["shortlisted", "ready"].includes(status)) return "review";
  if (["interviewing", "interviewed"].includes(status)) return "interviewed";
  if (status === "offered") return "offer";
  if (status === "hired") return "hired";
  return null;
}
const PILL_ORDER = ["new", "review", "interviewed", "offer", "hired"];
const STALLED_DAYS = 14;

/* Most urgent need for a job → its status signal + the one action button.
   Priority: a waiting client verdict (purple) > hot new applicants (green) >
   stalled with no recent activity (amber) > active (blue). */
function jobSignal(agg, job) {
  const newCount = agg.stages.new || 0;
  const verdicts = agg.verdictAppIds.size;
  const lastTs = agg.lastTs || ts(job.posted_at || job.created_at);
  const daysSince = lastTs ? Math.floor((Date.now() - lastTs) / 86400000) : null;
  if (verdicts > 0) {
    return { kind: "verdict", label: `${verdicts} client verdict${verdicts > 1 ? "s" : ""}`, action: { label: "See verdict", variant: "verdict", to: `/hr/jobs/${job.id}?app=${agg.verdictAppId}` } };
  }
  if (newCount > 0) {
    return { kind: "hot", label: `hot, ${newCount} new`, action: { label: `Review ${newCount} new`, variant: "primary", to: `/hr/jobs/${job.id}?stage=shortlist` } };
  }
  if (daysSince != null && daysSince >= STALLED_DAYS) {
    return { kind: "stalled", label: `stalled ${daysSince}d`, action: { label: "Source talent", variant: "ghost", to: "/hr/post" } };
  }
  return { kind: "active", label: "active", action: { label: "View applicants", variant: "quiet", to: `/hr/jobs/${job.id}` } };
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
  const [agg, setAgg] = useState(null); // Map<jobId, { stages, lastTs, verdictAppIds, verdictAppId }>
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

  // Per-job aggregates for the triage rows: pipeline stage counts, last
  // activity, and waiting client verdicts. One applications read + one
  // share_feedback read (RLS-scoped), aggregated client-side.
  useEffect(() => {
    if (!user?.id) return;
    let live = true;
    (async () => {
      const [appsRes, fbRes] = await Promise.all([
        supabase.from("applications").select("id, job_id, status, applied_at").eq("hr_id", user.id).limit(5000),
        supabase.from("share_feedback").select("created_at, candidate_shares!inner(application_id)").order("created_at", { ascending: false }).limit(500),
      ]);
      if (!live) return;
      const apps = appsRes.data || [];
      const appJob = new Map(apps.map((a) => [a.id, a.job_id]));
      const m = new Map();
      const ensure = (jid) => {
        let x = m.get(jid);
        if (!x) { x = { stages: { new: 0, review: 0, interviewed: 0, offer: 0, hired: 0 }, lastTs: 0, verdictAppIds: new Set(), verdictAppId: null }; m.set(jid, x); }
        return x;
      };
      apps.forEach((a) => {
        const x = ensure(a.job_id);
        const st = pillStage(a.status);
        if (st) x.stages[st] += 1;
        const t = ts(a.applied_at);
        if (t > x.lastTs) x.lastTs = t;
      });
      // fbRes is newest-first, so the first verdict seen per job is the most recent.
      (fbRes.data || []).forEach((r) => {
        const appId = r.candidate_shares?.application_id;
        const jid = appId ? appJob.get(appId) : null;
        if (jid && !ensure(jid).verdictAppIds.has(appId)) {
          const x = ensure(jid);
          if (!x.verdictAppId) x.verdictAppId = appId;
          x.verdictAppIds.add(appId);
        }
      });
      setAgg(m);
    })();
    return () => { live = false; };
  }, [user?.id]);

  const filtered = useMemo(() => {
    if (!jobs) return null;
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => (j.title || "").toLowerCase().includes(q));
  }, [jobs, search]);

  const EMPTY_AGG = { stages: {}, lastTs: 0, verdictAppIds: new Set(), verdictAppId: null };

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

        <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mainTab}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        >
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
            <div className="hjl-thead">
              <span>Role</span>
              <span>Pipeline</span>
              <span className="hjl-table__head--action">Action</span>
            </div>
            {filtered.map((j, i) => {
              const a = (agg && agg.get(j.id)) || EMPTY_AGG;
              const aggSafe = { stages: a.stages || {}, lastTs: a.lastTs || 0, verdictAppIds: a.verdictAppIds || new Set(), verdictAppId: a.verdictAppId };
              const sig = jobSignal(aggSafe, j);
              const pills = PILL_ORDER.filter((s) => (aggSafe.stages[s] || 0) > 0).map((s) => ({ stage: s, count: aggSafe.stages[s] }));
              const salary = formatSalary(j);
              return (
                <motion.div
                  key={j.id}
                  className="hjl-trow"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/hr/jobs/${j.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter") navigate(`/hr/jobs/${j.id}`); }}
                  initial={reduce ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1], delay: Math.min(i * 0.025, 0.18) }}
                >
                  <div className="hjl-trow__role">
                    <p className="hjl-trow__title">{j.title}</p>
                    {salary && <p className="hjl-trow__salary">{salary}</p>}
                    <span className={`hjl-signal hjl-signal--${sig.kind}`}>
                      <span className="hjl-signal__dot" aria-hidden />
                      {sig.label}
                    </span>
                  </div>
                  <div className="hjl-trow__pipeline">
                    {pills.length === 0
                      ? <span className="hjl-trow__empty">No applicants yet</span>
                      : pills.map((p) => (
                          <span key={p.stage} className={`hjl-pill hjl-pill--${p.stage}`}>{p.count} {p.stage}</span>
                        ))}
                  </div>
                  <div className="hjl-trow__action">
                    <button
                      type="button"
                      className={`hjl-act hjl-act--${sig.action.variant}`}
                      onClick={(e) => { e.stopPropagation(); navigate(sig.action.to); }}
                    >
                      {sig.action.label}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
        </>
        )}
        </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
