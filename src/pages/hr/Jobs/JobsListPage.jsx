import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import JobLimitBanner, { JobCountChip } from "../../../components/hr/JobLimitBanner";
import FoundationUpgradeSheet from "../../../components/hr/FoundationUpgradeSheet";
import { fetchEntitlement } from "../../../lib/employer/entitlement";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase } from "../../../appSupabaseClient";
import UserMenu from "../../../components/UserMenu/UserMenu";
import HrInsightsPanel from "../Insights/HrInsightsPanel";
import NotificationsBell from "../../../components/hr/NotificationsBell";
import AttentionPanel from "../../../components/hr/AttentionPanel";
import InterviewsToday from "../../../components/hr/InterviewsToday";
import "../PostJob/postJob.css"; // :root tokens
import "./jobsList.css";

/* ───────── Inline icons ───────── */
const BriefcaseIc = ({ size = 14, white = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={white ? "#FFFFFF" : "currentColor"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
);
const TrashIc = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
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
    return { kind: "verdict", label: `${verdicts} client verdict${verdicts > 1 ? "s" : ""}`, action: { label: "See verdict", variant: "verdict", to: `/employer/jobs/${job.id}?app=${agg.verdictAppId}` } };
  }
  if (newCount > 0) {
    return { kind: "hot", label: `hot, ${newCount} new`, action: { label: `Review ${newCount} new`, variant: "primary", to: `/employer/jobs/${job.id}/review` } };
  }
  if (daysSince != null && daysSince >= STALLED_DAYS) {
    return { kind: "stalled", label: `stalled ${daysSince}d`, action: { label: "Source talent", variant: "ghost", to: "/employer/post" } };
  }
  return { kind: "active", label: "active", action: { label: "View applicants", variant: "quiet", to: `/employer/jobs/${job.id}` } };
}

/* First-run starter (design 2a) — the "Get set up" checklist shown when a
   brand-new account has no open jobs yet. Step 1 is the one live action;
   steps 2 and 3 preview what unlocks next and stay dimmed until a job
   exists. The footnote covers the CVs-but-no-role path via talent pools. */
const SETUP_STEPS = [
  { n: 2, title: "Import the CVs you already have", body: "Up to 20 at once, parsed, scored, and ranked." },
  { n: 3, title: "Share your best candidate with your client", body: "They approve or pass with one tap." },
];

function EmptyOnboarding({ reduce, onPost, onImport }) {
  return (
    <motion.div
      className="hjl-onboard-card"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    >
      <p className="hjl-onboard-card__title">Get set up</p>

      <motion.div
        className="hjl-setup hjl-setup--active"
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.04 }}
      >
        <span className="hjl-setup__num hjl-setup__num--filled" aria-hidden>1</span>
        <span className="hjl-setup__text">
          <span className="hjl-setup__title">Post a job</span>
          <span className="hjl-setup__body">The wizard writes the ad with you in five short steps.</span>
        </span>
        <button type="button" className="hjl-setup__start" onClick={onPost}>Start</button>
      </motion.div>

      {SETUP_STEPS.map((s, i) => (
        <motion.div
          key={s.n}
          className="hjl-setup hjl-setup--waiting"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.08 + i * 0.04 }}
        >
          <span className="hjl-setup__num" aria-hidden>{s.n}</span>
          <span className="hjl-setup__text">
            <span className="hjl-setup__title">{s.title}</span>
            <span className="hjl-setup__body">{s.body}</span>
          </span>
        </motion.div>
      ))}

      <p className="hjl-onboard-card__foot">
        Have CVs but no role yet?{" "}
        <button type="button" className="hjl-onboard-card__link" onClick={onImport}>Import them into a talent pool.</button>{" "}
        You can move them onto a job later.
      </p>
    </motion.div>
  );
}

export default function JobsListPage() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState("open"); // open | past | pools
  const [search, setSearch] = useState("");
  const [jobs, setJobs] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [ent, setEnt] = useState(null);
  const [upgrade, setUpgrade] = useState(false);
  const [jobsTick, setJobsTick] = useState(0); // bump to refetch jobs (after a pool delete)
  const [deletePool, setDeletePool] = useState(null); // { id, title } pending delete
  const [deleteCount, setDeleteCount] = useState(null); // candidates in the pool (null = counting)
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState(null);
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
    if (!user?.id) return undefined;
    let live = true;
    fetchEntitlement().then((e) => { if (live) setEnt(e); }).catch(() => {});
    return () => { live = false; };
  }, [user?.id, jobsTick]);

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
        let q = supabase
          .from("jobs")
          .select("id, title, status, kind, posted_at, created_at, hr_id, salary_min, salary_max, currency")
          .eq("source", "hr_portal")
          .eq("hr_id", user.id)
          .order("posted_at", { ascending: false })
          .limit(200);
        // Pools live in their own view; the open/past triage shows only active
        // mandates, so a pool never reads as an active job in the table.
        q = view === "pools"
          ? q.eq("kind", "pool")
          : q.eq("kind", "active").in("status", view === "open" ? ["active", "published"] : ["closed"]);
        const { data, error: e } = await q;
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
  }, [view, user?.id, jobsTick]);

  // Count candidates in a pool, then open the delete confirm. Never a silent
  // cascade: deleting a job ON DELETE CASCADEs its applications.
  const openDeletePool = useCallback(async (job) => {
    setDeletePool(job); setDeleteCount(null); setDeleteErr(null);
    try {
      const { count } = await supabase
        .from("applications").select("id", { count: "exact", head: true })
        .eq("job_id", job.id);
      setDeleteCount(count || 0);
    } catch { setDeleteCount(0); }
  }, []);

  const confirmDeletePool = useCallback(async () => {
    if (!deletePool || deleteBusy || !user?.id) return;
    setDeleteBusy(true); setDeleteErr(null);
    try {
      // kind = 'pool' guard means this action can never delete an active mandate.
      const { error: e } = await supabase
        .from("jobs").delete()
        .eq("id", deletePool.id).eq("hr_id", user.id).eq("kind", "pool");
      if (e) throw e;
      setDeletePool(null);
      setJobsTick((t) => t + 1);
    } catch (e) {
      setDeleteErr(e.message || "Couldn't delete, try again.");
    } finally {
      setDeleteBusy(false);
    }
  }, [deletePool, deleteBusy, user?.id]);

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

  // Greeting header (design 2a). First run (zero open jobs, nothing searched,
  // no load error) swaps the time greeting for the Welcome variant that pairs
  // with the setup checklist below. While jobs are still loading we stay on
  // the time greeting so the header never flashes between the two.
  const firstRun = jobs !== null && jobs.length === 0 && view === "open" && !search.trim() && !error;
  const firstName = (profile?.full_name || "").trim().split(/\s+/)[0] || "";
  const greeting = useMemo(() => {
    const now = new Date();
    const h = now.getHours();
    const part = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
    // Composed by hand: ICU builds vary on whether en-GB includes the comma,
    // and the 2a mock wants "Thursday, 10 July" everywhere.
    const dateLine = `${now.toLocaleDateString("en-GB", { weekday: "long" })}, ${now.getDate()} ${now.toLocaleDateString("en-GB", { month: "long" })}`;
    if (firstRun) {
      return {
        title: firstName ? `Welcome, ${firstName}` : "Welcome",
        sub: "Let's get your first role live. It takes about two minutes.",
      };
    }
    return {
      title: firstName ? `Good ${part}, ${firstName}` : "Welcome back",
      sub: dateLine,
    };
  }, [firstRun, firstName]);

  return (
    <div className="hjl-root">
      <Helmet><title>Jobs · CVPassport</title></Helmet>
      <header className="hjl-topbar">
        <div>
          <a href="/" className="hjl-wordmark">CV<span>Passport</span></a>
        </div>
        <div className="hjl-center" />
        <div className="hjl-right">
          <button type="button" className="hjl-cta" onClick={() => navigate("/employer/post")}>
            <BriefcaseIc size={14} white />
            Request Talent
          </button>
          <NotificationsBell userId={user?.id} buttonClassName="hjl-icon-btn" />
          <UserMenu
            email={user?.email || ""}
            name={profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || greetingName}
            showPlan={false}
            roleLabel="Admin"
            switchTo={{ label: "Switch to Candidate", path: "/dashboard" }}
            settingsPath={null}
            theme="light"
          />
        </div>
      </header>

      <main className="hjl-page">
        <motion.div
          className="hjl-greet"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        >
          <h1 className="hjl-greet__title">{greeting.title}</h1>
          <p className="hjl-greet__sub">
            {greeting.sub}{ent?.loaded ? <> · <JobCountChip ent={ent} /></> : null}
          </p>
        </motion.div>

        {/* Gate E2. The cap is enforced by the 046 trigger; this is the
            designed state for it. Not blocking: the jobs below stay live. */}
        <JobLimitBanner ent={ent} onUpgrade={() => setUpgrade(true)} />

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

        {/* Interviews today: the flight board (renders nothing when there
            is nothing scheduled and nobody waiting at To interview). */}
        <InterviewsToday user={user} />

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
            <button
              type="button"
              role="radio"
              aria-checked={view === "pools"}
              className={`hjl-toggle__btn${view === "pools" ? " hjl-toggle__btn--active" : ""}`}
              onClick={() => setView("pools")}
            >Pools</button>
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
            <EmptyOnboarding reduce={reduce} onPost={() => navigate("/employer/post")} onImport={() => navigate("/employer/import")} />
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
                  onClick={() => navigate(`/employer/jobs/${j.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter") navigate(`/employer/jobs/${j.id}`); }}
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
                    {view === "pools" && (
                      <button
                        type="button"
                        className="hjl-act-del"
                        title="Delete pool"
                        aria-label={`Delete ${j.title} pool`}
                        onClick={(e) => { e.stopPropagation(); openDeletePool(j); }}
                      >
                        <TrashIc />
                      </button>
                    )}
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

      {/* Delete-pool confirm — never a silent cascade */}
      <AnimatePresence>
        {deletePool && (
          <motion.div
            role="dialog" aria-modal="true" aria-label="Delete pool"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            onClick={() => { if (!deleteBusy) setDeletePool(null); }}
            style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(20,19,31,0.42)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              style={{ width: "min(420px, 100%)", background: "var(--pj-surface)", border: "1px solid var(--pj-border)", borderRadius: 16, boxShadow: "var(--pj-shadow-card)", padding: 20 }}
            >
              <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "var(--pj-text)" }}>
                Delete the &quot;{deletePool.title || "Untitled"}&quot; pool?
              </h3>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--pj-text-soft)", lineHeight: 1.5 }}>
                {deleteCount === null
                  ? "Checking how many candidates are in this pool…"
                  : deleteCount > 0
                    ? `This will remove ${deleteCount} candidate${deleteCount === 1 ? "" : "s"} in this pool. Move them to a job first if you want to keep them.`
                    : "This pool has no candidates. Deleting it cannot be undone."}
              </p>
              {deleteErr && <p role="status" style={{ margin: "0 0 12px", fontSize: 12.5, color: "var(--hjl-pass, #D85A30)", fontWeight: 600 }}>{deleteErr}</p>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setDeletePool(null)} disabled={deleteBusy}
                  style={{ height: 38, padding: "0 16px", borderRadius: 9, border: "1px solid var(--pj-border)", background: "#FFFFFF", color: "var(--pj-text)", font: "inherit", fontFamily: "var(--pj-font)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="button" onClick={confirmDeletePool} disabled={deleteBusy || deleteCount === null}
                  style={{ height: 38, padding: "0 16px", borderRadius: 9, border: 0, background: "var(--hjl-pass, #D85A30)", color: "#FFFFFF", font: "inherit", fontFamily: "var(--pj-font)", fontSize: 13, fontWeight: 700, cursor: (deleteBusy || deleteCount === null) ? "not-allowed" : "pointer", opacity: (deleteBusy || deleteCount === null) ? 0.6 : 1 }}>
                  {deleteBusy ? "Deleting…" : "Delete pool"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    <FoundationUpgradeSheet
        open={upgrade}
        onClose={() => setUpgrade(false)}
        user={user}
        heading="Upgrade to Foundation"
        blurb="Up to 3 active jobs, and the full evaluation on every applicant."
      />
    </div>
  );
}
